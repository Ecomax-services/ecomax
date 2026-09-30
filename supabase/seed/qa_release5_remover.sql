-- ============================================================================
-- Remove a massa de QA do Release 5
-- ============================================================================
-- Apaga exatamente o que `qa_release5.sql` criou, e nada mais. O critério é o
-- prefixo `[QA]` no nome, que só a massa de QA usa.
--
-- A ordem importa: filho antes de pai, mesmo onde há cascata, porque nem toda
-- FK aqui tem `on delete cascade` e um erro no meio deixaria metade apagada.
--
-- Os clientes são apagados por último. Deletá-los primeiro levaria as OS por
-- cascata, e aí os filtros seguintes não encontrariam nada para apagar —
-- `os_anexos` e `os_plano_pontos` ficariam órfãos de critério.
--
-- Rodar: supabase db query --linked -f supabase/seed/qa_release5_remover.sql
-- ============================================================================

do $$
declare
  v_clientes uuid[];
  v_os uuid[];
  v_planos uuid[];
  n int;
begin
  select array_agg(id) into v_clientes from public.clientes where nome like '[QA]%';
  if v_clientes is null then
    raise notice 'Nada a remover: nenhum cliente com prefixo [QA].';
    return;
  end if;

  select array_agg(id) into v_os from public.ordens_servico where cliente_id = any(v_clientes);
  select array_agg(id) into v_planos from public.os_planos_controle where os_id = any(coalesce(v_os, '{}'));

  -- Detalhe da OS
  delete from public.os_plano_pontos where plano_id = any(coalesce(v_planos, '{}'));
  delete from public.os_planos_controle where os_id = any(coalesce(v_os, '{}'));
  delete from public.os_anexos where os_id = any(coalesce(v_os, '{}'));
  delete from public.os_relatorios where os_id = any(coalesce(v_os, '{}'));
  delete from public.os_cronograma where os_id = any(coalesce(v_os, '{}'));
  delete from public.os_produtos where os_id = any(coalesce(v_os, '{}'));
  delete from public.os_funcionarios where os_id = any(coalesce(v_os, '{}'));

  -- Ordens de serviço
  delete from public.ordens_servico where id = any(coalesce(v_os, '{}'));

  -- Documentos do cliente, incluindo o institucional (cliente_id nulo)
  delete from public.cliente_documentos where titulo like '[QA]%';

  -- Produtos e homologações
  delete from public.cliente_produtos_homologados
   where cliente_id = any(v_clientes)
      or produto_id in (select id from public.produtos where codigo like '[QA]%');
  delete from public.produtos where codigo like '[QA]%';

  -- Colaboradores
  delete from public.funcionario_documentos
   where funcionario_id in (select id from public.funcionarios where nome_completo like '[QA]%');
  delete from public.funcionarios where nome_completo like '[QA]%';

  -- Acesso ao Portal e, por fim, os clientes
  delete from public.cliente_portal_usuarios where cliente_id = any(v_clientes);
  delete from public.clientes where id = any(v_clientes);

  get diagnostics n = row_count;
  raise notice 'Massa de QA removida (% clientes).', n;
end $$;

-- Confere que não sobrou nada com o prefixo.
select 'clientes' as tabela, count(*) as restantes from public.clientes where nome like '[QA]%'
union all select 'produtos', count(*) from public.produtos where codigo like '[QA]%'
union all select 'funcionarios', count(*) from public.funcionarios where nome_completo like '[QA]%'
union all select 'cliente_documentos', count(*) from public.cliente_documentos where titulo like '[QA]%'
union all select 'os_relatorios', count(*) from public.os_relatorios where titulo like '[QA]%'
union all select 'os_anexos', count(*) from public.os_anexos where nome like '[QA]%';
