import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/Logo';

interface AuthLayoutProps {
  /** Título grande do painel esquerdo (verde). */
  heading: ReactNode;
  /** Subtexto do painel esquerdo. */
  subtext: ReactNode;
  /** Conteúdo extra abaixo do subtexto (pílula, caixa de requisitos…). */
  aside?: ReactNode;
  /** Card do formulário (painel direito). */
  children: ReactNode;
  /** Rodapé do painel direito. */
  footer?: ReactNode;
}

/**
 * Shell das telas de autenticação do Backoffice (espelha o Figma node 4:229).
 * Cada painel tem cor sólida + a sua metade da arte (floresta/cidade) recortada no ponto
 * de transição, em opacidade ~0.31 — garantindo que o seam verde/claro caia exatamente
 * na borda dos painéis (560px), independente da largura da tela.
 */
export function AuthLayout({ heading, subtext, aside, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Painel esquerdo (verde) */}
      <aside className="relative hidden w-[560px] shrink-0 overflow-hidden bg-forest-800 lg:block">
        <img
          src="/assets/auth-bg-left.jpg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.31]"
        />
        <Logo variant="mark" className="absolute left-[31px] top-[44px] z-10" />
        <div className="absolute left-[54px] right-[40px] top-[23%] z-10">
          <h1 className="text-[48px] font-bold leading-[1.2] text-white">{heading}</h1>
          <p className="mt-5 max-w-[380px] text-base font-semibold leading-[1.6] text-white/90">
            {subtext}
          </p>
          {aside && <div className="mt-8">{aside}</div>}
        </div>
      </aside>

      {/* Painel direito (claro) */}
      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-ink-50 px-6 py-10">
        <img
          src="/assets/auth-bg-right.jpg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.31]"
        />
        <div className="relative z-10 mb-7">
          <Logo className="h-[84px]" />
        </div>
        <div className="relative z-10 w-full max-w-[420px] rounded-2xl bg-white p-10 shadow-card">
          {children}
        </div>
        {footer && <div className="absolute bottom-9 z-10 text-xs text-ink-500">{footer}</div>}
      </main>
    </div>
  );
}
