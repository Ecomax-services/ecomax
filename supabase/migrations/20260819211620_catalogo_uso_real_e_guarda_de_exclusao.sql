-- "Em uso" verdadeira nos Cadastros Auxiliares.
--
-- A coluna existia mas mentia de duas formas: sete dos doze catálogos não
-- tinham contador nenhum (apareciam sempre com "—" e ofereciam Excluir), e o
-- Status de OS comparava rótulo com slug — o catálogo guarda "Em aberto" e a
-- OS guarda "em_aberto", então nunca batia.
--
-- Daí a coluna `valor`: o que o consumidor realmente grava, quando difere do
-- rótulo exibido. Só o status da OS precisa dela hoje; deixá-la genérica evita
-- que o próximo enum vire um dicionário no front.

alter table catalogo_itens
  add column if not exists valor text;

comment on column catalogo_itens.valor is
  'Valor gravado pelo consumidor quando difere do rótulo (ex.: rótulo "Em aberto", valor "em_aberto"). Nulo = o consumidor grava o próprio nome.';

update catalogo_itens set valor = case nome
    when 'Em aberto'     then 'em_aberto'
    when 'Emitida'       then 'emitida'
    when 'Confirmada'    then 'confirmada'
    when 'Em andamento'  then 'em_andamento'
    when 'Executada'     then 'executada'
    when 'Concluída'     then 'concluida'
    when 'Remarcada'     then 'remarcada'
    when 'Não executada' then 'nao_executada'
    when 'Cancelada'     then 'cancelada'
  end
 where catalogo = 'status_os' and valor is null;

-- Contagem no servidor, num round-trip só. Antes cada catálogo puxava a tabela
-- consumidora inteira para o navegador e contava lá — o que não escala e ainda
-- por cima só cobria cinco casos.
-- SECURITY DEFINER de propósito: a contagem precisa ser a verdade do banco, não
-- o que o usuário enxerga. Sob RLS do chamador, quem não lê Operacional veria
-- zero uso no Status de OS e o botão Excluir apareceria para um item em uso.
create or replace function catalogo_uso(_catalogo text)
returns table (nome text, uso bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not has_module_perm('configuracoes', 'ler') then
    raise exception 'Sem permissão para ler os cadastros auxiliares.' using errcode = '42501';
  end if;

  return query
  with itens as (
    select c.nome, coalesce(c.valor, c.nome) as chave
      from catalogo_itens c
     where c.catalogo = _catalogo
  )
  select i.nome, (
    case _catalogo
      when 'status_os'      then (select count(*) from ordens_servico o where o.status::text = i.chave)
      when 'etapas_os'      then (select count(*) from ordens_servico o where o.etapa = i.chave)
      when 'tipos_servico'  then (select count(*) from ordens_servico o where o.tipos_servico @> array[i.chave])
      when 'pragas'         then (select count(*) from ordens_servico o where o.pragas       @> array[i.chave])
      when 'epis'           then (select count(*) from ordens_servico o where o.epis         @> array[i.chave])
      when 'tipos_documento'then (select count(*) from os_anexos a where a.tipo = i.chave)
      when 'categorias_produto' then (select count(*) from produtos p where p.categoria = i.chave)
      when 'unidades'       then (select count(*) from produtos p where p.unidade = i.chave)
      when 'setores'        then (select count(*) from funcionarios f where f.setor = i.chave)
      when 'cargos'         then (select count(*) from funcionarios f where f.cargo = i.chave)
      when 'motivos_ajuste' then (select count(*) from movimentacoes m
                                   where m.tipo = 'ajuste' and m.descricao like 'Ajuste manual · ' || i.chave || '%')
      when 'status_garantia'  then (select count(*) from comercial_garantias g where g.status = i.chave)
      when 'status_follow_up' then (select count(*) from comercial_follow_ups f where f.status = i.chave)
      when 'tipos_controle'   then (select count(*) from os_planos_controle pc where pc.tipo_controle = i.chave)
                                 + (select count(*) from orcamento_itens oi where oi.tipo_controle = i.chave)
      when 'frequencias'      then (select count(*) from os_planos_controle pc where pc.frequencia = i.chave)
                                 + (select count(*) from orcamento_itens oi where oi.frequencia = i.chave)
      when 'categorias_documento_cliente' then (select count(*) from cliente_documentos d where d.categoria = i.chave)
      when 'documentos_colaborador'       then (select count(*) from funcionario_documentos d where d.tipo = i.chave)
      when 'perfis_portal'    then (select count(*) from cliente_portal_usuarios u where u.perfil = i.chave)
      else 0::bigint
    end
  ) as uso
  from itens i;
end;
$$;

revoke all on function catalogo_uso(text) from public;
grant execute on function catalogo_uso(text) to authenticated;

-- A regra "item em uso não se exclui" só existia na tela: quem chamasse a API
-- direto apagava do mesmo jeito, e as linhas que apontavam para o item ficavam
-- órfãs (são texto, não chave estrangeira).
create or replace function catalogo_item_bloqueia_exclusao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uso bigint;
begin
  select u.uso into v_uso
    from catalogo_uso(old.catalogo) u
   where u.nome = old.nome;

  if coalesce(v_uso, 0) > 0 then
    raise exception 'O item "%" está em uso em % registro(s) e não pode ser excluído. Inative-o.',
      old.nome, v_uso using errcode = '23503';
  end if;

  return old;
end;
$$;

drop trigger if exists trg_catalogo_item_bloqueia_exclusao on catalogo_itens;
create trigger trg_catalogo_item_bloqueia_exclusao
  before delete on catalogo_itens
  for each row execute function catalogo_item_bloqueia_exclusao();
