-- ============================================================================
-- Publicação do relatório técnico — Release 4, Fase 3 (PR 24)
-- ============================================================================
-- Do protótipo aprovado ("Publicar no portal do cliente"):
--   - publica sempre a última versão salva;
--   - pode publicar de novo ("Reemissão publicada no portal");
--   - somente OS executada ou concluída.
--
-- O PDF é gerado pela Edge Function `relatorio` (mesma montagem da tela) e
-- entra em `os_relatorios`, que é onde o Portal lista os relatórios e de onde
-- o gatilho do PR 9 avisa o cliente. Para o Portal mostrar só a versão
-- vigente, as publicações anteriores do relatório gerado deixam de ficar
-- publicadas — os PDFs enviados à mão (sem versão) não são tocados.
--
-- Este arquivo traz:
--   1. `os_relatorios.relatorio_versao`: de qual versão o PDF saiu (nulo =
--      PDF enviado à mão, como antes);
--   2. `registrar_publicacao_relatorio`: a contabilidade da publicação numa
--      transação só. Chamada só pela Edge Function (chave de serviço);
--   3. `listar_versoes_relatorio`: a aba Versões, com o nome de quem salvou;
--   4. leitura dos arquivos da OS pelo módulo Relatórios (galeria de fotos e
--      PDFs), que antes exigia o Operacional.
-- ============================================================================


alter table public.os_relatorios
  add column relatorio_versao integer check (relatorio_versao is null or relatorio_versao >= 1);

comment on column public.os_relatorios.relatorio_versao is
  'Versão do relatório técnico que gerou este PDF. Nulo = PDF enviado à mão.';


-- ----------------------------------------------------------------------------
-- 1. Publicação
-- ----------------------------------------------------------------------------

create or replace function public.registrar_publicacao_relatorio(
  _os_id uuid,
  _numero integer,
  _caminho text,
  _usuario uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rel  os_relatorios_tecnicos%rowtype;
  v_conteudo jsonb;
  v_status text;
  v_codigo text;
begin
  select * into v_rel from os_relatorios_tecnicos where os_id = _os_id for update;
  if not found then
    raise exception 'Relatório técnico não encontrado para esta OS.' using errcode = 'P0002';
  end if;
  select status, codigo into v_status, v_codigo from ordens_servico where id = _os_id;
  if v_status not in ('executada', 'concluida') then
    raise exception 'Somente OS executada ou concluída pode ser publicada' using errcode = '23514';
  end if;
  -- "Publica sempre a última versão salva."
  if _numero is distinct from v_rel.versao_atual then
    raise exception 'Só a última versão (v%) pode ser publicada.', v_rel.versao_atual using errcode = '40001';
  end if;
  select conteudo into v_conteudo from os_relatorio_versoes where os_id = _os_id and numero = _numero;
  if coalesce(btrim(v_conteudo ->> 'observacoes'), '') = '' or coalesce(btrim(v_conteudo ->> 'parecer'), '') = '' then
    raise exception 'Antes de publicar, salve uma versão com as observações técnicas e o parecer.' using errcode = '23514';
  end if;
  if _caminho is null or _caminho not like 'os/' || _os_id || '/relatorio/%' then
    raise exception 'Caminho do PDF inválido.' using errcode = '22023';
  end if;

  update os_relatorios set publicado = false
   where os_id = _os_id and relatorio_versao is not null and publicado;

  insert into os_relatorios (os_id, titulo, arquivo_url, publicado, publicado_at, created_by, relatorio_versao)
  values (_os_id, format('Relatório técnico · %s · v%s', v_codigo, _numero), _caminho, true, now(), _usuario, _numero);

  update os_relatorios_tecnicos
     set versao_publicada = _numero, publicado_em = now(), publicado_por = _usuario
   where os_id = _os_id;
end;
$$;

-- Só a Edge Function, com a chave de serviço.
revoke all on function public.registrar_publicacao_relatorio(uuid, integer, text, uuid) from public, anon, authenticated;
grant execute on function public.registrar_publicacao_relatorio(uuid, integer, text, uuid) to service_role;


-- ----------------------------------------------------------------------------
-- 2. Aba Versões
-- ----------------------------------------------------------------------------

create or replace function public.listar_versoes_relatorio(_os_id uuid)
returns table (
  numero integer,
  motivo text,
  autor text,
  created_at timestamptz,
  conteudo jsonb,
  notas_internas text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not has_module_perm('relatorios', 'ler') then
    raise exception 'Você não tem acesso aos relatórios técnicos.' using errcode = '42501';
  end if;
  return query
  select v.numero, v.motivo, coalesce(p.nome_completo, 'Sistema'), v.created_at, v.conteudo, v.notas_internas
    from os_relatorio_versoes v
    left join profiles p on p.id = v.created_by
   where v.os_id = _os_id
   order by v.numero desc;
end;
$$;

revoke all on function public.listar_versoes_relatorio(uuid) from public, anon;
grant execute on function public.listar_versoes_relatorio(uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- 3. Arquivos da OS para o módulo Relatórios
-- ----------------------------------------------------------------------------
-- A galeria do relatório mostra as fotos da execução, e o editor abre os PDFs
-- do relatório. Quem tem Relatórios e não tem Operacional ficava sem ver.

create policy opdocs_relatorios_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'operacional-docs'
    and public.storage_os_id(name) is not null
    and public.has_module_perm('relatorios', 'ler')
  );
