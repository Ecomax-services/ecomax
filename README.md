# Ecomax

Plataforma de gestão para uma empresa de controle de pragas. Três aplicações
sobre um banco Supabase, cada uma para um público:

| aplicação | quem usa | onde roda |
| --- | --- | --- |
| **Backoffice** | equipe administrativa | [painel.ecomax.com.br](https://painel.ecomax.com.br) |
| **Portal do Cliente** | o cliente contratante | [cliente.ecomax.com.br](https://cliente.ecomax.com.br) |
| **App Operador** | técnico em campo | iOS e Android |

O fluxo atravessa as três: o Backoffice emite a ordem de serviço, o Operador a
executa em campo com foto e assinatura, e o Portal mostra ao cliente o
relatório, o mapeamento dos pontos e o certificado.

---

## Como isto está montado

```
apps/
  web-backoffice/       React + Vite + Tailwind
  web-portal-cliente/   React + Vite + Tailwind
  mobile-operador/      React Native + Expo SDK 51
shared/                 módulos copiados para os três apps
supabase/
  migrations/           85 migrations, aplicadas em ordem
  tests/rls/            suíte de isolamento, roda a cada PR
  functions/            Edge Functions (Deno)
  types/                tipos gerados do schema
scripts/                geração de tipos e sincronização
docs/                   notas de implementação e roteiros de QA
```

**Não há workspace na raiz.** Cada app tem o próprio `package.json` e é
instalado separadamente. A razão é prática: Vite e Metro resolvem dependências
fora do root de formas diferentes, e um workspace exigiria configuração
específica em cada um. O preço disso é duplicação controlada — ver
[Código compartilhado](#código-compartilhado).

### A segurança mora no banco

As três aplicações falam direto com o Supabase, sem API própria no meio. Quem
decide o que cada pessoa enxerga é o **Row Level Security** do Postgres, não o
código do front.

Isso é decisão de arquitetura, não atalho. Regra de visibilidade escrita no
front protege a tela; escrita no banco protege o dado. No Portal do Cliente,
onde um cliente jamais pode ver o de outro, a diferença importa.

Consequência prática ao depurar: **RLS não dá erro.** Quando a regra não casa,
a consulta devolve zero linhas e a tela fica vazia, sem aviso nenhum. Tela
vazia é o primeiro sintoma a investigar.

---

## Rodando

Requisitos: Node 20+, Supabase CLI 2.114.0 (a mesma versão da CI).

```bash
# Backoffice
cd apps/web-backoffice && npm ci && cp .env.example .env
npm run dev                      # http://localhost:5173

# Portal do Cliente
cd apps/web-portal-cliente && npm ci && cp .env.example .env
npm run dev                      # http://localhost:5174

# App Operador
cd apps/mobile-operador && npm ci
npm start
```

As variáveis são lidas **em tempo de build** nos apps web. Sem elas o build
conclui e o app quebra em runtime com tela branca:

```
VITE_SUPABASE_URL        VITE_SUPABASE_ANON_KEY
VITE_PORTAL_URL          VITE_EMAIL_RH
EXPO_PUBLIC_SUPABASE_URL EXPO_PUBLIC_SUPABASE_ANON_KEY   (mobile)
```

---

## Banco de dados

### Migrations

```bash
supabase db push --linked                                  # aplica as pendentes
supabase db query --linked -f supabase/migrations/<arquivo> # aplica uma só
supabase migration list --linked                           # confere o histórico
```

> **Migration nova vai pelo CLI, nunca pelo MCP.** O conector MCP carimba o
> próprio horário ao aplicar, e o arquivo no repositório leva outro. O
> histórico diverge, `db push` passa a recusar tudo com *"Remote migration
> versions not found in local migrations directory"*, e a sugestão que o
> próprio CLI dá para consertar reaplica migrations já aplicadas. Já aconteceu
> uma vez e custou caro.

### Tipos e módulos compartilhados

Os tipos do banco e alguns módulos são **copiados** para os três apps, e a CI
falha se uma cópia divergir do original:

```bash
./scripts/gen-types.sh     # regenera supabase/types/database.ts e copia
./scripts/sync-shared.sh   # copia shared/*.ts para os três apps
```

Rode `gen-types.sh` depois de **qualquer** migration que mexa em coluna. Sem
isso o `tsc` continua verde contra um schema que já não existe, e o erro só
aparece em runtime.

### Testes de RLS

```bash
supabase db reset                                  # banco local do zero
psql "$DB_URL" -f supabase/tests/rls/<arquivo>.sql
```

Cada arquivo abre uma transação, monta o cenário, simula cada usuário com
`set local role authenticated` e faz `rollback` no fim — nada persiste.

O que se prova ali é principalmente **negativo**: que um cliente *não* vê a OS
do outro, que um rascunho *não* chega ao Portal, que a foto interna de uma OS
*não* aparece para o cliente dono dela. Afirmação negativa exige controlar os
dois lados, e é justamente o que um teste manual não consegue produzir.

---

## Integração contínua

Três jobs, em `.github/workflows/ci.yml`:

- **por aplicação** — `npm ci`, typecheck, build e lint nas três.
- **migrations sobem do zero** — recria o banco com as migrations, confere que
  o schema resultante bate com elas, valida que os tipos versionados não estão
  defasados e roda a suíte de RLS.
- **repositório x projeto remoto** — compara o histórico local com o do
  projeto. Só roda sob demanda ou agendado.

O job de migrations é o que realmente segura a qualidade: ele prova que o
repositório sozinho reconstrói o banco.

---

## Código compartilhado

Sem workspace na raiz, `shared/` é copiado para `apps/*/src/lib/` e a CI
compara byte a byte. Editar a cópia dentro de um app faz a CI barrar — edite o
original e rode `./scripts/sync-shared.sh`.

Hoje isso cobre os tipos do banco e o **mapa de status da OS**, que o design
system exige ser único entre os três ambientes. Antes eram três definições
independentes: os rótulos concordavam por manutenção manual, mas as cores já
tinham divergido — o Portal pintava "Executada" e "Concluída" iguais, e o
cliente não distinguia uma da outra.

As cores desse mapa vêm em hexadecimal, e não em classe do Tailwind, porque o
App Operador é React Native e não tem Tailwind. Hex é o único formato que os
três leem sem tradução, e era na tradução que a divergência nascia.

---

## Armadilhas conhecidas

**Tom de cor que não existe na paleta não vira classe.** O Tailwind não
reclama: simplesmente não gera a regra. Já produziu botão com texto branco
sobre fundo transparente, invisível em produção. Ao copiar componente de um app
para outro, confira se a paleta de destino tem os tons usados.

**A rota do Portal responde 200 mesmo quando não existe.** É uma SPA com
rewrite para `index.html` — `curl` devolvendo 200 não prova que a tela foi
publicada. Confira um marcador de texto dentro do bundle.

**`createSignedUrl` assina caminho inexistente.** "Gerou URL" não é prova de
que o arquivo está lá. Quem responde é o storage, e por isso o visualizador de
documento busca o arquivo antes de exibi-lo.

**Conta criada pelo painel do Supabase não entra no Portal.** O gatilho cria o
perfil com `role = 'operacional'`, e o Portal recusa. O caminho certo é
convidar pelo Backoffice, em Detalhe do Cliente → Portal.

**CocoaPods quebra com `LANG` vazio.** No macOS, `pod install` falha com
*"Unicode Normalization not appropriate for ASCII-8BIT"* antes de instalar
nada. Rode com `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`.

---

## Documentação

| arquivo | o que traz |
| --- | --- |
| [PRD.md](PRD.md) | produto e escopo |
| [architecture.md](architecture.md) | decisões técnicas |
| [data-model.md](data-model.md) | modelo de dados |
| [design-system.md](design-system.md) | tokens e componentes |
| [AGENTS.md](AGENTS.md) | instruções para agentes de IA |
| [docs/QA-RELEASE-5.md](docs/QA-RELEASE-5.md) | roteiro de QA do Portal |
| [docs/deploy-vercel.md](docs/deploy-vercel.md) | publicação dos apps web |
| [apps/mobile-operador/IOS.md](apps/mobile-operador/IOS.md) | publicação na App Store |

---

## Convenções

Commits e comentários em **português**, e explicando o **porquê**, não o quê. O
código já diz o que faz; o que se perde com o tempo é a razão de ele fazer
assim — especialmente quando a escolha foi contraintuitiva.
