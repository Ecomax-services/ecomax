-- ============================================================================
-- Empresa, responsável técnico e certificado — Release 4, Fase 1, PR 6
-- ============================================================================
-- O certificado de execução aprovado no App (28/09) imprime:
--   - a empresa: razão social, CNPJ, endereço, contato, licenças (VISA, MAPA,
--     CRQ, IBAMA, ANVISA) e o telefone do CEATOX;
--   - o responsável técnico: nome, formação, registro no conselho e a
--     assinatura — a terceira das três;
--   - a validade, que depende do tipo de serviço;
--   - a validação pelo código da OS.
--
-- Nada disso existe no banco. O protótipo usa dados de exemplo (CNPJ
-- 18.742.905/0001-36, "Marina Alcântara"); os reais vêm daqui. Razão social e
-- CNPJ já são conhecidos e entram; o resto fica vazio até o cliente informar,
-- e a emissão do certificado (PR 18) recusa enquanto faltar.
--
-- [A DEFINIR — endereço, contato, licenças, CEATOX e responsável técnico
-- (nome, CRQ, assinatura)] O conteúdo do certificado deve ser validado pelo RT.
--
-- Também corrige o acesso do Portal ao arquivo do certificado, que hoje
-- simplesmente não funciona (seção 6).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Empresa — uma linha só
-- ----------------------------------------------------------------------------

create table public.empresa_config (
  id            boolean primary key default true check (id),
  razao_social  text not null,
  cnpj          text not null check (cnpj ~ '^[0-9]{14}$'),
  endereco      text,
  contato       text,
  ceatox        text,
  logo_path     text,
  updated_by    uuid references auth.users (id) on delete set null,
  updated_at    timestamptz not null default now()
);

comment on table public.empresa_config is
  'Dados da empresa impressos no certificado e no relatório. Linha única.';

create trigger set_updated_at before update on public.empresa_config
  for each row execute function public.set_updated_at();

insert into public.empresa_config (razao_social, cnpj)
values ('ECOMAX SERVICOS AMBIENTAIS LTDA', '04009610000107');

