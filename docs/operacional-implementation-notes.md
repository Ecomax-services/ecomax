# Módulo Operacional (Ordens de Serviço) — Implementação

> Fonte: FigJam "[Ecomax] Discovery (8)" — board **Operacional**.
> Padrões espelhados de Gestão de Clientes / Estoque (mesmas convenções de schema, RLS,
> camada de dados e UI). Chave de módulo: `operacional` (já existe no enum `module_key` e no
> `ModuleKey` do front; item da Sidebar já declarado, só reabilitado).

## Telas entregues
- **4** Lista unificada de orçamentos + OS (`OperacionalList.tsx`)
- **4.1** Detalhe da OS com 6 abas internas (`OrdemServicoDetalhe.tsx`):
  a. Dados gerais · b. Execução · c. Produtos e equipamentos · d. Relatórios · e. Anexos · f. Histórico
- **4.2 / 4.2.1** Criar OS — wizard de 3 etapas (`CriarOrdemServico.tsx`):
  1. Dados gerais · 2. Vincular produtos e dados · 3. Revisão e conclusão

## Modelo de dados (migrations `20260722120000..121000_operacional_*`)
- `ordens_servico` — OS. `codigo` = `OS-####` (sequence). `orcamento_id` NULL ⇒ **Avulsa**;
  preenchido ⇒ **A partir de orçamento**. `status` (slug): `em_aberto | em_andamento | executada |
  concluida | cancelada`. Multi-valores como `text[]`: `tipos_servico`, `pragas`, `epis`(derivado).
  Campos de captura mobile (read-only no back office): `check_in_*`, `check_out_*`, `assinatura_url`.
  `rascunho boolean` (Salvar como rascunho). `data_programada` não pode ser passada (regra).
- `os_funcionarios` — funcionários vinculados (execução). `os_produtos` — produtos previstos
  (`qtd_recomendada`) + consumo (`qtd_utilizada`, preenchido pelo app; back office read-only/ajuste).
  `os_equipamentos` — equipamentos do inventário (produto categoria Equipamento) + nº série + responsável.
  `os_relatorios` — relatórios técnicos (publicáveis no portal). `os_anexos` — anexos tipados.
  `os_historico` — trilha por-campo (campo/valor_anterior/valor_novo/ator/timestamp). `os_cronograma`
  — datas geradas por recorrência.
- RLS: todas as tabelas `os_*` via `has_module_perm('operacional', ação)` (loop do-block, igual clientes).
- Storage: bucket privado `operacional-docs` (relatórios/anexos/mapa/assinatura/fotos).

## Regras de negócio (board → código)
- OS `concluida`/`cancelada` ⇒ **somente leitura** (`isReadOnly`).
- Toda edição em 4.1 grava em `os_historico` (campo, antes, depois, usuário, timestamp).
- Cancelar OS exige **motivo** (ConfirmDialog com justificativa).
- Não permitir `data_programada` no passado (validação no wizard e no update).
- Assinatura do cliente obrigatória para marcar como **executada**.
- Disponibilizar relatório ao cliente só com OS `executada`/`concluida`.
- Baixa de estoque **não** ocorre ao criar OS — só no consumo real do app (documentado; `qtd_utilizada`).
- Acesso: apenas perfis Operacional e Administrativo (+ admin sempre).

## Decisões sênior / desvios documentados
- **Status como slug fixo + tom estático** (`osStatusTone`/`osStatusLabel` na lib), espelhando
  `orcStatusTone`/`reqStatusTone`. O catálogo `status_os` (Configurações) segue como superfície de
  rótulos/cores; o ciclo de vida usa slugs estáveis para dirigir regras (readonly/cancel).
- **Multi-select** (tipos de serviço, pragas) populados de `catalogo_itens` via `listCatalogoAtivos`.
  EPIs derivados dos produtos (snapshot em `epis`, read-only) — aqui derivados por categoria/heurística
  simples do catálogo `epis` na ausência de vínculo produto↔EPI (documentado como ponto de evolução).
- **Reuso**: `listProdutos`/`listBases` (estoque), `listCatalogoAtivos` (configuracoes),
  `docState` (bloqueio de funcionário com ASO/CNH vencidos ao vincular), `auditoria` (modulo='operacional').

## Stubs (coerentes com o módulo Clientes)
Notificações reais (app/portal/e-mail), Exportar/Imprimir PDF, upload real p/ storage, publicar no
portal do cliente, Omie/NF e captura mobile — expõem ação + toast e gravam histórico/estado quando há
dado local; a integração externa é adiada (mesma política de "Criar MEC EPF"/"Gerar link" em Clientes).

## Dependência de RBAC entre módulos
Os seletores de produto/equipamento consomem `vw_produtos`/`produtos` (RLS do módulo **estoque**).
Para o perfil **Operacional** ver e escolher produtos nos modais, ele precisa de `estoque: leitura`
(coerente com "Impactos em outros módulos → Produtos: consulta estoque"). O `admin` não é afetado.
Ajuste na tela **Configurações → Permissões** (ou via seed próprio do estoque).

