# Design System — [Ecomax] Discovery

## 1. Fundamentos e tokens

# Tokens e estilos extraídos do Figma

Resumo: 1 cor(es), 58 estilo(s) tipográfico(s), 0 efeito(s), 0 variável(is), 35 componente(s) publicado(s), 1 frame(s) em páginas de Design System.

## Cores (estilos FILL)

> **Atualização (2026-06-25):** apenas **1 cor** estava publicada como _estilo_ de cor no Figma
> (`Primary/Blue/03 #294E98`), mas as telas reais (Login, Recuperação, Criar senha, Notificações,
> Overlay) usam uma **paleta verde** aplicada via variáveis/fills nomeados. A paleta abaixo foi
> extraída diretamente do Figma (`get_design_context`) durante a implementação do Backoffice e é a
> referência de produto. Está codificada em `apps/web-backoffice/tailwind.config.ts`.
>
> ⚠️ `Primary/Blue/03 #294E98` é tratada como **token legado/placeholder** — não aparece nas telas
> implementadas. **Confirmar com o designer** se deve ser removida do kit ou tem uso específico.

### Verdes (marca)
- **primary/700:** `#0f3f0f` — sidebar; texto da tag OS
- **secondary/800:** `#1c441c` — painel lateral das telas de autenticação
- **secondary/600:** `#1a5c1a` — fundo de avatar (iniciais)
- **secondary/500:** `#347a34` — **ação primária** (botões, links, foco recomendado)
- **secondary/100:** `#dcf7dc` — botão ghost, chip, fundo da tag OS
- **secondary/50:** `#f0fdf0` — fundo de NotificationCard não lida
- **primary/50:** `#edfced` — texto sobre fundo verde escuro (caixa de requisitos)
- **accent:** `#4ade80` — indicador de item de menu ativo

### Neutros
- **neutral/900:** `#151619` — texto principal
- **neutral/500:** `#686f7d` — texto secundário / breadcrumb
- **neutral/300:** `#b7bbc3` — placeholder / metadados (⚠ contraste, ver §4)
- **neutral/200:** `#d8dadf` — bordas (input, cards lidos, divisores)
- **neutral/50:** `#f7f7f8` — fundo de página e de input
- **white:** `#ffffff` — superfícies de card

### Feedback / semânticas
- **danger:** `#9b1400` — ação destrutiva (Excluir, Sair), texto de erro
- **danger/bright:** `#cc1a00` — badge contador de não lidas
- **strength/medium:** `#92400e` — barra "Força da senha: Média"

### Cores de tag (fundo / texto)
- **Tag OS:** `#dcf7dc` / `#0f3f0f`
- **Tag Documentos (info):** `#d9e5fc` / `#2a51bf`
- **Tag Documentos (expirado):** `#fce3d9` / `#9b1400`
- **Tag Estoque (alerta):** `#fcf2d9` / `#78350f`

### Legado (a confirmar)
- **Primary/Blue/03:** `#294E98` — único estilo de cor publicado; sem uso nas telas atuais.

