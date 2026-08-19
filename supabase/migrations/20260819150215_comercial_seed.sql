-- Catálogos e permissões do módulo Comercial.

-- Os 3 status do FUP. Catálogo, e não check constraint, porque o Discovery é
-- explícito: "editáveis em Configurações caso o cliente precise estender".
insert into public.catalogo_itens (catalogo, nome, ordem, ativo, cor_bg, cor_fg) values
  ('status_follow_up', 'Em espera',  1, true, '#fdebd0', '#b45309'),
  ('status_follow_up', 'Concluído',  2, true, '#d3f7d3', '#155015'),
  ('status_follow_up', 'Cancelado',  3, true, '#ffddd5', '#a81400')
on conflict (catalogo, nome) do nothing;

-- Os 8 estágios da renovação de garantia, preservados do sistema atual. Passam
-- a ser badge com cor em vez do texto numerado "1 - Em vigor".
insert into public.catalogo_itens (catalogo, nome, ordem, ativo, cor_bg, cor_fg) values
  ('status_garantia', 'Em vigor',            1, true, '#d3f7d3', '#155015'),
  ('status_garantia', 'A renovar',           2, true, '#fdebd0', '#b45309'),
  ('status_garantia', 'Renovado',            3, true, '#a3eba3', '#0f3f0f'),
  ('status_garantia', 'Renovação Recusada',  4, true, '#ffddd5', '#a81400'),
  ('status_garantia', 'Aguardando Retorno',  5, true, '#e8eefc', '#3056b5'),
  ('status_garantia', 'Novo Orçamento',      6, true, '#e8eefc', '#3056b5'),
  ('status_garantia', 'Enviado E-mail',      7, true, '#eeeff1', '#5b6470'),
  ('status_garantia', 'Não Aplicável',       8, true, '#eeeff1', '#5b6470')
on conflict (catalogo, nome) do nothing;

-- Perfil Comercial. O Discovery restringe o módulo a "Comercial, Gestor e
-- Administrativo", e não havia perfil Comercial — só Administrador, Gestor,
-- Operacional, Almoxarifado, Cliente e Operador de Campo.
insert into public.perfis_acesso (nome, descricao)
values ('Comercial', 'Follow-ups, garantias e relacionamento com o cliente.')
on conflict (nome) do nothing;

-- Permissões: Comercial opera o módulo; Gestor lê; Administrador já tem tudo
-- pelo bypass de is_admin(). Quem quiser mudar isso usa a matriz em
-- Configurações — é para isso que ela existe.
insert into public.permissoes_modulo (perfil_acesso_id, modulo, pode_ler, pode_criar, pode_editar, pode_excluir)
select p.id, 'comercial'::module_key, true, true, true, true
from public.perfis_acesso p where p.nome = 'Comercial'
on conflict (perfil_acesso_id, modulo) do update
  set pode_ler = true, pode_criar = true, pode_editar = true, pode_excluir = true;

insert into public.permissoes_modulo (perfil_acesso_id, modulo, pode_ler, pode_criar, pode_editar, pode_excluir)
select p.id, 'comercial'::module_key, true, false, false, false
from public.perfis_acesso p where p.nome = 'Gestor'
on conflict (perfil_acesso_id, modulo) do nothing;

-- O catálogo status_garantia já existia, com três valores inventados antes de o
-- Discovery do Comercial ser consultado: Vigente, A vencer, Expirada. Eles não
-- correspondem aos 8 estágios que o time usa e nada os referencia — não havia
-- tabela de garantias até agora.
--
-- Desativados, e não apagados: a tela de Configurações passa a escondê-los dos
-- selects, e reverter é mudar um booleano se surgir um consumidor esquecido.
update public.catalogo_itens
set ativo = false,
    observacao = coalesce(observacao || ' · ', '') ||
      'Substituído pelos 8 estágios do Discovery do Comercial (18/08).'
where catalogo = 'status_garantia'
  and nome in ('Vigente', 'A vencer', 'Expirada');
