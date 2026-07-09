# Modelo de dados

## Visão geral

Este documento descreve o modelo de dados do sistema Ecomax, derivado do Discovery e do Protótipo. O modelo está organizado em domínios funcionais, refletindo a arquitetura modular da plataforma (Backoffice, Operador, Cliente).

**Importante:** Este modelo representa a estrutura lógica de dados. Onde informações específicas ainda não foram definidas no Discovery ou nas respostas aos gaps, consta explicitamente **[A DEFINIR — depende de X]**.

---

## Domínio: Autenticação e Controle de Acesso

### Entidade: Usuario

Representa qualquer usuário do sistema (colaboradores internos, operadores de campo, clientes).

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | Sim | Identificador único do usuário |
| `email` | String(255) | Sim | E-mail de login, único no sistema |
| `senha_hash` | String(255) | Sim | Hash BCrypt da senha (8-16 caracteres, mínimo 1 número, 1 letra, 1 caractere especial) |
| `nome_completo` | String(255) | Sim | Nome completo do usuário |
| `tipo_usuario` | Enum | Sim | `ADMIN`, `GESTOR`, `OPERACIONAL`, `COMERCIAL`, `FINANCEIRO`, `RH`, `OPERADOR`, `CLIENTE` |
| `perfil_acesso_id` | UUID | Sim | FK para `PerfilAcesso` |
| `ativo` | Boolean | Sim | Indica se o usuário está ativo no sistema |
| `data_criacao` | Timestamp | Sim | Data de criação do registro |
| `data_ultima_alteracao` | Timestamp | Sim | Data da última alteração |
| `usuario_criador_id` | UUID | Não | FK para `Usuario` que criou este registro (apenas backoffice) |

**Chaves:**
- PK: `id`
- UK: `email`
- FK: `perfil_acesso_id` → `PerfilAcesso.id`
- FK: `usuario_criador_id` → `Usuario.id`

**Relacionamentos:**
- `Usuario` N:1 `PerfilAcesso` — cada usuário possui um perfil de acesso
- `Usuario` 1:N `TokenRecuperacaoSenha` — um usuário pode ter múltiplos tokens de recuperação ao longo do tempo
- `Usuario` 1:N `SessaoUsuario` — um usuário pode ter múltiplas sessões ativas

---

### Entidade: PerfilAcesso

Define perfis de acesso com permissões por módulo.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | Sim | Identificador único do perfil |
| `nome` | String(100) | Sim | Nome do perfil (ex: "Administrador", "Gestor Operacional") |
| `descricao` | Text | Não | Descrição do escopo do perfil |
| `ativo` | Boolean | Sim | Indica se o perfil está ativo |

**Chaves:**
- PK: `id`
- UK: `nome`

**Relacionamentos:**
- `PerfilAcesso` 1:N `Usuario` — um perfil pode ser atribuído a vários usuários
- `PerfilAcesso` 1:N `PermissaoModulo` — um perfil possui múltiplas permissões por módulo

**[A DEFINIR — depende de Perfis de acesso não definidos]:** Lista exata de perfis padrão, suas permissões específicas por módulo e matriz de controle de acesso.

---

### Entidade: PermissaoModulo

Define permissões granulares por módulo para cada perfil.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | Sim | Identificador único da permissão |
| `perfil_acesso_id` | UUID | Sim | FK para `PerfilAcesso` |
| `modulo` | Enum | Sim | `GESTAO_CLIENTES`, `OPERACIONAL`, `COMERCIAL`, `ESTOQUE`, `FINANCEIRO`, `RELATORIOS`, `GESTAO_USUARIOS`, `CONFIGURACOES` |
| `pode_ler` | Boolean | Sim | Permissão de leitura |
| `pode_criar` | Boolean | Sim | Permissão de criação |
| `pode_editar` | Boolean | Sim | Permissão de edição |
| `pode_excluir` | Boolean | Sim | Permissão de exclusão |

**Chaves:**
- PK: `id`
- UK: `perfil_acesso_id`, `modulo`
- FK: `perfil_acesso_id` → `PerfilAcesso.id`

