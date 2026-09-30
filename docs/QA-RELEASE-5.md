# QA — Release 5 · Portal do Cliente

Portal do Cliente em modo leitura, com quatro módulos: **Ordens de Serviço,
Produtos, Documentos e Colaboradores**, mais o detalhe da OS com quatro abas.

Endereço: **https://cliente.ecomax.com.br**

Este roteiro traz o que testar, o que esperar e — tão importante quanto — **o
que é normal aparecer vazio**. Boa parte dos chamados falsos num portal
multi-cliente nasce de alguém achando que uma tela quebrou quando ela está
apenas obedecendo a regra de visibilidade.

---

## 1. Antes de começar: as contas

### A armadilha

**Criar o usuário pelo painel do Supabase não funciona.** O gatilho cria o
perfil com `role = 'operacional'`, que é o padrão, e o Portal recusa o login
com:

> Este acesso é exclusivo para clientes Ecomax.

O caminho certo é o convite pelo Backoffice: **Gestão de Clientes → abrir o
cliente → Portal → convidar**. A função `invite_portal` cria a conta, grava
`role: 'cliente'`, marca o perfil como ativo, amarra o `cliente_id` e envia o
link para a pessoa definir a própria senha.

### Contas já preparadas

| conta | cliente | serve para |
| --- | --- | --- |
| `qa.alfa@ecomax.com.br` | `[QA] Alfa Alimentos` | o cliente com tudo preenchido |
| `qa.beta@ecomax.com.br` | `[QA] Beta Logística` | o vizinho, para testar isolamento |

O vínculo que faz o Portal enxergar alguma coisa é a linha em
`cliente_portal_usuarios`, casada **por e-mail**. Conta sem essa linha entra e
não vê nada — é o modo de falhar mais confuso do sistema.

---

## 2. Massa de teste

Tudo leva o prefixo `[QA]`. Para remover ao final:

```
supabase db query --linked -f supabase/seed/qa_release5_remover.sql
```

### Ordens de serviço

| código | cliente | situação | observação |
| --- | --- | --- | --- |
| OS-1034 | Alfa | Concluída | a completa: tem as quatro abas preenchidas |
| OS-1035 | Alfa | Em aberto | vazia de propósito: testa os estados vazios |
| OS-1036 | Alfa | Em aberto | **rascunho — não pode aparecer no Portal** |
| OS-1037 | Beta | Concluída | do vizinho: o Alfa não pode ver |

---

## 3. Roteiro por tela — entrando como **Alfa**

### 3.1 Ordens de Serviço

Esperado: **2 ordens** — OS-1034 e OS-1035.

- [ ] **OS-1036 não aparece.** É rascunho. Se aparecer, é vazamento.
- [ ] Quatro colunas: Número · Identificação · Data de abertura · Situação.
- [ ] Clicar na linha abre o detalhe. Tab + Enter também abre.
- [ ] O contador no topo acompanha a busca — buscar algo sem resultado deve
      levar o número a zero, não mantê-lo no total.

### 3.2 Detalhe da OS — abrir a **OS-1034**

Quatro abas, cada uma com contador ao lado do nome.

| aba | esperado |
| --- | --- |
| Relatórios Técnicos | **1** — só o publicado |
| Mapeamento | **4 pontos** |
| Cronograma | **2 visitas** |
| Certificado | **2** — certificado e comprovante |

- [ ] Existe um segundo relatório **não publicado** no banco. Ele **não pode**
      aparecer. Se aparecer, o cliente está vendo rascunho técnico.
- [ ] Mapeamento mostra as quatro situações, uma em cada linha: Conforme, Não
      conforme, Inacessível e Não registrado.
- [ ] A OS tem uma **foto interna** anexada. Ela **não pode** aparecer na aba
      Certificado — o recorte é por tipo, não só por dono.
- [ ] Abrir um documento deve abrir o visualizador em modal, não uma aba nova.

Depois abra a **OS-1035**: as quatro abas devem dizer que estão vazias, cada
uma com sua frase. Nenhuma pode ficar girando nem em branco.

### 3.3 Produtos

Esperado: **3 produtos**.

- [ ] Dois aparecem por homologação, um por ter sido aplicado na OS-1034.
- [ ] O raticida aparece como **Indisponível** — a homologação dele venceu. É
      o caso que o cliente precisa notar.
