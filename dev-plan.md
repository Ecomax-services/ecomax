# Plano de Desenvolvimento — Ecomax

> **Status:** Proposta inicial · **Base:** Discovery (PRD.md, requirements.md, architecture.md, data-model.md, design-system.md, business-model.md, AGENTS.md, open-questions.md)
> **Escopo:** 3 plataformas (Web Backoffice, Portal do Cliente Web, App Operador Mobile) + Backend/API compartilhado.
> **Modelo de estimativa:** sprints de 2 semanas + esforço relativo (P/M/G/GG). Sem datas absolutas — cronograma derivado da capacidade do time no refinamento.
> **Tratamento de gaps:** os 37 bloqueadores do Discovery são endereçados via **premissas documentadas** (`[PREMISSA]`) para não travar o desenvolvimento; cada premissa deve ser validada com o cliente em paralelo. Ver seção 4.

---

## 1. Objetivo e escopo

Construir o ecossistema Ecomax que substitui IB8, Omie (parcial), Excel e WhatsApp por uma plataforma integrada, entregando valor de forma incremental:

| Plataforma | Público | Natureza |
|---|---|---|
| **Web Backoffice** | Administrativo, Operacional, Comercial, Financeiro, Gestor, RH | SPA web autenticada |
| **Portal do Cliente** | Clientes (empresas contratantes) | SPA web autenticada + páginas públicas (link de renovação) |
| **App Operador** | Técnicos de campo | Mobile nativo (React Native/Expo), **offline-first** |
| **Backend/API** | Todas as plataformas | API REST + jobs assíncronos + integrações |

**Princípio de entrega:** cada release fecha um flurxo de negócio ponta-a-ponta utilizável, não uma camada técnica isolada. A fundação técnica é o único release "horizontal".

---

## 2. Arquitetura de entrega

### 2.1 Stack (consolidada do Discovery)

- **Backend:** Node.js + TypeScript + **NestJS** (modular por contexto) + PostgreSQL 15 + Redis (cache, filas BullMQ).
- **Web (Backoffice + Portal):** React 18 + TypeScript + Vite + TanStack Query + Zustand + Tailwind + Radix/shadcn.
- **Mobile:** React Native + Expo (managed) + TypeScript + WatermelonDB (SQLite offline) + React Navigation + TanStack Query.
- **Integrações:** Omie ERP (REST), e-mail (SendGrid — tracking de abertura), storage S3.
- **Monorepo** (Turborepo/Nx) conforme `AGENTS.md`: `apps/{api,web-backoffice,web-portal-cliente,mobile-operador}` + `packages/{ui,shared,db}`.

> Nota: `architecture.md` propõe NestJS; `AGENTS.md` cita Express/Fastify+Prisma como provisório. **Decisão deste plano: NestJS + (Prisma ou TypeORM).** A definição final de ORM é uma tarefa do R0 (ADR).

### 2.2 Tracks de trabalho (paralelizáveis)

| Track | Responsabilidade |
|---|---|
| **T1 · Plataforma/DevOps** | Monorepo, CI/CD, ambientes, observabilidade, IaC, storage, secrets |
| **T2 · Backend/API** | Domínios NestJS, modelo de dados, RBAC, jobs, integrações |
| **T3 · Web Backoffice** | Telas administrativas |
| **T4 · Portal do Cliente** | Telas self-service + páginas públicas |
| **T5 · Mobile Operador** | App offline-first |
| **T6 · Design System** | `packages/ui` a partir do `design-system.md` |

A maioria dos épicos de front depende do épico de backend correspondente (contrato de API). O padrão é: **backend de um módulo entra 0,5–1 sprint antes** do front que o consome, ou os times trabalham contra contrato/mock (OpenAPI gerado pelo NestJS).

### 2.3 Convenção de tamanhos (esforço relativo)

| Tamanho | Referência | Ação |
|---|---|---|
| **P** | ≤ 3 dias de 1 dev | Tarefa direta |
| **M** | ~1 sprint de 1 dev | Épico padrão |
| **G** | ~2 sprints de 1 dev | Quebrar em histórias no refinamento |
| **GG** | 3+ sprints | **Deve** ser fatiado antes de entrar em sprint |

