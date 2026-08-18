-- Preferências de notificação por usuário.
--
-- O Portal do Cliente guardava isso em localStorage: a escolha sumia ao trocar
-- de navegador ou de aparelho, e o servidor nunca ficava sabendo — o que torna
-- impossível respeitá-la na hora de disparar e-mail, que é justamente o que a
-- preferência promete controlar.
--
-- jsonb, e não colunas: a lista de canais vai crescer (push, WhatsApp) e cada
-- um viraria uma migration e um deploy dos três apps.
--
-- Sem valor padrão no banco de propósito. `null` significa "nunca escolheu", e
-- é a aplicação que decide o padrão — assim dá para mudar o padrão sem reescrever
-- a escolha de quem já respondeu.
alter table public.profiles add column if not exists preferencias jsonb;

comment on column public.profiles.preferencias is
  'Preferências do usuário, por canal. Ex.: {"notif_portal": true, "notif_email": false}. Null = nunca definiu.';

-- Não é preciso policy nova: profiles_update_self_or_admin já permite ao usuário
-- editar a própria linha, com USING e WITH CHECK ((id = auth.uid()) OR is_admin()).
