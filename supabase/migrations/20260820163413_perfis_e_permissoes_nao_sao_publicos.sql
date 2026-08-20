-- `perfis_acesso` e `permissoes_modulo` estavam com `for select using (true)`:
-- qualquer sessão autenticada lia a matriz inteira de perfis e de permissões por
-- módulo. Isso inclui o cliente do Portal e o operador em campo, que não têm o
-- que fazer com a configuração interna de acesso do escritório.
--
-- Só o Backoffice consome estas duas tabelas, e por três motivos:
--
--   1. o AuthProvider carrega as permissões do **próprio** perfil;
--   2. Meu Perfil mostra o nome do próprio perfil de acesso;
--   3. Gestão de Usuários lista os perfis para atribuir, e Configurações →
--      Permissões edita a matriz.
--
-- As policies abaixo cobrem exatamente esses três, e nada além.
--
-- `has_module_perm` é SECURITY DEFINER e roda como dona das tabelas, então
-- consultá-la de dentro da policy de `permissoes_modulo` não recursiona. Isso
-- não é confiança no raciocínio: `supabase/tests/rls/perfis_e_permissoes.sql`
-- faz a consulta e falharia por estouro de pilha se recursionasse.

drop policy if exists perfis_select_authenticated on public.perfis_acesso;
drop policy if exists permissoes_select_authenticated on public.permissoes_modulo;

create policy perfis_select on public.perfis_acesso
  for select using (
    has_module_perm('gestao_usuarios','ler')
    or has_module_perm('configuracoes','ler')
    -- O próprio perfil, para a pessoa ver em Meu Perfil a que grupo pertence.
    or id = (select p.perfil_acesso_id from public.profiles p where p.id = auth.uid())
  );

create policy permissoes_select on public.permissoes_modulo
  for select using (
    has_module_perm('configuracoes','ler')
    -- As próprias permissões: é o que o AuthProvider carrega no login para
    -- decidir o que mostrar. Sem isto, ninguém entra em lugar nenhum.
    or perfil_acesso_id = (select p.perfil_acesso_id from public.profiles p where p.id = auth.uid())
  );
