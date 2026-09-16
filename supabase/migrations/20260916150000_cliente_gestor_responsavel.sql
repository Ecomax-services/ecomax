-- ============================================================================
-- Gestor responsável pelo cliente
-- ============================================================================
-- O protótipo mostra "Gestor responsável" como coluna na lista de clientes e
-- como campo no cadastro. Não havia onde guardar isso.
--
-- `cliente_funcionarios` não serve: é a lista de quem atende o cliente em
-- campo, sem papel — hoje tem operador, almoxarife e até um usuário de portal
-- na mesma tabela. Gestor responsável é uma pessoa só, e é relação comercial,
-- não operacional. Duas coisas diferentes pedem duas colunas diferentes.
--
-- `on delete set null` e não `cascade`: desligar um funcionário não pode
-- apagar o cliente. O cliente fica sem gestor, o que é verdade, e aparece como
-- "—" na lista até alguém atribuir outro.
-- ============================================================================

alter table public.clientes
  add column if not exists gestor_id uuid references public.funcionarios (id) on delete set null;

create index if not exists clientes_gestor_idx on public.clientes (gestor_id);

comment on column public.clientes.gestor_id is
  'Funcionário responsável comercialmente pelo cliente. Distinto de cliente_funcionarios, que é o atendimento em campo.';
