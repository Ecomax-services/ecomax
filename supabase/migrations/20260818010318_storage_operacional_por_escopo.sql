-- Storage do Operacional: acesso por escopo, não por permissão de módulo.
--
-- As 4 policies originais do bucket `operacional-docs` são gated por
-- `has_module_perm('operacional', …)`. Isso funciona para o backoffice e falha
-- justamente para os dois papéis que mais usam o bucket:
--
--   • operador — `profiles.perfil_acesso_id` é NULL, então `has_module_perm`
--     retorna false para qualquer ação. Assinatura e fotos tomariam 403.
--   • cliente  — o perfil `Cliente` não tem linha para o módulo `operacional`,
--     então o portal não conseguiria nem gerar signed URL do relatório.
--
-- O acesso desses dois papéis não é "tem permissão no módulo", é "esta OS é
-- minha". As policies abaixo usam os helpers de escopo que já existem
-- (`os_is_mine`, `os_is_my_cliente`) e convivem com as originais — no Postgres,
-- policies permissivas do mesmo comando são OR.
--
-- Bucket com 0 objetos hoje, então este é o momento de fixar a convenção de
-- caminho sem migrar nada:
--
--     os/<os_id>/<tipo>/<timestamp>-<slug>.<ext>
--
-- <tipo> ∈ assinatura | foto | anexo | relatorio | certificado | mapa

-- ---------------------------------------------------------------------------
-- Leitura do caminho
-- ---------------------------------------------------------------------------

-- Extrai o os_id do caminho. Devolve NULL (em vez de estourar) quando o nome
-- não segue a convenção — daí a guarda de regex antes do cast: um objeto com
-- caminho arbitrário faria `::uuid` levantar exceção dentro da policy, e erro
-- em policy vira 500, não 403.
create or replace function public.storage_os_id(_name text)
returns uuid
language sql
immutable
set search_path to ''
as $$
  select case
    when _name ~ '^os/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
    then substring(_name from 4 for 36)::uuid
  end;
$$;

create or replace function public.storage_os_tipo(_name text)
returns text
language sql
immutable
set search_path to ''
as $$
  select nullif(split_part(_name, '/', 3), '');
$$;

-- O cliente só enxerga documento de OS cujo relatório já foi publicado.
-- Rascunho é interno — a mesma regra que `osrel_cliente_select` aplica à tabela.
create or replace function public.os_relatorio_publicado(_os_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.os_relatorios r
    where r.os_id = _os_id and r.publicado = true
  );
$$;

revoke execute on function public.storage_os_id(text) from anon;
revoke execute on function public.storage_os_tipo(text) from anon;
revoke execute on function public.os_relatorio_publicado(uuid) from anon;

-- ---------------------------------------------------------------------------
-- Operador: só as OS em que ele está escalado
-- ---------------------------------------------------------------------------

drop policy if exists opdocs_operador_read on storage.objects;
create policy opdocs_operador_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'operacional-docs'
    and public.storage_os_id(name) is not null
    and public.os_is_mine(public.storage_os_id(name))
  );

-- Só os tipos que o app de campo produz. Sem 'relatorio' e 'certificado': esses
-- são documentos de registro, emitidos pelo backoffice.
drop policy if exists opdocs_operador_insert on storage.objects;
create policy opdocs_operador_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'operacional-docs'
    and public.storage_os_id(name) is not null
    and public.os_is_mine(public.storage_os_id(name))
    and public.storage_os_tipo(name) in ('assinatura', 'foto', 'anexo')
  );

-- De propósito não há UPDATE nem DELETE para o operador: assinatura e foto são
-- evidência de execução. Reenvio usa caminho novo (o timestamp da convenção
-- garante isso) e a correção fica no histórico.

-- ---------------------------------------------------------------------------
-- Portal do Cliente: leitura, só do que é dele e só do que foi publicado
-- ---------------------------------------------------------------------------

drop policy if exists opdocs_cliente_read on storage.objects;
create policy opdocs_cliente_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'operacional-docs'
    and public.storage_os_id(name) is not null
    and public.storage_os_tipo(name) in ('relatorio', 'certificado')
    and public.os_is_my_cliente(public.storage_os_id(name))
    and public.os_relatorio_publicado(public.storage_os_id(name))
  );
