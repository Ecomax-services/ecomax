-- Perfil "Operador de Campo", para o Backoffice conseguir criar operador.
--
-- Havia um vão no cadastro: a tela de Gestão de Usuários deriva o papel a partir
-- do perfil escolhido, e nenhum dos cinco perfis resultava em `role = 'operador'`
-- — todos caíam em 'operacional'. Como `hasMobileAccess` exige exatamente
-- 'operador', não existia caminho para criar quem usa o aplicativo de campo.
-- Nem para o QA, nem em produção: o único operador do banco veio do seed.
--
-- O perfil entra SEM nenhuma linha em permissoes_modulo, e isso é deliberado —
-- o operador não usa o Backoffice. O acesso dele vem das policies de escopo
-- (os_is_mine), não da matriz de módulos. É o mesmo desenho do perfil Cliente,
-- que também não tem linha nenhuma.
--
-- Efeito colateral nenhum sobre o operador que já existe: ele segue com
-- perfil_acesso_id nulo, e `has_module_perm` devolve false nos dois casos.

insert into public.perfis_acesso (nome, descricao)
values ('Operador de Campo', 'Operador que usa o aplicativo em campo. Não acessa o Backoffice — o alcance dele vem do vínculo com a OS.')
on conflict (nome) do nothing;
