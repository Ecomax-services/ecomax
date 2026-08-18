import { useEffect, useMemo, useState } from 'react';
import { FileText, Download, CalendarDays, Search } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { cn } from '@/lib/cn';
import {
  listMinhasOs, listRelatorios, listCronograma, osStatusClass, contaAbertas,
  type MinhaOs, type RelatorioCliente, type CronogramaCliente,
} from '@/lib/operacional';

export function OrdensServico() {
  const [os, setOs] = useState<MinhaOs[]>([]);
  const [relatorios, setRelatorios] = useState<RelatorioCliente[]>([]);
  const [cronograma, setCronograma] = useState<CronogramaCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  // Filtro no cliente: o portal traz as OS de um cliente só, então a lista é
  // curta e uma ida ao servidor por tecla não se paga.
  const osFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return os;
    return os.filter((o) =>
      `${o.codigo} ${o.tipos} ${o.identificacao} ${o.statusLabel}`.toLowerCase().includes(q),
    );
  }, [os, busca]);

  useEffect(() => {
    setLoading(true);
    Promise.all([listMinhasOs(), listRelatorios(), listCronograma()])
      .then(([o, r, c]) => { setOs(o); setRelatorios(r); setCronograma(c); })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Topbar title="Ordens de Serviço" breadcrumb="Início  /  Ordens de Serviço" />
      <div className="flex-1 px-8 py-6">
        {error && <p className="mb-4 rounded-lg bg-expiredTag-bg px-4 py-3 text-sm text-expiredTag-fg">{error}</p>}
        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-ink-200 bg-white text-sm text-ink-400">Carregando…</div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Minhas OS */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[15px] text-ink-700">
                <span className="text-[22px] font-bold text-forest-900">{contaAbertas(os)}</span>{' '}
                {contaAbertas(os) === 1 ? 'ordem de serviço aberta' : 'ordens de serviço abertas'}
              </p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nº, serviço ou local"
                  aria-label="Buscar ordens de serviço"
                  className="h-10 w-[300px] max-w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 text-[13px] text-ink-900 placeholder:text-ink-400 focus:border-forest-500 focus:outline-none"
                />
              </div>
            </div>

            <Section title="Minhas ordens de serviço" count={osFiltradas.length}>
              {osFiltradas.length === 0 ? (
                <Empty>{busca ? 'Nenhuma ordem de serviço para esta busca.' : 'Nenhuma ordem de serviço.'}</Empty>
              ) : (
                <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
                  <table className="w-full border-collapse">
                    <thead><tr className="bg-ink-50">
                      <th className={TH}>Nº</th><th className={TH}>Identificação</th><th className={TH}>Serviço</th><th className={TH}>Data</th><th className={TH}>Status</th>
                    </tr></thead>
                    <tbody>
                      {osFiltradas.map((o) => (
                        <tr key={o.id} className="border-t border-ink-200">
                          <td className="px-4 py-3 text-sm font-semibold text-forest-900">{o.codigo}</td>
                          <td className="px-4 py-3 text-sm text-ink-800">{o.identificacao}</td>
                          <td className="px-4 py-3 text-sm text-ink-800">{o.tipos}</td>
                          <td className="px-4 py-3 text-sm text-ink-500">{o.data}</td>
                          <td className="px-4 py-3"><span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', osStatusClass[o.status])}>{o.statusLabel}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            {/* Relatórios publicados */}
            <Section title="Relatórios técnicos disponíveis" count={relatorios.length}>
              {relatorios.length === 0 ? (
                <Empty>Nenhum relatório disponível ainda.</Empty>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {relatorios.map((r) => (
                    <li key={r.id} className="flex items-center justify-between rounded-xl border border-ink-200 bg-white px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest-50 text-forest-600"><FileText className="h-[18px] w-[18px]" /></span>
                        <div>
                          <p className="text-sm font-semibold text-ink-900">{r.titulo}</p>
                          <p className="text-xs text-ink-400">{r.osCodigo} · publicado em {r.publicadoEm}</p>
                        </div>
                      </div>
                      <a
                        href={r.arquivoUrl ?? undefined}
                        aria-disabled={!r.arquivoUrl}
                        className={cn('inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-xs font-medium', r.arquivoUrl ? 'text-forest-600 hover:bg-ink-50' : 'pointer-events-none text-ink-300')}
                      >
                        <Download className="h-4 w-4" />Baixar PDF
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {/* Cronograma */}
            <Section title="Cronograma de visitas" count={cronograma.length}>
              {cronograma.length === 0 ? (
                <Empty>Sem visitas agendadas.</Empty>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {cronograma.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest-50 text-forest-600"><CalendarDays className="h-[18px] w-[18px]" /></span>
                      <div>
                        <p className="text-sm font-semibold text-ink-900">{c.data}</p>
                        <p className="text-xs text-ink-400">{c.osCodigo}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        )}
      </div>
    </>
  );
}

const TH = 'px-4 py-2.5 text-left text-xs font-bold uppercase text-ink-400';

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-ink-900">
        {title}<span className="rounded-full bg-ink-50 px-2 py-0.5 text-[11px] font-semibold text-ink-500">{count}</span>
      </h2>
      {children}
    </section>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-ink-200 bg-white text-sm text-ink-400">{children}</div>;
}
