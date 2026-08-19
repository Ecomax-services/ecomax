-- Perfil do usuário do portal vira catálogo, em vez de texto livre.
--
-- O campo era um input aberto, e o resultado apareceu já nos primeiros usos:
-- quatro linhas com três grafias — "Gestor de clientes", "Gestor do cliente" e
-- "Usuário" —, nenhuma delas correspondendo ao que o design define. O filtro
-- "Todos os perfis · Administrador · Gestor · Consulta" nunca encontraria essas
-- pessoas, e o campo perde a serventia de agrupar.
--
-- Catálogo, e não check constraint, pela mesma razão dos demais: a tela de
-- Configurações é a fonte da verdade, e um perfil novo entra por lá.

insert into public.catalogo_itens (catalogo, nome, ordem, ativo)
values
  ('perfis_portal', 'Administrador', 1, true),
  ('perfis_portal', 'Gestor',        2, true),
  ('perfis_portal', 'Consulta',      3, true)
on conflict (catalogo, nome) do nothing;

-- Normaliza o que já foi gravado à mão. São linhas de seed e de teste; a
-- correspondência é por aproximação e vale só para esta limpeza inicial.
update public.cliente_portal_usuarios
set perfil = case
  when perfil ilike '%admin%'  then 'Administrador'
  when perfil ilike '%gestor%' then 'Gestor'
  else 'Consulta'
end
where perfil not in ('Administrador', 'Gestor', 'Consulta');
