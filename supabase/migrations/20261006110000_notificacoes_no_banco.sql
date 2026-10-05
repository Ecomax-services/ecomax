-- ============================================================================
-- Notificações no banco — Release 4, Fase 1, PR 9
-- ============================================================================
-- O modelo antigo tinha três defeitos, dois deles de segurança:
--
--   1. QUALQUER sessão autenticada criava notificação para qualquer pessoa. A
--      policy de INSERT só exigia `created_by = auth.uid()` — um cliente do
--      Portal podia mandar "sua senha expirou, clique aqui" para o
--      administrador, com o link que quisesse.
--   2. Notificação para um papel ou para um cliente era UMA linha só,
--      compartilhada. Quem apagava, apagava para todos; quem lia, marcava lida
--      para todos.
--   3. Quem decidia notificar era a tela do Backoffice, depois de gravar. Se a
--      aba fechasse entre uma coisa e outra, o técnico não ficava sabendo da
--      OS; e outro caminho que vinculasse técnico (o App, uma RPC) não avisava
--      ninguém.
--
-- O modelo novo:
--   - uma linha por DESTINATÁRIO, sempre com `para_profile_id`. Papel e
--     cliente continuam registrados como origem, mas a linha é de uma pessoa;
--   - só o banco cria notificação, por `notificar_perfis` (e os dois atalhos
--     por papel e por cliente), que nenhuma sessão pode chamar direto. O que
--     a API tentar inserir é descartado (seção 3 explica por que sem erro);
--   - os avisos que a tela criava viram gatilhos no próprio dado: vincular
--     técnico, desvincular, publicar relatório;
--   - o destinatário só muda `lida` e só apaga a própria.
--
-- Produção tem zero notificações hoje; a conversão das antigas (seção 2)
-- existe para o banco recriado do zero e por garantia.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Criar notificação: só pelo banco
-- ----------------------------------------------------------------------------

