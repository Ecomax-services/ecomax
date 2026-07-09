# Ecomax · Web Backoffice

Front-end do ambiente administrativo (Backoffice) da plataforma Ecomax.
React 18 + TypeScript + Vite + Tailwind CSS, com tokens extraídos do Figma `[Ecomax] Projeto`.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173
```

Outros scripts: `npm run build`, `npm run typecheck`, `npm run preview`.

## Telas implementadas (R0/R1 do dev-plan.md)

| Rota | Tela | Figma node |
|------|------|------------|
| `/login` | Login | 4:229 |
| `/recuperar-senha` | Recuperação de senha | 4:265 |
| `/recuperar-senha/enviado` | E-mail enviado | 83:295 |
| `/criar-senha` | Criar nova senha (medidor de força) | 4:289 |
| `/notificacoes` | Notificações (tabs, marcar lidas, excluir) | 5:324 / 83:387 |
| — | Overlay "Sair da conta?" (modal de logout) | 82:255 |

## Estrutura

```
src/
├─ components/ui/    # Button, Input/PasswordInput, Logo, Modal (design system)
├─ components/       # Sidebar, Topbar, LogoutModal
├─ layouts/          # AuthLayout (telas de auth), AppLayout (shell autenticado)
├─ pages/auth/       # Login, ForgotPassword, EmailSent, ResetPassword
├─ pages/            # Notifications
└─ data/             # mocks (notifications)
```

## Notas

- **Front-end only**: sem backend. O login navega direto para `/notificacoes`; ações
  (excluir, marcar lida, logout) operam sobre estado local/mocks.
- **Política de senha** (RF-004): 8–16 caracteres, ≥1 número, ≥1 letra, ≥1 especial.
- **Token de recuperação**: o design "E-mail enviado" diz **15 minutos** — seguido
  conforme o Figma (diverge da premissa de 1h registrada em `dev-plan.md §4`; alinhar com PO).
- Itens de menu além de Notificações estão desabilitados (releases futuros).
- Logo Ecomax recriado em SVG (`components/ui/Logo.tsx`); o Figma usa um PNG 3D com URL temporária.
```