- [ ] A faixa Disponível/Indisponível é **legenda, não filtro**. Não é clicável.
- [ ] O ícone da coluna **ANVISA / Rótulo** abre `consultas.anvisa.gov.br` em
      aba nova, e não o visualizador.
- [ ] Existe um quarto produto homologado só para a Beta. Não pode aparecer.

### 3.4 Documentos

Esperado: **3 documentos** distribuídos nas abas de categoria.

- [ ] Contrato e Licença são do Alfa; o Manual é **institucional** e aparece
      para todo cliente.
- [ ] Existe um documento **arquivado** (inativo). Não pode aparecer.
- [ ] Duas colunas: Documento · Arquivo.
- [ ] As abas de categoria aparecem mesmo com contagem zero.

### 3.5 Colaboradores

Esperado: **2 colaboradores**.

- [ ] Matriz com uma coluna por tipo de documento.
- [ ] Validade em **MM/AA**. Passar o mouse mostra a data completa.
- [ ] Carlos tem os quatro estados: um válido, um **vencendo em breve** (com
      ícone de relógio), um **vencido** e os demais **indisponíveis**.
- [ ] Buscar um nome que não existe deve oferecer "Solicitar ao RH por e-mail"
      e "Limpar busca".
- [ ] Existe um terceiro técnico, que atendeu só a Beta. Não pode aparecer.

---

## 4. Isolamento — entrando como **Beta**

Saia e entre com `qa.beta@ecomax.com.br`. Esta é a parte que mais importa.

- [ ] **1 ordem** apenas: OS-1037. Nenhuma do Alfa.
- [ ] Documentos: o contrato da Beta **e** o Manual institucional. O contrato
      do Alfa não pode estar lá.
- [ ] Produtos: só o cupinicida. Os do Alfa não.
- [ ] Colaboradores: só o Rafael.
- [ ] Abrir o endereço da OS do Alfa na barra — trocar o id na URL de
      `/ordens/<id>` — deve dizer que a ordem não está disponível para a conta,
      e não mostrar conteúdo.

---

## 5. Caminhos públicos (sem login)

- [ ] `https://cliente.ecomax.com.br/privacidade` abre sem pedir login, com 12
      seções, CNPJ e razão social. É a URL exigida pelas lojas de aplicativo.
- [ ] Um link de redefinição de senha **expirado** deve mostrar "Este link
      expirou" e **não** exibir os campos de senha. Antes, a pessoa digitava a
      senha e o botão não fazia nada.

---

## 6. Responsivo

- [ ] Em 375px de largura, nenhuma tela pode rolar para o lado.
- [ ] A matriz de Colaboradores rola horizontalmente **dentro do próprio
      quadro**, sem arrastar a página junto.

---

## 7. O que já foi provado — não precisa refazer

O isolamento foi verificado no banco, simulando cada usuário do Portal. São 20
casos, entre eles:

```
Alfa NÃO vê OS em rascunho          Alfa NÃO vê OS da Beta
Alfa NÃO vê documento inativo        Beta NÃO vê o contrato do Alfa
Alfa NÃO vê o técnico da Beta        Alfa vê só o relatório publicado
Alfa NÃO vê foto interna da própria OS
Beta NÃO vê ponto do mapeamento do Alfa
```

A suíte automatizada vive em `supabase/tests/rls/` e roda a cada PR contra um
banco recriado do zero. O valor do teste manual está na **interface**: textos,
estados vazios, navegação e comportamento do visualizador.

---

## 8. Aberto, e não é defeito de tela

**Documento institucional é visível a qualquer usuário autenticado**, inclusive
a um usuário de Portal que foi **desativado**. Nenhum dado de cliente vaza —
conferido: quem não tem vínculo vê zero documentos de cliente. O que fica
exposto é material da empresa para todos os clientes (manual, política).

A regra está escrita assim de propósito (`cliente_id IS NULL` = todos). Falta
decidir se "todos" deve significar "todo autenticado" ou "todo usuário de
portal ativo". **Não bloqueia o Release 5.**

---

## 9. Como reportar

Para cada problema, informe:

1. Qual conta estava usando (Alfa ou Beta).
2. Endereço da página.
3. O que esperava e o que aconteceu.
4. Se o problema é **algo que apareceu e não devia**, marque como urgente — é a
   classe de falha que expõe dado de um cliente a outro.