-- As licenças variam em quantidade e em nome entre empresas e ao longo do
-- tempo; uma coluna por licença envelheceria na primeira mudança.
create table public.empresa_licencas (
  id          uuid primary key default gen_random_uuid(),
  rotulo      text not null check (length(btrim(rotulo)) > 0),
  descricao   text not null check (length(btrim(descricao)) > 0),
  ordem       integer not null default 0,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.empresa_licencas is
  'Licenças e registros impressos no certificado (ex.: "IBAMA" · "CTF nº ...").';

create trigger set_updated_at before update on public.empresa_licencas
  for each row execute function public.set_updated_at();


-- ----------------------------------------------------------------------------
-- 2. Responsável técnico — troca é linha nova
-- ----------------------------------------------------------------------------
-- O certificado emitido em março tem de continuar dizendo quem era o RT em
-- março. Por isso o RT não se edita: registrar um novo encerra o anterior, e
-- o certificado aponta para a linha que valia quando foi emitido.

create table public.responsaveis_tecnicos (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null check (length(btrim(nome)) > 0),
  formacao         text,
  conselho         text not null check (length(btrim(conselho)) > 0),
  registro         text not null check (length(btrim(registro)) > 0),
  assinatura_path  text,
  vigente_desde    timestamptz not null default now(),
  vigente_ate      timestamptz,
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  check (vigente_ate is null or vigente_ate >= vigente_desde)
);

comment on table public.responsaveis_tecnicos is
  'Responsável técnico da empresa. Não se edita: um novo encerra o vigente.';

create unique index responsaveis_tecnicos_um_vigente
  on public.responsaveis_tecnicos ((true)) where vigente_ate is null;

-- Registrar um RT novo encerra o vigente, na mesma transação.
create or replace function public.responsavel_tecnico_encerra_anterior()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update responsaveis_tecnicos
     set vigente_ate = greatest(new.vigente_desde, vigente_desde)
   where vigente_ate is null and id <> new.id;
  return new;
end;
$$;

create trigger responsavel_tecnico_encerra_anterior
  before insert on public.responsaveis_tecnicos
  for each row execute function public.responsavel_tecnico_encerra_anterior();

-- O único campo que muda depois de criado é o encerramento. A assinatura
-- pode ser anexada uma vez, se o RT foi cadastrado antes de enviá-la.
create or replace function public.responsavel_tecnico_imutavel()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.nome is distinct from old.nome
     or new.formacao is distinct from old.formacao
     or new.conselho is distinct from old.conselho
     or new.registro is distinct from old.registro
     or new.vigente_desde is distinct from old.vigente_desde
     or (old.assinatura_path is not null and new.assinatura_path is distinct from old.assinatura_path) then
    raise exception 'O responsável técnico não se edita. Para trocar, registre um novo.' using errcode = '42501';
  end if;
  if old.vigente_ate is not null and new.vigente_ate is distinct from old.vigente_ate then
    raise exception 'Um responsável técnico encerrado não volta a valer.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger responsavel_tecnico_imutavel
  before update on public.responsaveis_tecnicos
  for each row execute function public.responsavel_tecnico_imutavel();

-- Apagar levaria junto a referência dos certificados emitidos. Só se apaga
-- RT que nunca assinou nada (a FK de os_certificados barra o resto).


-- ----------------------------------------------------------------------------
-- 3. Validade do certificado por tipo de serviço
-- ----------------------------------------------------------------------------
-- O protótipo usa 90 dias para Desratização e 180 para Sanitização. Os
-- outros tipos dele ("Dedetização", "Controle de pragas") não batem com os
-- nomes do catálogo.
--
-- [A DEFINIR — validade do certificado de Desinsetização e Descupinização, e
-- qual vale quando a OS tem mais de um tipo de serviço]

alter table public.catalogo_itens add column validade_certificado_dias integer
  check (validade_certificado_dias is null or validade_certificado_dias > 0);

comment on column public.catalogo_itens.validade_certificado_dias is
  'Só em tipos de serviço: dias de validade do certificado de execução.';

update public.catalogo_itens set validade_certificado_dias = 90
 where catalogo = 'tipos_servico' and nome = 'Desratização';
update public.catalogo_itens set validade_certificado_dias = 180
 where catalogo = 'tipos_servico' and nome = 'Sanitização';


-- ----------------------------------------------------------------------------
-- 4. Certificado emitido
-- ----------------------------------------------------------------------------
-- Um por OS. O `snapshot` guarda exatamente o que foi impresso — empresa,
-- licenças, RT, cliente, serviço, produtos — para o certificado continuar
-- igual mesmo que o cadastro mude depois. O hash do PDF permite provar que o
-- arquivo apresentado é o emitido.
--
-- Ninguém grava pela API: quem emite é a Edge Function (PR 18), com a chave
-- de serviço. Depois de emitido, só o PDF pode ser anexado, uma vez.

create table public.os_certificados (
  id                      uuid primary key default gen_random_uuid(),
  os_id                   uuid not null unique references public.ordens_servico (id) on delete restrict,
  -- O protótipo valida pelo código da OS; o número é ele.
  numero                  text not null,
  emitido_em              timestamptz not null default now(),
  validade                date not null,
  responsavel_tecnico_id  uuid not null references public.responsaveis_tecnicos (id),
  snapshot                jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  pdf_path                text,
  pdf_sha256              text check (pdf_sha256 is null or pdf_sha256 ~ '^[0-9a-f]{64}$'),
  emitido_por             uuid references auth.users (id) on delete set null,
  check ((pdf_path is null) = (pdf_sha256 is null))
);

comment on table public.os_certificados is
  'Certificado de execução emitido. Imutável; o PDF é anexado uma vez.';

create or replace function public.os_certificado_imutavel()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Certificado emitido não se apaga.' using errcode = '42501';
  end if;
  if new.os_id is distinct from old.os_id
     or new.numero is distinct from old.numero
     or new.emitido_em is distinct from old.emitido_em
     or new.validade is distinct from old.validade
     or new.responsavel_tecnico_id is distinct from old.responsavel_tecnico_id
     or new.snapshot is distinct from old.snapshot
     or new.emitido_por is distinct from old.emitido_por
     or (old.pdf_path is not null and (new.pdf_path is distinct from old.pdf_path
                                       or new.pdf_sha256 is distinct from old.pdf_sha256)) then
    raise exception 'Certificado emitido não se altera.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger os_certificado_imutavel
  before update or delete on public.os_certificados
  for each row execute function public.os_certificado_imutavel();


-- ----------------------------------------------------------------------------
-- 5. Bucket institucional
-- ----------------------------------------------------------------------------
-- Logo e assinatura do RT. Privado, mas legível por qualquer sessão
-- autenticada: os dois aparecem impressos em todo certificado que o cliente
-- recebe, e a prévia do certificado no App precisa deles.
-- Escrita só por quem edita Configurações.

insert into storage.buckets (id, name, public)
values ('institucional', 'institucional', false)
on conflict (id) do nothing;

create policy institucional_read on storage.objects
  for select to authenticated
  using (bucket_id = 'institucional');
create policy institucional_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'institucional' and public.has_module_perm('configuracoes', 'editar'));
-- Sem UPDATE nem DELETE: assinatura de RT é evidência; arquivo novo usa
-- caminho novo.


