# Requisitos — Ecomax

## Visão Geral

Este documento especifica os **requisitos funcionais (RF)** e **não-funcionais (RNF)** do sistema Ecomax, organizados por módulo/fluxo. Cada requisito possui identificador único, título, descrição e critérios de aceite testáveis em formato Dado/Quando/Então.

Todos os requisitos são rastreáveis ao Discovery e ao Protótipo fornecidos.

---

## 1. Requisitos Funcionais

### 1.1. Módulo: Autenticação (Backoffice Web)

#### RF-001: Login com e-mail e senha
**Descrição:** O sistema deve permitir que o usuário do backoffice faça login utilizando e-mail e senha cadastrados.

**Rastreabilidade:** Discovery > Page 1 > Ambiente Backoffice > Autenticação > Funcionalidades > 1 Login

**Critérios de aceite:**

**Dado** que o usuário está na tela de login  
**Quando** preenche e-mail e senha válidos e clica em "Entrar"  
**Então** o sistema autentica o usuário e redireciona para a tela de notificações (2 - Notificações)

**Dado** que o usuário está na tela de login  
**Quando** preenche e-mail ou senha inválidos e clica em "Entrar"  
**Então** o sistema exibe mensagem "[A DEFINIR — depende de especificação de mensagens de erro]" abaixo do campo correspondente

**Dado** que o usuário está na tela de login  
**Quando** deixa campo obrigatório vazio e clica em "Entrar"  
**Então** o sistema exibe mensagem "[A DEFINIR — depende de especificação de mensagens de erro]" abaixo do campo vazio

---

#### RF-002: Recuperação de senha
**Descrição:** O sistema deve permitir que o usuário recupere sua senha através de link enviado por e-mail.

**Rastreabilidade:** Discovery > Page 1 > Ambiente Backoffice > Autenticação > Funcionalidades > 1.1 Recuperação de senha

**Critérios de aceite:**

**Dado** que o usuário está na tela de recuperação de senha (1.1)  
**Quando** insere e-mail cadastrado e clica em "Enviar link de recuperação"  
**Então** o sistema envia e-mail com link de recuperação e exibe tela de confirmação (1.1.2)

**Dado** que o usuário recebeu o link de recuperação por e-mail  
**Quando** clica no link dentro do prazo de validade [A DEFINIR — depende de prazo de expiração de token]  
**Então** o sistema redireciona para a tela de criar nova senha (1.1.1)

**Dado** que o usuário recebeu o link de recuperação por e-mail  
**Quando** clica no link após o prazo de validade [A DEFINIR — depende de prazo de expiração de token]  
**Então** o sistema exibe mensagem de link expirado [A DEFINIR — depende de comportamento após expiração]

---

#### RF-003: Criação de nova senha
**Descrição:** O sistema deve permitir que o usuário crie uma nova senha seguindo política de segurança.

**Rastreabilidade:** Discovery > Page 1 > Ambiente Backoffice > Autenticação > Funcionalidades > 1.1.1 Criar nova senha

**Critérios de aceite:**

**Dado** que o usuário está na tela de criar nova senha (1.1.1)  
**Quando** insere senha válida (8-16 caracteres, contendo ao menos 1 número, 1 letra e 1 caractere especial) e confirma a mesma senha  
**Então** o sistema salva a nova senha e redireciona para tela de login (1)

**Dado** que o usuário está na tela de criar nova senha (1.1.1)  
**Quando** insere senha que não atende aos critérios de complexidade  
**Então** o sistema exibe feedback inline "[A DEFINIR — depende de especificação de mensagens de erro]" indicando requisitos não atendidos

**Dado** que o usuário está na tela de criar nova senha (1.1.1)  
**Quando** insere senha e confirmação divergentes  
**Então** o sistema exibe mensagem de erro "[A DEFINIR — depende de especificação de mensagens de erro]" abaixo do campo de confirmação

---