Tamanhos são **relativos e independentes de capacidade**. A duração em calendário sai do nº de devs por track × velocity medida nos 2 primeiros sprints.

---

## 3. Roadmap por release

Releases são marcos de valor. Dentro de cada um, os épicos estão agrupados por track com tamanho e dependências. A ordem entre releases é sequencial em valor, mas há sobreposição (o front de um release começa enquanto o backend do próximo é preparado).

### R0 · Fundação técnica e decisões de arranque
**Objetivo:** repositório, pipeline, modelo de dados base, autenticação e design system esqueleto funcionando ponta-a-ponta. Único release horizontal.

| # | Épico | Track | Tam. | Depende de |
|---|---|---|---|---|
| R0-1 | Monorepo + estrutura de pastas + lint/format/typecheck | T1 | M | — |
| R0-2 | CI/CD (build, lint, test, preview deploy) | T1 | M | R0-1 |
| R0-3 | Infra dev/staging (Postgres, Redis, S3, secrets) via Docker/IaC | T1 | M | R0-1 |
| R0-4 | ADRs de arranque (ORM, estratégia de auth/JWT, sync offline, RBAC) | T2 | P | — |
| R0-5 | Modelo de dados base + migrations (Usuario, PerfilAcesso, Permissao, Sessao, Token, Status auxiliar) | T2 | M | R0-3, R0-4 |
| R0-6 | Auth backend: login, logout, refresh, recuperação de senha, RBAC core | T2 | G | R0-5 |
| R0-7 | `packages/ui`: tokens + componentes base (Button, Input, Badge, Table, Drawer, Modal, Toast) do `design-system.md` | T6 | G | R0-1 |
| R0-8 | Shell de navegação web (sidebar, topbar, rotas, guarda de auth) — base Backoffice e Portal | T3/T4 | M | R0-7 |
| R0-9 | Telas de auth Web Backoffice (login, recuperar, criar senha) | T3 | M | R0-6, R0-8 |
| R0-10 | Bootstrap app mobile (Expo, navegação, storage offline, telas de auth) | T5 | G | R0-6 |

**Critério de saída:** um usuário faz login/logout e reset de senha nas 3 plataformas; CI verde; design system publicado; RBAC aplicável a rotas.

> Premissas relevantes: #6 (expiração token), #11 (tentativas de login), perfis de acesso — ver seção 4.

---

### R1 · Núcleo administrativo (Clientes, Usuários, Notificações)
**Objetivo:** cadastrar e gerir clientes/usuários e ter o backbone de notificações in-app + e-mail.

| # | Épico | Track | Tam. | Depende de |
|---|---|---|---|---|
| R1-1 | Domínio Gestão de Usuários + Perfis/Permissões (CRUD + UI admin) | T2/T3 | G | R0-6 |
| R1-2 | Domínio Cliente (CRUD, classificação ABC, endereço, contatos) | T2 | G | R0-5 |
| R1-3 | UI Backoffice: lista de clientes (filtros, busca, paginação ~2.115 reg.) + ficha do cliente | T3 | G | R1-2, R0-7 |
| R1-4 | Funcionários integrados, serviços do funcionário, integração com empresas, Linhas MEC | T2/T3 | G | R1-2 |
| R1-5 | Usuários do Portal do Cliente (provisionamento a partir do Backoffice) | T2/T3 | M | R1-1, R1-2 |
| R1-6 | Motor de notificações (in-app + e-mail via SendGrid + push mobile) + preferências | T2 | G | R0-3 |
| R1-7 | UI Notificações Backoffice (lista, filtros, marcar lida, agrupar por data, excluir) | T3 | M | R1-6 |

**Critério de saída:** equipe interna gerenciada com perfis; clientes e funcionários integrados cadastrados; notificações disparam e aparecem in-app/e-mail.

> Premissas: #12/#13 (gatilhos e config de notificação), #27/#30/#31/#32/#33 (MEC, integração empresas, linhas MEC), perfis de acesso — seção 4.

---

### R2 · Operacional — Ordens de Serviço (coração do sistema)
**Objetivo:** ciclo completo de OS no Backoffice: orçamento → OS → planos de controle → execução → conclusão.

