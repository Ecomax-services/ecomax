-- Rascunho não é OS: não chega ao campo, e sai do rascunho ao ser emitido.
--
-- Encontrado testando o app no simulador: a OS-1004 estava com rascunho=true e
-- mesmo assim apareceu na lista do operador, foi executada, assinada e voltou
-- ao Backoffice como "Executada · Rascunho". Uma OS que o Backoffice ainda está
-- escrevendo não pode ser executada em campo.
--
-- A guarda entra em `os_is_mine` porque é o funil por onde passam as 17 policies
-- de escopo do operador — lista, detalhe, produtos, anexos, histórico, storage.
-- Barrar só na consulta do app deixaria o detalhe e o storage abertos.

create or replace function os_is_mine(_os_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.os_funcionarios osf
      join public.funcionarios f on f.id = osf.funcionario_id
      join public.ordens_servico o on o.id = osf.os_id
     where osf.os_id = _os_id
       and f.profile_id = auth.uid()
       and not o.rascunho
  );
$$;

-- A criação de OS já não vinculava funcionário a rascunho; a aba Execução do
-- detalhe não tinha a mesma guarda, e foi por ali que o rascunho ganhou equipe.
-- No banco para a recusa valer também fora da tela.
create or replace function os_funcionario_recusa_rascunho()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from ordens_servico o where o.id = new.os_id and o.rascunho) then
    raise exception 'Esta OS é um rascunho. Emita a OS antes de vincular funcionários.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_os_funcionario_recusa_rascunho on os_funcionarios;
create trigger trg_os_funcionario_recusa_rascunho
  before insert on os_funcionarios
  for each row execute function os_funcionario_recusa_rascunho();

-- Correção do dado: a OS-1004 foi executada de fato, com assinatura no bucket.
-- Deixá-la marcada como rascunho manteria a contradição na tela.
update ordens_servico set rascunho = false
 where rascunho and status <> 'em_aberto';
