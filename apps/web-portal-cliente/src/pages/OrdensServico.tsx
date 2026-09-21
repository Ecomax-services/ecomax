import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Topbar } from '@/components/Topbar';
import {
  CountHeadline, Empty, ErrorBanner, Loading, SearchInput, Section, TH,
} from '@/components/ui/DataSection';
import { listMinhasOs, estiloStatus, contaAbertas, type MinhaOs } from '@/lib/operacional';

/**
 * Lista de ordens de serviço.
 *
 * Relatórios e cronograma saíram daqui: eram duas seções soltas que misturavam
 * o conteúdo de todas as OS, e quem tinha seis ordens via uma pilha única onde
 * era preciso conferir o número da OS em cada linha. Agora vivem no detalhe da
 * ordem a que pertencem, como no protótipo.
 */
export function OrdensServico() {
  const navigate = useNavigate();
  const [os, setOs] = useState<MinhaOs[]>([]);
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
    listMinhasOs()
      .then(setOs)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Topbar title="Ordens de Serviço" breadcrumb="Início  /  Ordens de Serviço" />
      <div className="flex-1 px-8 py-6">
        {error && <ErrorBanner>{error}</ErrorBanner>}
        {loading ? (
          <Loading />
        ) : (
          <div className="flex flex-col gap-6">
            {/* Minhas OS */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Conta sobre a lista filtrada, como no protótipo. Contando o
                  total, buscar por "cancelada" mostrava uma linha na tabela e
                  um número de abertas que não tinha relação com ela. */}
              <CountHeadline
                n={contaAbertas(osFiltradas)}
                singular="ordem de serviço aberta"
                plural="ordens de serviço abertas"
              />
              <SearchInput
                value={busca}
                onChange={setBusca}
                placeholder="Buscar por nº, serviço ou local"
                label="Buscar ordens de serviço"
              />
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
                        <tr
                          key={o.id}
                          onClick={() => navigate(`/ordens/${o.id}`)}
                          // Teclado também abre: a linha virou o controle, e
                          // quem navega por Tab precisa chegar nela.
                          tabIndex={0}
                          role="link"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              navigate(`/ordens/${o.id}`);
                            }
                          }}
                          className="cursor-pointer border-t border-ink-200 transition hover:bg-forest-50 focus-visible:bg-forest-50 focus-visible:outline-none"
                        >
                          <td className="px-4 py-3 text-sm font-semibold text-forest-900">{o.codigo}</td>
                          <td className="px-4 py-3 text-sm text-ink-800">{o.identificacao}</td>
                          <td className="px-4 py-3 text-sm text-ink-800">{o.tipos}</td>
                          <td className="px-4 py-3 text-sm text-ink-500">{o.data}</td>
                          <td className="px-4 py-3"><span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={estiloStatus(o.status)}>{o.statusLabel}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

          </div>
        )}
      </div>
    </>
  );
}