## Tipografia (estilos TEXT)
- App/Button/LG (fonte Inter, 16px, peso 600, line-height 22px, letter-spacing 0.03200000047683716)
- App/Button/MD (fonte Inter, 14px, peso 600, line-height 20px, letter-spacing 0.028000000417232516)
- App/Button/SM (fonte Inter, 12px, peso 600, line-height 16px, letter-spacing 0.024000000357627872)
- App/Caption/Medium (fonte Inter, 10px, peso 500, line-height 14px, letter-spacing 0)
- App/Caption/Regular (fonte Inter, 10px, peso 400, line-height 14px, letter-spacing 0)
- App/Display/LG (fonte Inter, 32px, peso 600, line-height 40px, letter-spacing -0.32)
- App/Display/MD (fonte Inter, 28px, peso 600, line-height 36px, letter-spacing -0.28)
- App/Display/SM (fonte Inter, 24px, peso 600, line-height 32px, letter-spacing 0)
- App/Label/LG (fonte Inter, 14px, peso 500, line-height 18px, letter-spacing 0)
- App/Label/MD (fonte Inter, 12px, peso 500, line-height 16px, letter-spacing 0)
- App/Label/SM (fonte Inter, 11px, peso 500, line-height 14px, letter-spacing 0.055)
- App/Text/LG/Medium (fonte Inter, 18px, peso 500, line-height 26px, letter-spacing 0)
- App/Text/LG/Regular (fonte Inter, 18px, peso 400, line-height 26px, letter-spacing 0)
- App/Text/LG/SemiBold (fonte Inter, 18px, peso 600, line-height 26px, letter-spacing 0)
- App/Text/MD/Medium (fonte Inter, 16px, peso 500, line-height 22px, letter-spacing 0)
- App/Text/MD/Regular (fonte Inter, 16px, peso 400, line-height 22px, letter-spacing 0)
- App/Text/MD/SemiBold (fonte Inter, 16px, peso 600, line-height 22px, letter-spacing 0)
- App/Text/SM/Medium (fonte Inter, 14px, peso 500, line-height 20px, letter-spacing 0)
- App/Text/SM/Regular (fonte Inter, 14px, peso 400, line-height 20px, letter-spacing 0)
- App/Text/SM/SemiBold (fonte Inter, 14px, peso 600, line-height 20px, letter-spacing 0)
- App/Text/XL/Medium (fonte Inter, 20px, peso 500, line-height 28px, letter-spacing 0)
- App/Text/XL/Regular (fonte Inter, 20px, peso 400, line-height 28px, letter-spacing 0)
- App/Text/XL/SemiBold (fonte Inter, 20px, peso 600, line-height 28px, letter-spacing 0)
- App/Text/XS/Medium (fonte Inter, 12px, peso 500, line-height 16px, letter-spacing 0)
- App/Text/XS/Regular (fonte Inter, 12px, peso 400, line-height 16px, letter-spacing 0)
- App/Text/XS/SemiBold (fonte Inter, 12px, peso 600, line-height 16px, letter-spacing 0)
- Web/Code/LG (fonte Inter, 16px, peso 400, line-height 24px, letter-spacing 0)
- Web/Code/MD (fonte Inter, 14px, peso 400, line-height 20px, letter-spacing 0)
- Web/Code/SM (fonte Inter, 12px, peso 400, line-height 18px, letter-spacing 0)
- Web/Display/2XL (fonte Inter, 72px, peso 600, line-height 90px, letter-spacing -1.44)
- Web/Display/LG (fonte Inter, 48px, peso 600, line-height 60px, letter-spacing -0.96)
- Web/Display/MD (fonte Inter, 36px, peso 600, line-height 44px, letter-spacing -0.36)
- Web/Display/SM (fonte Inter, 30px, peso 600, line-height 38px, letter-spacing -0.3)
- Web/Display/XL (fonte Inter, 60px, peso 600, line-height 72px, letter-spacing -1.2)
- Web/Display/XS (fonte Inter, 24px, peso 600, line-height 32px, letter-spacing 0)
- Web/Label/LG (fonte Inter, 14px, peso 500, line-height 20px, letter-spacing 0)
- Web/Label/MD (fonte Inter, 12px, peso 500, line-height 16px, letter-spacing 0)
- Web/Label/SM (fonte Inter, 11px, peso 500, line-height 16px, letter-spacing 0.055)
- Web/Text/LG/Bold (fonte Inter, 18px, peso 700, line-height 28px, letter-spacing 0)
- Web/Text/LG/Medium (fonte Inter, 18px, peso 500, line-height 28px, letter-spacing 0)
- Web/Text/LG/Regular (fonte Inter, 18px, peso 400, line-height 28px, letter-spacing 0)
- Web/Text/LG/SemiBold (fonte Inter, 18px, peso 600, line-height 28px, letter-spacing 0)
- Web/Text/MD/Bold (fonte Inter, 16px, peso 700, line-height 24px, letter-spacing 0)
- Web/Text/MD/Medium (fonte Inter, 16px, peso 500, line-height 24px, letter-spacing 0)
- Web/Text/MD/Regular (fonte Inter, 16px, peso 400, line-height 24px, letter-spacing 0)
- Web/Text/MD/SemiBold (fonte Inter, 16px, peso 600, line-height 24px, letter-spacing 0)
- Web/Text/SM/Bold (fonte Inter, 14px, peso 700, line-height 20px, letter-spacing 0)
- Web/Text/SM/Medium (fonte Inter, 14px, peso 500, line-height 20px, letter-spacing 0)
- Web/Text/SM/Regular (fonte Inter, 14px, peso 400, line-height 20px, letter-spacing 0)
- Web/Text/SM/SemiBold (fonte Inter, 14px, peso 600, line-height 20px, letter-spacing 0)
- Web/Text/XL/Bold (fonte Inter, 20px, peso 700, line-height 30px, letter-spacing 0)
- Web/Text/XL/Medium (fonte Inter, 20px, peso 500, line-height 30px, letter-spacing 0)
- Web/Text/XL/Regular (fonte Inter, 20px, peso 400, line-height 30px, letter-spacing 0)
- Web/Text/XL/SemiBold (fonte Inter, 20px, peso 600, line-height 30px, letter-spacing 0)
- Web/Text/XS/Bold (fonte Inter, 12px, peso 700, line-height 18px, letter-spacing 0)
- Web/Text/XS/Medium (fonte Inter, 12px, peso 500, line-height 18px, letter-spacing 0)
- Web/Text/XS/Regular (fonte Inter, 12px, peso 400, line-height 18px, letter-spacing 0)
- Web/Text/XS/SemiBold (fonte Inter, 12px, peso 600, line-height 18px, letter-spacing 0)

## Componentes publicados no arquivo
- **Avatar/Large/Default**
- **Avatar/Medium/Default**
- **Avatar/Small/Default**
- **Badge/Count/Green**
- **Badge/Count/Red**
- **Badge/Dot**
- **BottomNavBar/Default**
- **Button/Destructive/Default**
- **Button/Ghost/Default**
- **Button/Primary/Default**
- **Button/Primary/Disabled**
- **Button/Secondary/Default**
- **Button/Secondary/Disabled**
- **Button/Small/Primary**
- **Button/Small/Secondary**
- **Header/Simple**
- **Header/WithBack**
- **Input/Default**
- **Input/Disabled**
- **Input/Error**
- **Input/Filled**
- **Input/Focused**
- **Input/Password**
- **NotificationCard/Read**
- **NotificationCard/Unread**
- **SettingsRow/Destructive**
- **SettingsRow/Toggle**
- **SettingsRow/WithArrow**
- **Style=Filled, Color=Primary, Size=Small, State=Enabled, Loading=Off**
- **Tag/Documento**
- **Tag/Estoque**
- **Tag/Expirado**
- **Tag/Info**
- **Tag/OS**
- **Type=Outline**

## Conteúdo de páginas/seções de Design System
### Background (UI Kit › Cover — Design System)
Textos:
- eco
- Ecomax Design System
- Componentes, tokens e padrões visuais para os ambientes Backoffice, Operador e Cliente
- v1.0 · Release 1
- 30+
- Componentes
- 3
- Ambientes
- 35+
- Tokens
- Mobile · Web
- Breakpoints

---

## 2. Inventário de componentes

# Inventário de componentes de UI

