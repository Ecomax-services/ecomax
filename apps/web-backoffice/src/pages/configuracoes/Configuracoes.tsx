import { Link } from 'react-router-dom';
import { FolderCog, UserRound, ShieldCheck, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Topbar } from '@/components/Topbar';

const cards: { icon: LucideIcon; title: string; desc: string; to: string }[] = [
  { icon: FolderCog, title: 'Cadastros Auxiliares', desc: 'Status, tipos, categorias, unidades e demais catálogos do sistema', to: '/configuracoes/cadastros' },
  { icon: UserRound, title: 'Meu Perfil', desc: 'Dados básicos, foto e redefinição de senha', to: '/configuracoes/perfil' },
  { icon: ShieldCheck, title: 'Permissões e Acessos', desc: 'Perfis de acesso e permissões de leitura/escrita por módulo', to: '/configuracoes/permissoes' },
];

/** 10 — Hub do módulo Configurações. */
export function Configuracoes() {
  return (
    <>
      <Topbar title="Configurações" breadcrumb="Início  /  Configurações" />
      <div className="flex-1 px-8 py-6">
        <div className="grid max-w-3xl gap-3.5">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.to}
                to={c.to}
                className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white px-6 py-5 transition-colors hover:border-forest-accent hover:bg-forest-50/40"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary50 text-forest-700">
                  <Icon className="h-6 w-6" />
                </span>
                <div className="flex-1">
                  <h3 className="text-[15px] font-bold text-ink-900">{c.title}</h3>
                  <p className="mt-0.5 text-[13px] text-ink-500">{c.desc}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-ink-300" />
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