-- ----------------------------------------------------------------------------
-- 6. Portal: o cliente consegue abrir o certificado
-- ----------------------------------------------------------------------------
-- A regra antiga liberava ao cliente arquivos no caminho `relatorio` ou
-- `certificado`, e só se a OS tivesse relatório publicado. Dois defeitos:
--
--   - o Backoffice grava TODO anexo em `os/<id>/anexo/…`, inclusive o
--     certificado e o comprovante. O cliente via a linha na aba Certificado e
--     o arquivo dava acesso negado;
--   - certificado não depende de relatório. Ele sai na execução; o relatório
--     é montado depois, no escritório.
--
-- A regra nova libera pelo REGISTRO, não pelo caminho: o arquivo é do cliente
-- se um anexo de certificado ou comprovante da OS dele aponta para ele, ou se
-- é o PDF do certificado emitido. Foto e autorização continuam de fora, mesmo
-- no mesmo caminho.
--
-- O relatório continua exigindo publicação.

create or replace function public.storage_doc_liberado_ao_cliente(_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select storage_os_id(_name) is not null
     and os_is_my_cliente(storage_os_id(_name))
     and (
       exists (select 1 from os_anexos a
                where a.os_id = storage_os_id(_name) and a.arquivo_url = _name
                  and a.tipo in ('certificado', 'comprovante'))
       or exists (select 1 from os_certificados c
                   where c.os_id = storage_os_id(_name) and c.pdf_path = _name)
     );
$$;

revoke all on function public.storage_doc_liberado_ao_cliente(text) from public, anon;
grant execute on function public.storage_doc_liberado_ao_cliente(text) to authenticated;

drop policy if exists opdocs_cliente_read on storage.objects;
create policy opdocs_cliente_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'operacional-docs'
    and public.storage_os_id(name) is not null
    and public.storage_os_tipo(name) = 'relatorio'
    and public.os_is_my_cliente(public.storage_os_id(name))
    and public.os_relatorio_publicado(public.storage_os_id(name))
  );

create policy opdocs_cliente_certificado_read on storage.objects
  for select to authenticated
  using (bucket_id = 'operacional-docs' and public.storage_doc_liberado_ao_cliente(name));


-- ----------------------------------------------------------------------------
-- 7. RLS
-- ----------------------------------------------------------------------------
-- Empresa, licenças e RT: leitura para toda sessão autenticada — é o que sai
-- impresso no certificado de todo cliente. Escrita por quem edita
-- Configurações. O RT não tem UPDATE pela API além do que o trigger permite.

alter table public.empresa_config        enable row level security;
alter table public.empresa_licencas      enable row level security;
alter table public.responsaveis_tecnicos enable row level security;
alter table public.os_certificados       enable row level security;

create policy empresa_config_select on public.empresa_config
  for select to authenticated using (true);
create policy empresa_config_update on public.empresa_config
  for update to authenticated
  using (public.has_module_perm('configuracoes', 'editar'))
  with check (public.has_module_perm('configuracoes', 'editar'));

create policy empresa_licencas_select on public.empresa_licencas
  for select to authenticated using (true);
create policy empresa_licencas_write on public.empresa_licencas
  for all to authenticated
  using (public.has_module_perm('configuracoes', 'editar'))
  with check (public.has_module_perm('configuracoes', 'editar'));

create policy responsaveis_tecnicos_select on public.responsaveis_tecnicos
  for select to authenticated using (true);
create policy responsaveis_tecnicos_insert on public.responsaveis_tecnicos
  for insert to authenticated with check (public.has_module_perm('configuracoes', 'editar'));
create policy responsaveis_tecnicos_update on public.responsaveis_tecnicos
  for update to authenticated
  using (public.has_module_perm('configuracoes', 'editar'))
  with check (public.has_module_perm('configuracoes', 'editar'));

create policy os_certificados_select on public.os_certificados
  for select to authenticated
  using (public.has_module_perm('operacional', 'ler') or public.os_is_mine(os_id) or public.os_is_my_cliente(os_id));

revoke all on public.empresa_config, public.empresa_licencas, public.responsaveis_tecnicos, public.os_certificados
  from anon, authenticated;
grant select, update on public.empresa_config to authenticated;
grant select, insert, update, delete on public.empresa_licencas to authenticated;
grant select, insert, update on public.responsaveis_tecnicos to authenticated;
grant select on public.os_certificados to authenticated;
grant all on public.empresa_config, public.empresa_licencas, public.responsaveis_tecnicos, public.os_certificados
  to service_role;
