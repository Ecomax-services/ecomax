# Builds do app do Operador

O `eas.json` não aceita comentários, então a explicação dos perfis vive aqui.

## Os três perfis

| Perfil | Para quê | Formato |
|---|---|---|
| `development` | desenvolvimento com dev client, sem Expo Go | APK |
| `preview` | **é o que o QA instala** | APK |
| `production` | publicação na Play Store | AAB |

## Por que `preview` é APK e não AAB

O padrão do EAS para Android é `.aab`, que **só serve para a Play Store** — não
instala à mão num aparelho. Como o QA precisa instalar direto, o perfil força
`buildType: "apk"`. `distribution: "internal"` rende um link e um QR code que
instalam sem loja e sem conta de desenvolvedor.

O `gradleCommand: ":app:assembleRelease"` mantém a build em modo release: o QA
precisa medir a aparência e a velocidade do app de verdade, não de uma build de
depuração.

## Gerar o APK do QA

```bash
cd apps/mobile-operador
npx eas-cli build --platform android --profile preview
```

O EAS gera e guarda a keystore na primeira vez; nas seguintes ele reusa a mesma.
Ao fim, a saída traz o link de instalação.

## Variáveis de ambiente

Não há nenhuma a configurar. `src/lib/supabase.ts` traz a URL e a chave
publishable embutidas como padrão — a chave é pública por design, vai no bundle
de qualquer forma. Se um dia for preciso apontar para outro projeto, basta
definir `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` no perfil
do `eas.json`.

## O link do e-mail

Em build nativo o app responde por `ecomaxoperador://`, e o link de definir
senha abre o aplicativo. Dentro do **Expo Go** isso não acontece: lá o app
responde por `exp://`, e o e-mail de primeiro acesso avisa para usar a senha
provisória.
