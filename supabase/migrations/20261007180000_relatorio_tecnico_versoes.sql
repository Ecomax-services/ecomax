-- ============================================================================
-- Relatório técnico com versões — Release 4, Fase 3 (PR 21)
-- ============================================================================
-- No protótipo aprovado do Backoffice (Relatórios › Relatórios técnicos), o
-- relatório não é criado do zero: "ele nasce da execução da OS e é
-- complementado pelo técnico". Cada OS executada tem um relatório; a v1 nasce
-- da execução, e "toda edição salva gera automaticamente uma nova versão do
-- relatório: as anteriores ficam preservadas no histórico".
--
-- Hoje `os_relatorios` guarda PDFs enviados à mão (o Portal lista os
-- publicados). Ela continua igual, para esses documentos e para o PDF do
-- relatório técnico quando ele for publicado (PR 24). O relatório técnico em
-- si mora aqui:
--
--   os_relatorios_tecnicos   um por OS executada: versão atual e publicada;
--   os_relatorio_versoes     só INSERT. O conteúdo de cada versão fica
--                            congelado; as notas internas ficam numa coluna à
--                            parte, que o PDF e o Portal nunca leem.
--
-- O que a versão congela: observações técnicas, recomendações, parecer,
-- sugestões, o texto livre de cada bloco E a configuração dos blocos
-- (incluir/ocultar, frequência). No protótipo, incluir/ocultar e frequência
-- não entravam na versão. Aqui entram: senão o PDF de uma versão já publicada
-- mudaria ao mexer num interruptor, sem versão nova.
--   [A DEFINIR — confirmar com o cliente; o protótipo deixa em aberto.]
--
-- Quem lê e edita: o módulo Relatórios (Administrador e Gestor editam;
-- Almoxarifado lê). O técnico e o cliente não leem versões — o cliente recebe
-- o PDF publicado.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Tabelas
-- ----------------------------------------------------------------------------

create table public.os_relatorios_tecnicos (
  os_id             uuid primary key references public.ordens_servico (id) on delete restrict,
  versao_atual      integer not null default 1 check (versao_atual >= 1),
  -- null = rascunho (nunca publicado). Publicar é o PR 24.
  versao_publicada  integer check (versao_publicada is null or versao_publicada between 1 and versao_atual),
  publicado_em      timestamptz,
  publicado_por     uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  check ((versao_publicada is null) = (publicado_em is null))
);

comment on table public.os_relatorios_tecnicos is
  'Relatório técnico de uma OS executada. Nasce com a execução (v1); cada edição salva vira uma versão nova.';

create table public.os_relatorio_versoes (
  id              uuid primary key default gen_random_uuid(),
  os_id           uuid not null references public.os_relatorios_tecnicos (os_id) on delete restrict,
  numero          integer not null check (numero >= 1),
  -- { observacoes, recomendacoes, parecer, sugestoes,
  --   blocos: { <bloco>: texto }, visibilidade: { <bloco>: bool },
  --   frequencias: { <bloco>: 'semanal' | 'quinzenal' | 'mensal' } }
  conteudo        jsonb not null check (jsonb_typeof(conteudo) = 'object'),
  -- Uso interno: não entra na pré-visualização, no PDF nem no Portal.
  notas_internas  text,
  motivo          text not null,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (os_id, numero)
);

comment on table public.os_relatorio_versoes is
  'Versões do relatório técnico. Só INSERT: versão salva não muda nem some.';
comment on column public.os_relatorio_versoes.notas_internas is
  'Notas da equipe. Nunca vão para o PDF nem para o Portal do cliente.';

create index os_relatorio_versoes_os_idx on public.os_relatorio_versoes (os_id, numero desc);


-- Versão salva não muda nem some.
create or replace function public.os_relatorio_versao_imutavel()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Versão salva do relatório não se altera nem se apaga.' using errcode = '42501';
end;
$$;

create trigger os_relatorio_versao_imutavel
  before update or delete on public.os_relatorio_versoes
  for each row execute function public.os_relatorio_versao_imutavel();


-- ----------------------------------------------------------------------------
-- 2. A v1 nasce da execução
-- ----------------------------------------------------------------------------
-- Quando a OS fica executada (pelo App ou pelo Backoffice) ou concluída, o
-- relatório e a v1 são criados. A v1 é do técnico que executou, como no
-- protótipo ("Criado a partir da execução da OS"), com os textos vazios: quem
-- complementa é o escritório, gerando a v2.

create or replace function public.os_cria_relatorio_tecnico()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_autor uuid;
begin
  if new.status not in ('executada', 'concluida') or coalesce(new.rascunho, false) then
    return new;
  end if;
  if exists (select 1 from os_relatorios_tecnicos where os_id = new.id) then
    return new;
  end if;

  select f.profile_id into v_autor from funcionarios f where f.id = new.tecnico_executor_id;

  insert into os_relatorios_tecnicos (os_id) values (new.id);
  insert into os_relatorio_versoes (os_id, numero, conteudo, motivo, created_by)
  values (new.id, 1, '{}'::jsonb, 'Criado a partir da execução da OS', coalesce(v_autor, auth.uid()));
  return new;
end;
$$;

create trigger os_cria_relatorio_tecnico
  after insert or update of status on public.ordens_servico
  for each row execute function public.os_cria_relatorio_tecnico();


