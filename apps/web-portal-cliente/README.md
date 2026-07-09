# Ecomax · Web Portal do Cliente

Front-end do ambiente do cliente (Portal) da plataforma Ecomax.
React 18 + TypeScript + Vite + Tailwind CSS, com tokens extraídos do Figma `[Ecomax] Projeto`.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5174
```

Outros scripts: `npm run build`, `npm run typecheck`, `npm run preview`.

## Telas implementadas

| Rota | Tela | Figma node |
|------|------|------------|
| `/login` | Login | 31:692 |
| `/recuperar-senha` | Recuperação de senha | 31:727 |
| `/recuperar-senha/enviado` | E-mail enviado | 83:345 |
| `/criar-senha` | Criar nova senha (medidor de força) | 31:752 |
| `/notificacoes` | Notificações (tabs, marcar lidas, excluir) | 31:788 |
| `/configuracoes` | Configurações (hub) | 31:870 |
| `/configuracoes/perfil` | Meu Perfil (dados read-only) | 31:930 |
| `/configuracoes/preferencias` | Preferências (toggles) | 31:988 |
| — | Overlay "Sair da conta?" (modal de logout) | 82:265 |

## Diferenças visuais vs. Backoffice

- **Verde mais escuro** no painel/sidebar: `#0a2d0a` (primary/800) vs `#1c441c`.
- **Sidebar 220px** com badge "Portal do Cliente" e menos itens.
- **Login** com 4 "pills" de features e heading 40px.
- Neutros extras do portal: placeholder/breadcrumb `#959ba7`, labels `#25282c`.

## Estrutura

```
src/
├─ components/ui/    # Button, Input/PasswordInput, Logo, Modal
├─ components/       # Sidebar, Topbar, LogoutModal
├─ layouts/          # AuthLayout (auth), AppLayout (shell autenticado)
├─ pages/auth/       # Login, ForgotPassword, EmailSent, ResetPassword
├─ pages/            # Notifications, Settings, Profile, Preferences
└─ data/             # mocks (notifications)
```

## Notas

- **Front-end only**: sem backend. O login navega direto para `/notificacoes`; ações
  (excluir, marcar lida, toggles, logout) operam sobre estado local/mocks.
- **Acesso gerenciado pelo admin**: o Perfil é read-only por design (banner de aviso).
- **Token de recuperação**: o design "E-mail enviado" diz **15 minutos** (seguido conforme Figma;
  diverge da premissa de 1h em `dev-plan.md §4` — alinhar com PO).
- Itens de menu além de Notificações/Configurações estão desabilitados (releases futuros).
- Componentes/assets atualmente **duplicados** do `web-backoffice`; candidato a extração para
  `packages/ui` compartilhado (ver `dev-plan.md` R0-7).
```