create or replace function public.notificar_perfis(
  _perfis uuid[], _tipo text, _titulo text, _descricao text, _os_id uuid, _link text,
  _para_role text default null, _para_cliente_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into notificacoes (para_profile_id, para_role, para_cliente_id, tipo, titulo, descricao, os_id, link, created_by)
  select distinct p, _para_role, _para_cliente_id, coalesce(_tipo, 'info'), _titulo, _descricao, _os_id, _link, auth.uid()
    from unnest(coalesce(_perfis, '{}')) as p
   where p is not null;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Todo perfil ativo com o papel.
create or replace function public.notificar_papel(
  _role user_role, _tipo text, _titulo text, _descricao text, _os_id uuid, _link text
)
returns integer
language sql
security definer
set search_path = public
as $$
  select notificar_perfis(
    array(select id from profiles where role = _role and coalesce(ativo, true)),
    _tipo, _titulo, _descricao, _os_id, _link, _role::text, null);
$$;

-- Todo usuário ATIVO do Portal daquele cliente. O vínculo do Portal é por
-- e-mail (`cliente_portal_usuarios`), como em `my_portal_cliente_ids`; usuário
-- desativado no Portal não recebe.
create or replace function public.notificar_cliente(
  _cliente_id uuid, _tipo text, _titulo text, _descricao text, _os_id uuid, _link text
)
returns integer
language sql
security definer
set search_path = public
as $$
  select notificar_perfis(
    array(select distinct u.id
            from cliente_portal_usuarios cpu
            join auth.users u on lower(u.email) = lower(cpu.email)
           where cpu.cliente_id = _cliente_id and cpu.status <> 'inativo'),
    _tipo, _titulo, _descricao, _os_id, _link, null, _cliente_id);
$$;

-- Ninguém chama direto. `revoke ... from public` não basta: o Supabase dá
-- EXECUTE direto a anon e authenticated (ver tests/rls/execute_de_funcoes.sql).
revoke all on function public.notificar_perfis(uuid[], text, text, text, uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.notificar_papel(user_role, text, text, text, uuid, text) from public, anon, authenticated;
revoke all on function public.notificar_cliente(uuid, text, text, text, uuid, text) from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 2. As antigas: uma linha por destinatário
-- ----------------------------------------------------------------------------
-- Cada destinatário herda o `lida` da linha compartilhada — é o melhor que se
-- sabe; quem já a tinha visto como lida continua vendo assim.

insert into public.notificacoes (para_profile_id, para_role, para_cliente_id, tipo, titulo, descricao, os_id, link, lida, created_by, created_at)
select p.id, n.para_role, null, n.tipo, n.titulo, n.descricao, n.os_id, n.link, n.lida, n.created_by, n.created_at
  from public.notificacoes n
  join public.profiles p on p.role::text = n.para_role and coalesce(p.ativo, true)
 where n.para_profile_id is null and n.para_role is not null;

insert into public.notificacoes (para_profile_id, para_role, para_cliente_id, tipo, titulo, descricao, os_id, link, lida, created_by, created_at)
select distinct u.id, null, n.para_cliente_id, n.tipo, n.titulo, n.descricao, n.os_id, n.link, n.lida, n.created_by, n.created_at
  from public.notificacoes n
  join public.cliente_portal_usuarios cpu on cpu.cliente_id = n.para_cliente_id and cpu.status <> 'inativo'
  join auth.users u on lower(u.email) = lower(cpu.email)
 where n.para_profile_id is null and n.para_cliente_id is not null;

delete from public.notificacoes where para_profile_id is null;

alter table public.notificacoes alter column para_profile_id set not null;

create index if not exists notificacoes_destinatario_idx
  on public.notificacoes (para_profile_id, created_at desc);


-- ----------------------------------------------------------------------------
-- 3. RLS: cada um com as suas
-- ----------------------------------------------------------------------------

drop policy if exists notif_select on public.notificacoes;
drop policy if exists notif_insert on public.notificacoes;
drop policy if exists notif_update on public.notificacoes;
drop policy if exists notif_delete on public.notificacoes;

create policy notif_select on public.notificacoes
  for select to authenticated using (para_profile_id = auth.uid());
create policy notif_update on public.notificacoes
  for update to authenticated using (para_profile_id = auth.uid()) with check (para_profile_id = auth.uid());
create policy notif_delete on public.notificacoes
  for delete to authenticated using (para_profile_id = auth.uid());

-- Sem INSERT pela API. E o UPDATE só alcança `lida`: sem isto, o destinatário
-- reescreveria título e link da própria notificação — inofensivo para ele,
-- mas o registro deixaria de ser o que o sistema mandou.
revoke all on public.notificacoes from anon, authenticated;
grant select, delete on public.notificacoes to authenticated;
grant update (lida) on public.notificacoes to authenticated;
grant all on public.notificacoes to service_role;

-- INSERT pela API: aceito e DESCARTADO, sem erro e sem linha.
--
-- O Backoffice publicado antes desta mudança ainda cria notificação pela API
-- depois de criar a OS, vincular técnico ou publicar relatório. Recusar com
-- erro faria a tela mostrar falha numa ação que já tinha acontecido — e quem
-- tenta de novo cria a OS duas vezes. Descartando, a tela antiga segue
-- funcionando e o aviso sai igual, pelo gatilho do banco (seção 4).
--
-- A falha de segurança continua fechada: nada que venha da API vira linha.
-- O gatilho roda antes da RLS; `current_user` é `authenticated` ou `anon` na
-- chamada pela API e o dono da função quando é `notificar_perfis` que insere.
grant insert on public.notificacoes to authenticated;

create or replace function public.notificacao_descarta_insert_da_api()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    return null;
  end if;
  return new;
end;
$$;

create trigger notificacao_descarta_insert_da_api
  before insert on public.notificacoes
  for each row execute function public.notificacao_descarta_insert_da_api();


-- ----------------------------------------------------------------------------
-- 4. Os avisos que a tela criava viram gatilhos
-- ----------------------------------------------------------------------------

-- Técnico vinculado a uma OS. A OS em rascunho nem aceita vínculo (gatilho
-- `os_funcionario_recusa_rascunho`), então todo vínculo aqui é de OS real.
-- Visita recorrente não avisa uma a uma: `gerar_visitas_da_os` manda um
-- resumo por técnico.
create or replace function public.os_funcionario_notifica_vinculo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil uuid;
  v_os record;
begin
  select profile_id into v_perfil from funcionarios where id = new.funcionario_id;
  select codigo, recorrencia_origem_id into v_os from ordens_servico where id = new.os_id;
  if v_perfil is null or v_os.recorrencia_origem_id is not null then
    return new;
  end if;
  perform notificar_perfis(array[v_perfil], 'os', 'Nova OS atribuída',
    format('Você foi vinculado à ordem de serviço %s.', v_os.codigo), new.os_id, null);
  return new;
end;
$$;

create trigger os_funcionario_notifica_vinculo
  after insert on public.os_funcionarios
  for each row execute function public.os_funcionario_notifica_vinculo();

-- Técnico desvinculado. Sem este aviso a OS some da lista dele sem
-- explicação. Sem `os_id`: a OS já não está ao alcance dele, e um link que dá
-- erro é pior que nenhum.
-- Se a OS inteira foi apagada (o vínculo cai por cascata), não há a quem
-- explicar nada: não avisa.
create or replace function public.os_funcionario_notifica_saida()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil uuid;
  v_codigo text;
begin
  select profile_id into v_perfil from funcionarios where id = old.funcionario_id;
  select codigo into v_codigo from ordens_servico where id = old.os_id;
  if v_perfil is null or v_codigo is null then
    return old;
  end if;
  perform notificar_perfis(array[v_perfil], 'info', 'Você saiu de uma OS',
    format('A ordem de serviço %s não está mais atribuída a você.', v_codigo), null, null);
  return old;
end;
$$;

create trigger os_funcionario_notifica_saida
  after delete on public.os_funcionarios
  for each row execute function public.os_funcionario_notifica_saida();

-- Relatório publicado: cada usuário ativo do Portal do cliente.
create or replace function public.os_relatorio_notifica_publicacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_os record;
begin
  if not new.publicado or (tg_op = 'UPDATE' and old.publicado) then
    return new;
  end if;
  select cliente_id, codigo into v_os from ordens_servico where id = new.os_id;
  perform notificar_cliente(v_os.cliente_id, 'os', 'Relatório técnico disponível',
    format('Um novo relatório técnico da %s foi disponibilizado no seu portal.', v_os.codigo),
    new.os_id, null);
  return new;
end;
$$;

create trigger os_relatorio_notifica_publicacao
  after insert or update of publicado on public.os_relatorios
  for each row execute function public.os_relatorio_notifica_publicacao();


-- ----------------------------------------------------------------------------
-- 5. Quem já criava pelo banco passa pelo caminho novo
-- ----------------------------------------------------------------------------

create or replace function public.garantias_marcar_a_renovar()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  g record;
  n integer := 0;
begin
  for g in
    select id, status, data_validade, cliente_id
    from public.comercial_garantias
    where status = 'Em vigor'
      and data_validade <= current_date + 60
      and data_validade >= current_date
    for update
  loop
    update public.comercial_garantias set status = 'A renovar' where id = g.id;

    insert into public.comercial_garantia_historico
      (garantia_id, campo, valor_anterior, valor_novo, comentario, actor_id)
    values
      (g.id, 'Status', g.status, 'A renovar',
       format('Alerta automático: vence em %s dias.', g.data_validade - current_date),
       null);

    perform public.notificar_papel(
      'comercial', 'expired',
      'Garantia a renovar',
      format('Uma garantia vence em %s. Entre em contato com o cliente.',
             to_char(g.data_validade, 'DD/MM/YYYY')),
      null,
      '/comercial/garantias/' || g.id
    );

    n := n + 1;
  end loop;

  return n;
end $function$;

revoke execute on function public.garantias_marcar_a_renovar() from public, anon, authenticated;

-- Visitas recorrentes: um resumo por técnico em vez de um aviso por visita.
--
-- `gerar_visitas_da_os` roda com os privilégios de quem chama, e quem chama
-- não alcança `notificar_perfis`. Este intermediário é o único caminho, e não
-- serve para forjar aviso: exige permissão de criar OS e conta só as visitas
-- criadas NESTA transação (`created_at = now()`, que é o início dela).

create or replace function public.notificar_visitas_agendadas(_os_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  v_codigo text;
begin
  if not has_module_perm('operacional', 'criar') then
    raise exception 'Sem permissão para agendar visitas.' using errcode = '42501';
  end if;

  select count(*) into n from ordens_servico where recorrencia_origem_id = _os_id and created_at = now();
  if n = 0 then
    return 0;
  end if;

  select codigo into v_codigo from ordens_servico where id = _os_id;
  return notificar_perfis(
    array(select f.profile_id from os_funcionarios osf join funcionarios f on f.id = osf.funcionario_id
           where osf.os_id = _os_id and f.profile_id is not null),
    'os', 'Visitas recorrentes agendadas',
    format('%s %s da ordem de serviço %s %s para você.', n,
           case when n = 1 then 'visita' else 'visitas' end, v_codigo,
           case when n = 1 then 'foi agendada' else 'foram agendadas' end),
    _os_id, null);
end;
$$;

revoke all on function public.notificar_visitas_agendadas(uuid) from public, anon;
grant execute on function public.notificar_visitas_agendadas(uuid) to authenticated;

create or replace function public.gerar_visitas_da_os(_os_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_origem ordens_servico%rowtype;
  v_data record;
  v_visita uuid;
  v_plano record;
  v_novo_plano uuid;
  v_criadas integer := 0;
begin
  select * into v_origem from ordens_servico where id = _os_id for update;
  if not found then
    raise exception 'OS não encontrada.' using errcode = 'P0002';
  end if;
  if v_origem.recorrencia_origem_id is not null then
    raise exception 'Esta OS já é uma visita de outra; as visitas saem da OS de origem.' using errcode = '23514';
  end if;
  if v_origem.rascunho then
    raise exception 'Emita a OS antes de gerar as visitas.' using errcode = '23514';
  end if;

  for v_data in
    select c.id, c.data_prevista
      from os_cronograma c
     where c.os_id = _os_id and c.visita_os_id is null and c.status <> 'cancelada'
     order by c.data_prevista, c.ordem
  loop
    insert into ordens_servico (
      cliente_id, orcamento_id, status, rascunho, etapa, tipos_servico, descricao,
      data_programada, hora_prevista, duracao_estimada, recorrencia, endereco_execucao,
      responsavel_admin_id, funcionario_integrado_id, observacoes, pragas, epis,
      necessita_relatorio, outros_documentos, mapa_pontos_url, contato,
      recorrencia_origem_id, created_by
    ) values (
      v_origem.cliente_id, v_origem.orcamento_id, 'emitida', false, v_origem.etapa,
      v_origem.tipos_servico, v_origem.descricao,
      v_data.data_prevista, v_origem.hora_prevista, v_origem.duracao_estimada, v_origem.recorrencia,
      v_origem.endereco_execucao, v_origem.responsavel_admin_id, v_origem.funcionario_integrado_id,
      v_origem.observacoes, v_origem.pragas, v_origem.epis,
      v_origem.necessita_relatorio, v_origem.outros_documentos, v_origem.mapa_pontos_url, v_origem.contato,
      _os_id, auth.uid()
    ) returning id into v_visita;

    insert into os_funcionarios (os_id, funcionario_id)
    select v_visita, funcionario_id from os_funcionarios where os_id = _os_id;

    -- Lote fica de fora: é escolhido em campo, da base do técnico, na visita.
    insert into os_produtos (os_id, produto_id, qtd_recomendada, unidade, prazo_alvo, observacao, base_id)
    select distinct on (produto_id) v_visita, produto_id, qtd_recomendada, unidade, prazo_alvo, observacao, base_id
      from os_produtos where os_id = _os_id
     order by produto_id, created_at;

    insert into os_equipamentos (os_id, produto_id, numero_serie, responsavel_id)
    select v_visita, produto_id, numero_serie, responsavel_id from os_equipamentos where os_id = _os_id;

    -- Planos: um por tipo de controle, como a origem nasceu. Se o cliente tem
    -- mapa, `preparar_monitoramento_os` faz o resto, igual à origem.
    for v_plano in
      select distinct on (tipo_controle) id, tipo_controle, frequencia, pontos_previstos, servico_codigo
        from os_planos_controle where os_id = _os_id
       order by tipo_controle, servico_codigo nulls first
    loop
      insert into os_planos_controle (os_id, tipo_controle, frequencia, pontos_previstos)
      values (v_visita, v_plano.tipo_controle, v_plano.frequencia,
              case when v_plano.servico_codigo is null then v_plano.pontos_previstos else 0 end)
      returning id into v_novo_plano;

      -- Plano preenchido à mão: os mesmos pontos, em branco, para a visita.
      if v_plano.servico_codigo is null then
        insert into os_plano_pontos (plano_id, numero, identificacao)
        select v_novo_plano, numero, identificacao
          from os_plano_pontos where plano_id = v_plano.id and cliente_ponto_id is null;
      end if;
    end loop;

    perform preparar_monitoramento_os(v_visita);

    update os_cronograma set visita_os_id = v_visita where id = v_data.id;

    insert into os_historico (os_id, campo, valor_anterior, valor_novo, actor_id)
    values (v_visita, 'OS criada', null, format('Visita recorrente da %s', v_origem.codigo), auth.uid());

    v_criadas := v_criadas + 1;
  end loop;

  -- Um aviso por técnico, não um por visita. O vínculo de cada visita não
  -- notifica (o gatilho ignora visitas): seis "Nova OS atribuída" seguidas
  -- esconderiam a notificação que importa.
  perform notificar_visitas_agendadas(_os_id);

  return v_criadas;
end;
$$;
