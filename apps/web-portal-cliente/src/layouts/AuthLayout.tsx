import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/Logo';

interface AuthLayoutProps {
  /** Título grande do painel esquerdo (verde). */
  heading: ReactNode;
  /** Subtexto do painel esquerdo. */
  subtext: ReactNode;
  /** Pílulas de features (Login do portal). */
  features?: string[];
  /** Conteúdo extra abaixo do subtexto (caixa de requisitos…). */
  aside?: ReactNode;
  /** Card do formulário (painel direito). */
  children: ReactNode;
  /** Rodapé do painel direito. */
  footer?: ReactNode;
}

/**
 * Shell das telas de autenticação do Portal do Cliente (Figma node 31:692).
 * Painel esquerdo verde escuro (520px) + arte recortada em opacidade 0.31; painel direito claro.
 */
export function AuthLayout({ heading, subtext, features, aside, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Painel esquerdo (verde) */}
      <aside className="relative hidden w-[520px] shrink-0 overflow-hidden bg-forest-800 lg:block">
        <img
          src="/assets/auth-bg-left.jpg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.31]"
        />
        <Logo variant="mark" className="absolute left-[31px] top-[44px] z-10" />
        <div className="absolute left-[38px] right-[40px] top-[23%] z-10">
          <h1 className="max-w-[356px] text-[40px] font-bold leading-[1.2] text-white">{heading}</h1>
          <p className="mt-5 max-w-[356px] text-base font-semibold leading-[1.6] text-white/90">
            {subtext}
          </p>
          {features && (
            <div className="mt-10 flex flex-col gap-3">
              {features.map((f) => (
                <div
                  key={f}
                  className="flex h-[38px] w-[270px] items-center justify-center rounded-full bg-white text-xs text-[#111827]"
                >
                  {f}
                </div>
              ))}
            </div>
          )}
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
        {footer && <div className="absolute bottom-9 z-10 text-xs text-ink-400">{footer}</div>}
      </main>
    </div>
  );
}
