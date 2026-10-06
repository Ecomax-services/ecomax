# Deploy na Vercel

## Projetos

Um projeto Vercel por app, com **Root Directory** apontando para a pasta do app:

| Projeto | Domínio | Root Directory |
|---|---|---|
| backoffice | `painel.ecomax.com.br` | `apps/web-backoffice` |
| portal-cliente | `cliente.ecomax.com.br` | `apps/web-portal-cliente` |

O `mobile-operador` não vai para a Vercel — é Expo, distribuído por Expo Go / EAS.

## Publicação pelo GitHub Action

Desde 05/10/2026 a integração da Vercel com o GitHub não publica: o plano Hobby
recusa repositório **privado de organização** ("Cannot deploy from a private
GitHub organization repository on the Hobby plan"), qualquer que seja o autor
do merge. A publicação é feita pelo workflow `.github/workflows/deploy-vercel.yml`,
que roda depois da CI da `main` e só segue se ela passou.

### Configurar (uma vez)

No GitHub: **Settings → Secrets and variables → Actions → New repository
secret**, quatro segredos:

| Segredo | Onde pegar |
|---|---|
| `VERCEL_TOKEN` | Vercel → avatar → **Account Settings → Tokens → Create**. Escopo: a conta onde estão os projetos. |
| `VERCEL_ORG_ID` | Vercel → **Settings → General** da conta (ou do time) → *Vercel ID* / *Team ID* |
| `VERCEL_PROJECT_ID_BACKOFFICE` | projeto **backoffice** → **Settings → General** → *Project ID* |
| `VERCEL_PROJECT_ID_CLIENTE` | projeto **cliente** → **Settings → General** → *Project ID* |

As variáveis do app (`VITE_*`) continuam nos projetos da Vercel, em
**Production**: o workflow as baixa com `vercel pull` antes do build.

### Publicar de novo sem commit

Depois de trocar uma variável na Vercel: GitHub → **Actions → Deploy na Vercel
→ Run workflow**.

### Os checks vermelhos nos PRs

A integração com o GitHub continua conectada e marca "Vercel – backoffice" e
"Vercel – cliente" como falha em todo PR e merge. Não afetam nada. Para
removê-los: em cada projeto, **Settings → Git → Disconnect**. O workflow não
depende dessa conexão.

## Por que cada linha do `vercel.json`

**`rewrites` para `/index.html`** — o roteamento é do react-router, e o único
arquivo que existe em disco é o `index.html`. Sem o rewrite, dar F5 em
`/usuarios` ou `/estoque/saldo` devolve 404. Arquivos que existem em disco têm
precedência sobre rewrites, então os assets continuam sendo servidos.

**Cache dos assets** — os nomes levam hash de conteúdo, então nunca mudam sob a
mesma URL: `immutable` por um ano.

**`no-cache` no `index.html`** — é o único arquivo cujo conteúdo muda sob a mesma
URL. Se ele for cacheado, o navegador continua pedindo assets de um deploy que já
não existe, e a pessoa vê tela branca até limpar o cache.

**Nada de chave `comment`** — a Vercel valida o `vercel.json` com schema estrito
e recusa propriedades desconhecidas. O deploy falha na validação, antes do build.

## Versão do Node

`"engines": { "node": "24.x" }` no `package.json` de cada app. A Vercel usa o
`engines` **em vez** da versão escolhida em Project Settings, então é aqui que
se muda. Desde 01/10/2026 ela recusa build com Node 20, e o
`@supabase/supabase-js` já exige Node 22 ou mais. A CI usa a mesma versão.

## Variáveis de ambiente

Nos dois projetos, marcadas para **Production, Preview e Development**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Só no backoffice**, mais uma:

- `VITE_PORTAL_URL=https://cliente.ecomax.com.br`

Ela monta o link público de renovação de garantia, que abre numa tela do Portal.
Sem ela o link apontaria para o próprio painel, onde o cliente não tem acesso —
e o defeito só apareceria quando alguém clicasse no link recebido por e-mail.

São lidas em tempo de build, não em runtime — mudar uma delas exige um redeploy,
não basta salvar. O `scripts/check-env.mjs` roda antes do `tsc` e falha o build
com o nome da variável faltando, em vez de deixar o deploy verde e o app abrir
em branco.

## Redirect URLs no Supabase

Em Authentication → URL Configuration, a allow-list precisa conter:

```
https://painel.ecomax.com.br/**
https://cliente.ecomax.com.br/**
https://backoffice-*-<scope>.vercel.app/**
https://portal-cliente-*-<scope>.vercel.app/**
http://localhost:5173/**
http://localhost:5174/**
ecomaxoperador://**
exp://**
```

Sem os wildcards de preview, o link de recuperação de senha aberto a partir de um
deploy de preview cai fora da allow-list e o Supabase devolve para o Site URL.


## Secrets da Edge Function

Já configuradas no projeto `imnfcffmzzukabhsotul`:

```
APP_URL_BACKOFFICE=https://painel.ecomax.com.br
APP_URL_PORTAL=https://cliente.ecomax.com.br
```

**Falta configurar:**

```
APP_URL_MOBILE=ecomaxoperador://
```

São elas que decidem para qual aplicação o e-mail de primeiro acesso aponta. Sem
`APP_URL_PORTAL`, o convite de um usuário do portal levaria a pessoa ao painel
administrativo, onde ela não tem acesso — e a função recusa o envio em vez de
mandar o link errado.

O mesmo vale para o operador: sem `APP_URL_MOBILE`, cadastrar um funcionário com
perfil de campo devolve *"Usuário cadastrado, mas o e-mail não saiu
(APP_URL_MOBILE não configurada nas secrets da função). Entregue a senha
provisória"*. O cadastro acontece; só o e-mail não sai.

Duas ressalvas sobre essa secret:

- `ecomaxoperador://` é o scheme do **build nativo** (EAS). Dentro do Expo Go o
  app responde por `exp://<host>`, que muda a cada rede — não há valor fixo que
  sirva para os dois. Enquanto o QA testar por Expo Go, o caminho é entregar a
  senha provisória que a própria tela mostra.
- O valor precisa estar nas **Redirect URLs** do projeto Supabase
  (Authentication > URL Configuration), senão o link é recusado no clique.

Para conferir ou trocar:

```bash
npx supabase secrets list --project-ref imnfcffmzzukabhsotul
npx supabase secrets set APP_URL_PORTAL=https://cliente.ecomax.com.br --project-ref imnfcffmzzukabhsotul
```
