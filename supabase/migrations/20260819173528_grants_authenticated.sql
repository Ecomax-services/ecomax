-- Acesso de tabela para o role `authenticated`, em todo o schema public.
--
-- No projeto remoto isso nunca precisou ser escrito: o Supabase configura
-- ALTER DEFAULT PRIVILEGES, e toda tabela criada pelo dashboard ou por migration
-- já nasce acessível a anon/authenticated/service_role. Num banco criado do
-- zero — `supabase db reset`, um projeto novo, o CI — esse padrão não existe, e
-- o resultado é um banco que sobe inteiro e no qual o aplicativo não lê nada,
-- falhando com "permission denied for table", que se disfarça de erro de RLS e
-- não é.
--
-- Foi a suíte de RLS do CI que expôs isso: ela é o primeiro código a rodar
-- contra um banco recriado do zero com o role de aplicação.
--
-- É seguro conceder em bloco porque as 37 tabelas do schema têm RLS habilitado
-- — verificado antes de escrever esta migration. O grant abre a porta da tabela;
-- quem decide as linhas continua sendo a policy. A checagem abaixo falha a
-- migration se alguma tabela sem RLS aparecer no futuro, para o grant nunca
-- virar tabela aberta em silêncio.

do $$
declare
  sem_rls text;
  r record;
begin
  select string_agg(tablename, ', ') into sem_rls
  from pg_tables where schemaname = 'public' and not rowsecurity;

  if sem_rls is not null then
    raise exception
      'Tabelas sem RLS no schema public: %. Conceder acesso em bloco deixaria estas abertas — habilite RLS antes.',
      sem_rls;
  end if;

  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format(
      'grant select, insert, update, delete on public.%I to authenticated, service_role',
      r.tablename
    );
  end loop;
end $$;

-- Sequências, para os defaults que usam nextval (o código das OS, por exemplo).
do $$
declare r record;
begin
  for r in select sequencename from pg_sequences where schemaname = 'public' loop
    execute format('grant usage, select on sequence public.%I to authenticated, service_role', r.sequencename);
  end loop;
end $$;
