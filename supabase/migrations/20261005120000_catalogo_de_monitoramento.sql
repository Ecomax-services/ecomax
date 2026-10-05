-- ============================================================================
-- Catálogo de monitoramento — Release 4, Fase 1, PR 1
-- ============================================================================
-- Base do monitoramento ponto a ponto aprovado no protótipo do App Operador
-- ("Revisão tela de Monitoramento", fechado em 28/09). Só cria estrutura e
-- dados de referência: nenhuma tabela existente perde coluna nem muda de
-- comportamento, e nenhuma tela atual passa a ler isto ainda.
--
-- Três peças:
--
--   1. Os seis serviços como CÓDIGOS FIXOS. O App decide a tela pelo
--      comportamento (grade de status, contagem, ocorrência, aplicação) — isso
--      é código, não cadastro. Um serviço novo cadastrado pela tela não teria
--      tela nenhuma para abrir.
--
--   2. Legendas de status com código fixo e rótulo configurável. O comparativo
--      do relatório depende de "1 = isca consumida"; se o código pudesse mudar,
--      o histórico de um ponto passaria a significar outra coisa sem ninguém
--      notar. Rótulo e cor continuam editáveis na Planilha, como a Sarah
--      descreveu em 01/10 ("legendas vindas da Planilha por tipo de serviço").
--
--   3. As listas do App (espécies, outras pragas, pragas de ocorrência,
--      técnicas de aplicação, capturas não-alvo) em `catalogo_itens`.
--
-- O que NÃO entra aqui, por depender do cliente:
--   - [A DEFINIR — Globo de Moscas conta como Armadilha Luminosa?] sem mapeamento.
--   - [A DEFINIR — Caixa D'água tem monitoramento?] sem mapeamento.
--   - [A DEFINIR — para quais tipos de serviço vale a Desinsetização (DI)?]
--     sem mapeamento.
--   - [A DEFINIR — desativar as 5 legendas antigas de Desratização?] continuam
--     ativas. Nunca foram ligadas a ponto nenhum, mas apagá-las é decisão dele.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Serviços de monitoramento
-- ----------------------------------------------------------------------------
-- Nomes e siglas exatamente como no protótipo aprovado (MON_SERVICOS).

create table public.monitoramento_servicos (
  codigo        text primary key check (codigo in ('DI', 'PI', 'PA', 'AL', 'PG', 'OC')),
  nome          text not null,
  nome_longo    text not null,
  comportamento text not null check (comportamento in ('aplicacao', 'status', 'contagem', 'ocorrencia')),
  ordem         smallint not null
);

comment on table public.monitoramento_servicos is
  'Serviços de monitoramento com tela própria no App. Fixos: o comportamento está no código do App.';

insert into public.monitoramento_servicos (codigo, nome, nome_longo, comportamento, ordem) values
  ('DI', 'Desinsetização',       'Desinsetização · Registro de aplicação',       'aplicacao',  1),
  ('PI', 'Porta Iscas (PI)',     'Desratização · Porta Iscas (uso externo)',     'status',     2),
  ('PA', 'Placas Adesivas (PA)', 'Desratização · Placas Adesivas (uso interno)', 'status',     3),
  ('AL', 'Armadilhas Luminosas', 'Armadilhas Luminosas · Insetos Voadores',      'contagem',   4),
  ('PG', 'Pragas de Grãos',      'Armadilhas de Pragas de Grãos',                'contagem',   5),
  ('OC', 'Ocorrência Setorial',  'Registros de Ocorrência Setorial',             'ocorrencia', 6);

alter table public.monitoramento_servicos enable row level security;

-- Leitura para todo autenticado: o App do operador e o relatório do Portal
-- precisam do nome. Sem policy de escrita — nem admin altera pela API.
create policy monitoramento_servicos_select on public.monitoramento_servicos
  for select to authenticated using (true);

-- Grants explícitos: o banco recriado do zero não dá privilégio padrão a
-- tabela nova, e o projeto remoto dá mais do que deve. Os dois terminam iguais.
revoke all on public.monitoramento_servicos from anon, authenticated;
grant select on public.monitoramento_servicos to authenticated;
grant all on public.monitoramento_servicos to service_role;


-- ----------------------------------------------------------------------------
-- 2. Mapeamento: catálogo editável → código fixo
-- ----------------------------------------------------------------------------
-- O orçamento e a OS continuam gravando o tipo de controle por nome, como
-- hoje. É este mapa que diz ao App quais telas abrir para cada um. Um tipo
-- pode abrir mais de uma: Controle Roedores abre PI e PA.
--
-- A chave estrangeira composta prende o item ao catálogo certo no próprio
-- banco. Sem ela, nada impediria mapear uma unidade de medida para PI.

alter table public.catalogo_itens
  add constraint catalogo_itens_id_catalogo_key unique (id, catalogo);

create table public.monitoramento_mapeamento (
  catalogo_item_id uuid not null,
  catalogo         text not null check (catalogo in ('tipos_controle', 'tipos_servico')),
  servico_codigo   text not null references public.monitoramento_servicos (codigo),
  created_at       timestamptz not null default now(),
  primary key (catalogo_item_id, servico_codigo),
  foreign key (catalogo_item_id, catalogo)
    references public.catalogo_itens (id, catalogo) on delete cascade
);

comment on table public.monitoramento_mapeamento is
  'Quais serviços de monitoramento cada tipo de controle ou tipo de serviço abre no App.';

alter table public.monitoramento_mapeamento enable row level security;

create policy monitoramento_mapeamento_select on public.monitoramento_mapeamento
  for select to authenticated using (true);
create policy monitoramento_mapeamento_insert on public.monitoramento_mapeamento
  for insert to authenticated with check (public.has_module_perm('configuracoes', 'editar'));
create policy monitoramento_mapeamento_delete on public.monitoramento_mapeamento
  for delete to authenticated using (public.has_module_perm('configuracoes', 'editar'));

revoke all on public.monitoramento_mapeamento from anon, authenticated;
grant select, insert, delete on public.monitoramento_mapeamento to authenticated;
grant all on public.monitoramento_mapeamento to service_role;

-- Só os casos sem dúvida. Os outros estão no cabeçalho, aguardando o cliente.
insert into public.monitoramento_mapeamento (catalogo_item_id, catalogo, servico_codigo)
select c.id, c.catalogo, m.codigo
  from (values
    ('Controle Roedores',      'PI'),
    ('Controle Roedores',      'PA'),
    ('Armadilha Luminosa',     'AL'),
    ('Praga de Grãos',         'PG'),
    ('Monitoramento de Áreas', 'OC')
  ) as m (nome, codigo)
  join public.catalogo_itens c on c.catalogo = 'tipos_controle' and c.nome = m.nome
on conflict do nothing;


-- ----------------------------------------------------------------------------
-- 3. Legendas de status com código fixo
-- ----------------------------------------------------------------------------
-- Só PI e PA têm grade de status 1–4. As legendas continuam na Planilha da
-- Desratização, onde o cliente já as procura; `servico_codigo` separa as do
-- porta-isca das da placa.

alter table public.planilha_itens
  add column servico_codigo text references public.monitoramento_servicos (codigo),
  add column codigo smallint;

alter table public.planilha_itens
  add constraint planilha_itens_codigo_so_status check (servico_codigo is null or servico_codigo in ('PI', 'PA')),
  add constraint planilha_itens_codigo_faixa check (codigo is null or codigo between 1 and 4),
  add constraint planilha_itens_codigo_par check ((codigo is null) = (servico_codigo is null)),
  add constraint planilha_itens_servico_codigo_key unique (servico_codigo, codigo);

comment on column public.planilha_itens.codigo is
  'Código fixo do status (1–4). O significado não muda; rótulo e cor são editáveis.';

-- A guarda. O que a tela pode mudar numa legenda com código: rótulo, cor,
-- observação e ordem. O que não pode: o código, o serviço, a planilha de
-- origem, inativá-la ou apagá-la — qualquer uma dessas tira um status da
-- grade do App ou muda o sentido do histórico.
--
-- Legenda nova pela tela nasce sem código, como sempre nasceu. Código só se
-- atribui por migration, onde a decisão fica registrada.
create or replace function public.planilha_item_guarda_codigo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.codigo is not null and current_user = 'authenticated' then
      raise exception 'Legenda com código de status só é criada pelo sistema.' using errcode = '42501';
    end if;
    return new;
  end if;

  if old.codigo is null then
    if tg_op = 'UPDATE' and new.codigo is not null then
      raise exception 'Não é possível atribuir código de status a uma legenda existente.' using errcode = '42501';
    end if;
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    raise exception 'A legenda "%" é o status % do % e não pode ser excluída. Edite o rótulo, se precisar.',
      old.nome, old.codigo, old.servico_codigo using errcode = '23503';
  end if;

  if new.codigo is distinct from old.codigo
     or new.servico_codigo is distinct from old.servico_codigo
     or new.tipo_servico is distinct from old.tipo_servico then
    raise exception 'O código de status da legenda "%" é fixo.', old.nome using errcode = '42501';
  end if;

  if not new.ativo then
    raise exception 'A legenda "%" é o status % do % e não pode ser inativada.',
      old.nome, old.codigo, old.servico_codigo using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger planilha_item_guarda_codigo
  before insert or update or delete on public.planilha_itens
  for each row execute function public.planilha_item_guarda_codigo();

-- Rótulos e cores do protótipo aprovado (legenda 1–4 de PI e PA). O protótipo
-- tem também cor de borda; a Planilha guarda fundo e texto, e a borda sai
-- derivada do fundo, como nas demais legendas.
insert into public.planilha_itens (tipo_servico, servico_codigo, codigo, nome, cor_bg, cor_fg, ordem, ativo) values
  ('Desratização', 'PI', 1, 'Isca Consumida',                    '#fdf2e3', '#8a6410', 101, true),
  ('Desratização', 'PI', 2, 'Isca Mofada',                       '#fdeceb', '#a3341f', 102, true),
  ('Desratização', 'PI', 3, 'Isca Intacta',                      '#e7f6e7', '#1d6b25', 103, true),
  ('Desratização', 'PI', 4, 'Porta Isca Obstruído (sem acesso)', '#eef0f2', '#515761', 104, true),
  ('Desratização', 'PA', 1, 'Placa com ocorrência',              '#fdf2e3', '#8a6410', 201, true),
  ('Desratização', 'PA', 2, 'Placa Danificada (sem aderência)',  '#fdeceb', '#a3341f', 202, true),
  ('Desratização', 'PA', 3, 'Placa Intacta',                     '#e7f6e7', '#1d6b25', 203, true),
  ('Desratização', 'PA', 4, 'Placa Obstruída (sem acesso)',      '#eef0f2', '#515761', 204, true);


-- ----------------------------------------------------------------------------
-- 4. Listas do App
-- ----------------------------------------------------------------------------
-- Ficam fora da lista visível de Cadastros Auxiliares (`CATALOGOS` no
-- Backoffice): a tela segue a ordem aprovada no protótipo, e ele não traz
-- estes catálogos. Editar exige migration até o cliente pedir a tela.
--
-- "Outros" é item da lista, como no protótipo; o que o técnico escreve ao
-- escolhê-lo, e o campo livre de outras pragas na Armadilha Luminosa, são
-- texto digitado no App e ficam no registro do ponto, não aqui.

insert into public.catalogo_itens (catalogo, nome, ordem, ativo) values
  ('monitoramento_especies_al', 'Mosca Doméstica',  1, true),
  ('monitoramento_especies_al', 'Mosca Varejeira',  2, true),
  ('monitoramento_especies_al', 'Mosca Drosophila', 3, true),

  ('monitoramento_outras_pragas_al', 'Siriri (Cupim)',  1, true),
  ('monitoramento_outras_pragas_al', 'Marimbondo',      2, true),
  ('monitoramento_outras_pragas_al', 'Libélula',        3, true),
  ('monitoramento_outras_pragas_al', 'Vespa',           4, true),
  ('monitoramento_outras_pragas_al', 'Abelhas',         5, true),
  ('monitoramento_outras_pragas_al', 'Mariposas',       6, true),
  ('monitoramento_outras_pragas_al', 'Formigas Aladas', 7, true),

  ('monitoramento_pragas_pg', 'Bio Serrico (lasioderma serricone)', 1, true),
  ('monitoramento_pragas_pg', 'Gachon (ephestia)',                  2, true),

  ('monitoramento_pragas_oc', 'Barata',                       1, true),
  ('monitoramento_pragas_oc', 'Roedor',                       2, true),
  ('monitoramento_pragas_oc', 'Formiga',                      3, true),
  ('monitoramento_pragas_oc', 'Aranha',                       4, true),
  ('monitoramento_pragas_oc', 'Mosca',                        5, true),
  ('monitoramento_pragas_oc', 'Mosca de Umidade (Psychoda)',  6, true),
  ('monitoramento_pragas_oc', 'Mosca de Frutas',              7, true),
  ('monitoramento_pragas_oc', 'Mosquito',                     8, true),
  ('monitoramento_pragas_oc', 'Abelha',                       9, true),
  ('monitoramento_pragas_oc', 'Escorpião',                   10, true),
  ('monitoramento_pragas_oc', 'Borboleta/Traça',             11, true),
  ('monitoramento_pragas_oc', 'Besouro/Caruncho',            12, true),
  ('monitoramento_pragas_oc', 'Marimbondo/Vespa',            13, true),
  ('monitoramento_pragas_oc', 'Outros',                      14, true),

  ('monitoramento_tecnicas_di', 'Aplicação de Gel', 1, true),
  ('monitoramento_tecnicas_di', 'Pulverização',     2, true),
  ('monitoramento_tecnicas_di', 'Polvilhamento',    3, true),
  ('monitoramento_tecnicas_di', 'Termonebulização', 4, true),

  -- Captura Não-Alvo: preenchida pelo Backoffice no relatório (decisão de
  -- 17/09), não pelo App.
  ('monitoramento_capturas_nao_alvo', 'Aranha',    1, true),
  ('monitoramento_capturas_nao_alvo', 'Lagartixa', 2, true),
  ('monitoramento_capturas_nao_alvo', 'Grilo',     3, true),
  ('monitoramento_capturas_nao_alvo', 'Barata',    4, true),
  ('monitoramento_capturas_nao_alvo', 'Outros',    5, true)
on conflict (catalogo, nome) do nothing;
