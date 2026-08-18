-- Seed do módulo Operacional.

-- 1) Concede o módulo aos perfis Operacional e Administrativo (idempotente; não sobrescreve config).
--    Admin do sistema já passa por is_admin(); aqui liberamos os perfis nomeados do board.
insert into public.permissoes_modulo (perfil_acesso_id, modulo, pode_ler, pode_criar, pode_editar, pode_excluir)
select p.id, 'operacional'::public.module_key, true, true, true, (p.nome ilike '%admin%')
from public.perfis_acesso p
where p.nome ilike '%operac%' or p.nome ilike '%admin%'
on conflict (perfil_acesso_id, modulo) do nothing;

-- 2) OS de demonstração — apenas se ainda não houver nenhuma OS.
with base as (
  select
    (select id from public.clientes where nome = 'Supermercado BomPreço' limit 1)  as cli_bom,
    (select id from public.clientes where nome = 'Restaurante Sabor & Cia' limit 1) as cli_rest,
    (select id from public.clientes where nome = 'Hospital Vida Plena' limit 1)     as cli_hosp,
    (select id from public.clientes where nome = 'Padaria Pão Nosso' limit 1)       as cli_pad,
    (select id from public.orcamentos where status = 'aprovado' limit 1)            as orc_aprovado,
    (select id from public.funcionarios where nome_completo = 'Eliana Martins' limit 1) as func_gestora
)
insert into public.ordens_servico
  (cliente_id, orcamento_id, status, tipos_servico, descricao, data_programada, hora_prevista,
   recorrencia, endereco_execucao, responsavel_admin_id, pragas, necessita_relatorio)
select v.* from base b, lateral (values
  (b.cli_bom,  b.orc_aprovado, 'em_andamento', array['Desratização'],   'Controle mensal de pragas — Loja 1', current_date + 3, '09:00', 'mensal',   'Av. Paulista, 1200 - São Paulo/SP', b.func_gestora, array['Roedores'],  true),
  (b.cli_rest, null,           'em_aberto',    array['Desinsetização'], 'Desinsetização preventiva de cozinha', current_date + 7, '14:00', 'nenhuma', 'Rua Augusta, 540 - São Paulo/SP',   b.func_gestora, array['Baratas'],   false),
  (b.cli_hosp, null,           'executada',    array['Sanitização'],    'Sanitização de alas',                  current_date - 2, '08:00', 'nenhuma', 'Av. Sumaré, 2100 - São Paulo/SP',   b.func_gestora, array['Mosquitos'], true),
  (b.cli_pad,  null,           'concluida',    array['Descupinização'], 'Descupinização estrutural',            current_date - 20,'07:30', 'nenhuma', 'Av. Braz Leme, 88 - São Paulo/SP',  b.func_gestora, array['Cupins'],    true)
) as v(cliente_id, orcamento_id, status, tipos_servico, descricao, data_programada, hora_prevista,
       recorrencia, endereco_execucao, responsavel_admin_id, pragas, necessita_relatorio)
where not exists (select 1 from public.ordens_servico);

-- Assinatura + check-in/out para as OS já executadas (demo da captura mobile, read-only).
update public.ordens_servico
set assinatura_url = 'seed/assinatura-demo.png', check_in_at = created_at, check_out_at = created_at
where status in ('executada','concluida') and assinatura_url is null;

-- Um técnico de campo vinculado às OS de campo.
insert into public.os_funcionarios (os_id, funcionario_id)
select o.id, (select id from public.funcionarios where cargo = 'Técnico de Campo' and ativo order by nome_completo limit 1)
from public.ordens_servico o
where o.descricao in ('Controle mensal de pragas — Loja 1','Sanitização de alas','Descupinização estrutural')
  and not exists (select 1 from public.os_funcionarios)
on conflict do nothing;

-- Um produto previsto por OS (consumo preenchido nas já executadas).
insert into public.os_produtos (os_id, produto_id, qtd_recomendada, qtd_utilizada, unidade)
select o.id, p.id, 2, case when o.status in ('executada','concluida') then 2 else null end, p.unidade
from public.ordens_servico o
cross join lateral (select id, unidade from public.produtos where ativo order by nome limit 1) p
where not exists (select 1 from public.os_produtos);

-- Relatório técnico das OS executadas (publicado quando concluída).
insert into public.os_relatorios (os_id, titulo, publicado, publicado_at)
select o.id, 'Relatório técnico — ' || o.codigo, (o.status = 'concluida'),
       case when o.status = 'concluida' then now() else null end
from public.ordens_servico o
where o.status in ('executada','concluida')
  and not exists (select 1 from public.os_relatorios);

-- Evento inicial no histórico de cada OS.
insert into public.os_historico (os_id, campo, valor_anterior, valor_novo)
select o.id, 'OS criada', null, o.codigo
from public.ordens_servico o
where not exists (select 1 from public.os_historico);
