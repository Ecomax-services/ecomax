import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, AlarmClock, ShieldAlert, MailQuestion, ChevronRight, MessagesSquare, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { KpiCard } from '@/components/ui/KpiCard';
import { useToast } from '@/components/ui/Toast';
import { getResumoComercial, type ResumoComercial } from '@/lib/comercial';

/** Tela 5 - Hub do Comercial. Acesso rápido às duas áreas e ao que precisa de ação hoje. */
export function ComercialHub() {
  const { showToast } = useToast();
  const [r, setR] = useState<ResumoComercial | null>(null);

  useEffect(() => {
    getResumoComercial().then(setR).catch((e) => showToast((e as Error).message));
  }, [showToast]);

  return (
    <>
      <Topbar title="Comercial" breadcrumb="Início  /  Comercial" />
      <div className="flex-1 px-8 py-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon={CalendarClock} value={String(r?.fupsHoje ?? '—')} label="Follow-ups de hoje" tone="green" />
          <KpiCard icon={AlarmClock} value={String(r?.fupsAtraso ?? '—')} label="Follow-ups em atraso" tone="red" />
          <KpiCard icon={ShieldAlert} value={String(r?.garantiasVencendo ?? '—')} label="Garantias vencendo em 60 dias" tone="amber" />
          <KpiCard icon={MailQuestion} value={String(r?.garantiasAguardando ?? '—')} label="Aguardando resposta do cliente" tone="blue" />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Area
            to="/comercial/follow-ups"
            icon={MessagesSquare}
            titulo="Follow-ups"
            desc="Acompanhamento de orçamentos e contatos com o cliente, organizados pela data de ação."
          />
          <Area
            to="/comercial/garantias"
            icon={ShieldCheck}
            titulo="Garantias de OS avulsas"
            desc="Controle de validade e renovação, com link público para o cliente responder."
          />
        </div>
      </div>
    </>
  );
}

function Area({ to, icon: Icon, titulo, desc }: { to: string; icon: LucideIcon; titulo: string; desc: string }) {
  return (
    <Link to={to} className="flex items-start gap-4 rounded-2xl border border-ink-100 bg-white px-6 py-5 transition hover:border-forest-500">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary50">
        <Icon className="h-6 w-6 text-forest-700" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-bold text-ink-900">{titulo}</span>
        <span className="mt-1 block text-[13px] text-ink-500">{desc}</span>
      </span>
      <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-ink-400" />
    </Link>
  );
}
