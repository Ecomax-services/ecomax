-- ============================================================================
-- Cadastros Auxiliares conforme o protótipo aprovado
-- ============================================================================
-- Três mudanças, todas nascidas da mesma comparação: o protótipo desenha a tela
-- de um jeito e a implementação entregou outro.
--
--   1. Status de OS e Etapas da OS deixam de ser conjunto fechado por check
--      constraint. Passam a ser validados contra o próprio catálogo — que é a
--      premissa da tela: "Cadastros Auxiliares é a fonte da verdade".
--   2. Entram os dois catálogos especiais do protótipo, que não existiam:
--      planilha de execução por tipo de serviço e produtos padrão por tipo.
--   3. Entram os dois catálogos genéricos que faltavam: Tipos de produto e
--      Categorias de relatório.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. O catálogo passa a mandar em status e etapa da OS
-- ----------------------------------------------------------------------------
-- A check constraint listava os nove status em texto. Enquanto ela existisse,
-- criar um status pela tela produzia um item que nenhuma OS podia usar — o
-- botão "Novo item" ficava escondido justamente por isso.
--
-- CHECK não aceita subconsulta, então a validação vira trigger. O efeito é o
-- mesmo de antes para os nove valores existentes: continua impossível gravar
-- status que não esteja cadastrado. O que muda é quem define a lista.

alter table public.ordens_servico drop constraint if exists ordens_servico_status_check;
alter table public.ordens_servico drop constraint if exists ordens_servico_etapa_check;

-- `valor` é o slug que a OS guarda ('em_aberto'); `nome` é o rótulo que a tela
-- mostra ('Em aberto'). Etapas nunca tiveram slug — gravam o nome direto —,
-- então o valor delas passa a ser o próprio nome, e aí as duas validações usam
-- a mesma regra.
update public.catalogo_itens
   set valor = nome
 where catalogo = 'etapas_os' and valor is null;

create unique index if not exists catalogo_itens_catalogo_valor_uidx
  on public.catalogo_itens (catalogo, valor)
  where valor is not null;

create or replace function public.os_status_do_catalogo()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- Só valida o que mudou: um update que não toca em status não precisa pagar
  -- duas consultas ao catálogo.
  if (tg_op = 'INSERT' or new.status is distinct from old.status) then
    if not exists (
      select 1 from public.catalogo_itens
       where catalogo = 'status_os' and valor = new.status and ativo
    ) then
      raise exception 'Status "%" não existe no catálogo Status de OS, ou está inativo.', new.status
        using errcode = '23514';
    end if;
  end if;

  if new.etapa is not null and (tg_op = 'INSERT' or new.etapa is distinct from old.etapa) then
    if not exists (
      select 1 from public.catalogo_itens
       where catalogo = 'etapas_os' and valor = new.etapa and ativo
    ) then
      raise exception 'Etapa "%" não existe no catálogo Etapas da OS, ou está inativa.', new.etapa
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.os_status_do_catalogo() from public, anon, authenticated;

drop trigger if exists os_status_do_catalogo on public.ordens_servico;
create trigger os_status_do_catalogo
  before insert or update on public.ordens_servico
  for each row execute function public.os_status_do_catalogo();

-- Um status em uso não pode ser apagado nem inativado: a OS que o carrega
-- ficaria com um valor que a própria validação recusa no próximo update.
create or replace function public.status_os_em_uso_nao_sai()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_valor text := coalesce(old.valor, old.nome);
  v_qtd   int;
begin
  if old.catalogo not in ('status_os', 'etapas_os') then
    return coalesce(new, old);
  end if;
  -- Inativar também conta: a validação exige `ativo`.
  if tg_op = 'UPDATE' and new.ativo and new.valor is not distinct from old.valor then
    return new;
  end if;

  if old.catalogo = 'status_os' then
    select count(*) into v_qtd from public.ordens_servico where status = v_valor;
  else
    select count(*) into v_qtd from public.ordens_servico where etapa = v_valor;
  end if;

  if v_qtd > 0 then
    raise exception '% está em uso por % ordem(ns) de serviço e não pode ser removido nem inativado.',
      old.nome, v_qtd using errcode = '23503';
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.status_os_em_uso_nao_sai() from public, anon, authenticated;

