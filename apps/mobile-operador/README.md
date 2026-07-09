# Ecomax · App Operador (mobile)

App do operador de campo da plataforma Ecomax.
**React Native + Expo (managed) + TypeScript**, com React Navigation e a fonte Inter.
Tokens do design system extraídos do Figma `[Ecomax] Projeto`.

## Rodar

Codebase **único** com dois alvos: **nativo** (lojas) e **web** (react-native-web, para
desenvolver/preview no navegador).

```bash
npm install
npm start          # Expo DevTools — Expo Go ou simulador (nativo)
npm run ios        # simulador iOS
npm run android    # emulador Android
npm run web        # navegador (react-native-web) em http://localhost:8082
npm run typecheck  # tsc --noEmit
```

- **Lançamento nas lojas**: use a build nativa (EAS Build / `expo run:ios|android`). A web é só
  para desenvolvimento/visualização — não substitui a publicação nativa.
- O alvo web é servido por Metro; o preview desta ferramenta carrega `http://localhost:8082`
  (config `mobile-operador-web` no `.claude/launch.json` da raiz).

## Telas implementadas

| Tela | Figma node |
|------|------------|
| 1 · Login (hero + card) | 30:382 |
| 1.1 · Recuperação de senha | 30:460 |
| 1.1.1 · Criar nova senha (força) | 30:475 |
| 1.1.2 · E-mail enviado | 83:330 |
| 2 · Notificações (tabs, marcar lidas) | 30:497 / 83:483 |
| 3 · Configurações (perfil + rows) | 30:554 |
| 3.1 · Meu Perfil (dados + documentos) | 30:600 |
| 3.2 · Preferências (toggles) | 83:615 |
| Overlay · Confirmar Saída (bottom sheet) | 83:275 |

## Navegação

```
RootStack (sem header)
├─ Login, ForgotPassword, ResetPassword, EmailSent   (auth)
└─ Main → BottomTabs (tab bar custom)
   ├─ OS        (placeholder)
   ├─ Agenda    (placeholder)
   ├─ Notif.    → NotificationsScreen
   └─ Config.   → ConfigStack (Configurações → Perfil, Preferências)
```

- **ResetPassword** ("Criar nova senha") fica registrada mas, no fluxo real, é aberta pelo link do
  e-mail. Para vê-la no app de demo, navegue manualmente até a rota `ResetPassword`.
- **OS** e **Agenda** são placeholders (fora do escopo destas telas).

## Estrutura

```
App.tsx                     # fontes + NavigationContainer + RootStack
src/
├─ theme.ts                 # cores, fontes (Inter), raios
├─ components/              # Button, Input/PasswordInput, Tag, Toggle,
│                           #   ScreenHeader, CenteredAuthLayout, LogoutSheet
├─ navigation/              # MainTabs (tab bar custom + ConfigStack), types
├─ screens/auth/            # Login, ForgotPassword, ResetPassword, EmailSent
├─ screens/                 # Notifications, Settings, Profile, Preferences, Placeholder
└─ data/                    # mocks (notifications)
assets/                     # ecomax-logo.png, forest-dark/-light.jpg, ícones do Expo
```

## Notas

- **Front-end only**: sem backend. Login navega direto para as abas; ações (marcar lidas, toggles,
  logout) operam sobre estado local/mocks.
- **Offline-first / sync** (WatermelonDB, GPS, fotos, assinatura) é o R3 do `dev-plan.md` — ainda
  não implementado; estas telas são a casca de UI.
- **Ícones**: `@expo/vector-icons` (MaterialIcons) no lugar de Material Symbols Rounded.
- **Token de recuperação**: design "E-mail enviado" diz **15 minutos** (seguido conforme Figma).
- Componentes ainda **não compartilhados** com os apps web (cada plataforma tem sua stack: web=Tailwind,
  mobile=StyleSheet). Lógica comum (validação de senha, formatação) é candidata a `packages/shared`.
```
