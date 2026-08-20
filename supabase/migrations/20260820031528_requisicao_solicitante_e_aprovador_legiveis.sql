-- A tela de Requisições mostrava "Solicitante: —" sempre e "Aprovador: —" mesmo
-- em requisição já aprovada, com o nome de quem aprovou gravado no banco.
--
-- As duas colunas apontavam para `auth.users`, e o PostgREST não resolve embed
-- em `auth` — o schema não é exposto. Sem caminho para o nome, o código
-- devolvia traço.
--
-- Mesmo caso já corrigido em comercial_follow_ups.responsavel_id: `profiles`
-- guarda `nome_completo`, vive em `public`, e sua PK já referencia auth.users,
-- então os valores continuam válidos.
--
-- `aprovador_id` (quem DEVE aprovar) fica como está: já aponta para
-- `funcionarios`, que é de `public`, e sempre funcionou. São coisas diferentes —
-- o designado e quem de fato aprovou.

alter table requisicoes
  drop constraint requisicoes_solicitante_id_fkey;

alter table requisicoes
  add constraint requisicoes_solicitante_id_fkey
  foreign key (solicitante_id) references profiles(id) on delete set null;

alter table requisicoes
  drop constraint requisicoes_aprovado_por_fkey;

alter table requisicoes
  add constraint requisicoes_aprovado_por_fkey
  foreign key (aprovado_por) references profiles(id) on delete set null;
