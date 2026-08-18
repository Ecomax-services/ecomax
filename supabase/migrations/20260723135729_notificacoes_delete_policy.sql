-- Permite ao destinatário excluir a própria notificação (ação "Excluir" da tela).

create policy notif_delete on public.notificacoes
  for delete to authenticated using (
    para_profile_id = auth.uid()
    or (para_role is not null and para_role = public.current_user_role()::text)
    or (para_cliente_id is not null and para_cliente_id in (select public.my_portal_cliente_ids()))
  );
