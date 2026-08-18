-- Acesso do OPERADOR de campo (app mobile) às suas OS.
-- O operador não é usuário de back office (has_module_perm('operacional') não se aplica ao perfil dele).
-- Em vez de conceder o módulo inteiro, damos acesso PERMISSIVO e ESCOPADO: cada operador enxerga e
-- atualiza apenas as OS às quais está vinculado (os_funcionarios ↔ funcionarios.profile_id = auth.uid()).
-- RLS é permissiva (OR entre policies), então o acesso do back office continua intacto.

-- Helpers SECURITY DEFINER (evitam recursão de RLS ao consultar as tabelas de apoio).
create or replace function public.os_is_mine(_os_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.os_funcionarios osf
    join public.funcionarios f on f.id = osf.funcionario_id
    where osf.os_id = _os_id and f.profile_id = auth.uid()
  );
$$;

create or replace function public.cliente_in_my_os(_cliente_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.ordens_servico o
    join public.os_funcionarios osf on osf.os_id = o.id
    join public.funcionarios f on f.id = osf.funcionario_id
    where o.cliente_id = _cliente_id and f.profile_id = auth.uid()
  );
$$;

create or replace function public.produto_in_my_os(_produto_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.os_produtos op
    join public.os_funcionarios osf on osf.os_id = op.os_id
    join public.funcionarios f on f.id = osf.funcionario_id
    where op.produto_id = _produto_id and f.profile_id = auth.uid()
  ) or exists (
    select 1 from public.os_equipamentos oe
    join public.os_funcionarios osf on osf.os_id = oe.os_id
    join public.funcionarios f on f.id = osf.funcionario_id
    where oe.produto_id = _produto_id and f.profile_id = auth.uid()
  );
$$;

revoke execute on function public.os_is_mine(uuid), public.cliente_in_my_os(uuid), public.produto_in_my_os(uuid) from anon, public;
grant execute on function public.os_is_mine(uuid), public.cliente_in_my_os(uuid), public.produto_in_my_os(uuid) to authenticated;

-- O operador pode ler o próprio cadastro de funcionário.
create policy funcionarios_self_select on public.funcionarios
  for select to authenticated using (profile_id = auth.uid());

-- OS: ler e atualizar as minhas (check-in/out, status, assinatura).
create policy os_operador_select on public.ordens_servico
  for select to authenticated using (public.os_is_mine(id));
create policy os_operador_update on public.ordens_servico
  for update to authenticated using (public.os_is_mine(id)) with check (public.os_is_mine(id));

-- Produtos previstos: ler e registrar consumo (qtd_utilizada).
create policy osprod_operador_select on public.os_produtos
  for select to authenticated using (public.os_is_mine(os_id));
create policy osprod_operador_update on public.os_produtos
  for update to authenticated using (public.os_is_mine(os_id)) with check (public.os_is_mine(os_id));

-- Demais itens da OS: leitura escopada.
create policy osfunc_operador_select on public.os_funcionarios
  for select to authenticated using (public.os_is_mine(os_id));
create policy osequip_operador_select on public.os_equipamentos
  for select to authenticated using (public.os_is_mine(os_id));
create policy oscrono_operador_select on public.os_cronograma
  for select to authenticated using (public.os_is_mine(os_id));
create policy osrel_operador_select on public.os_relatorios
  for select to authenticated using (public.os_is_mine(os_id));

-- Anexos (fotos/comprovantes) e histórico: ler e inserir nas minhas OS.
create policy osanexo_operador_select on public.os_anexos
  for select to authenticated using (public.os_is_mine(os_id));
create policy osanexo_operador_insert on public.os_anexos
  for insert to authenticated with check (public.os_is_mine(os_id));
create policy oshist_operador_select on public.os_historico
  for select to authenticated using (public.os_is_mine(os_id));
create policy oshist_operador_insert on public.os_historico
  for insert to authenticated with check (public.os_is_mine(os_id) and actor_id = auth.uid());

-- Cliente e produtos vinculados às minhas OS: leitura escopada (nomes/endereço para exibição).
create policy clientes_operador_select on public.clientes
  for select to authenticated using (public.cliente_in_my_os(id));
create policy produtos_operador_select on public.produtos
  for select to authenticated using (public.produto_in_my_os(id));
