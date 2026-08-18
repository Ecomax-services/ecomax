-- Acesso do Portal do Cliente aos três módulos novos.
--
-- O ponto que decide tudo aqui: `produtos` e `funcionarios` só tinham policy
-- por `has_module_perm`, e o perfil Cliente não tem linha para nenhum módulo.
-- Sem o que está abaixo, as telas de Produtos e Colaboradores retornariam zero
-- linhas mesmo construídas — e pareceriam bug de interface.
--
-- O critério do portal nunca é permissão de módulo, é vínculo: "isto é do meu
-- cliente". As funções abaixo tornam esse vínculo explícito e reutilizável.

-- ---------------------------------------------------------------------------
-- Funções de escopo
-- ---------------------------------------------------------------------------

-- Colaborador que atende o cliente = escalado em alguma OS dele.
-- É o recorte certo: o cliente tem interesse legítimo na documentação de quem
-- entra no local dele, e nenhum na do resto da equipe.
create or replace function public.funcionario_in_my_os(_funcionario_id uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1
    from public.os_funcionarios osf
    join public.ordens_servico o on o.id = osf.os_id
    where osf.funcionario_id = _funcionario_id
      and o.cliente_id in (select public.my_portal_cliente_ids())
  );
$$;

-- Produto que o cliente pode consultar: homologado para ele OU efetivamente
-- aplicado numa OS dele. O segundo caso não é detalhe — a ficha de emergência
-- e a FDS existem justamente para o que foi usado no local.
create or replace function public.produto_do_meu_cliente(_produto_id uuid)
returns boolean
language sql stable security definer set search_path to 'public'
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
  );
$$;

revoke execute on function public.funcionario_in_my_os(uuid) from anon;
revoke execute on function public.produto_do_meu_cliente(uuid) from anon;

-- ---------------------------------------------------------------------------
-- cliente_documentos
-- ---------------------------------------------------------------------------
alter table public.cliente_documentos enable row level security;

-- Quem opera o Backoffice administra, pelo módulo de clientes.
create policy cliente_docs_admin_all on public.cliente_documentos
  for all to authenticated
  using (public.has_module_perm('gestao_clientes', 'ler'))
  with check (public.has_module_perm('gestao_clientes', 'editar'));

-- O cliente lê o que é dele e o que é institucional (cliente_id nulo).
-- Só ativo: desativar um documento tem de tirá-lo do portal na hora, sem
-- depender de apagar o arquivo.
create policy cliente_docs_portal_select on public.cliente_documentos
  for select to authenticated
  using (
    ativo = true
    and (cliente_id is null or cliente_id in (select public.my_portal_cliente_ids()))
  );

-- ---------------------------------------------------------------------------
-- funcionario_documentos
-- ---------------------------------------------------------------------------
alter table public.funcionario_documentos enable row level security;

create policy func_docs_admin_all on public.funcionario_documentos
  for all to authenticated
  using (public.has_module_perm('gestao_usuarios', 'ler'))
  with check (public.has_module_perm('gestao_usuarios', 'editar'));

-- A própria pessoa vê os próprios documentos (é o que a tela Perfil do app do
-- operador mostra).
create policy func_docs_self_select on public.funcionario_documentos
  for select to authenticated
  using (exists (
    select 1 from public.funcionarios f
    where f.id = funcionario_id and f.profile_id = auth.uid()
  ));

create policy func_docs_portal_select on public.funcionario_documentos
  for select to authenticated
  using (public.funcionario_in_my_os(funcionario_id));

-- ---------------------------------------------------------------------------
-- Leitura pelo portal do que já existia
-- ---------------------------------------------------------------------------

-- Sem isto a tela Colaboradores mostra a matriz de documentos e nenhum nome.
create policy funcionarios_portal_select on public.funcionarios
  for select to authenticated
  using (public.funcionario_in_my_os(id));

create policy produtos_portal_select on public.produtos
  for select to authenticated
  using (public.produto_do_meu_cliente(id));

-- Para o rótulo "Disponível / Indisponível", que sai da validade da homologação.
alter table public.cliente_produtos_homologados enable row level security;
create policy cph_portal_select on public.cliente_produtos_homologados
  for select to authenticated
  using (cliente_id in (select public.my_portal_cliente_ids()));

-- ---------------------------------------------------------------------------
-- Storage: bucket portal-docs
-- ---------------------------------------------------------------------------
-- Caminho: <escopo>/<id>/<tipo>/<ts>-<slug>.<ext>, escopo ∈ documento|produto|funcionario.
--
-- No escopo `documento` o id é o da linha em cliente_documentos, e não o do
-- cliente. Isso é o que faz o documento institucional funcionar: ele não tem
-- cliente, então não haveria id de cliente para pôr no caminho. Chavear pelo
-- próprio documento resolve os dois casos com uma regra só.
-- Mesma ideia de operacional-docs: o caminho carrega o escopo, e a policy só faz
-- o cast depois de a regex casar — erro dentro de policy vira 500, não 403.

create or replace function public.portal_doc_escopo(_name text)
returns text language sql immutable set search_path to ''
as $$
  select case when _name ~ '^(documento|produto|funcionario)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
              then split_part(_name, '/', 1) end;
$$;

create or replace function public.portal_doc_id(_name text)
returns uuid language sql immutable set search_path to ''
as $$
  select case when _name ~ '^(documento|produto|funcionario)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
              then split_part(_name, '/', 2)::uuid end;
$$;

revoke execute on function public.portal_doc_escopo(text) from anon;
revoke execute on function public.portal_doc_id(text) from anon;

-- Escrita: quem administra pelo Backoffice.
drop policy if exists portaldocs_admin_write on storage.objects;
create policy portaldocs_admin_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'portal-docs'
    and (public.has_module_perm('gestao_clientes', 'editar')
         or public.has_module_perm('gestao_usuarios', 'editar')
         or public.has_module_perm('estoque', 'editar'))
  );

drop policy if exists portaldocs_admin_read on storage.objects;
create policy portaldocs_admin_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'portal-docs'
    and (public.has_module_perm('gestao_clientes', 'ler')
         or public.has_module_perm('gestao_usuarios', 'ler')
         or public.has_module_perm('estoque', 'ler'))
  );

-- Leitura pelo portal, com o mesmo escopo das tabelas.
drop policy if exists portaldocs_cliente_read on storage.objects;
create policy portaldocs_cliente_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'portal-docs'
    and public.portal_doc_escopo(name) is not null
    and case public.portal_doc_escopo(name)
      -- Delega à própria linha: ela já resolve ativo, institucional e do-meu-cliente.
      when 'documento' then exists (
        select 1 from public.cliente_documentos d
        where d.id = public.portal_doc_id(name)
          and d.ativo = true
          and (d.cliente_id is null or d.cliente_id in (select public.my_portal_cliente_ids()))
      )
      when 'produto' then public.produto_do_meu_cliente(public.portal_doc_id(name))
      when 'funcionario' then public.funcionario_in_my_os(public.portal_doc_id(name))
      else false
    end
  );