#### RF-004: Validação de política de senha
**Descrição:** O sistema deve validar que senhas possuam 8-16 caracteres, contendo ao menos 1 número, 1 letra e 1 caractere especial.

**Rastreabilidade:** Discovery > Page 1 > Ambiente Backoffice > Autenticação > Critérios de aceite

**Critérios de aceite:**

**Dado** que o usuário está criando ou alterando senha  
**Quando** a senha possui menos de 8 ou mais de 16 caracteres  
**Então** o sistema rejeita e exibe feedback de tamanho inválido

**Dado** que o usuário está criando ou alterando senha  
**Quando** a senha não contém ao menos 1 número  
**Então** o sistema rejeita e exibe feedback de ausência de número

**Dado** que o usuário está criando ou alterando senha  
**Quando** a senha não contém ao menos 1 letra  
**Então** o sistema rejeita e exibe feedback de ausência de letra

**Dado** que o usuário está criando ou alterando senha  
**Quando** a senha não contém ao menos 1 caractere especial  
**Então** o sistema rejeita e exibe feedback de ausência de caractere especial

---

#### RF-005: Ocultar/exibir senha
**Descrição:** O sistema deve permitir que o usuário visualize ou oculte os caracteres digitados no campo de senha.

**Rastreabilidade:** Discovery > Page 1 > Ambiente Backoffice > Autenticação > Critérios de aceite

**Critérios de aceite:**

**Dado** que o usuário está preenchendo campo de senha  
**Quando** clica no botão "Mostrar"  
**Então** o sistema exibe os caracteres da senha em texto claro

**Dado** que o usuário está com senha visível  
**Quando** clica no botão "Ocultar" (ou equivalente)  
**Então** o sistema oculta novamente os caracteres da senha

---

#### RF-006: Bloqueio por tentativas falhas
**Descrição:** [A DEFINIR — depende de limite de tentativas de login]

**Rastreabilidade:** Discovery > Page 1 > Ambiente Backoffice > Autenticação > Gap: Limite de tentativas de login não especificado

**Critérios de aceite:**

[A DEFINIR — depende de quantas tentativas são permitidas, tempo de bloqueio e como desbloquear]

---

#### RF-007: Alterar senha logado
**Descrição:** O sistema deve permitir que o usuário altere sua senha após autenticado, seguindo a mesma política de senha do login.

**Rastreabilidade:** Discovery > Page 1 > Ambiente Backoffice > Autenticação > Impactos em outros módulos

**Critérios de aceite:**

**Dado** que o usuário está autenticado e acessa a funcionalidade de alterar senha  
**Quando** insere senha atual correta e nova senha válida  
**Então** o sistema altera a senha e envia e-mail de confirmação de alteração

**Dado** que o usuário está autenticado e acessa a funcionalidade de alterar senha  
**Quando** insere senha atual incorreta  
**Então** o sistema rejeita a operação e exibe mensagem de senha atual inválida

---

### 1.2. Módulo: Notificações (Backoffice Web)

#### RF-008: Visualizar lista de notificações
**Descrição:** O sistema deve exibir lista de notificações do usuário com data, hora, título, descrição, tipo e indicador de leitura.

**Rastreabilidade:** Discovery > Page 1 > Ambiente Backoffice > Notificações > Funcionalidades > 2 Notificações

**Critérios de aceite:**

**Dado** que o usuário acessa o módulo de notificações (2)  
**Quando** a lista é carregada  
**Então** o sistema exibe todas as notificações ordenadas por data mais recente primeiro, contendo data/hora, título, descrição, tipo e indicador visual de não lida

**Dado** que o usuário possui notificações não lidas  
**Quando** acessa o módulo de notificações (2)  
**Então** o sistema destaca visualmente as notificações não lidas [A DEFINIR — depende de regra "destacar visualmente notificações não lidas"]

---

#### RF-009: Marcar notificação como lida
**Descrição:** O sistema deve marcar automaticamente uma notificação como lida quando o usuário interage com ela.