## 1. Navegação

### 1.1. Header

**Descrição:**  
Componente de cabeçalho utilizado para identificar a tela atual e fornecer navegação contextual.

**Variantes/Estados:**
- **Header/Simple** – Cabeçalho padrão com título centralizado
- **Header/WithBack** – Cabeçalho com botão de voltar à esquerda e título

**Tokens associados:**
- Tipografia título: App/Text/LG/SemiBold (Inter, 18px, peso 600, line-height 26px)
- Cor do título: neutral/900 `#151619`; breadcrumb neutral/500 `#686f7d`
- Cor de ação/link: secondary/500 `#347a34`
- Tipografia ícone: Material Icons (arrow_back)

**Exemplos de uso:**
- Ambiente Operador: telas "1.1 - Recuperação de senha", "1.1.1 - Criar nova senha", "2 - Notificações", "3 - Configurações", "3.1 - Perfil"
- Ambiente Backoffice: telas de detalhes, formulários e gestão
- Ambiente Cliente: todas as telas internas do portal

---

### 1.2. BottomNavBar

**Descrição:**  
Barra de navegação inferior para aplicativo mobile, permitindo acesso rápido às principais seções.

**Variantes/Estados:**
- **BottomNavBar/Default** – Barra com 4 itens de navegação (ícone + label)
- Estados: ativo (destacado), inativo (cinza)

**Tokens associados:**
- Tipografia label: App/Caption/Medium (Inter, 10px, peso 500, line-height 14px)
- Ícones: Material Icons (assignment, calendar_today, notifications, settings)
- Cor ativa: secondary/500 `#347a34`
- Cor inativa: neutral/500 `#686f7d`

**Exemplos de uso:**
- Ambiente Operador: telas "2 - Notificações", "3 - Configurações"
- Itens recorrentes: "OS", "Agenda", "Notif.", "Config."

---

## 2. Formulários

### 2.1. Input

**Descrição:**  
Campo de entrada de texto para formulários, com suporte a diferentes tipos de dado e estados visuais.

**Variantes/Estados:**
- **Input/Default** – Estado padrão (vazio, aguardando entrada)
- **Input/Focused** – Estado ativo (foco do usuário)
- **Input/Filled** – Estado preenchido
- **Input/Error** – Estado de erro (validação falhou)
- **Input/Disabled** – Estado desabilitado (somente leitura)
- **Input/Password** – Campo de senha com toggle "Mostrar/Ocultar"

