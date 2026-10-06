# Deploy no Cloudflare Pages

Os dois apps web saem pelo **Cloudflare Pages**, de graça e com uso comercial
permitido. A Vercel deixou de publicar em 05/10/2026: o plano Hobby não aceita
repositório privado de organização do GitHub, e a assinatura não foi feita.

Um projeto Pages por app:

| Projeto | Domínio | Pasta raiz (Root directory) |
|---|---|---|
| `ecomax-cliente` | `cliente.ecomax.com.br` | `apps/web-portal-cliente` |
| `ecomax-painel` | `painel.ecomax.com.br` | `apps/web-backoffice` |

O `mobile-operador` não vai para cá: é Expo, distribuído pela loja.

## Por que Pages, e não Worker

No painel atual da Cloudflare, "Create" abre por padrão um **Worker** (com
`npx wrangler deploy`). Para estes apps o certo é **Pages**: um Worker só
aceita domínio próprio se o DNS do domínio estiver na Cloudflare, e o
`ecomax.com.br` está na Locaweb. O Pages aceita um CNAME feito na própria
Locaweb.

## Criar o projeto

Em **Workers & Pages → Create → Pages → Connect to Git** (no painel novo, o
link fica no rodapé: *"Looking to deploy Pages? Get started"*):

1. Repositório: `Ecomax-services/ecomax`.
2. **Production branch:** `main`.
3. **Framework preset:** `Vite` (ou "None").
4. **Build command:** `npm run build`
5. **Build output directory:** `dist`
6. **Root directory:** a pasta do app (tabela acima).
7. **Environment variables** — em *Production* e em *Preview*:

   | Variável | Valor |
   |---|---|
   | `NODE_VERSION` | `24` |
   | `VITE_SUPABASE_URL` | `https://imnfcffmzzukabhsotul.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | a chave *anon / publishable* do projeto (Supabase → Project Settings → API) |

   **Só no painel**, mais uma:

   | Variável | Valor |
   |---|---|
   | `VITE_PORTAL_URL` | `https://cliente.ecomax.com.br` |

   O `.node-version` de cada app já pede Node 24; a variável é garantia.
   As variáveis são lidas **no build**: mudou uma, precisa de novo deploy.
   Faltando alguma, o `scripts/check-env.mjs` para o build com o nome dela,
   em vez de publicar um app que abre em branco.

8. **Save and Deploy.**

## Domínio próprio

Com o primeiro deploy verde, em **Custom domains → Set up a custom domain**,
informe `cliente.ecomax.com.br` (ou `painel.ecomax.com.br`). A Cloudflare
mostra o destino do CNAME — algo como `ecomax-cliente.pages.dev`.

Na **Locaweb**, na zona DNS de `ecomax.com.br`:

- troque o registro `cliente` (hoje aponta para a Vercel) por um **CNAME**
  para o endereço `.pages.dev` que a Cloudflare mostrou;
- o mesmo para `painel`.

A Cloudflare valida e emite o certificado sozinha; pode levar alguns minutos.

## Cabeçalhos e rotas

`public/_headers` de cada app vira `dist/_headers` no build e o Pages aplica:
cache longo nos assets com hash, `index.html` sem cache e os cabeçalhos de
segurança — o mesmo que o `vercel.json` fazia.

As rotas do react-router (`/usuarios`, `/ordens/…`) não precisam de regra: sem
um `404.html` no build, o Pages serve o `index.html` para qualquer caminho que
não seja arquivo.

## Supabase: URLs de redirecionamento

Em **Authentication → URL Configuration**, acrescente os endereços de preview do
Pages (os de produção, `painel` e `cliente`, já estão lá):

```
https://ecomax-cliente.pages.dev/**
https://*.ecomax-cliente.pages.dev/**
https://ecomax-painel.pages.dev/**
https://*.ecomax-painel.pages.dev/**
```

Sem eles, o link de redefinição de senha aberto a partir de um preview cai fora
da lista e o Supabase devolve para o Site URL.

## Depois da troca

Quando os dois domínios estiverem no Pages, desconecte o repositório na Vercel
(Settings → Git → Disconnect) — senão todo PR continua ganhando dois checks
vermelhos da Vercel. O `vercel.json` pode sair do repositório nessa hora.