drop trigger if exists status_os_em_uso_nao_sai on public.catalogo_itens;
create trigger status_os_em_uso_nao_sai
  before update or delete on public.catalogo_itens
  for each row execute function public.status_os_em_uso_nao_sai();

-- ----------------------------------------------------------------------------
-- 2. Planilha de execução por tipo de serviço
-- ----------------------------------------------------------------------------
-- É o primeiro item da coluna no protótipo. Cada tipo de serviço tem a própria
-- lista de status/legendas, usada ao preencher os pontos durante a execução —
-- "Sem consumo", "Consumo parcial", "Placa saturada". Não é o mesmo conjunto
-- para todos: o que faz sentido em controle de roedores não faz em sanitização.
create table if not exists public.planilha_itens (
  id            uuid primary key default gen_random_uuid(),
  tipo_servico  text not null,
  nome          text not null,
  cor_bg        text,
  cor_fg        text,
  observacao    text,
  ordem         integer not null default 0,
  ativo         boolean not null default true,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tipo_servico, nome)
);
create index if not exists planilha_itens_tipo_idx on public.planilha_itens (tipo_servico, ordem);

drop trigger if exists set_updated_at on public.planilha_itens;
create trigger set_updated_at before update on public.planilha_itens
  for each row execute function public.set_updated_at();

alter table public.planilha_itens enable row level security;

-- Mesma divisão de catalogo_itens: leitura para qualquer autenticado (o app do
-- operador precisa das legendas para preencher ponto), escrita só para quem tem
-- Configurações.
drop policy if exists planilha_itens_select on public.planilha_itens;
create policy planilha_itens_select on public.planilha_itens
  for select to authenticated using (true);
drop policy if exists planilha_itens_insert on public.planilha_itens;
create policy planilha_itens_insert on public.planilha_itens
  for insert to authenticated with check (public.has_module_perm('configuracoes', 'criar'));
drop policy if exists planilha_itens_update on public.planilha_itens;
create policy planilha_itens_update on public.planilha_itens
  for update to authenticated
  using (public.has_module_perm('configuracoes', 'editar'))
  with check (public.has_module_perm('configuracoes', 'editar'));
drop policy if exists planilha_itens_delete on public.planilha_itens;
create policy planilha_itens_delete on public.planilha_itens
  for delete to authenticated using (public.has_module_perm('configuracoes', 'excluir'));

-- ----------------------------------------------------------------------------
-- 3. Produtos padrão por tipo de serviço
-- ----------------------------------------------------------------------------
-- Segundo item da coluna. Produtos do almoxarifado que já vêm previstos ao criar
-- uma OS daquele tipo, com quantidade padrão. A homologação por cliente
-- (cliente_produtos_homologados) continua valendo por cima disso.
create table if not exists public.tipo_servico_produtos (
  id            uuid primary key default gen_random_uuid(),
  tipo_servico  text not null,
  produto_id    uuid not null references public.produtos (id) on delete cascade,
  qtd_padrao    numeric not null default 1 check (qtd_padrao > 0),
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tipo_servico, produto_id)
);
create index if not exists tipo_servico_produtos_tipo_idx on public.tipo_servico_produtos (tipo_servico);

drop trigger if exists set_updated_at on public.tipo_servico_produtos;
create trigger set_updated_at before update on public.tipo_servico_produtos
  for each row execute function public.set_updated_at();

alter table public.tipo_servico_produtos enable row level security;

drop policy if exists tipo_servico_produtos_select on public.tipo_servico_produtos;
create policy tipo_servico_produtos_select on public.tipo_servico_produtos
  for select to authenticated using (true);
drop policy if exists tipo_servico_produtos_insert on public.tipo_servico_produtos;
create policy tipo_servico_produtos_insert on public.tipo_servico_produtos
  for insert to authenticated with check (public.has_module_perm('configuracoes', 'criar'));
drop policy if exists tipo_servico_produtos_update on public.tipo_servico_produtos;
create policy tipo_servico_produtos_update on public.tipo_servico_produtos
  for update to authenticated
  using (public.has_module_perm('configuracoes', 'editar'))
  with check (public.has_module_perm('configuracoes', 'editar'));
drop policy if exists tipo_servico_produtos_delete on public.tipo_servico_produtos;
create policy tipo_servico_produtos_delete on public.tipo_servico_produtos
  for delete to authenticated using (public.has_module_perm('configuracoes', 'excluir'));
