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
          700: '#155015', // texto verde sobre fundo claro
          800: '#1c441c', // painel de auth
          900: '#0f3f0f', // sidebar / primary-700
          accent: '#1a8a3a', // avatares, ícones de KPI, links
        },
        primary50: '#edfced',
        greenSoft: '#d3f7d3', // fundo de badges/verde claro
        // Neutros
        ink: {
          50: '#f7f7f8',
          100: '#eeeff1', // hairlines / cabeçalho de tabela
          200: '#d8dadf',
          300: '#b7bbc3',
          400: '#959ba7', // rótulos discretos
          500: '#686f7d',
          600: '#515761',
          700: '#3a3e45', // texto secundário
          800: '#25282c', // texto de corpo
          900: '#151619',
        },
        // Status
        danger: { DEFAULT: '#9b1400', bright: '#cc1a00' },
        infoTag: { bg: '#d9e5fc', fg: '#2a51bf' },
        warnTag: { bg: '#fcf2d9', fg: '#78350f' },
        expiredTag: { bg: '#fce3d9', fg: '#9b1400' },
        strengthMed: '#92400e',
        // Paletas de tag (fiéis ao design dos módulos)
        tag: {
          successBg: '#d3f7d3',
          successFg: '#155015',
          successStrongBg: '#a3eba3',
          successStrongFg: '#0f3f0f',
          infoBg: '#e8eefc',
          infoFg: '#3056b5',
          warnBg: '#fdebd0',
          warnFg: '#b45309',
          dangerBg: '#ffddd5',
          dangerFg: '#a81400',
          mutedBg: '#eeeff1',
          mutedFg: '#686f7d',
          softWarnBg: '#fdf6e8',
          softWarnFg: '#8a6410',
          expBg: '#ffe9d6',
          expFg: '#c2410c',
        },
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