**Rastreabilidade:** Discovery > Page 1 > Ambiente Backoffice > Notificações > Critérios de aceite

**Critérios de aceite:**

**Dado** que o usuário possui notificação não lida  
**Quando** clica na notificação ou pressiona "Ver detalhes"  
**Então** o sistema marca a notificação como lida automaticamente e remove o destaque visual

---

#### RF-010: Marcar todas notificações como lidas
**Descrição:** O sistema deve permitir que o usuário marque todas as notificações como lidas de uma vez.

**Rastreabilidade:** Protótipo > Backoffice > 2 - Notificações > Btn - Marcar todas lidas

**Critérios de aceite:**

**Dado** que o usuário possui notificações não lidas  
**Quando** clica em "Marcar como lidas"  
**Então** o sistema marca todas as notificações como lidas e remove o destaque visual de todas

---

#### RF-011: Filtrar notificações por status de leitura
**Descrição:** O sistema deve permitir que o usuário filtre notificações por "Todas", "Não lidas" e "Lidas".

**Rastreabilidade:** Discovery > Page 1 > Ambiente Backoffice > Notificações > Funcionalidades > 2 Notificações

**Critérios de aceite:**

**Dado** que o usuário está na tela de notificações (2)  
**Quando** seleciona a aba "Não lidas"  
**Então** o sistema exibe apenas notificações não lidas

**Dado** que o usuário está na tela de notificações (2)  
**Quando** seleciona a aba "Lidas"  
**Então** o sistema exibe apenas notificações já lidas

**Dado** que o usuário está na tela de notificações (2)  
**Quando** seleciona a aba "Todas"  
**Então** o sistema exibe todas as notificações (lidas e não lidas)

---

#### RF-012: Excluir notificação
**Descrição:** O sistema deve permitir que o usuário exclua notificações individualmente.

**Rastreabilidade:** Discovery > Page 1 > Ambiente Backoffice > Notificações > Funcionalidades > 2 Notificações; Protótipo > Backoffice > Content Area > Excluir

**Critérios de aceite:**

**Dado** que o usuário está visualizando uma notificação  
**Quando** clica em "Excluir"  
**Então** o sistema remove a notificação da lista permanentemente

---

#### RF-013: Carregar mais notificações (paginação)
**Descrição:** O sistema deve permitir carregar mais notificações ao rolar a lista.

**Rastreabilidade:** Discovery > Page 1 > Ambiente Backoffice > Notificações > Funcionalidades > 2 Notificações

**Critérios de aceite:**

**Dado** que o usuário está visualizando lista de notificações  
**Quando** rola até o fim da lista e clica em "Carregar mais"  
**Então** o sistema carrega próximo lote de notificações e exibe estado de carregamento durante a operação

---

#### RF-014: Agrupar notificações por data
**Descrição:** O sistema deve agrupar implicitamente notificações por data quando houver grande volume.

**Rastreabilidade:** Discovery > Page 1 > Ambiente Backoffice > Notificações > Funcionalidades > 2 Notificações

**Critérios de aceite:**

**Dado** que o usuário possui [A DEFINIR — depende de critério 'grande volume'] ou mais notificações  
**Quando** acessa a lista de notificações  
**Então** o sistema agrupa notificações por data (ex: "Hoje", "Ontem", "05/02")

---

#### RF-015: Redirecionar ao clicar em notificação
**Descrição:** O sistema deve redirecionar o usuário para o local apropriado ao clicar em uma notificação.

**Rastreabilidade:** Discovery > Page 1 > Ambiente Backoffice > Notificações > Funcionalidades > 2 Notificações; Protótipo > Backoffice > Ir para ordem de serviço / Ver detalhes

**Critérios de aceite:**

**Dado** que o usuário clica em notificação do tipo "Nova ordem de serviço cadastrada"  
**Quando** pressiona "Ir para ordem de serviço"  
**Então** o sistema redireciona para a tela de detalhes da OS correspondente [A DEFINIR — depende de detalhamento do