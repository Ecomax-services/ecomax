-- ============================================================================
-- Agenda da equipe — Release 4, Fase 2 (PR 15)
-- ============================================================================
-- O App aprovado tem, na Agenda, o botão "Ver agenda da equipe" para o gestor:
-- a agenda dos técnicos dele, somente leitura, com filtro por operador.
--
-- Quem é gestor. O App só aceita login de papel `operador`, então o "Gestor"
-- do protótipo não é papel nem perfil de acesso — é um técnico que coordena
-- outros. O cadastro já guarda isso em `funcionarios.gestor_id` ("gestor
-- imediato"). Aqui, gestor é quem é gestor imediato de algum colaborador ativo,
-- e a equipe dele é ele mesmo mais esses colaboradores (um nível, sem descer
-- na hierarquia).
--   [A DEFINIR — confirmar com o cliente se a equipe desce mais de um nível.]
--
-- Por que funções e não policies. Abrir `ordens_servico`, `clientes` e
-- `funcionarios` ao gestor por RLS daria a ele a OS inteira dos colegas
-- (assinatura, CPF do assinante, pontos, anexos). A tela só mostra o que está
-- no card e no "Detalhes do serviço" da equipe — e as funções devolvem só isso.
-- ============================================================================


-- Eu e os colaboradores ativos de quem sou gestor imediato. Sem equipe, a
-- lista tem só a mim — e o App não mostra o botão da equipe.
create or replace function public.minha_equipe()
returns table (funcionario_id uuid, nome text, sou_eu boolean)
language sql
stable
security definer
set search_path = public
as $$
  with eu as (
    select f.id from funcionarios f
     where f.profile_id = auth.uid() and f.ativo
     limit 1
  )
  select f.id, f.nome_completo, f.id = eu.id
    from eu
    join funcionarios f on f.id = eu.id or (f.gestor_id = eu.id and f.ativo)
   order by f.id = eu.id desc, f.nome_completo;
$$;

revoke all on function public.minha_equipe() from public, anon;
grant execute on function public.minha_equipe() to authenticated;


-- A agenda da equipe num período: uma linha por OS (ou por data de cronograma
-- antigo, que ainda não virou OS própria), com os técnicos da equipe que estão
-- nela. Só os campos que a tela mostra.
create or replace function public.agenda_da_equipe(_de date, _ate date)
returns table (
  os_id uuid,
  cronograma_id uuid,
  codigo text,
  data date,
  hora text,
  duracao text,
  status text,
  cliente text,
  endereco text,
  tipos text[],
  pragas text[],
  funcionarios uuid[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if (select count(*) from minha_equipe()) < 2 then
    raise exception 'A agenda da equipe é só para quem é gestor de algum técnico.'
      using errcode = '42501';
  end if;
  -- O App pede uma semana ou um mês. O teto evita varrer o ano inteiro.
  if _de is null or _ate is null or _ate < _de or _ate - _de > 62 then
    raise exception 'Período inválido para a agenda.' using errcode = '22023';
  end if;

  return query
  with equipe as (
    select e.funcionario_id from minha_equipe() e
  ),
  os_da_equipe as (
    select osf.os_id, array_agg(distinct osf.funcionario_id) as funcs
      from os_funcionarios osf
      join equipe e on e.funcionario_id = osf.funcionario_id
     group by osf.os_id
  ),
  datas as (
    select o.id as os_id, null::uuid as cronograma_id, o.data_programada as data, null::text as crono_status
      from ordens_servico o
     where o.data_programada between _de and _ate
    union all
    -- Data que já virou OS própria aparece pela própria OS, na linha de cima.
    select c.os_id, c.id, c.data_prevista, c.status
      from os_cronograma c
     where c.visita_os_id is null
       and c.status <> 'cancelada'
       and c.data_prevista between _de and _ate
  )
  select o.id, d.cronograma_id, o.codigo, d.data, o.hora_prevista, o.duracao_estimada,
         -- Visita antiga já feita aparece feita, mesmo com a OS de origem aberta.
         case when d.crono_status = 'concluida' then 'concluida' else o.status end,
         cl.nome,
         coalesce(
           nullif(o.endereco_execucao, ''),
           nullif(concat_ws(' - ',
             nullif(concat_ws(', ', nullif(cl.logradouro, ''), nullif(cl.numero, ''),
                              nullif(cl.complemento, ''), nullif(cl.bairro, '')), ''),
             nullif(concat_ws('/', nullif(cl.cidade, ''), nullif(cl.uf, '')), '')), '')
         ),
         coalesce(o.tipos_servico, '{}'), coalesce(o.pragas, '{}'), od.funcs
    from datas d
    join os_da_equipe od on od.os_id = d.os_id
    join ordens_servico o on o.id = d.os_id
    left join clientes cl on cl.id = o.cliente_id
   where o.status <> 'cancelada'
     and not coalesce(o.rascunho, false)
   order by d.data, o.hora_prevista nulls last, o.codigo;
end;
$$;

revoke all on function public.agenda_da_equipe(date, date) from public, anon;
grant execute on function public.agenda_da_equipe(date, date) to authenticated;