**Relacionamentos:**
- `PermissaoModulo` N:1 `PerfilAcesso` — múltiplas permissões por perfil

---

### Entidade: TokenRecuperacaoSenha

Armazena tokens temporários para recuperação de senha.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | Sim | Identificador único do token |
| `usuario_id` | UUID | Sim | FK para `Usuario` |
| `token` | String(255) | Sim | Token único criptograficamente seguro |
| `data_criacao` | Timestamp | Sim | Data de criação do token |
| `data_expiracao` | Timestamp | Sim | Data de expiração do token |
| `utilizado` | Boolean | Sim | Indica se o token já foi utilizado |

**Chaves:**
- PK: `id`
- UK: `token`
- FK: `usuario_id` → `Usuario.id`

**Relacionamentos:**
- `TokenRecuperacaoSenha` N:1 `Usuario` — múltiplos tokens podem existir para um usuário (histórico)

**[A DEFINIR — depende de Expiração de token de recuperação de senha não especificada]:** Prazo de validade exato do token (atualmente sem definição) e comportamento após expiração.

---

### Entidade: SessaoUsuario

Registra sessões ativas de usuários para controle de acesso concorrente.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | Sim | Identificador único da sessão |
| `usuario_id` | UUID | Sim | FK para `Usuario` |
| `token_sessao` | String(255) | Sim | Token JWT ou similar |
| `data_inicio` | Timestamp | Sim | Data/hora de início da sessão |
| `data_expiracao` | Timestamp | Sim | Data/hora de expiração da sessão |
| `ip_origem` | String(45) | Não | IP de origem da conexão |
| `user_agent` | String(500) | Não | User-agent do navegador/app |
| `ativa` | Boolean | Sim | Indica se a sessão está ativa |

**Chaves:**
- PK: `id`
- UK: `token_sessao`
- FK: `usuario_id` → `Usuario.id`

**Relacionamentos:**
- `SessaoUsuario` N:1 `Usuario` — múltiplas sessões por usuário

**[A DEFINIR — depende de Limite de tentativas de login não especificado]:** Política de bloqueio por tentativas falhas, número de tentativas permitidas e tempo de bloqueio.

---

## Domínio: Gestão de Clientes

### Entidade: Cliente

Representa empresas clientes da Ecomax.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | Sim | Identificador único do cliente |
| `razao_social` | String(255) | Sim | Razão social da empresa |
| `nome_fantasia` | String(255) | Não | Nome fantasia |
| `cnpj` | String(18) | Sim | CNPJ (formato XX.XXX.XXX/XXXX-XX) |
| `classificacao_abc` | Enum | Sim | `A`, `B`, `C` — classificação de importância |
| `logradouro` | String(255) | Sim | Endereço: logradouro |
| `numero` | String(20) | Sim | Endereço: número |
| `complemento` | String(100) | Não | Endereço: complemento |
| `bairro` | String(100) | Sim | Endereço: bairro |
| `cidade` | String(100) | Sim | Endereço: cidade |
| `uf` | String(2) | Sim | Endereço: UF (sigla) |
| `cep` | String(9) | Sim | Endereço: CEP (formato XXXXX-XXX) |
| `ativo` | Boolean | Sim | Indica se o cliente está ativo |
| `data_cadastro` | Timestamp | Sim | Data de cadastro do cliente |
| `observacoes` | Text | Não | Observações gerais sobre o cliente |

**Chaves:**
- PK: `id`
- UK: `cnpj`

**Relacionamentos:**
- `Cliente` 1:N `ContatoCliente` — um cliente pode ter múltiplos contatos
- `Cliente` 1:N `UsuarioPortalCliente` — um cliente pode ter múltiplos usuários de portal
- `Cliente` 1:N `Orcamento` — um cliente pode ter múltiplos orçamentos
- `Cliente` 1:N `OrdemServico` — um cliente pode ter múltiplas ordens de serviço
- `Cliente` 1:N `FuncionarioIntegrado` — um cliente pode ter funcionários integrados/parceiros
- `Cliente` N:N `Produto` (via `ProdutoHomologadoCliente`) — cliente homologa produtos específicos

---

