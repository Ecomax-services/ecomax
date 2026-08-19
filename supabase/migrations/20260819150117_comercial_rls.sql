-- Acesso ao módulo Comercial.
--
-- "Apenas perfis Comercial, Gestor e Administrativo acessam este módulo."
-- O gate é o mesmo do resto do Backoffice — has_module_perm('comercial', …) —,
-- e quem decide quais perfis têm essa permissão é a matriz de Configurações.

do $$
declare t text;
begin
  foreach t in array array[
    'comercial_follow_ups', 'comercial_fup_anexos',
    'comercial_garantias', 'comercial_garantia_servicos',
    'comercial_garantia_historico', 'comercial_garantia_links',
    'comercial_garantia_anexos'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($f$
      create policy %1$I_select on public.%1$I for select to authenticated
        using (public.has_module_perm('comercial', 'ler'))
    $f$, t);
    execute format($f$
      create policy %1$I_insert on public.%1$I for insert to authenticated
        with check (public.has_module_perm('comercial', 'criar'))
    $f$, t);
    execute format($f$
      create policy %1$I_update on public.%1$I for update to authenticated
        using (public.has_module_perm('comercial', 'editar'))
        with check (public.has_module_perm('comercial', 'editar'))
    $f$, t);
    execute format($f$
      create policy %1$I_delete on public.%1$I for delete to authenticated
        using (public.has_module_perm('comercial', 'excluir'))
    $f$, t);
    execute format('grant select, insert, update, delete on public.%I to authenticated, service_role', t);
  end loop;
end $$;

-- O link público NÃO ganha policy para `anon`. A leitura pelo cliente final
-- acontece por Edge Function, que valida o token, a expiração e a revogação
-- antes de devolver qualquer coisa — é a primeira superfície anônima do produto
-- e não deve depender de acertar uma policy para não vazar a base inteira.

-- ---------------------------------------------------------------------------
-- Filtros salvos: por autor e escopo, não por módulo
-- ---------------------------------------------------------------------------
-- Se o gate fosse has_module_perm('comercial'), quem só tem Operacional não
-- leria os próprios filtros — e a tabela atende os dois.
alter table public.filtros_salvos enable row level security;

create policy filtros_select on public.filtros_salvos
  for select to authenticated
  using (created_by = auth.uid() or visibilidade = 'global');

create policy filtros_insert on public.filtros_salvos
  for insert to authenticated with check (created_by = auth.uid());

-- Editar e excluir só o que é seu: filtro global é visível a todos, mas
-- continua pertencendo a quem o criou.
create policy filtros_update on public.filtros_salvos
  for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy filtros_delete on public.filtros_salvos
  for delete to authenticated using (created_by = auth.uid());

grant select, insert, update, delete on public.filtros_salvos to authenticated, service_role;
