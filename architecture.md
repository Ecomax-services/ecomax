# Arquitetura Técnica — Ecomax

## 1. Visão Geral da Solução

O **Ecomax** é uma plataforma B2B de gestão operacional para empresas de controle de pragas, estruturada em **três ambientes principais**:

1. **Backoffice (Web)** — interface administrativa para gestão de clientes, ordens de serviço, estoque, comercial, financeiro, relatórios e usuários. Usuários internos (Administrativo, Operacional, Comercial, Gestor, RH).
2. **Portal do Cliente (Web)** — interface self-service para clientes acompanharem ordens de serviço, documentos, relatórios técnicos, certificados, cronogramas e produtos homologados. Autenticação gerenciada pelo Backoffice.
3. **App do Operador (Mobile nativo)** — aplicativo para técnicos de campo executarem ordens de serviço, registrarem check-in/check-out com geolocalização, consumo de produtos, assinaturas, fotos e emissão de relatórios. Funciona offline com sincronização posterior.

**Objetivo central:** eliminar processos manuais, fragmentação de sistemas (IB8, Omie, Excel, WhatsApp, portais externos) e centralizar toda a operação em um único ecossistema digital, com automação de fluxos, rastreabilidade completa e integração financeira via API com Omie ERP.

**Escala esperada:** ~2.115 clientes cadastrados, ~9.000 garantias/OS avulsas, volume de usuários internos não especificado mas suportando crescimento de 3x em 2 anos ([A DEFINIR — depende de baseline de usuários ativos e meta de adoção]).

---

## 2. Stack Tecnológica Sugerida

### 2.1. Backend (API/Core)

**Stack recomendada:** Node.js (TypeScript) + NestJS + PostgreSQL + Redis

**Justificativa:**
- **Node.js/TypeScript:** maturidade em APIs REST, forte ecossistema de bibliotecas, fácil integração com Omie (API externa), suporte a filas/jobs (necessário para sincronização app mobile, processamento de notificações, integração Omie).
- **NestJS:** framework opinativo, modular, com injeção de dependências nativa, facilita organização de código em contextos (Clientes, Operacional, Comercial, Estoque, Financeiro), geração automática de Swagger/OpenAPI, suporte a GraphQL (opcional futuro para Portal Cliente com queries otimizadas).
- **PostgreSQL:** banco relacional robusto, suporte a JSON (campos dinâmicos como formulários de planos de controle no módulo OS), constraints complexas (validações de estoque, status de OS, vencimento de documentos), particionamento por data (histórico de movimentações de estoque, logs de auditoria), suporte a full-text search (busca em clientes, produtos, OS).
- **Redis:** cache de sessão, filas de jobs (Bull/BullMQ) para processamento assíncrono (envio de notificações, sincronização Omie, geração de relatórios PDF), rate limiting de APIs públicas (link de renovação de garantias).

**Alternativa considerada:**
- **Django (Python):** forte em admin auto-gerado, mas menor performance em I/O concorrente e maior fricção com integração Omie (SDK Node.js mais ativo).
- **.NET Core (C#):** excelente para cenários enterprise, mas maior complexidade de infra (Windows Server histórico, embora roda em Linux) e menor alinhamento com skillset de equipes front-end modernas (React/TypeScript).

### 2.2. Frontend Web (Backoffice + Portal Cliente)

**Stack recomendada:** React 18 + TypeScript + Vite + TanStack Query + Zustand + TailwindCSS + Radix UI

**Justificativa:**
- **React:** maturidade, vasto ecossistema de componentes (tabelas complexas com filtros/paginação, drag-and-drop de anexos, drawers/modals), facilita reutilização entre Backoffice e Portal Cliente (mesma base de componentes, estilos diferentes).
- **TypeScript:** type-safety end-to-end com backend NestJS, reduz bugs em produção, melhora DX (autocompletar de campos de entidades).
- **Vite:** build rápido, HMR instantâneo, melhora DX durante desenvolvimento.
- **TanStack Query (ex-React Query):** gerenciamento de cache de requisições, invalidação automática, otimização de re-fetches (crítico em listagens grandes ~9k garantias), suporte a infinite scroll (carregar mais notificações).
- **Zustand:** state management leve para estado global (usuário logado, preferências de notificação, filtros salvos), alternativa mais simples que Redux.
- **TailwindCSS:** utilitário CSS, acelera prototipação de UI, facilita manutenção de design system.
- **Radix UI:** primitivos acessíveis (modals, drawers, tooltips, badges coloridos de status) sem opinião visual, permite customização total mantendo acessibilidade (ARIA, teclado).

**Alternativa considerada:**
- **Next.js (SSR):** ganho de SEO irrelevante (Backoffice e Portal são autenticados, não indexáveis), complexidade adicional de server-side rendering sem benefício claro.
- **Vue.js:** menor ecossistema de componentes corporativos prontos comparado a React.

### 2.3. Mobile (App Operador)

**Stack recomendada:** React Native (Expo managed workflow) + TypeScript + SQLite (WatermelonDB) + React Navigation + TanStack Query

**Justificativa:**
- **React Native:** único codebase iOS + Android, reutilização de lógica de negócio do frontend web (validações de formulário, formatação de dados), time único front-end (React).
- **Expo managed workflow:** simplifica build iOS/Android (sem Xcode/Android Studio local), acesso facilitado a APIs nativas (câmera para fotos, geolocalização para check-in/check-out, assinatura digital), OTA updates (patches sem passar por App Store review).
- **SQLite local (WatermelonDB):** persistência offline de OS atribuídas, produtos, mapeamentos, permite operador trabalhar sem conexão (campo remoto), sincronização bidirecional ao retornar online. WatermelonDB otimiza performance em listas grandes (lazy loading), sincronização incremental.
- **React Navigation:** navegação nativa (stack, tabs), drawer lateral (menu), deep linking (notificação push abre OS específica).
- **TanStack Query:** mesmo padrão do web, cache de requisições, sincronização automática quando online.

**Alternativa considerada:**
- **Flutter:** performance ligeiramente superior em animações complexas, mas curva de aprendizado (Dart), menor reuso com web, time isolado mobile.
- **PWA (Progressive Web App):** elimina App Store, mas acesso limitado a APIs nativas (câmera, geolocalização em background, push notifications iOS), experiência offline inferior a React Native.

### 2.4. Integrações Externas

**Omie ERP (API REST):** integração bidirecional para sincronização de NF, pedidos de compra, clientes ([A DEFINIR — depende de mapeamento completo de endpoints e campos Omie↔Ecomax, autenticação, retry policy, fila de sincronização]).

**E-mail (SMTP/SendGrid):** envio de notificações por e-mail (recuperação de senha, follow-ups comerciais, alertas de documentos vencidos, link público de renovação de garantias). SendGrid recomendado por tracking de abertura (necessário em módulo Comercial para validar "primeira abertura" do link).

**Storage de arquivos (AWS S3 ou similar):** armazenamento de anexos (PDF de relatórios técnicos, fotos de execução de OS, croquis de mapeamento, notas fiscais de recebimento de OC, version