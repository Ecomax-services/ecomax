-- Perfis de acesso padrão e a matriz de permissões por módulo.
-- Reconstruída a partir do banco (ver auth_core_schema). Idempotente.

insert into public.perfis_acesso (nome, descricao) values
  ('Administrador', 'Acesso total ao sistema'),
  ('Gestor',        'Gerencia equipes e operações'),
  ('Operacional',   'Execução de serviços em campo'),
  ('Almoxarifado',  'Gestão de estoque e produtos'),
  ('Cliente',       'Acesso ao Portal do Cliente')
on conflict (nome) do nothing;

-- Matriz (ler, criar, editar, excluir) por perfil × módulo.
-- O perfil Cliente não recebe linhas: o acesso dele é ao portal, governado por
-- has_app_access e pelas policies de escopo, não pela matriz do backoffice.
with p as (select nome, id from public.perfis_acesso),
matriz(perfil, modulo, l, c, e, x) as (values
  -- Administrador: total em tudo
  ('Administrador','dashboard',       true,  true,  true,  true),
  ('Administrador','gestao_clientes', true,  true,  true,  true),
  ('Administrador','operacional',     true,  true,  true,  true),
  ('Administrador','comercial',       true,  true,  true,  true),
  ('Administrador','estoque',         true,  true,  true,  true),
  ('Administrador','relatorios',      true,  true,  true,  true),
  ('Administrador','financeiro',      true,  true,  true,  true),
  ('Administrador','gestao_usuarios', true,  true,  true,  true),
  ('Administrador','configuracoes',   true,  true,  true,  true),
  -- Gestor
  ('Gestor','dashboard',       true,  false, false, false),
  ('Gestor','gestao_clientes', true,  true,  true,  true),
  ('Gestor','operacional',     true,  true,  true,  true),
  ('Gestor','comercial',       true,  true,  true,  true),
  ('Gestor','estoque',         true,  false, false, false),
  ('Gestor','relatorios',      true,  true,  true,  true),
  ('Gestor','financeiro',      true,  false, false, false),
  ('Gestor','gestao_usuarios', true,  false, false, false),
  ('Gestor','configuracoes',   false, false, false, false),
  -- Operacional
  ('Operacional','dashboard',       false, false, false, false),
  ('Operacional','gestao_clientes', true,  false, false, false),
  ('Operacional','operacional',     true,  true,  true,  true),
  ('Operacional','comercial',       false, false, false, false),
  ('Operacional','estoque',         true,  false, false, false),
  ('Operacional','relatorios',      false, false, false, false),
  ('Operacional','financeiro',      false, false, false, false),
  ('Operacional','gestao_usuarios', false, false, false, false),
  ('Operacional','configuracoes',   false, false, false, false),
  -- Almoxarifado
  ('Almoxarifado','dashboard',       false, false, false, false),
  ('Almoxarifado','gestao_clientes', false, false, false, false),
  ('Almoxarifado','operacional',     true,  false, false, false),
  ('Almoxarifado','comercial',       false, false, false, false),
  ('Almoxarifado','estoque',         true,  true,  true,  true),
  ('Almoxarifado','relatorios',      true,  false, false, false),
  ('Almoxarifado','financeiro',      false, false, false, false),
  ('Almoxarifado','gestao_usuarios', false, false, false, false),
  ('Almoxarifado','configuracoes',   false, false, false, false)
)
insert into public.permissoes_modulo (perfil_acesso_id, modulo, pode_ler, pode_criar, pode_editar, pode_excluir)
select p.id, m.modulo::public.module_key, m.l, m.c, m.e, m.x
from matriz m join p on p.nome = m.perfil
on conflict (perfil_acesso_id, modulo) do nothing;