**Tokens associados:**
- Tipografia label: App/Label/MD (Inter, 12px, peso 500, line-height 16px)
- Tipografia input: App/Text/MD/Regular (Inter, 16px, peso 400, line-height 22px)
- Fundo: neutral/50 `#f7f7f8` (vira branco no foco)
- Texto: neutral/900 `#151619`; placeholder neutral/300 `#b7bbc3`
- Borda default: neutral/200 `#d8dadf`
- Borda erro: danger `#9b1400` _(recomendado — estado de erro não capturado em tela; confirmar no Figma)_
- Borda/anel de foco: secondary/500 `#347a34` _(recomendado — substitui o legado #294E98)_

**Exemplos de uso:**
- Ambiente Operador: telas de login (1 - Login), recuperação de senha (1.1), criação de nova senha (1.1.1)
- Ambiente Backoffice e Cliente: formulários de autenticação, cadastros e edição

---

### 2.2. Button

**Descrição:**  
Botões para ações primárias, secundárias e destrutivas, disponíveis em três tamanhos.

**Variantes/Estados:**
- **Button/Primary/Default** – Botão primário ativo
- **Button/Primary/Disabled** – Botão primário desabilitado
- **Button/Secondary/Default** – Botão secundário ativo
- **Button/Secondary/Disabled** – Botão secundário desabilitado
- **Button/Destructive/Default** – Botão para ações destrutivas (ex: excluir, sair)
- **Button/Ghost/Default** – Botão fantasma (sem preenchimento)
- **Button/Small/Primary** – Botão primário pequeno
- **Button/Small/Secondary** – Botão secundário pequeno
- **Style=Filled, Color=Primary, Size=Small, State=Enabled, Loading=Off** – Variante com estado de carregamento

**Tokens associados:**
- Tipografia LG: App/Button/LG (Inter, 16px, peso 600, line-height 22px, letter-spacing 0.032px)
- Tipografia MD: App/Button/MD (Inter, 14px, peso 600, line-height 20px, letter-spacing 0.028px)
- Tipografia SM: App/Button/SM (Inter, 12px, peso 600, line-height 16px, letter-spacing 0.024px)
- Cor primária: secondary/500 `#347a34` (texto branco); hover `#1a5c1a`; disabled 50% de opacidade
- Cor secundária: fundo branco, borda neutral/200 `#d8dadf`, texto neutral/500 `#686f7d`
- Cor ghost: fundo secondary/100 `#dcf7dc`, texto secondary/500 `#347a34`
- Cor destrutiva: `#9b1400` (texto branco)

**Exemplos de uso:**
- Ambiente Operador: "Enviar link de recuperação" (1.1), "Salvar nova senha" (1.1.1), "Entrar" (1 - Login)
- Ambiente Backoffice e Cliente: ações principais em formulários, modais e listas

---

## 3. Feedback

### 3.1. Badge

**Descrição:**  
Indicadores visuais compactos para status, contadores e categorias.

**Variantes/Estados:**
- **Badge/Dot** – Badge simples (ponto colorido)
- **Badge/Count/Green** – Badge com contador (verde, ex: notificações lidas)
- **Badge/Count/Red** – Badge com contador (vermelho, ex: notificações não lidas)

**Tokens associados:**
- Tipografia: App/Caption/Medium (Inter, 10px, peso 500, line-height 14px)
- Badge/Count/Red: fundo danger/bright `#cc1a00`, texto branco (não lidas)
- Badge/Count/Green: fundo secondary/100 `#dcf7dc`, texto secondary/500 `#347a34`
- Badge/Dot: secondary/500 `#347a34`

**Exemplos de uso:**
- Ambiente Operador: contador de notificações não lidas (tela "2 - Notificações")
- Ambiente Backoffice e Cliente: status de OS, documentos e alertas

---

### 3.2. Tag

**Descrição:**  
Etiquetas de categorização e status, com cores semânticas.

**Variantes/Estados:**
- **Tag/OS** – Tag para identificar Ordens de Serviço
- **Tag/Documento** – Tag para identificar documentos
- **Tag/Estoque** – Tag para alertas de estoque
- **Tag/Expirado** – Tag para itens expirados
- **Tag/Info** – Tag informativa genérica

**Tokens associados:**
- Tipografia: App/Label/SM (Inter, 11px, peso 500, line-height 14px, letter-spacing 0.055px)
- Cores (fundo / texto):
  - Tag/OS: `#dcf7dc` / `#0f3f0f`
  - Tag/Info (Documentos): `#d9e5fc` / `#2a51bf`
  - Tag/Expirado (Documentos): `#fce3d9` / `#9b1400`
  - Tag/Estoque: `#fcf2d9` / `#78350f`

**Exemplos de uso:**
- Ambiente Operador: categorização de notificações (tela "2 - Notificações")
- Ambiente Backoffice: lista de OS, relatórios e alertas
- Ambiente Cliente: status de OS e documentos

---

### 3.3. NotificationCard

**Descrição:**  
Card de notificação exibindo informações resumidas com ações contextuais.

**Variantes/Estados:**
- **NotificationCard/Unread** – Notificação não lida (destaque visual)
- **NotificationCard/Read** – Notificação lida (aparência neutra)

**Tokens associados:**
- Tipografia título: App/Text/SM/SemiBold (Inter, 14px, peso 600, line-height 20px)
- Tipografia corpo: App/Text/SM/Regular (Inter, 14px, peso 400, line-height 20px)
- Tipografia data: App/Caption/Regular (Inter, 10px, peso 400, line-height 14px)
- Background não lido: secondary/50 `#f0fdf0` + ponto secondary/500 `#347a34`
- Background lido: branco `#ffffff` com borda neutral/200 `#d8dadf`
- Ação primária: secondary/500 `#347a34`; ação Excluir: danger `#9b1400`

**Exemplos de uso:**
- Ambiente Operador: lista de notificações (tela "2 - Notificações")
- Ambiente Backoffice e Cliente: tela "2 - Notificações"

---

## 4. Dados

### 4.1. Avatar

**Descrição:**  
Componente de avatar para representar usuários, com iniciais ou foto.

**Variantes/Estados:**
- **Avatar/Large/Default** – Avatar grande (ex: perfil do usuário)
- **Avatar/Medium/Default** – Avatar médio (ex: listas, cabeçalhos)
- **Avatar/Small/Default** – Avatar pequeno (ex: comentários, histórico)

**Tokens associados:**
- Tipografia iniciais Large: App/Text/LG/SemiBold (Inter, 18px, peso 600, line-height 26px)
- Tipografia iniciais Medium: App/Text/MD/SemiBold (Inter, 16px, peso 600, line-height 22px)
- Tipografia iniciais Small: App/Text/SM/SemiBold (Inter, 14px, peso 600, line-height 20px)
- Background: secondary/600 `#1a5c1a`; iniciais em branco

**Exemplos de uso:**
- Ambiente Operador: perfil do usuário (tela "3.1 - Perfil")
- Ambiente Cliente: perfil do usuário (tela de configurações)

---

### 4.2. SettingsRow

**Descrição:**  
Linha de configuração para listas de opções e preferências.

**Variantes/Estados:**
- **SettingsRow/WithArrow** – Linha clicável com seta à direita (navegação)
- **SettingsRow/Toggle** – Linha com switch on/off
- **SettingsRow/Destructive** – Linha para ações destrutivas (ex: "Sair da conta")

**Tokens associados:**
- Tipografia título: App/Text/MD/Medium (Inter, 16px, peso 500, line-height 22px)
- Tipografia descrição: App/Text/SM/Regular (Inter, 14px, peso 400, line-height 20px)
- Ícones: Material Icons (person, lock, notifications, info, logout)
- Cor destrutiva: `#9b1400`

**Exemplos de uso:**
- Ambiente Operador: tela "3 - Configurações", "3.2 - Preferências"
- Ambiente Cliente: tela de configurações e preferências

---

## 5. Outros componentes

### 5.1. Form Card

**Descrição:**  
Card de formulário utilizado nas telas de autenticação (login, recuperação de senha).

**Variantes/Estados:**
- Default (login)
- Recuperação de senha
- Criar nova senha
- E-mail enviado (feedback)

**Tokens associados:**
- Tipografia título: App/Display/SM (Inter, 24px, peso 600, line-height 32px) ou Web/Display/XS (Inter, 24px, peso 600, line-height 32px)
- Tipografia corpo: App/Text/SM/Regular (Inter, 14px, peso 400, line-height 20px) ou Web/Text/SM/Regular (Inter, 14px, peso 400, line-height 20px)
- Background: branco `#ffffff`; raio 16px; sombra `0 4px 24px rgba(0,0,0,0.07)`
- Sem borda (elevação por sombra); divisor interno neutral/200 `#d8dadf`

**Exemplos de uso:**
- Ambiente Operador: telas "1 - Login", "1.1 - Recuperação de senha", "1.1.1 - Criar nova senha"
- Ambiente Backoffice e Cliente: telas de autenticação equivalentes

---

### 5.2. Modal / Overlay

**Descrição:**  
Componente de sobreposição para confirmações, alertas e ações contextuais.

**Variantes/Estados:**
- **Overlay - Confirmar Saída** – Modal de confirmação destrutiva

**Tokens associados:**
- Tipografia título: App/Text/LG/SemiBold (Inter, 18px, peso 600, line-height 26px) ou Web/Text/LG/SemiBold (Inter, 18px, peso 600, line-height 28px)
- Tipografia corpo: App/Text/SM/Regular (Inter, 14px, peso 400, line-height 20px) ou Web/Text/SM/Regular (Inter, 14px, peso 400, line-height 20px)
- Background overlay: `rgba(0,0,0,0.45)`
- Background modal: branco `#ffffff`; raio 16px; sombra `0 8px 32px rgba(0,0,0,0.14)`
- Ícone + botão de confirmação destrutivo: `#9b1400`

**Exemplos de uso:**
- Ambiente Operador: tela "3 - Configurações" → "Overlay - Confirmar Saída"
- Ambiente Backoffice e Cliente: confirmações de ações críticas

---

### 5.3. Type=Outline (contexto a definir)

**Descrição:**  
[A DEFINIR — componente publicado no Figma mas sem contexto de uso nos wireframes. Necessário validar com o designer qual a aplicação deste componente.]

**Tokens associados:**
- [A DEFINIR — depende da especificação do componente]

**Exemplos de uso:**
- [A DEFINIR — depende da especificação do componente]

---

## Notas de implementação

- **Responsividade:** Componentes Web devem utilizar tokens da família `Web/` enquanto componentes App (mobile) utilizam tokens da família `App/`.
- **Paleta de cores completa:** ✅ Documentada na seção "Cores (estilos FILL)" (verdes da marca, neutros, feedback e tags), extraída do Figma durante a implementação do Backoffice. O token azul `Primary/Blue/03 #294E98` é legado/placeholder e precisa ser confirmado/removido com o designer.
- **Ícones:** Material Icons é a biblioteca padrão. Tokens de tamanho e cor dos ícones devem ser padronizados.
- **Estados de hover, pressed, loading:** Não foram mapeados nos tokens extraídos. Definir comportamento visual para esses estados.
- **Acessibilidade:** Garantir contraste mínimo WCAG AA (4.5:1 para texto normal, 3:1 para texto grande) e suporte a l

---

## 3. Layout e navegação

# 3. Layout e padrões de navegação

## 3.1 Grid e viewport

### Desktop (Ambientes Backoffice e Cliente)

**Largura do container principal:** 1200 px  
**Viewport de referência:** 1440 × 900 px  
**Breakpoints:**
- Desktop: ≥ 1280 px
- [A DEFINIR — depende de breakpoints tablet/mobile se houverem versões responsivas Web]

**Margens laterais:** [A DEFINIR — depende do layout shell final]  
**Espaçamento interno (padding):** [A DEFINIR — depende de tokens de spacing]

### Mobile (Ambiente Operador)

**Largura do canvas:** 390 px  
**Altura do canvas:** 844 px  
**Viewport de referência:** 390 × 844 px (iPhone 14 Pro/similar)  
**Breakpoints:**
- Mobile: 390 px (referência)
- [A DEFINIR — depende de suporte a outros tamanhos de tela mobile]

**Margens laterais:** [A DEFINIR — depende de tokens de spacing]  
**Área segura (safe area):** [A DEFINIR — depende de tratamento de notch/bordas arredondadas]

---

## 3.2 Estrutura shell

### Ambiente Backoffice (Desktop – Web)

**Composição:**

```
┌────────────────────────────────────────────────────────────┐
│  [Sidebar]  │          [Header]                            │
│             ├──────────────────────────────────────────────┤
│  Navegação  │                                              │
│  principal  │          [Área de conteúdo]                  │
│             │                                              │
│             │                                              │
└─────────────┴──────────────────────────────────────────────┘
```

**Sidebar (navegação lateral):**
- Largura: [A DEFINIR — depende do design final]
- Posição: Fixa à esquerda
- Conteúdo: [A DEFINIR — depende da hierarquia de módulos/menu]
- Comportamento: [A DEFINIR — colapsa? permanece fixa? overlay em telas menores?]

**Header (cabeçalho superior):**
- Altura: [A DEFINIR — depende do design final]
- Posição: Fixa no topo
- Conteúdo esperado (com base nos wireframes):
  - Logo/identificação do sistema
  - Notificações (ícone + badge contador)
  - Avatar/menu do usuário
  - [A DEFINIR — breadcrumb? busca global? outros controles?]

**Área de conteúdo:**
- Largura máxima: 1200 px
- Padding: [A DEFINIR — depende de tokens de spacing]
- Scroll: Vertical, dentro da área de conteúdo (header e sidebar fixos)

---

### Ambiente Cliente (Desktop – Web)

**Composição:**

A estrutura shell do ambiente Cliente segue o mesmo padrão do Backoffice:

```
┌────────────────────────────────────────────────────────────┐
│  [Sidebar]  │          [Header]                            │
│             ├──────────────────────────────────────────────┤
│  Navegação  │                                              │
│  principal  │          [Área de conteúdo]                  │
│             │                                              │
│             │                                              │
└─────────────┴──────────────────────────────────────────────┘
```

**Diferenças esperadas:**
- Menu da sidebar adaptado ao perfil Cliente (menos módulos/funcionalidades)
- [A DEFINIR — há diferenças visuais de branding? tema? cores?]

---

### Ambiente Operador (Mobile – Nativo)

**Composição:**

```
┌──────────────────────────────────┐
│          [Header]                │
├──────────────────────────────────┤
│                                  │
│      [Área de conteúdo]          │
│                                  │
│                                  │
│                                  │
├──────────────────────────────────┤
│    [Bottom Navigation Bar]       │
└──────────────────────────────────┘
```

**Header (topo):**
- Altura: [A DEFINIR — depende do design final]
- Conteúdo (variável por tela):
  - Botão voltar (arrow_back) — presente em telas de navegação interna
  - Título da tela (ex.: "Notificações", "Configurações", "Recuperar senha")
  - Ações contextuais (ex.: "Marcar como lidas" na tela de Notificações)

**Área de conteúdo:**
- Ocupa espaço entre header e bottom bar
- Scroll: Vertical
- Padding: [A DEFINIR — depende de tokens de spacing]

**Bottom Navigation Bar (barra de navegação inferior):**
- Altura: [A DEFINIR — depende do componente BottomNavBar/Default]
- Posição: Fixa na base da tela
- Itens de navegação principais (com base nos wireframes):
  - **OS** (assignment) — [A DEFINIR — destino da navegação]
  - **Agenda** (calendar_today)
  - **Notificações** (notifications) — leva para tela 2 - Notificações
  - **Configurações** (settings) — leva para tela 3 - Configurações
- Estado ativo: ícone + label em secondary/500 `#347a34` (peso 600); inativo em neutral/500 `#686f7d`

---

## 3.3 Padrões de página

### 3.3.1 Listagem (Tabelas e listas)

**Uso:** Exibir conjuntos de dados tabulares ou listas de itens (ex.: notificações, ordens de serviço, clientes).

**Estrutura padrão (Desktop – Backoffice/Cliente):**

```
┌──────────────────────────────────────────────────────────┐
│  [Título] [Contador]          [Filtros] [Ações globais]  │
├──────────────────────────────────────────────────────────┤
│  [Barra de filtros / Abas]                               │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐  │
│  │  [Linha 1]                                  [Ações]│  │
│  │  [Linha 2]                                  [Ações]│  │
│  │  [Linha 3]                                  [Ações]│  │
│  │  ...                                               │  │
│  └────────────────────────────────────────────────────┘  │
│  [Botão "Carregar mais" / Paginação]                     │
└──────────────────────────────────────────────────────────┘
```

**Elementos:**
- **Título + Contador:** Ex.: "2 Notificações não lidas" (fonte: Web/Text/LG/SemiBold ou Web/Display/XS)
- **Filtros:** Abas (ex.: Todas / Não lidas / Lidas) ou dropdowns/campos de pesquisa
- **Ações globais:** Botões como "Marcar como lidas", "Nova ordem de serviço" (componente Button/Primary)
- **Tabela/Lista:**
  - **Desktop:** Tabela com colunas (ex.: Data, Título, Status, Ações)
  - **Mobile:** Lista vertical de cards (componente NotificationCard/Read ou NotificationCard/Unread)
- **Carregar mais:** Botão centralizado ou paginação [A DEFINIR — depende da escolha de UX]

**Exemplo (Notificações – Desktop):**
- Tela: 2 - Notificações (Backoffice)
- Abas: Todas / Não lidas / Lidas
- Lista de cards de notificação (tipo OS, Documento, Estoque — componentes Tag/)
- Botão "Carregar mais"

**Exemplo (Notificações – Mobile):**
- Tela: 2 - Notificações (Operador)
- Abas: Todas / Não lidas / Lidas
- Lista vertical de NotificationCard
- Scroll infinito ou botão "Carregar mais" [A DEFINIR]

---

### 3.3.2 Detalhe (Visualização de registro único)

**Uso:** Exibir informações completas de um item específico (ex.: detalhes de cliente, ordem de serviço, perfil de usuário).

**Estrutura padrão (Desktop):**

```
┌──────────────────────────────────────────────────────────┐
│  [← Voltar]  [Título do registro]      [Ações globais]   │
├──────────────────────────────────────────────────────────┤
│  [Abas de navegação interna]                             │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐  │
│  │  [Seção 1: Dados gerais]                           │  │
│  │  Campo 1: Valor                                    │  │
│  │  Campo 2: Valor                                    │  │
│  ├────────────────────────────────────────────────────┤  │
│  │  [Seção 2: Informações adicionais]                 │  │
│  │  ...                                               │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Elementos:**
- **Botão Voltar:** Link ou botão (← arrow_back) para retornar à listagem
- **Título:** Nome do registro ou identificador (ex.: "João Ferreira", "OS #4231")
- **Ações globais:** Botões como "Editar", "Excluir", "Duplicar" (Button/Secondary ou Button/Destructive)
- **Abas de navegação interna:** [A DEFINIR — quando há múltiplas seções de dados relacionados ao registro]
- **Seções de conteúdo:** Agrupadas por contexto (Dados gerais, Documentos, Histórico, etc.)
  - Labels: Web/Label/MD ou Web/Text/SM/Medium
  - Valores: Web/Text/MD/Regular

**Exemplo (Perfil – Mobile Operador):**
- Tela: 3.1 - Perfil
- Header com botão Voltar (arrow_back) e título "Meu Perfil"
- Seções: Dados do Usuário, Documentos
- Botões de ação: "Alterar senha", "Sair da conta"

---

### 3.3.3 Formulário (Criação/Edição)

**Uso:** Cadastrar ou editar registros (ex.: novo cliente, nova ordem de serviço, editar perfil).

**Estrutura padrão (Desktop):**

```
┌──────────────────────────────────────────────────────────┐
│  [← Voltar]  [Título do formulário]                      │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐  │
│  │  [Seção 1: Campos obrigatórios]                    │  │
│  │  Label 1  [Input campo 1]                          │  │
│  │  Label 2  [Input campo 2]                          │  │
│  ├────────────────────────────────────────────────────┤  │
│  │  [Seção 2: Campos adicionais]                      │  │
│  │  ...                                               │  │
│  └────────────────────────────────────────────────────┘  │
│  [Cancelar]                              [Salvar/Enviar] │
└──────────────────────────────────────────────────────────┘
```

**Elementos:**
- **Botão Voltar:** Retorna sem salvar (pode exigir confirmação se houver alterações)
- **Título:** Ex.: "Nova Ordem de Serviço", "Editar Cliente"
- **Campos de entrada:** Componentes Input/Default, Input/Filled, Input/Error, Input/Disabled
  - Labels: Web/Label/LG (desktop) ou App/Label/LG (mobile)
  - Placeholder: Web/Text/MD/Regular (cor secundária/placeholder)
  - Feedback de erro: Web/Text/SM/Regular (cor de erro) + Input

---

## 4. Acessibilidade

# Diretrizes de acessibilidade

## Princípios fundamentais

O Ecomax Design System segue as diretrizes **WCAG 2.1 nível AA** como baseline mínimo de acessibilidade. Todas as interfaces devem ser:

- **Perceptíveis:** Informação e componentes de interface devem ser apresentados de forma que os usuários possam percebê-los.
- **Operáveis:** Componentes de interface e navegação devem ser operáveis por diferentes métodos de entrada (mouse, teclado, toque).
- **Compreensíveis:** Informações e operações devem ser compreensíveis.
- **Robustos:** Conteúdo deve ser robusto o suficiente para ser interpretado por tecnologias assistivas.

---

## Contraste de cores

### Contraste mínimo (WCAG 2.1 — 1.4.3)

#### Texto e elementos interativos

| Situação | Contraste mínimo | Validação Ecomax |
|----------|------------------|------------------|
| **Texto normal** (< 18px ou < 14px bold) | 4.5:1 | ✅ texto/secundário aprovam; ❌ placeholder `#b7bbc3` (ver tabela abaixo) |
| **Texto grande** (≥ 18px ou ≥ 14px bold) | 3:1 | ✅ títulos `#151619` |
| **Elementos de interface** (bordas, ícones) | 3:1 | ⚠ validar bordas `#d8dadf` sobre branco (~1.3:1 — decorativas) |
| **Estados de foco** | 3:1 contra fundo adjacente | recomendado secondary/500 `#347a34`, 2px |

#### Validação de contraste com a paleta real

Pares principais (verificar com checker antes do go-live; valores aproximados):

| Par | Uso | Contraste aprox. | AA |
|-----|-----|------------------|----|
| `#151619` sobre `#ffffff` | Texto principal em card | ~16:1 | ✅ |
| `#151619` sobre `#f7f7f8` | Texto principal em página | ~15:1 | ✅ |
| `#686f7d` sobre `#f7f7f8` | Texto secundário | ~4.7:1 | ✅ (texto normal) |
| `#b7bbc3` sobre `#f7f7f8` | **Placeholder/metadados** | ~1.9:1 | ❌ — só decorativo; nunca info crítica |
| branco sobre `#347a34` | Texto em botão primário | ~4.6:1 | ✅ |
| branco sobre `#9b1400` | Texto em botão destrutivo | ~7.6:1 | ✅ |
| `#347a34` sobre `#ffffff` | Link/ação | ~4.5:1 | ✅ (limítrofe) |
| `#2a51bf` sobre `#d9e5fc` | Texto da tag Info | ~5.1:1 | ✅ |

**Pontos de atenção:**
- `#b7bbc3` (neutral/300) **reprova** AA — usar só para placeholder/decoração, jamais como única forma de transmitir informação.
- `#347a34` sobre branco fica no limite (≈4.5:1) — ok para texto, mas para ícones/bordas (3:1) sobra margem.
- **Foco:** definir cor oficial do anel de foco (recomendado secondary/500 `#347a34`, espessura 2px) e validar 3:1 contra fundos adjacentes.

**Recomendação para dev:**  
Utilize ferramentas de verificação de contraste durante o desenvolvimento:
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Contrast Ratio (Lea Verou)](https://contrast-ratio.com/)
- Plugin de DevTools: aXe DevTools ou Lighthouse

---

## Foco e navegação por teclado

### Visibilidade do foco (WCAG 2.1 — 2.4.7)

**Requisitos obrigatórios:**

1. **Indicador de foco visível**
   - Todos os elementos interativos (botões, links, inputs, toggles) devem exibir indicador de foco ao receberem foco via teclado
   - Contraste mínimo: **3:1** contra o fundo adjacente
   - Cor recomendada: secondary/500 `#347a34` (anel/borda); confirmar com o designer
   - Espessura mínima: **2px** (recomendação WCAG 2.2)

2. **Ordem de foco lógica**
   - A sequência de navegação via `Tab` deve seguir a ordem visual do layout (esquerda→direita, topo→fundo)
   - Modais e drawers devem **capturar o foco** ao abrir e restaurá-lo ao fechar
   - Elementos fora da viewport atual (ex: drawer fechado) não devem ser alcançáveis via `Tab`

3. **Atalhos de teclado**
   - **[A DEFINIR — depende de funcionalidades complexas]**
   - Caso sejam implementados atalhos globais (ex: `Ctrl+K` para busca), devem ser documentados e reversíveis
   - Atalhos não devem conflitar com tecnologias assistivas (evitar sobrescrever `Tab`, `Esc`, `Enter`)

### Estados de teclado obrigatórios

| Componente | Tecla | Comportamento esperado |
|------------|-------|------------------------|
| **Botões** | `Enter` / `Space` | Acionar ação primária |
| **Links** | `Enter` | Navegar para destino |
| **Inputs de texto** | `Tab` | Navegar para próximo campo; `Shift+Tab` para anterior |
| **Checkboxes/Radio** | `Space` | Alternar seleção |
| **Toggles** | `Space` | Alternar estado on/off |
| **Modais/Drawers** | `Esc` | Fechar overlay |
| **Dropdowns/Select** | `Arrow ↑↓` | Navegar opções; `Enter` selecionar; `Esc` fechar |
| **Tabelas** | `Arrow ←→↑↓` | Navegar células (se aplicável) |
| **Bottom Nav Bar** | `Tab` | Navegar entre itens; `Enter` ativar |

**[A DEFINIR — comportamento de navegação em listas longas]**  
Para telas com muitos itens (ex: lista de notificações, tabela de OS), definir se haverá atalho para pular blocos (`Skip to main content`) ou navegação por grupo.

---

## Labels e identificação de campos

### Labels obrigatórios (WCAG 2.1 — 3.3.2)

**Todos os campos de formulário devem possuir:**

1. **Label visível e associado via `<label for="id">` ou `aria-labelledby`**
   - Estilo tipográfico extraído:
     - **Mobile (App):** `App/Label/MD` (Inter 12px peso 500)
     - **Desktop (Web):** `Web/Label/LG` (Inter 14px peso 500)
   - Labels devem estar **acima** ou **à esquerda** do campo (nunca placeholder como único identificador)

2. **Placeholder como complemento, não substituto**
   - Placeholders desaparecem ao digitar → não devem conter informação crítica
   - Exemplo válido:
     - **Label:** "E-mail cadastrado"
     - **Placeholder:** "seu@email.com.br" (exemplo de formato)

3. **Instruções claras para campos obrigatórios**
   - Indicação visual consistente (ex: asterisco `*` ou badge "Obrigatório")
   - Mensagem inicial de tela deve informar "Campos marcados com * são obrigatórios"
   - **[A DEFINIR — padrão visual de obrigatoriedade]**

4. **Descrições adicionais quando necessário**
   - Para campos complexos (ex: senha, CPF), adicionar hint text abaixo do label:
     - Estilo tipográfico: `App/Caption/Regular` (10px) ou `Web/Text/XS/Regular` (12px)
     - Exemplo: "Sua senha deve ter 8–16 caracteres, contendo letras, números e símbolos."

### Campos de senha

Requisitos específicos de acessibilidade:

- **Botão "Mostrar/Ocultar senha"** deve ter:
  - Rótulo acessível: `aria-label="Mostrar senha"` / `"Ocultar senha"`
  - Estado alternado deve ser anunciado por leitores de tela
  - Ícone: `visibility` / `visibility_off` (Material Icons)

- **Indicador de força de senha**
  - Texto acessível além da barra visual (ex: "Força: Média")
  - **[A DEFINIR — critérios de cálculo de força]**
  - Estado deve ser anunciado via `aria-live="polite"` ao mudar

---

## Mensagens de erro e validação

### Feedback de erro acessível (WCAG 2.1 — 3.3.1, 3.3.3)

**Requisitos obrigatórios:**

1. **Erro identificado visualmente E por texto**
   - Cor de erro: danger `#9b1400` (texto e borda do campo)
   - Nunca usar apenas cor (adicionar ícone `error` ou texto)
   - Borda do campo deve mudar para cor de erro ao validar

2. **Mensagem de erro clara e específica**
   - Localização: **abaixo do campo** com erro
   - Estilo tipográfico: `App/Caption/Regular` (10px) ou `Web/Text/XS/Regular` (12px)
   - Tom de voz: direto, sem culpar o usuário
   - Exemplos:
     - ❌ "Erro: campo inválido"
     - ✅ "Digite um e-mail válido. Exemplo: seu@email.com.br"
     - ✅ "A senha deve ter no mínimo 8 caracteres."

3. **Anúncio para leitores de tela**
   - Mensagens de erro devem ser associadas ao campo via `aria-describedby`
   - Erros de formulário global devem usar `role="alert"` ou `aria-live="assertive"`
   - Ao submeter formulário com erros:
     - Foco deve mover para o **primeiro campo com erro**
     - Mensagem de resumo de erros no topo (ex: "3 campos precisam de atenção")

4. **Validação em tempo real (com cautela)**
   - **[A DEFINIR — estratégia de validação: on blur, on submit ou híbrida]**
   - Se validar durante digitação (`on change`), aguardar pausa de 500ms para não interromper usuário
   - Nunca exibir erro antes do usuário terminar de digitar o campo

### Estados de input extraídos do Figma

Componentes de Input identificados:
- `Input/Default`
- `Input/Disabled`
- `Input/Error`
- `Input/Filled`
- `Input/Focused`
- `Input/Password`

Cores por estado (ver token detalhado em §2.1 Input):
- **Default/Filled:** fundo neutral/50 `#f7f7f8`, borda neutral/200 `#d8dadf`, texto `#151619`
- **Focused:** fundo branco + anel secondary/500 `#347a34` _(recomendado)_
- **Error:** borda + mensagem danger `#9b1400`
- **Disabled:** opacidade reduzida _(valor exato a confirmar no Figma)_

---

## Estados em badges e status

### Badges de status acessíveis

Componentes extraídos:
- `Badge/Count/Green`
- `Badge/Count/Red`
- `Badge/Dot`
- `Tag/Documento`
- `Tag/Estoque`
- `Tag/Expirado`
- `Tag/Info`
- `Tag/OS`