-- ----------------------------------------------------------------------------
-- 3. Salvar = nova versão
-- ----------------------------------------------------------------------------
-- Única porta de escrita. Regras do protótipo:
--   - "As observações técnicas são obrigatórias no relatório."
--   - "Informe o parecer técnico antes de gerar a nova versão."
--   - motivo da versão: "Edição de campos complementares".
-- E uma que o protótipo não tem e o sistema precisa, por ter mais de uma
-- pessoa no escritório: quem salva diz sobre qual versão editou. Se outra
-- pessoa salvou no meio, recusa em vez de sobrescrever o trabalho dela.

create or replace function public.salvar_versao_relatorio(
  _os_id uuid,
  _conteudo jsonb,
  _notas_internas text,
  _versao_base integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_atual integer;
  v_chave text;
  v_freq text;
begin
  if not has_module_perm('relatorios', 'editar') then
    raise exception 'Você não tem permissão para editar relatórios técnicos.' using errcode = '42501';
  end if;

  select versao_atual into v_atual from os_relatorios_tecnicos where os_id = _os_id for update;
  if not found then
    raise exception 'Relatório técnico não encontrado para esta OS.' using errcode = 'P0002';
  end if;
  if _versao_base is distinct from v_atual then
    raise exception 'Outra pessoa salvou a v% depois que você abriu o relatório. Reabra para ver as mudanças.', v_atual
      using errcode = '40001';
  end if;

  if _conteudo is null or jsonb_typeof(_conteudo) <> 'object' then
    raise exception 'Conteúdo do relatório inválido.' using errcode = '22023';
  end if;
  for v_chave in select jsonb_object_keys(_conteudo) loop
    if v_chave not in ('observacoes', 'recomendacoes', 'parecer', 'sugestoes', 'blocos', 'visibilidade', 'frequencias') then
      raise exception 'Campo desconhecido no relatório: %.', v_chave using errcode = '22023';
    end if;
  end loop;
  if coalesce(btrim(_conteudo ->> 'observacoes'), '') = '' then
    raise exception 'As observações técnicas são obrigatórias no relatório.' using errcode = '23514';
  end if;
  if coalesce(btrim(_conteudo ->> 'parecer'), '') = '' then
    raise exception 'Informe o parecer técnico antes de gerar a nova versão.' using errcode = '23514';
  end if;
  if (_conteudo ? 'blocos' and jsonb_typeof(_conteudo -> 'blocos') <> 'object')
     or (_conteudo ? 'visibilidade' and jsonb_typeof(_conteudo -> 'visibilidade') <> 'object')
     or (_conteudo ? 'frequencias' and jsonb_typeof(_conteudo -> 'frequencias') <> 'object') then
    raise exception 'Configuração dos blocos inválida.' using errcode = '22023';
  end if;
  for v_freq in select value #>> '{}' from jsonb_each(coalesce(_conteudo -> 'frequencias', '{}'::jsonb)) loop
    if v_freq is null or v_freq not in ('semanal', 'quinzenal', 'mensal') then
      raise exception 'Frequência inválida: use semanal, quinzenal ou mensal.' using errcode = '22023';
    end if;
  end loop;

  insert into os_relatorio_versoes (os_id, numero, conteudo, notas_internas, motivo, created_by)
  values (_os_id, v_atual + 1, _conteudo, nullif(btrim(_notas_internas), ''), 'Edição de campos complementares', auth.uid());
  update os_relatorios_tecnicos set versao_atual = v_atual + 1 where os_id = _os_id;
  return v_atual + 1;
end;
$$;

revoke all on function public.salvar_versao_relatorio(uuid, jsonb, text, integer) from public, anon;
grant execute on function public.salvar_versao_relatorio(uuid, jsonb, text, integer) to authenticated;


-- ----------------------------------------------------------------------------
-- 4. RLS e grants
-- ----------------------------------------------------------------------------
-- Leitura pelo módulo Relatórios. Escrita só pela função e pelo gatilho: não há
-- policy de INSERT/UPDATE/DELETE.

alter table public.os_relatorios_tecnicos enable row level security;
alter table public.os_relatorio_versoes enable row level security;

create policy os_relatorios_tecnicos_select on public.os_relatorios_tecnicos
  for select to authenticated using (public.has_module_perm('relatorios', 'ler'));
create policy os_relatorio_versoes_select on public.os_relatorio_versoes
  for select to authenticated using (public.has_module_perm('relatorios', 'ler'));

grant select on public.os_relatorios_tecnicos, public.os_relatorio_versoes to authenticated;
grant all on public.os_relatorios_tecnicos, public.os_relatorio_versoes to service_role;


-- ----------------------------------------------------------------------------
-- 5. OS já executadas antes desta migration
-- ----------------------------------------------------------------------------
-- Ganham relatório e v1, como se o gatilho já existisse.

insert into public.os_relatorios_tecnicos (os_id)
select o.id from public.ordens_servico o
 where o.status in ('executada', 'concluida') and not coalesce(o.rascunho, false)
   and not exists (select 1 from public.os_relatorios_tecnicos r where r.os_id = o.id);

insert into public.os_relatorio_versoes (os_id, numero, conteudo, motivo, created_by)
select r.os_id, 1, '{}'::jsonb, 'Criado a partir da execução da OS', f.profile_id
  from public.os_relatorios_tecnicos r
  join public.ordens_servico o on o.id = r.os_id
  left join public.funcionarios f on f.id = o.tecnico_executor_id
 where not exists (select 1 from public.os_relatorio_versoes v where v.os_id = r.os_id);
