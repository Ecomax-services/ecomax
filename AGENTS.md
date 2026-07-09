# AGENTS.md — Instruções para o Agente de IA

**Produto:** Ecomax — plataforma para centralizar, automatizar e integrar processos operacionais, comerciais, técnicos, documentais e parcialmente financeiros da empresa em um único ecossistema digital. O sistema elimina retrabalho, falhas de comunicação entre áreas e dependência de processos manuais, atendendo operadores de campo (via app mobile), equipe administrativa (via web backoffice) e clientes (via portal web).

---

## 1. Stack e ferramentas

**[A DEFINIR — depende de decisão de arquitetura]**

Enquanto a stack não for definida, assuma provisoriamente:

- **Frontend Web (Backoffice e Portal Cliente):** React 18+ com TypeScript, Vite, React Router, TanStack Query, shadcn/ui (Radix UI + Tailwind CSS).
- **Mobile (Operador):** React Native com TypeScript, Expo SDK (managed workflow), React Navigation, AsyncStorage para offline, expo-location para GPS.
- **Backend:** Node.js (Express ou Fastify), TypeScript, Prisma ORM.
- **Banco de dados:** PostgreSQL 15+.
- **Autenticação:** JWT (access + refresh tokens).
- **Infraestrutura:** Docker, deploy em [A DEFINIR].
- **Testes:** Vitest (unit), Playwright (E2E web), Detox (E2E mobile).
- **Linting/formatação:** ESLint, Prettier, Biome (se adotado).
- **CI/CD:** GitHub Actions (ou equivalente).

Se a arquitetura já estiver definida em outro documento (ex: ARCHITECTURE.md), **consulte-a e siga-a rigorosamente**.

---

## 2. Estrutura de pastas sugerida

```
/
├─ apps/
│  ├─ web-backoffice/        # React (Vite) — ambiente administrativo
│  ├─ web-portal-cliente/    # React (Vite) — portal do cliente
│  ├─ mobile-operador/       # React Native (Expo) — app do operador
│  └─ api/                   # Node.js (Express/Fastify) — backend
├─ packages/
│  ├─ ui/                    # Componentes compartilhados (shadcn/ui)
│  ├─ shared/                # Utilitários, tipos, constantes
│  └─ db/                    # Schema Prisma, migrations, seeds
├─ docs/
│  ├─ AGENTS.md              # Este arquivo
│  ├─ PRD.md
│  ├─ ARCHITECTURE.md
│  ├─ SPECS.md
│  └─ wireframes/
├─ .github/workflows/        # CI/CD
├─ docker-compose.yml
└─ README.md
```

Ajuste conforme necessidade (monorepo vs multirepo, Turborepo vs Nx, etc.). Documente mudanças no README.

---

## 3. Como rodar o projeto

### 3.1. Requisitos

- Node.js 20+ (LTS)
- Docker + Docker Compose
- Expo CLI (`npm install -g expo-cli`) para mobile
- PostgreSQL 15+ (via Docker ou local)

### 3.2. Instalação

```bash
# Clone o repositório
git clone <repo-url>
cd ecomax

# Instale dependências
npm install  # ou pnpm install, yarn install

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com credenciais do banco, secrets JWT, etc.

# Suba banco de dados
docker-compose up -d postgres

# Rode migrations
npm run db:migrate

# (Opcional) Popule banco com dados de teste
npm run db:seed
```

### 3.3. Desenvolvimento

```bash
# Backend
npm run dev:api         # http://localhost:3000

# Web Backoffice
npm run dev:backoffice  # http://localhost:5173

# Portal Cliente
npm run dev:portal      # http://localhost:5174

# Mobile (Expo)
cd apps/mobile-operador
npm run start           # Abre Expo DevTools
# Use Expo Go (iOS/Android) ou emulador
```

### 3.4. Build de produção

```bash
# Backend
npm run build:api

# Web
npm run build:backoffice
npm run build:portal

# Mobile (EAS Build ou local)
cd apps/mobile-operador
npm run build:android   # ou build:ios
```

### 3.5. Testes

```bash
# Unit tests (Vitest)
npm run test

# E2E Web (Playwright)
npm run test:e2e:web

# E2E Mobile (Detox)
npm run test:e2e:mobile

# Coverage
npm run test:coverage
```

---

## 4. Gates de qualidade (pré-requisitos para concluir uma tarefa)

Antes de marcar uma tarefa como concluída, **todos os gates abaixo devem passar**:

### 4.1. Testes

- [ ] **Unit tests** cobrem lógica de negócio crítica (mínimo 80% de cobertura nas funções de domínio).
- [ ] **Integration tests** validam fluxos completos (ex: criar OS → vincular produtos → registrar execução → emitir relatório).
- [ ] **E2E tests** cobrem happy path e casos de erro principais por módulo.
- [ ] Todos os testes passam localmente (`npm run test`) **sem warnings**.

### 4.2. Linting e formatação

- [ ] `npm run lint` passa sem erros.
- [ ] `npm run format:check` confirma que código está formatado (ou rode `npm run format` antes de commitar).
- [ ] Sem `console.log` ou `debugger` residuais no código de produção.

### 4.3. Typecheck (TypeScript)

- [ ] `npm run typecheck` passa sem erros (ou `tsc --noEmit`).
- [ ] Tipos explícitos em funções públicas, APIs e props de componentes.
- [ ] Sem uso de `any` (exceto casos justificados com comentário `// @ts-expect-error [motivo]`).

### 4.4. Build

- [ ] `npm run build` conclui sem erros.
- [ ] Bundle size dentro do esperado (alerte se crescer >10% sem justificativa).

### 4.5. Documentação inline

- [ ] Funções complexas possuem JSDoc/TSDoc explicando parâmetros, retorno e comportamento.
- [ ] Regras de negócio não-óbvias estão comentadas no código (ex: "valida CNH com 30 dias de antecedência conforme PRD seção X").

### 4.6. Conformidade com specs

- [ ] Implementação segue **exatamente** o especificado no PRD/SPECS.md (campos, validações, fluxos).
- [ ] Se algo não estiver especificado, **não invente** — marque `[A DEFINIR — depende de X]` e documente no código.

---

## 5. Regras de ouro

### 5.1. Não invente requisitos

- **Jamais** adicione campos, regras, telas ou comportamentos que não estejam explicitamente descritos no PRD/SPECS.
- Se encontrar ambiguidade, **pare** e documente a dúvida:
  ```typescript
  // [A DEFINIR — depende de resposta do cliente sobre se status 'Executada' 
  // bloqueia edição de produtos ou apenas trava mudança de data]
  if (status === 'executada') {
    // TODO: definir se bloqueia edição completa ou parcial
    throw new Error('Comportamento pendente de especificação');
  }
  ```

### 5.2. Consulte os specs em caso de dúvida

- **Sempre** releia PRD.md, ARCHITECTURE.md e SPECS.md antes de implementar.
- Se uma funcionalidade estiver detalhada em múltiplos lugares (ex: autenticação aparece no módulo 1 do Backoffice, módulo 1 do App Operador e módulo 1 do Portal Cliente), **consolide as regras** e documente divergências.

### 5.3. Marque pendências explicitamente

- Use comentários padronizados:
  ```typescript
  // [A DEFINIR — depende de definição de cores do badge de status]
  const badgeColor = 'gray'; // provisório

  // [BLOQUEADOR — gap PRD #47: limite de tamanho de anexo não especificado]
  const MAX_FILE_SIZE = 10 * 1024 * 1024;