## Estado: COMPLETO (pendente aplicar migrations + verificação de build)
Telas 4, 4.1 (6 abas), 4.2/4.2.1 (wizard) implementadas; rotas em `App.tsx` sob
`RequireModule module="operacional"`; item da Sidebar reabilitado.

## Aplicar / verificar
1. Migrations: `supabase db push` (ou aplicar os 3 arquivos `20260722*_operacional_*.sql` na ordem)
   — o MCP do Supabase aqui exige autenticação, então não foram aplicadas nesta sessão.
2. `npm --prefix apps/web-backoffice run typecheck` e `... run build`.
3. `npm --prefix apps/web-backoffice run dev` → login como Operacional/Admin → menu **Operacional**.

## App Operador (mobile-operador) — captura em campo
Fecha o ciclo: o que hoje é read-only no back office (consumo, check-in/out, assinatura) é
preenchido aqui pelo operador.
- **RLS escopada** (migration `20260723120000_operacional_operador_rls.sql`): o operador NÃO recebe o
  módulo inteiro; enxerga/atualiza apenas as OS em que está vinculado (`os_is_mine()` via
  `os_funcionarios ↔ funcionarios.profile_id = auth.uid()`), incluindo leitura escopada de
  cliente/produtos. Policies permissivas — o back office segue intacto.
- **Dados**: `apps/mobile-operador/src/lib/operacional.ts` (listMinhasOs, getOs, check-in/out,
  salvarConsumo, confirmarAssinatura, registrarFoto, marcarExecutada, listAgenda).
- **Telas**: `screens/os/OsListScreen.tsx`, `screens/os/OsDetailScreen.tsx`, `screens/AgendaScreen.tsx`;
  abas OS/Agenda deixam de ser placeholder (`navigation/MainTabs.tsx` + `OsStackParamList`).
- **Deps**: sem câmera/GPS/assinatura-pad no `package.json` → consumo/check-in/out/assinatura/foto
  gravam metadados + timestamp; captura nativa (GPS/foto/assinatura desenhada) fica para **R3**.
- **Verificar**: `npm --prefix apps/mobile-operador run typecheck`; para testar ponta a ponta, o
  operador logado precisa ter `funcionarios.profile_id` = seu uid **e** estar vinculado a uma OS
  (aba Execução no back office, ou ajustar o seed). O seed atual vincula "Técnico de Campo" sem login.

## Notificações reais (persistidas) — os 3 apps
Tabela `public.notificacoes` (migration `notificacoes`) com destinatário por `para_profile_id`,
`para_role` (broadcast) ou `para_cliente_id` (portal, casado por e-mail via `my_portal_cliente_ids()`).
RLS select/insert/update/delete escopada ao destinatário (WITH CHECK espelha USING).
- **Produtores** (`web-backoffice/src/lib/operacional.ts` → `criarNotificacao`): OS criada/atribuída →
  notifica o profile do funcionário vinculado; relatório publicado → notifica o cliente (`para_cliente_id`).
- **Consumidores**: `web-backoffice/src/lib/notificacoes.ts` + `pages/Notifications.tsx`;
  `web-portal-cliente/src/lib/notificacoes.ts` + `pages/Notifications.tsx`;
  `mobile-operador/src/lib/notificacoes.ts` + `screens/NotificationsScreen.tsx` (todos lendo a mesma tabela).

## Portal do Cliente — Ordens de Serviço
RLS (migration `operacional_portal_cliente_rls`): cliente lê as próprias OS, relatórios **publicados**
e cronograma (helpers `my_portal_cliente_ids()` / `os_is_my_cliente()`). Tela
`web-portal-cliente/src/pages/OrdensServico.tsx` (rota `/ordens`, item da Sidebar reabilitado):
lista de OS + relatórios técnicos para download + cronograma de visitas.

## R3 — captura nativa (GPS / foto / assinatura) no app do operador — PLANO (não aplicado)
Não instalado aqui para não quebrar o `typecheck` verde. Para habilitar no device:
1. `npx expo install expo-location expo-image-picker` e `npm i react-native-signature-canvas` (WebView-based).
2. Em `screens/os/OsDetailScreen.tsx`, no check-in: `Location.requestForegroundPermissionsAsync()` +
   `Location.getCurrentPositionAsync()` → passar `{lat,lng}` para `registrarCheckIn` (a lib e as colunas
   `check_in_lat/lng`, `check_out_lat/lng` já existem — só popular).
3. Foto: `ImagePicker.launchCameraAsync()` → `supabase.storage.from('operacional-docs').upload(...)` →
   `registrarFoto(osId, path)` (o bucket já existe e tem policies).
4. Assinatura: `react-native-signature-canvas` num modal → exporta base64 → upload no bucket →
   gravar o path em `assinatura_url` (hoje `confirmarAssinatura` grava um placeholder).
As colunas, o bucket e as funções da camada de dados já suportam esses valores — o R3 é só troca da
origem (placeholder → captura real).