| # | Épico | Track | Tam. | Depende de |
|---|---|---|---|---|
| R2-1 | Máquina de estados de OS (status, transições, cadastro auxiliar de status/cores) | T2 | G | R1-2 |
| R2-2 | Orçamentos (elaborar, frequência/valores, calendário/report, converter em OS) | T2/T3 | G | R2-1 |
| R2-3 | Emitir OS: campos, toolbar (10 ações), modal de emissão, OS avulsa vs. originada | T2/T3 | GG | R2-1 |
| R2-4 | Planos de controle (chips/drawers por tipo: Armadilha Luminosa, Roedores, Globo de Moscas, Praga de Grãos, Monitoramento de Áreas, Caixa D'água) + indicador de preenchimento | T2/T3 | GG | R2-3 |
| R2-5 | Vincular produtos à OS + modal almoxarifado (indicador de estoque por cor) | T2/T3 | G | R2-3, R4-1 |
| R2-6 | Mapa de pontos / croqui (upload PDF/imagem) + cronograma recorrente | T2/T3 | G | R2-3 |
| R2-7 | Detalhes da OS: histórico/auditoria, cancelar (motivo), duplicar, alertas de OS vencida | T2/T3 | G | R2-3 |
| R2-8 | Gerenciar funcionários na OS + indicador de documento vencido | T2/T3 | M | R1-4, R2-3 |

**Critério de saída:** uma OS percorre todo o fluxo no Backoffice, com produtos, planos, cronograma e auditoria.

> Premissas: #14/#15 (status e cores), #19/#20 (planos e ações), #16/#17 (anexos), #21/#27 (calendário/report), #36 (3.1.3) e correlatos — seção 4. **Este é o release de maior risco; planos de controle (R2-4) e emissão (R2-3) devem ser fatiados por tipo de plano.**

---

### R3 · App Operador (execução em campo, offline-first)
**Objetivo:** técnico executa a OS no celular, sem conexão, e sincroniza.

| # | Épico | Track | Tam. | Depende de |
|---|---|---|---|---|
| R3-1 | Engine de sincronização offline (WatermelonDB ↔ API, fila, resolução de conflitos, delta sync) | T2/T5 | GG | R0-10, R2-3 |
| R3-2 | Agenda do operador / OS atribuídas (download para offline) | T5 | G | R3-1 |
| R3-3 | Execução da OS: check-in/check-out com GPS, preenchimento de planos, mapa de pontos | T5 | GG | R3-1, R2-4 |
| R3-4 | Consumo de produtos + lote + diluição + baixa de estoque | T2/T5 | G | R3-3, R4-1 |
| R3-5 | Captura de fotos + assinatura digital | T5 | G | R3-3 |
| R3-6 | Push notifications (deep link para OS) | T5 | M | R1-6, R3-1 |
| R3-7 | Espelhamento execução (4.1.1) → backend para relatório técnico (mapeamento de campos) | T2 | G | R3-3 |

**Critério de saída:** operador recebe OS, executa offline (planos, fotos, assinatura, consumo, GPS) e os dados sincronizam ao reconectar.

> Premissas: #148 (estratégia offline), #37 (mapeamento app→relatório técnico), #35 (alinhamento de status executada/concluída) — seção 4. R3-1 é pré-requisito duro; prototipar a sync no início do release.

---

### R4 · Estoque, Produtos e Compras
**Objetivo:** controle de estoque que alimenta OS e compras, com fluxo de aprovação.

| # | Épico | Track | Tam. | Depende de |
|---|---|---|---|---|
| R4-1 | Domínio Produtos + Estoque (saldo, almoxarifados, lotes, vencimento, indicador por cor) | T2/T3 | G | R0-5 |
| R4-2 | Movimentações + Inventário (diário e físico) | T2/T3 | G | R4-1 |
| R4-3 | Fornecedores (cadastro, dados bancários, fornecedor principal, IQF/"melhor avaliado") | T2/T3 | G | R4-1 |
| R4-4 | Cotações (criar, enviar por e-mail, comparativo entre fornecedores) | T2/T3 | G | R4-3 |
| R4-5 | Requisições/Ordens de compra + fluxo de aprovação em 2 níveis (alçada) + recebimento c/ NF | T2/T3 | G | R4-4 |

**Critério de saída:** estoque consistente com consumo das OS; ciclo de compra (requisição→aprovação→recebimento) funcional.

> Premissas: #15 (limites do indicador), #24 (matriz de aprovação), #25 (fórmula IQF), #31 (NF), #33 (60 dias), #26 (telas do módulo) — seção 4.

---

### R5 · Financeiro / Integração Omie
**Objetivo:** sincronizar dados financeiros (NF, pedidos de compra) com Omie.

| # | Épico | Track | Tam. | Depende de |
|---|---|---|---|---|
| R5-1 | Camada de integração Omie (cliente API, auth, retry, fila, idempotência, dead-letter) | T2 | G | R0-3 |
| R5-2 | Mapeamento Garantia/OC ↔ Omie + emissão de NF na renovação | T2 | G | R5-1, R6-1 |
| R5-3 | Sincronização de pedidos de compra/clientes (conforme escopo Omie) | T2 | G | R5-1, R4-5 |
| R5-4 | Painel de monitoramento de integração (status, reprocessamento) | T2/T3 | M | R5-1 |

**Critério de saída:** eventos financeiros disparam integração confiável com Omie, com reprocessamento e observabilidade.

> Premissa CRÍTICA: #18 (mapeamento campo-a-campo Omie). Sem o mapeamento real, R5 fica em **[PREMISSA] + mock** até o cliente fornecer o contrato da API. Ver seção 4 — este gap não deve ser assumido cegamente; exige insumo do cliente.

---

### R6 · Garantias, Portal do Cliente e Relatórios
**Objetivo:** fechar o ciclo externo (cliente) e a camada de relatórios.

| # | Épico | Track | Tam. | Depende de |
|---|---|---|---|---|
| R6-1 | Garantias: detalhe, anexos (versionamento, tipos/tamanho), renovação | T2/T3 | G | R2-1 |
| R6-2 | Link público de renovação (subdomínio, rate limit, tracking 1ª abertura) | T2/T4 | M | R6-1 |
| R6-3 | Portal do Cliente: OS, documentos, relatórios técnicos, certificados, cronogramas, produtos homologados | T2/T4 | GG | R1-5, R2-7 |
| R6-4 | Relatórios técnicos (7.2): pré-preenchimento da execução, histórico de versões, comparação | T2/T3 | G | R3-7 |
| R6-5 | Relatórios internos (7.1): categorias, filtros, exportação, hub de indicadores | T2/T3 | G | R4-2 |
| R6-6 | Agendamento de relatórios recorrentes | T2 | M | R6-5 |

**Critério de saída:** cliente acompanha tudo no portal; relatórios técnicos e gerenciais emitidos e versionados.

> Premissas: #16/#17/#22 (anexos), #25 (1ª abertura), #26 (portal), #21/#36/#43 (relatórios) — seção 4.

---

## 4. Premissas adotadas para os bloqueadores (`[PREMISSA]`)

Cada premissa abaixo **destrava o desenvolvimento** e deve ser confirmada com o cliente em paralelo. Onde marcado **⚠ INSUMO DO CLIENTE**, não há premissa segura — exige dado externo antes de codar a parte afetada.

### Autenticação e segurança
- **#6 Token de recuperação:** validade **1 hora**, uso único; token expirado → mensagem "Link expirado, solicite um novo" + botão de reenvio. *(R0)*
- **#11 Tentativas de login:** bloqueio temporário após **5 tentativas**, 15 min; desbloqueio automático + opção de reset por e-mail. *(R0)*
- **Perfis de acesso (#105):** perfis iniciais = ADMIN, GESTOR, OPERACIONAL, COMERCIAL, FINANCEIRO, RH, OPERADOR, CLIENTE, com permissões CRUD por módulo (matriz default editável). *(R0/R1)*

### Notificações
- **#12 Config de notificação:** tela de preferências por **tipo** (OS, documentos, estoque, comercial) × canal (in-app / e-mail). *(R1)*
- **#13 Gatilhos:** documentos próximos = **30 dias antes**; OS vencida = a partir do dia seguinte à data programada; nova OS = na criação; destinatários = responsável + perfil do módulo. *(R1)*
- **#anexo "grande volume":** agrupar por data a partir de **20 notificações**.

### Operacional / OS
- **#14/#15 Status de OS:** Em aberto (cinza), Em andamento (azul), Executada (amarelo), Concluída (verde), Cancelada (vermelho); configurável em cadastro auxiliar. OS vencida = data programada < hoje. *(R2)*
- **#19/#20 Planos e ações:** cada tipo de plano tem formulário próprio (campos como JSONB validado por schema por tipo); cada uma das 10 ações tem pré-condição e transição definidas no refinamento do épico R2-3/R2-4.
- **#16/#17 Anexos:** máx **10 MB/arquivo**; tipos permitidos = PDF, JPG, PNG, DOCX, XLSX; executáveis bloqueados; versionamento mantém histórico, exclusão remove todas as versões com confirmação.
- **#35 Status p/ relatório técnico:** relatório técnico habilitado nos status **Executada** e **Concluída**.
- **#37 Espelhamento app→RT:** ⚠ **INSUMO DO CLIENTE** — mapeamento campo-a-campo (fotos, assinatura, produtos, pontos) deve ser confirmado; provisoriamente assume-se espelhamento direto 1:1.

### Estoque, compras e fornecedores
- **#15 Indicador de estoque:** verde > 50% do mínimo, amarelo 20–50%, vermelho < 20%.
- **#24 Aprovação de OC:** 2 níveis por alçada — até R$ X aprova gestor da área; acima, diretoria. Valor de corte **⚠ INSUMO DO CLIENTE**.
- **#25 IQF "melhor avaliado":** score 0–100 = 50% prazo médio + 50% taxa de resposta, mínimo 3 cotações; fornecedor novo entra como "sem histórico".
- **#31 NF de recebimento:** aceita PDF e XML (NF-e); leitura de chave de XML opcional fase 2; máx 10 MB.
- **#33 Vencimento de lote:** alerta padrão 60 dias, **configurável por categoria**.

### Integração Omie
- **#18 Mapeamento Omie:** ⚠ **INSUMO DO CLIENTE** — endpoints, autenticação, campos, sync/async, retry. Até receber: desenvolver contra **contrato mock** e isolar atrás de uma porta (interface) para troca sem reescrita. *(R5)*

### Portal do cliente / relatórios
- **#25 "1ª abertura" do link:** primeira abertura **absoluta** desde a geração do link (não por sessão).
- **#26 Portal do cliente:** subdomínio próprio, mesma identidade visual, autenticação herdada do Backoffice; links públicos sem login com token assinado e rate limit.
- **#21/#43 Relatórios:** cada categoria com filtros e exportação PDF/CSV; comparação de versões = diff lado a lado destacando alterações.

### Métricas (não bloqueiam dev de features; bloqueiam dashboards)
- **#1–#9 Métricas sem baseline** (produtividade, adoção, churn, health score, SLA, etc.): ⚠ **INSUMO DO CLIENTE**. O sistema é instrumentado para **coletar os eventos** desde o R0 (telemetria de uso, timestamps de processos); os **dashboards e metas** ficam para um release posterior, após o cliente definir baselines. Não bloqueiam as features operacionais.

> A lista completa dos 87 gaps está em `open-questions.md`. As premissas acima cobrem os 37 bloqueadores de forma agrupada; os de severidade média/baixa são resolvidos no refinamento de cada épico.

---

## 5. Dependências críticas (caminho principal)

```
R0 (fundação + auth + design system)
   └─> R1 (clientes, usuários, notificações)
          ├─> R2 (OS) ──────────────┬─> R3 (app operador, offline)  ──> R6-4 (relatório técnico)
          │                         └─> R6-1 (garantias) ──> R6-2 (link público)
          └─> R4 (estoque/compras) ──┬─> R5 (Omie)  [⚠ aguarda insumo do cliente #18]
                                     └─> R6-5 (relatórios internos)
   R1-5 + R2-7 ──> R6-3 (portal do cliente)
```

**Gargalos de atenção:**
1. **R2 (OS)** é o épico central — tudo a jusante (mobile, garantias, relatório técnico, portal) depende dele. Fatiar agressivamente.
2. **R3-1 (sync offline)** é risco técnico alto — prototipar isolado já no R0/início do R3.
3. **R5 (Omie)** e **#18** dependem de insumo externo — isolar atrás de interface e não bloquear o resto.

---

## 6. Estratégias transversais

- **Contrato-primeiro:** NestJS gera OpenAPI; front consome tipos gerados. Backend de cada módulo entra ~0,5–1 sprint à frente do front (ou front usa mock do contrato).
- **Offline sync:** WatermelonDB com sync incremental (push/pull por timestamp), fila de mutações, resolução de conflito "last-write-wins por campo + log de divergência". Prototipar cedo.
- **RBAC:** guardas por módulo/ação no backend (decorators NestJS) + ocultação de UI no front; perfis seedados.
- **Notificações:** um produtor de eventos de domínio → consumidores (in-app, e-mail SendGrid, push Expo). Preferências por tipo×canal.
- **Design system:** `packages/ui` é fonte única; Backoffice e Portal compartilham componentes com temas distintos; mobile reusa lógica (validações/formatos) de `packages/shared`.
- **Qualidade (gates do `AGENTS.md`):** unit ≥80% domínio, integração por fluxo, E2E happy path (Playwright web / Detox mobile), lint+typecheck+build verdes, sem `any`/`console.log`. Regra de ouro: **não inventar requisito** — marcar `[A DEFINIR]`/`[PREMISSA]`.
- **Telemetria desde o R0:** instrumentar eventos de uso e tempos de processo para viabilizar as métricas (#1–#9) quando os baselines chegarem.

---

## 7. Riscos e mitigação

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| 37 bloqueadores não validados a tempo | Alta | Alto | Premissas documentadas + validação paralela; backlog de "confirmar premissa" por release |
| Mapeamento Omie (#18) atrasa | Alta | Alto | Isolar atrás de interface + mock; R5 não bloqueia demais releases |
| Complexidade do offline (R3-1) | Média | Alto | Spike/protótipo no R0; escolher WatermelonDB cedo; testes de conflito |
| Escopo de OS (R2) maior que estimado | Alta | Alto | Fatiar por tipo de plano e por ação; entregar OS avulsa simples primeiro |
| Volume de dados (~2.115 clientes / ~9k OS) | Baixa | Médio | Paginação server-side, índices, full-text desde o início |
| Discovery incompleto (data-model/requirements só cobrem parte) | Média | Médio | Refinar modelo de dados por release; não tratar data-model.md como final |

---

## 8. Definition of Done (por épico)

Herda os gates do `AGENTS.md` §4:
- [ ] Testes (unit ≥80% domínio, integração de fluxo, E2E happy path + erros principais) verdes.
- [ ] `lint` + `typecheck` + `build` sem erros/warnings; sem `any` injustificado, sem `console.log`.
- [ ] Conformidade com requirements.md / PRD; pendências marcadas `[A DEFINIR]`/`[PREMISSA]` no código.
- [ ] Acessibilidade conforme `design-system.md` §4 (contraste, foco, labels) para telas.
- [ ] Premissas usadas no épico registradas e enviadas para validação do cliente.

---

## 9. Próximos passos imediatos

1. **Validar este plano** e as premissas da seção 4 com o Product Owner.
2. **Agendar workshop** para os 3 insumos que não podem ser premissados: **#18 (Omie)**, **#24 (alçada de aprovação)**, **#37 (mapeamento app→relatório técnico)** e baselines de métricas (#1–#9).
3. **Iniciar R0** (não depende de nenhuma premissa de negócio): monorepo, CI/CD, infra, modelo base, auth, design system.
4. **Medir velocity** nos 2 primeiros sprints do R0 para converter os tamanhos (P/M/G/GG) em cronograma de calendário.
5. **Refinar** R1 e R2 em histórias enquanto o R0 roda (épicos GG de OS e planos de controle precisam ser fatiados antes de entrar em sprint).
