-- Três coisas que se resolvem juntas porque uma depende da outra.
--
-- 1) Separar contagem de autorização. `catalogo_uso` faz as duas coisas, e o
--    trigger de exclusão a chama. Numa migration não há `auth.uid()`, então a
--    checagem falha e o trigger aborta qualquer DELETE em catalogo_itens —
--    inclusive o do item 2 abaixo, e inclusive num `db reset` do zero.
--    A contagem passa a viver em `catalogo_uso_interno`, sem checagem; quem
--    checa é só a função exposta ao cliente.

create or replace function catalogo_uso_interno(_catalogo text)
returns table (nome text, uso bigint)
language sql
stable
security definer
set search_path = public
as $$
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
$$;

revoke all on function catalogo_uso_interno(text) from public;

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
  return query select u.nome, u.uso from catalogo_uso_interno(_catalogo) u;
end;
$$;

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
    from catalogo_uso_interno(old.catalogo) u
   where u.nome = old.nome;

  if coalesce(v_uso, 0) > 0 then
    raise exception 'O item "%" está em uso em % registro(s) e não pode ser excluído. Inative-o.',
      old.nome, v_uso using errcode = '23503';
  end if;

  return old;
end;
$$;

-- 2) Remover `tipos_produto`. Nasceu no seed rotulado "consumidor futuro" e
--    nunca ganhou um: seus 4 itens são cópia de `categorias_produto`, que é
--    quem `produtos.categoria` realmente consome. Um catálogo sem significado
--    próprio só tem como confundir quem for editar.
delete from catalogo_itens where catalogo = 'tipos_produto';

-- 3) `produtos.observacao`. A ficha do produto já tinha o campo "Observações",
--    mas ele aceitava digitação e descartava — não havia coluna para guardar.
alter table produtos
  add column if not exists observacao text;

comment on column produtos.observacao is 'Notas internas sobre o produto.';
