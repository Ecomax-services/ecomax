import type { Config } from 'tailwindcss';

/**
 * Tokens extraídos do Figma "[Ecomax] Projeto" + design-system.md.
 * Paleta verde (forest), neutros (ink) e cores de status das notificações.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Verde institucional (secondary/* e primary/700 do design system)
        forest: {
          50: '#f0fdf0',
          100: '#dcf7dc',
          500: '#347a34', // ação primária
          600: '#1a5c1a',
          800: '#0a2d0a', // sidebar / painel de auth do Portal do Cliente
          900: '#0f3f0f',
        },
        primary50: '#edfced',
        // Neutros
        // Escala igual à do Backoffice. Os tons 100, 600 e 700 faltavam aqui,
        // embora o código já os usasse: `divide-ink-100` não desenhava a linha
        // e `text-ink-700` caía na cor herdada. Tom que não existe na paleta não
        // vira classe — o Tailwind não avisa, só não gera a regra.
        ink: {
          50: '#f7f7f8',
          100: '#eeeff1', // hairlines
          200: '#d8dadf',
          300: '#b7bbc3',
          400: '#959ba7', // placeholder / breadcrumb (Portal)
          500: '#686f7d',
          600: '#515761',
          700: '#3a3e45',
          800: '#25282c', // labels (Portal)
          900: '#151619',
        },
        warnSoft: { bg: '#fef2e0', fg: '#92400e' },
        // Status
        danger: { DEFAULT: '#9b1400', bright: '#cc1a00' },
        infoTag: { bg: '#d9e5fc', fg: '#2a51bf' },
        warnTag: { bg: '#fcf2d9', fg: '#78350f' },
        expiredTag: { bg: '#fce3d9', fg: '#9b1400' },
        strengthMed: '#92400e',
      },
      boxShadow: {
        card: '0px 4px 24px 0px rgba(0,0,0,0.07)',
        modal: '0px 8px 32px 0px rgba(0,0,0,0.14)',
        topbar: '0px 2px 8px 0px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
} satisfies Config;
