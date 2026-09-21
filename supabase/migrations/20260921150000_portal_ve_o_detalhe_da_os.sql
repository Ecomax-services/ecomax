-- ============================================================================
-- O Portal do Cliente passa a enxergar o detalhe da ordem de serviço
-- ============================================================================
-- O protótipo do Portal abre a OS num detalhe com quatro abas: Relatórios
-- Técnicos, Mapeamento, Cronograma e Certificado. Duas delas já funcionavam
-- (`os_relatorios` e `os_cronograma` têm policy de portal desde o começo), e as
-- outras duas não tinham como funcionar: `os_planos_controle`,
-- `os_plano_pontos` e `os_anexos` têm RLS ligada e nenhuma policy que aceite o
-- usuário do portal. O cliente recebia zero linhas, sem erro — RLS não avisa,
-- só não devolve.
--
-- As policies espelham `osrel_cliente_select`, que já resolvia o mesmo problema
-- para relatórios: o vínculo é sempre "a OS é de um cliente meu", respondido por
-- `os_is_my_cliente`.
--
-- Nada aqui abre escrita. O Portal é ambiente de leitura, e as policies são
-- todas `for select`.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Mapeamento: plano de controle e seus pontos
-- ---------------------------------------------------------------------------
-- É o que prova ao cliente que os pontos combinados foram visitados, e em que
-- situação cada um estava. Sem isto a aba existiria vazia para sempre.
drop policy if exists osplanos_cliente_select on public.os_planos_controle;
create policy osplanos_cliente_select on public.os_planos_controle
  for select to authenticated
  using (public.os_is_my_cliente(os_id));

-- O ponto não tem `os_id`: pendura no plano. A checagem passa pelo plano para
-- não duplicar a regra — se o vínculo do plano mudar, o ponto acompanha.
drop policy if exists ospontos_cliente_select on public.os_plano_pontos;
create policy ospontos_cliente_select on public.os_plano_pontos
  for select to authenticated
  using (
    exists (
      select 1
        from public.os_planos_controle p
       where p.id = os_plano_pontos.plano_id
         and public.os_is_my_cliente(p.os_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Certificado
-- ---------------------------------------------------------------------------
-- O certificado de execução é o documento que o cliente arquiva e mostra à
-- fiscalização — é o desfecho do serviço, do ponto de vista dele.
--
-- Ele ainda não é gerado pelo sistema: `lib/impressao.ts` registra que
-- relatório técnico e certificado "saem assinados e pedem geração no servidor".
-- Até lá, o tipo entra na lista de anexos para a equipe subir o arquivo pelo
-- Backoffice, e a aba do Portal passa a ter conteúdo. Quando a geração
-- automática existir, ela grava no mesmo lugar e nada na tela muda.
alter table public.os_anexos drop constraint if exists os_anexos_tipo_check;
alter table public.os_anexos add constraint os_anexos_tipo_check
  check (tipo = any (array['foto', 'comprovante', 'autorizacao', 'certificado', 'extra', 'outro']));

-- O cliente vê o certificado e o comprovante — documentos que existem para ele.
-- Foto, autorização e anexo interno ficam de fora de propósito: são material de
-- trabalho da equipe, e o protótipo do Portal não os mostra em lugar nenhum.
drop policy if exists osanexos_cliente_select on public.os_anexos;
create policy osanexos_cliente_select on public.os_anexos
  for select to authenticated
  using (
    tipo in ('certificado', 'comprovante')
    and public.os_is_my_cliente(os_id)
  );
