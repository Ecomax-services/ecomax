# Plano de implementação (implementation-plan.md)

## 1. Visão geral

Este documento descreve o **plano de implementação incremental** do sistema Ecomax, estruturado em **5 releases** que priorizam a entrega de valor de forma progressiva, começando pela fundação técnica e evoluindo até features completas de negócio.

### 1.1. Estratégia de entrega

- **Fase 1 (R1):** Fundação técnica — setup, autenticação, modelo de dados base
- **Fase 2 (R2):** Módulos administrativos essenciais — gestão de clientes, usuários, produtos
- **Fase 3 (R3):** Operacional completo — criação e gestão de OS, notificações, histórico
- **Fase 4 (R4):** App mobile do operador + módulo financeiro (ordens de compra, integração Omie)
- **Fase 5 (R5):** Portal do cliente + módulos comercial e relatórios

### 1.2. Premissas e dependências conhecidas

- **Integração Omie:** [A DEFINIR — depende de mapeamento de campos Garantia↔Omie, endpoint da API, autenticação e tratamento de erros (gap #18)]
- **Métricas de produtividade, uptime, SLA:** [A DEFINIR — depende de definição de baselines, metas quantitativas e forma de medição (gaps #1, #2, #5, #15)]
- **Perfis de acesso e permissões:** [A DEFINIR — depende de matriz RACI detalhada e definição de Admin, Gestor, Operacional (gap #105)]
- **Política de senha completa:** especificada parcialmente (8-16 caracteres, número, letra, caractere especial); detalhes adicionais (aceita maiúsculas/minúsculas, lista de caracteres especiais permitidos) seguem regra de senha forte padrão da indústria
- **Templates de e-mail:** [A DEFINIR — depende de especificação de conteúdo, campos dinâmicos e layout dos templates de cotação, notificações e recuperação de senha (gaps #22, #65)]
- **Fluxo de aprovação de ordens de compra:** [A DEFINIR — depende de matriz de aprovação (perfil/cargo), regras de alçada por valor e se há dispensa de aprovação (gap #24)]
- **Fórmula de cálculo do IQF:** [A DEFINIR — depende de algoritmo de avaliação, pesos e período de referência (gap #25)]
- **Configurações de notificação:** [A DEFINIR — depende de detalhamento de onde/como usuário configura preferências e opções disponíveis (gap #11, #12)]
- **Status de OS e transições:** [A DEFINIR — depende de lista completa de status possíveis, fluxo de transição e cores/rótulos (gap #14, #40)]
- **Comportamento offline do app mobile:** [A DEFINIR — depende de estratégia de sincronização, armazenamento local e resolução de conflitos (gap #148)]

---

## 2. Release 1 (R1): Fundação técnica — 8h estimadas

**Objetivo:** Estabelecer infraestrutura, modelo de dados base, autenticação funcional e CI/CD.

### Fase 1.1: Setup de projeto e infraestrutura

- [ ] **TASK-001: Configurar repositórios e estrutura de pastas**
  - **Objetivo:** Criar repositórios Git (backend, frontend web, app mobile) com estrutura de pastas padrão (src, tests, docs, scripts)
  - **Arquivos/áreas:** `README.md`, `.gitignore`, `package.json` (ou equivalente), estrutura de diretórios
  - **Dependências:** Nenhuma
  - **Gates:** Estrutura commitada, README com instruções de setup, linter configurado

- [ ] **TASK-002: Configurar CI/CD básico**
  - **Objetivo:** Pipeline de build, lint e testes unitários automatizados no push/PR
  - **Arquivos/áreas:** `.github/workflows/ci.yml` (ou equivalente), scripts de build
  - **Dependências:** TASK-001
  - **Gates:** Pipeline passa em repositório vazio (smoke test), notificação de falha ativa

- [ ] **TASK-003: Configurar banco de dados e migrations**
  - **Objetivo:** Instanciar banco (Postgres/MySQL sugerido), ferramenta de migrations (Prisma, TypeORM, Alembic)
  - **Arquivos/áreas:** `docker-compose.yml`, schema inicial vazio, configuração de conexão
  - **Dependências:** TASK-001
  - **Gates:** Banco sobe via docker-compose, migrations rodam sem erro, rollback funciona

- [ ] **TASK-004: Modelar entidades base (schema v0.1)**
  - **Objetivo:** Criar tabelas User, Session (autenticação) e entidade auxiliar de Status (para OS, orçamentos)
  - **Arquivos/áreas:** `migrations/001_create_users_sessions.sql`, modelos ORM
  - **Dependências:** TASK-003
  - **Gates:** Migration aplica sem erro, tipos/constraints validados, seed de dados de teste OK

### Fase 1.2: Autenticação (Backoffice + Cliente + Operador)

- [ ] **TASK-005: Implementar autenticação backend (login, logout, validação de token)**
  - **Objetivo:** Endpoint `/auth/login` (e-mail + senha), `/auth/logout`, middleware de validação JWT
  - **Arquivos/áreas:** `auth.controller.ts`, `auth.service.ts`, middleware `verifyToken.ts`
  - **Dependências:** TASK-004
  - **Gates:** Testes unitários de login válido/inválido, token gerado/validado, senha hasheada (bcrypt ou similar)

- [ ] **TASK-006: Implementar recuperação de senha (envio de link, validação de token, reset)**
  - **Objetivo:** Endpoint `/auth/forgot-password` (envia e-mail com token), `/auth/reset-password` (valida token e salva nova senha)
  - **Arquivos/áreas:** `auth.service.ts`, template de e-mail de recuperação, tabela `password_reset_tokens`
  - **Dependências:** TASK-005
  - **Gates:** E-mail enviado (mock ou serviço real), token expira corretamente ([A DEFINIR — prazo de validade do token, gap #6]), senha atualizada com sucesso, testes de token expirado/inválido passam
  - **[A DEFINIR — depende de prazo de validade do token de recuperação de senha (gap #6)]**

- [ ] **TASK-007: Implementar tela de login (Backoffice web)**
  - **Objetivo:** Form com e-mail, senha, "Esqueci minha senha", feedback de erro/sucesso inline
  - **Arquivos/áreas:** `pages/Login.tsx`, componentes `Input`, `Button`, serviço de autenticação
  - **Dependências:** TASK-005
  - **Gates:** Formulário valida campos obrigatórios, exibe mensagens de erro ([A DEFINIR — mensagens exatas de erro/sucesso, gap #10]), redireciona para dashboard após login, campo de senha oculta caracteres com toggle "Mostrar"

- [ ] **TASK-008: Implementar tela de recuperação de senha (Backoffice web)**
  - **Objetivo:** Form com e-mail, botão "Enviar link", tela de confirmação de e-mail enviado, tela de criar nova senha (validação de força)
  - **Arquivos/áreas:** `pages/ForgotPassword.tsx`, `pages/ResetPassword.tsx`, validação de senha (8-16 chars, número, letra, especial)
  - **Dependências:** TASK-006, TASK-007
  - **Gates:** Link enviado, tela de confirmação exibida, nova senha validada conforme política, feedback visual de força de senha (fraco/médio/forte), usuário consegue fazer login com nova senha

- [ ] **TASK-009: Implementar autenticação no app mobile (Login, Recuperar senha, Criar nova senha)**
  - **Objetivo:** Telas 1, 1.1, 1.1.1 do app Operador (mesma lógica do web, UI mobile)
  - **Arquivos/áreas:** `screens/Login.tsx`, `screens/ForgotPassword.tsx`, `screens/ResetPassword.tsx` (React Native ou Flutter)
  - **Dependências:** TASK-005, TASK-006
  - **Gates:** Login funciona, recuperação de senha envia e-mail, nova senha salva, UI responsiva em Android/iOS, validação de campos inline

- [ ] **TASK-010: Implementar autenticação no Portal do Cliente (Login, Recuperar senha, Criar nova senha)**
  - **Objetivo:** Telas 1, 1.1, 1.1.1 do Portal Cliente (mesma lógica do Backoffice, UI diferenciada)
  - **Arquivos/áreas:** `pages/Login.tsx`, `pages/