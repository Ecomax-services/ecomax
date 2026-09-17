# Publicar o Ecomax Operador na App Store

O projeto nativo `ios/` **não está no git**: ele é gerado a partir do
`app.json`. Commitá-lo criaria a mesma configuração em dois lugares, e o
segundo divergiria em silêncio — mudar o `app.json` deixaria de ter efeito, e
mexer direto no Xcode se perderia no próximo `prebuild`.

## Gerar o projeto

```
cd apps/mobile-operador
npx expo prebuild -p ios --clean
cd ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install
open EcomaxOperador.xcworkspace
```

O `LANG` não é enfeite: sem ele o CocoaPods quebra com
`Unicode Normalization not appropriate for ASCII-8BIT`. O shell deste Mac vem
com `LANG` vazio, e o CocoaPods 1.16 assume UTF-8 sem verificar.

Abra sempre o `.xcworkspace`, nunca o `.xcodeproj` — o segundo não enxerga os
pods.

## O que já está resolvido no app.json

- **As três permissões.** No iOS, chamar câmera, galeria ou localização sem a
  chave correspondente no `Info.plist` não dá aviso: derruba o app na hora. E a
  App Review recusa o binário. O app usa as três.
- **`ITSAppUsesNonExemptEncryption: false`.** Sem isso a Apple pergunta sobre
  exportação de criptografia a cada envio, e o build fica parado no TestFlight
  esperando resposta manual. O app só usa HTTPS, que é uso isento.
- **Manifesto de privacidade.** Gerado pelo prebuild, declarando as APIs de
  "motivo obrigatório" que o React Native usa (UserDefaults, timestamp de
  arquivo, espaço em disco, tempo de boot).

## O que só você pode fazer

1. **Conta no Apple Developer Program** — 99 USD/ano. Sem ela não há assinatura
   nem envio.
2. No Xcode, aba **Signing & Capabilities**: escolher o Team. O
   `DEVELOPMENT_TEAM` fica vazio de propósito no repositório.
3. Criar o app no **App Store Connect** com o bundle id
   `br.com.ecomax.operador`.
4. **Product → Archive**, depois **Distribute App → App Store Connect**.

## Antes de mandar para revisão

- **URL de política de privacidade** é obrigatória, e o app coleta
  localização. Continua pendente — é o mesmo item da tela "Sobre".
- **Capturas de tela** de iPhone 6.7" e 6.5".
- Conta de teste para a App Review: o app exige login, e revisor sem
  credencial reprova por "não conseguimos avaliar".
- A localização precisa de justificativa na ficha: é carimbo de check-in e
  check-out, não rastreamento — o app nunca pede permissão de segundo plano.

## Alternativa sem Xcode

`eas build -p ios --profile production` faz o mesmo na nuvem, cuidando de
certificado e provisioning. Ainda exige a conta paga da Apple.

Atenção à conta do EAS: o projeto pertence a `ecomax.com.br`, e o CLI pode
estar logado em outra. Confira com `eas whoami` antes.
