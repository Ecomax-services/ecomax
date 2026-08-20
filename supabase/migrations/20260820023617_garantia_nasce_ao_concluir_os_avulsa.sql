-- Nada no sistema criava garantia: a tela Comercial > Garantias listava,
-- filtrava, trocava status e gerava link público sobre uma tabela que nunca
-- recebia linha. O módulo era inalcançável na prática.
--
-- A garantia nasce ao concluir uma OS avulsa — é quando o serviço foi entregue
-- e a garantia passa a valer. Avulsa = sem orçamento de origem; OS de contrato
-- é acompanhada pelo plano, não por garantia pontual.

-- Prazo por tipo de serviço. `prazo_padrao` não serve: é o prazo de resposta do
-- link público (5 a 15 dias), curto demais para algo que o alerta avisa com 60
-- dias de antecedência.
alter table catalogo_itens
  add column if not exists garantia_meses integer;

comment on column catalogo_itens.garantia_meses is
  'Meses de garantia deste tipo de serviço. Só se aplica ao catálogo tipos_servico.';

-- 12 meses como ponto de partida para os quatro tipos, editável em
-- Configurações. Deixar nulo faria a conclusão da OS não gerar garantia
-- nenhuma, e o módulo continuaria vazio sem ninguém entender por quê.
update catalogo_itens set garantia_meses = 12
 where catalogo = 'tipos_servico' and garantia_meses is null;

create or replace function os_gera_garantia()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_execucao date;
  v_meses    integer;
  v_garantia uuid;
  v_tipo     text;
begin
  -- Só na transição para concluída, e só OS avulsa.
  if new.status <> 'concluida' or old.status = 'concluida' then return new; end if;
  if new.orcamento_id is not null then return new; end if;

  -- Uma OS, uma garantia: reconcluir não duplica.
  if exists (select 1 from comercial_garantias g where g.os_id = new.id) then return new; end if;

  v_execucao := coalesce(new.termino_execucao::date, new.check_out_at::date, new.data_programada, current_date);

  -- A OS pode ter vários tipos de serviço e uma garantia só. Vale o maior prazo:
  -- encerrar a garantia antes do prazo do serviço mais longo tiraria do cliente
  -- uma cobertura que ele contratou.
  select max(c.garantia_meses) into v_meses
    from catalogo_itens c
   where c.catalogo = 'tipos_servico'
     and c.nome = any(coalesce(new.tipos_servico, '{}'));

  -- Sem prazo configurado não há o que garantir — melhor não criar do que criar
  -- com validade inventada.
  if v_meses is null then return new; end if;

  insert into comercial_garantias (os_id, cliente_id, data_execucao, data_validade, status, created_by)
  values (new.id, new.cliente_id, v_execucao,
          (v_execucao + make_interval(months => v_meses))::date,
          'Em vigor', new.created_by)
  returning id into v_garantia;

  -- Registra quais serviços a garantia cobre — a tabela existe para isso.
  foreach v_tipo in array coalesce(new.tipos_servico, '{}') loop
    insert into comercial_garantia_servicos (garantia_id, tipo_servico)
    values (v_garantia, v_tipo);
  end loop;

  insert into comercial_garantia_historico (garantia_id, campo, valor_anterior, valor_novo, comentario, actor_id)
  values (v_garantia, 'Garantia criada', null, 'Em vigor',
          format('Gerada ao concluir a OS %s.', new.codigo), auth.uid());

  return new;
end;
$$;

drop trigger if exists trg_os_gera_garantia on ordens_servico;
create trigger trg_os_gera_garantia
  after update of status on ordens_servico
  for each row execute function os_gera_garantia();
