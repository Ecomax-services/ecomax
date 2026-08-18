import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck, ClipboardList, FileText, Clock, Bell, ChevronRight, Package, Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { Empty, ErrorBanner, Loading, Section } from '@/components/ui/DataSection';
import { getResumoInicio, abrirDocumento, validadeMeta, type ResumoInicio } from '@/lib/portal';

const hojePorExtenso = () =>
  new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Primeiro nome — o cumprimento com o nome inteiro soa formal demais. */
const primeiroNome = (n: string) => n.trim().split(/\s+/)[0];

/** Tela 1 - Início. Resume as outras e leva a elas. */
export function Inicio() {
  const { profile } = useAuth();
  const [r, setR] = useState<ResumoInicio | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    getResumoInicio()
      .then(setR)
      .catch((e) => setErro((e as Error).message));
  }, []);

  return (
    <>
      <Topbar title="Início" breadcrumb="Início" />
      <div className="flex-1 px-8 py-6">
        {erro && <ErrorBanner>{erro}</ErrorBanner>}
        {!r ? (
          <Loading />
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-[22px] font-bold text-ink-900">
                Olá, {primeiroNome(profile?.nome_completo ?? 'Cliente')}
              </h1>
              <p className="text-[13px] text-ink-500">{hojePorExtenso()}</p>
            </div>

            {/* Indicadores */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Kpi
                icon={CalendarCheck}
                label="Próxima visita"
                valor={r.proximaVisita?.data ?? '—'}
                detalhe={r.proximaVisita?.servico ?? 'Nenhuma agendada'}
                to="/ordens"
                cta="Ver ordem de serviço"
              />
              <Kpi icon={ClipboardList} label="OS abertas" valor={String(r.osAbertas)} to="/ordens" cta="Ver ordens de serviço" />
              <Kpi
                icon={FileText}
                label="Documentos emitidos"
                valor={String(r.documentosRecentes)}
                detalhe="Últimos 30 dias"
                to="/documentos"
                cta="Ver documentos"
              />
              <Kpi
                icon={Clock}
                label="A vencer"
                valor={String(r.aVencer)}
                detalhe="Licenças e certificações"
                to="/colaboradores"
                cta="Ver colaboradores"
              />
              <Kpi icon={Bell} label="Notificações não lidas" valor={String(r.naoLidas)} to="/notificacoes" cta="Ver notificações" />
            </div>

            {/* Próximas visitas */}
            <Section title="Próximas visitas">
              {r.proximasVisitas.length === 0 ? (
                <Empty>Nenhuma visita agendada.</Empty>
              ) : (
                <div className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-200 bg-white">
                  {r.proximasVisitas.map((v) => (
                    <div key={v.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="w-[92px] shrink-0">
                        <p className="text-sm font-semibold text-ink-900">{v.data}</p>
                        <p className="text-[11px] text-ink-400">{v.diaSemana}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-900">{v.servico}</p>
                        <p className="truncate text-[13px] text-ink-500">
                          {v.local} · {v.osCodigo}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Últimos documentos */}
              <Section title="Últimos documentos">
                {r.ultimosDocumentos.length === 0 ? (
                  <Empty>Nenhum documento disponível.</Empty>
                ) : (
                  <div className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-200 bg-white">
                    {r.ultimosDocumentos.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => abrirDocumento(d.arquivoUrl)}
                        disabled={!d.arquivoUrl}
                        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-ink-50 disabled:cursor-default disabled:hover:bg-transparent"
                      >
                        <FileText className="h-[18px] w-[18px] shrink-0 text-forest-600" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink-900">{d.titulo}</p>
                          <p className="text-[13px] text-ink-500">{d.categoria}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Section>

              {/* Alertas de validade */}
              <Section title="Licenças e certificações a vencer">
                {r.alertas.length === 0 ? (
                  <Empty>Nada a vencer nos próximos 30 dias.</Empty>
                ) : (
                  <div className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-200 bg-white">
                    {r.alertas.map((a) => (
                      <div key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                        <Clock className="h-[18px] w-[18px] shrink-0 text-ink-400" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink-900">{a.titulo}</p>
                          <p className="text-[13px] text-ink-500">{a.detalhe}</p>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                            validadeMeta[a.estado].classe,
                          )}
                        >
                          {a.estado === 'vencido' ? 'Vencido' : `Vence em ${a.validadeBr}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>

            {/* Atalhos */}
            <Section title="Atalhos">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Atalho to="/ordens" icon={ClipboardList} titulo="Ordens de Serviço" desc="Acompanhe suas OS" />
                <Atalho to="/documentos" icon={FileText} titulo="Documentos" desc="Relatórios e certificados" />
                <Atalho to="/produtos" icon={Package} titulo="Produtos" desc="Fichas e registros" />
                <Atalho to="/colaboradores" icon={Users} titulo="Colaboradores" desc="Documentação da equipe" />
              </div>
            </Section>
          </div>
        )}
      </div>
    </>
  );
}

function Kpi({
  icon: Icon,
  label,
  valor,
  detalhe,
  to,
  cta,
}: {
  icon: LucideIcon;
  label: string;
  valor: string;
  detalhe?: string;
  to: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-ink-200 bg-white p-4">
      <Icon className="h-[18px] w-[18px] text-forest-600" />
      <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-0.5 text-[19px] font-bold text-ink-900">{valor}</p>
      {detalhe && <p className="text-[12px] text-ink-500">{detalhe}</p>}
      <Link
        to={to}
        className="mt-auto flex items-center gap-1 pt-3 text-[12px] font-medium text-forest-600 hover:underline"
      >
        {cta}
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function Atalho({
  to,
  icon: Icon,
  titulo,
  desc,
}: {
  to: string;
  icon: LucideIcon;
  titulo: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3.5 transition hover:border-forest-500"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest-100">
        <Icon className="h-[18px] w-[18px] text-forest-600" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-900">{titulo}</span>
        <span className="block truncate text-[13px] text-ink-500">{desc}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-400" />
    </Link>
  );
}
