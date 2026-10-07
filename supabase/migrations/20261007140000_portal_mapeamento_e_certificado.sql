-- ============================================================================
-- Portal: aplicações no Mapeamento e aviso de certificado — Release 4 (PR 19)
-- ============================================================================
-- A aba Mapeamento do Portal mostra os pontos do monitoramento com o modelo
-- novo. A Desinsetização não tem ponto: o registro dela é a aplicação
-- (`os_aplicacoes`), e o cliente não conseguia ler nenhuma. Sem isso, o plano
-- de Desinsetização aparecia vazio no Portal, como se nada tivesse sido feito.
--
--   1. o cliente lê as aplicações das OS dele (como já lê planos e pontos);
--   2. o produto aplicado conta como "produto do meu cliente", para o nome
--      aparecer junto da aplicação;
--   3. o cliente é avisado quando o certificado em PDF fica pronto (PR 18).
-- ============================================================================


-- 1. Aplicações: o cliente lê as das OS dele, como já lê planos e pontos.
create policy os_aplicacoes_cliente_select on public.os_aplicacoes
  for select to authenticated using (public.os_is_my_cliente(os_id));


-- 2. Produto aplicado também é produto do cliente. Antes só contavam os
--    homologados e os de `os_produtos`.
create or replace function public.produto_do_meu_cliente(_produto_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cliente_produtos_homologados h
    where h.produto_id = _produto_id
      and h.cliente_id in (select public.my_portal_cliente_ids())
  ) or exists (
    select 1
    from public.os_produtos op
    join public.ordens_servico o on o.id = op.os_id
    where op.produto_id = _produto_id
      and o.cliente_id in (select public.my_portal_cliente_ids())
  ) or exists (
    select 1
    from public.os_aplicacoes a
    join public.ordens_servico o on o.id = a.os_id
    where a.produto_id = _produto_id
      and o.cliente_id in (select public.my_portal_cliente_ids())
  );
$$;


-- 3. Certificado pronto → aviso no Portal. Dispara quando o PDF é anexado
--    (a Edge Function grava o certificado e depois o PDF), não na criação da
--    linha: avisar antes de o arquivo existir mandaria o cliente a um link vazio.
create or replace function public.os_certificado_notifica_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_os record;
begin
  if new.pdf_path is null or (tg_op = 'UPDATE' and old.pdf_path is not null) then
    return new;
  end if;
  select cliente_id, codigo into v_os from ordens_servico where id = new.os_id;
  perform notificar_cliente(v_os.cliente_id, 'os', 'Certificado de execução disponível',
    format('O certificado de execução da %s já pode ser baixado no seu portal.', v_os.codigo),
    new.os_id, null);
  return new;
end;
$$;

create trigger os_certificado_notifica_cliente
  after insert or update of pdf_path on public.os_certificados
  for each row execute function public.os_certificado_notifica_cliente();
