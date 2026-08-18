# Entrega para o QA interno

## O que você precisa fazer antes (3 itens, todos no painel)

Nenhum é código — eu não tenho acesso a esses painéis.

### 1. Vercel · Deployment Protection

Hoje as duas URLs de produção redirecionam para o login da Vercel. O QA bateria
nessa tela antes de ver o Ecomax.

> Vercel → cada projeto → Settings → Deployment Protection → **Vercel
> Authentication** → *Standard Protection* (protege só preview) ou *Disabled*.

Com *Standard Protection*, entregue ao QA o **domínio de produção do projeto** —
as URLs específicas de deploy (`...-9jpfts0cs-...`) continuam protegidas.

### 2. Vercel · o terceiro projeto

Existem **três** projetos ligados ao repositório: `backoffice`, `portal-cliente`
e `cliente`. Os dois primeiros deployam; o `cliente` falha, e é o 404 que
apareceu. Ele está sem as variáveis de ambiente — o `check-env.mjs` que entrou
hoje passou a acusar isso em vez de deixar subir uma tela branca.

**Recomendo apagar o `cliente`**: o `portal-cliente` já cobre o mesmo app, e dois
projetos para um app só multiplicam confusão. Se preferir manter, preencha
`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nele.

Para confirmar o diagnóstico:

```bash
npx vercel inspect dpl_2snWdECspu1dPBp3EvaZ5sK7Kizp --logs
```

### 3. Supabase · secrets da Edge Function

O e-mail de primeiro acesso precisa saber para qual app mandar a pessoa. Sem
isso, operador e cliente recebem link para o Backoffice, onde não têm acesso.

```bash
npx supabase secrets set --project-ref imnfcffmzzukabhsotul \
  APP_URL_BACKOFFICE=https://<dominio-do-backoffice> \
  APP_URL_PORTAL=https://<dominio-do-portal>
```

E em Authentication → URL Configuration, acrescentar os dois domínios à
allow-list de Redirect URLs (a lista completa está em `deploy-vercel.md`).

---

## Limitação conhecida: primeiro acesso do operador no Expo Go

No Expo Go o app responde por um endereço que **muda a cada sessão do servidor**
(`exp://192.168.x.x:8081/--/...`). Não existe URL fixa para gravar numa secret,
então o e-mail de primeiro acesso disparado pelo Backoffice não consegue abrir o
aplicativo.

**Contorno para o QA:** o operador usa **"Esqueci minha senha" dentro do próprio
app**. Esse caminho monta o endereço em tempo de execução e funciona no Expo Go.

Isso deixa de ser necessário no build EAS, que tem scheme fixo
(`ecomaxoperador://`) — aí `APP_URL_MOBILE` passa a ser configurável.

---

## O que NÃO reportar como bug

São botões que anunciam a própria ausência, esperando módulos que ainda não
foram construídos. Estão marcados na interface com "(em breve)".

| Onde | Controle |
|---|---|
| Operacional · lista | Novo orçamento (depende do Comercial) |
| Operacional · lista | Exportar PDF |
| Operacional · detalhe da OS | Exportar PDF, Imprimir, Baixar PDF do relatório |
| Operacional · criar OS | Buscar CEP, anexar mapa de pontos |
| Clientes · lista | MEC EPI, Link do portal |
| Estoque · inventário | Controle de produtos em campo por operador |
| Estoque · bases | Aba ainda sem conteúdo |

Fora de escopo desta entrega, e ausentes de propósito: Dashboard, Relatórios,
Financeiro e Comercial no Backoffice; Início, Documentos, Produtos e
Colaboradores no Portal; execução guiada em 6 passos e agenda em calendário no
aplicativo do Operador.

**Assinatura e foto do aplicativo já gravam arquivo de verdade.** O operador
assina num quadro na tela e a foto vem da câmera ou da galeria; o backoffice
mostra a assinatura na aba Execução.

Duas OS do seed (OS-1002 e OS-1003) apontam para `seed/assinatura-demo.png`, um
caminho que nunca existiu no armazenamento. Elas aparecem como **"Coletada
(arquivo indisponível)"** — isso é o comportamento correto, não um defeito.
Colete uma assinatura nova pelo aplicativo para ver a imagem.

---

## Como testar com o perfil certo

Não teste o caminho feliz com `admin@`. O administrador tem desvio de permissão
tanto na interface (`can()`) quanto no banco (`is_admin()`), então ele passa por
qualquer porta e não prova nada.

Use sempre **o perfil de menor privilégio que deveria conseguir** fazer aquilo.
Perfis disponíveis: Administrador e Almoxarifado (acesso total), Gestor e
Operacional (somente leitura), Cliente (sem acesso a módulos internos).