### Entidade: ContatoCliente

Representa contatos (pessoas) vinculados ao cliente.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | Sim | Identificador único do contato |
| `cliente_id` | UUID | Sim | FK para `Cliente` |
| `nome` | String(255) | Sim | Nome completo do contato |
| `cargo` | String(100) | Não | Cargo na empresa |
| `email` | String(255) | Não | E-mail do contato |
| `telefone` | String(20) | Não | Telefone (formato (XX) XXXXX-XXXX) |
| `principal` | Boolean | Sim | Indica se é o contato principal do cliente |

**Chaves:**
- PK: `id`
- FK: `cliente_id` → `Cliente.id`

**Relacionamentos:**
- `ContatoCliente` N:1 `Cliente` — múltiplos contatos por cliente

---

### Entidade: UsuarioPortalCliente

Representa usuários com acesso ao Portal do Cliente (ambiente web externo).

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | Sim | Identificador único do usuário do portal |
| `cliente_id` | UUID | Sim | FK para `Cliente` |
| `usuario_id` | UUID | Sim | FK para `Usuario` (herda autenticação) |
| `data_criacao` | Timestamp | Sim | Data de criação do acesso ao portal |
| `ativo` | Boolean | Sim | Indica se o acesso está ativo |

**Chaves:**
- PK: `id`
- UK: `usuario_id`
- FK: `cliente_id` → `Cliente.id`
- FK: `usuario_id` → `Usuario.id`

**Relacionamentos:**
- `UsuarioPortalCliente` N:1 `Cliente` — múltiplos usuários de portal por cliente
- `UsuarioPortalCliente` 1:1 `Usuario` — cada usuário de portal está vinculado a um registro de usuário do sistema

---

### Entidade: FuncionarioIntegrado

Representa funcionários de empresas parceiras alocados para serviços de clientes.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | Sim | Identificador único do funcionário integrado |
| `cliente_id` | UUID | Sim | FK para `Cliente` ao qual está vinculado |
| `nome_completo` | String(255) | Sim | Nome completo do funcionário |
| `cpf` | String(14) | Sim | CPF (formato XXX.XXX.XXX-XX) |
| `empresa_origem` | String(255) | Sim | Nome da empresa parceira de origem |
| `ativo` | Boolean | Sim | Indica se o funcionário está ativo |

**Chaves:**
- PK: `id`
- UK: `cpf`
- FK: `cliente_id` → `Cliente.id`

**Relacionamentos:**
- `FuncionarioIntegrado` N:1 `Cliente` — múltiplos funcionários integrados por cliente
- `FuncionarioIntegrado` N:N `TipoServico` (via `ServicoFuncionarioIntegrado`) — funcionário pode executar múltiplos tipos de serviço
- `FuncionarioIntegrado` 1:N `IntegracaoEmpresa` — funcionário pode ter múltiplas integrações com empresas ao longo do tempo

**[A DEFINIR — depende de Conceito de 'Integração com Empresas' não definido]:** Definição completa do conceito de integração, campos do cadastro, regras de negócio e impacto funcional.

---

### Entidade: IntegracaoEmpresa

Representa vínculos temporários de funcionários integrados com empresas parceiras.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | Sim | Identificador único da integração |
| `funcionario_integrado_id` | UUID | Sim | FK para `FuncionarioIntegrado` |
| `empresa` | String(255) | Sim | Nome da empresa parceira |
| `data_inicio` | Date | Sim | Data de início da integração |
| `data_vencimento` | Date | Sim | Data de vencimento da integração |
| `ativo` | Boolean | Sim | Indica se a integração está ativa |

**Chaves:**
- PK: `id`
- FK: `funcionario_integrado_id` → `FuncionarioIntegrado.id`

**Relacionamentos:**
- `IntegracaoEmpresa` N:1 `FuncionarioIntegrado` — múltiplas integrações por funcionário (histórico)

**[A DEFINIR — depende de Conceito de 'Integração com Empresas' não definido]:** Propósito da data de vencimento, campos adicionais do cadastro e impacto no restante do sistema.

---

### Entidade: ServicoFuncionarioIntegrado

Tabela associ