-- Anexos do Comercial e o alerta automático de 60 dias.

-- ---------------------------------------------------------------------------
-- 1. Bucket dos anexos
-- ---------------------------------------------------------------------------
-- Separado de portal-docs de propósito: aquele guarda o que o CLIENTE enxerga,
-- e estes são documentos internos do comercial — proposta, e-mail trocado,
-- comprovante. Misturar os dois faria a policy do portal ter de excluir tipos
-- em vez de simplesmente não alcançá-los.
--
-- Convenção de caminho:  <escopo>/<id>/<timestamp>-<slug>.<ext>
--                        escopo ∈ follow-up | garantia
insert into storage.buckets (id, name, public, file_size_limit)
values ('comercial-docs', 'comercial-docs', false, 10485760)  -- 10 MB, como o Discovery pede
on conflict (id) do nothing;

create or replace function public.comercial_doc_escopo(_name text)
returns text language sql immutable set search_path to ''
as $$
  select case when _name ~ '^(follow-up|garantia)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
              then split_part(_name, '/', 1) end;
$$;

revoke execute on function public.comercial_doc_escopo(text) from anon;

-- O acesso é o mesmo do módulo. O caminho é validado para um objeto de nome
-- arbitrário não escapar da convenção — e a regex roda antes de qualquer cast.
drop policy if exists comercialdocs_read on storage.objects;
create policy comercialdocs_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'comercial-docs'
    and public.comercial_doc_escopo(name) is not null
    and public.has_module_perm('comercial', 'ler')
  );

drop policy if exists comercialdocs_insert on storage.objects;
create policy comercialdocs_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'comercial-docs'
    and public.comercial_doc_escopo(name) is not null
    and public.has_module_perm('comercial', 'criar')
  );

drop policy if exists comercialdocs_delete on storage.objects;
create policy comercialdocs_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'comercial-docs'
    and public.comercial_doc_escopo(name) is not null
    and public.has_module_perm('comercial', 'excluir')
  );

-- ---------------------------------------------------------------------------
-- 2. Alerta automático de 60 dias
-- ---------------------------------------------------------------------------
-- "Validade da garantia gera alerta automático 60 dias antes do vencimento,
-- atualizando o status para 'A renovar' e listando o registro na aba Vencendo."
--
-- A aba já funcionava pela data. O que faltava era a transição de status
-- acontecer sozinha — hoje alguém precisa lembrar de mudar, e o que depende de
-- alguém lembrar não acontece.
--
-- Só toca em 'Em vigor'. Garantia já renovada, recusada ou marcada como não
-- aplicável fica onde está: a automação avisa, não desfaz decisão de gente.
create or replace function public.garantias_marcar_a_renovar()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  g record;
  n integer := 0;
begin
  for g in
    select id, status, data_validade, cliente_id
    from public.comercial_garantias
    where status = 'Em vigor'
      and data_validade <= current_date + 60
      and data_validade >= current_date
    for update
  loop
    update public.comercial_garantias set status = 'A renovar' where id = g.id;

    insert into public.comercial_garantia_historico
      (garantia_id, campo, valor_anterior, valor_novo, comentario, actor_id)
    values
      (g.id, 'Status', g.status, 'A renovar',
       format('Alerta automático: vence em %s dias.', g.data_validade - current_date),
       null);   -- sem actor: foi o sistema, e inventar um usuário seria mentira

    -- Uma notificação por garantia, no momento em que ela vira acionável. Não
    -- precisa de dedupe: a transição sai de 'Em vigor' e não volta sozinha.
    insert into public.notificacoes (para_role, tipo, titulo, descricao, link)
    values (
      'comercial', 'expired',
      'Garantia a renovar',
      format('Uma garantia vence em %s. Entre em contato com o cliente.',
             to_char(g.data_validade, 'DD/MM/YYYY')),
      '/comercial/garantias/' || g.id
    );

    n := n + 1;
  end loop;

  return n;
end $$;

revoke execute on function public.garantias_marcar_a_renovar() from anon, authenticated;

comment on function public.garantias_marcar_a_renovar() is
  'Move garantias de "Em vigor" para "A renovar" a 60 dias do vencimento. Idempotente: rodar duas vezes no mesmo dia não duplica nada, porque a segunda execução já não encontra linhas em "Em vigor".';

-- ---------------------------------------------------------------------------
-- 3. Agendamento
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron with schema extensions;

-- Todo dia às 6h UTC (3h em Brasília): o comercial encontra a lista pronta ao
-- começar o expediente, e o horário está fora do pico de uso.
select cron.unschedule('garantias-a-renovar')
where exists (select 1 from cron.job where jobname = 'garantias-a-renovar');

select cron.schedule(
  'garantias-a-renovar',
  '0 6 * * *',
  $$select public.garantias_marcar_a_renovar()$$
);
