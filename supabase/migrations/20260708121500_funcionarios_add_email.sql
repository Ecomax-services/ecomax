-- E-mail de acesso/contato do funcionário (exibição sem expor auth.users).
alter table public.funcionarios add column if not exists email text;
