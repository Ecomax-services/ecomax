-- A tela Comercial > Follow-ups não abria: "Could not find a relationship
-- between 'comercial_follow_ups' and 'responsavel_id' in the schema cache".
--
-- A chave estrangeira existia, mas apontava para `auth.users`. O PostgREST só
-- resolve embed dentro dos schemas que expõe, e `auth` não é um deles — então
-- `responsavel:responsavel_id(nome_completo)` não tinha como funcionar. Some o
-- caminho, e a lista inteira falha, não só a coluna do responsável.
--
-- `profiles` é o alvo certo: é quem guarda `nome_completo`, vive em `public` e
-- sua PK já referencia auth.users — os valores continuam válidos.
--
-- As outras duas colunas `responsavel_id` do sistema (bases, os_equipamentos)
-- apontam para `funcionarios`, que também é de `public`, e por isso sempre
-- funcionaram.

alter table comercial_follow_ups
  drop constraint comercial_follow_ups_responsavel_id_fkey;

alter table comercial_follow_ups
  add constraint comercial_follow_ups_responsavel_id_fkey
  foreign key (responsavel_id) references profiles(id) on delete set null;
