-- Fecha o UPDATE de notificações com WITH CHECK.
--
-- A policy original só tinha USING, então o destinatário podia marcar como lida
-- e, na mesma operação, reendereçar a notificação para outra pessoa. O
-- WITH CHECK garante que a linha continue endereçada a quem pode vê-la.

drop policy if exists notif_update on public.notificacoes;
create policy notif_update on public.notificacoes
  for update to authenticated
  using (
    para_profile_id = auth.uid()
    or (para_role is not null and para_role = public.current_user_role()::text)
    or (para_cliente_id is not null and para_cliente_id in (select public.my_portal_cliente_ids()))
  )
  with check (
    para_profile_id = auth.uid()
    or (para_role is not null and para_role = public.current_user_role()::text)
    or (para_cliente_id is not null and para_cliente_id in (select public.my_portal_cliente_ids()))
  );
