-- Vencimento da integração do funcionário com cada empresa. O protótipo mostra
-- "Vencimento" e "Dias p/ vencer" por empresa na aba Integração com Empresas —
-- o vínculo existia, o prazo dele não.
alter table public.cliente_funcionarios
  add column if not exists vencimento date;

-- "Utiliza Caixa" é um dos dois interruptores do cadastro no protótipo.
alter table public.funcionarios
  add column if not exists utiliza_caixa boolean not null default false;

-- Habilitações do funcionário por tipo de serviço: quem pode executar o quê, e
-- até quando. Hoje o bloqueio por documento olha só ASO e CNH; isto é o que
-- permite dizer que alguém está certificado para "Controle de Roedores".
create table if not exists public.funcionario_servicos (
  id             uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references public.funcionarios (id) on delete cascade,
  tipo_servico   text not null,
  habilitacao    text,
  validade       date,
  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (funcionario_id, tipo_servico)
);
create index if not exists funcionario_servicos_func_idx on public.funcionario_servicos (funcionario_id);

drop trigger if exists set_updated_at on public.funcionario_servicos;
create trigger set_updated_at before update on public.funcionario_servicos
  for each row execute function public.set_updated_at();

alter table public.funcionario_servicos enable row level security;

drop policy if exists funcionario_servicos_select on public.funcionario_servicos;
create policy funcionario_servicos_select on public.funcionario_servicos
  for select to authenticated using (true);
drop policy if exists funcionario_servicos_insert on public.funcionario_servicos;
create policy funcionario_servicos_insert on public.funcionario_servicos
  for insert to authenticated with check (public.has_module_perm('gestao_usuarios', 'criar'));
drop policy if exists funcionario_servicos_update on public.funcionario_servicos;
create policy funcionario_servicos_update on public.funcionario_servicos
  for update to authenticated
  using (public.has_module_perm('gestao_usuarios', 'editar'))
  with check (public.has_module_perm('gestao_usuarios', 'editar'));
drop policy if exists funcionario_servicos_delete on public.funcionario_servicos;
create policy funcionario_servicos_delete on public.funcionario_servicos
  for delete to authenticated using (public.has_module_perm('gestao_usuarios', 'excluir'));
