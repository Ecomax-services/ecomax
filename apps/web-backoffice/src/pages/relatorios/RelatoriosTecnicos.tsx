import { useCallback, useEffect, useMemo, useState } from 'react';
import { Cloud, FilePenLine, FileText, FilterX } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SearchInput, SelectField, TextField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useFiltroUrl } from '@/lib/useFiltroUrl';
import { corDoStatus, rotuloStatus } from '@/lib/statusOs';
import { listarRelatoriosTecnicos, type LinhaRelatorio } from '@/lib/relatoriosTecnicos';
import { RelatorioTecnicoDrawer } from '@/pages/relatorios/RelatorioTecnicoDrawer';

const br = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—');

const ORDENS = [
  { value: 'exec', label: 'Data de execução (recente)' },
  { value: 'cliente', label: 'Cliente (A-Z)' },
  { value: 'tipo', label: 'Tipo de serviço' },
  { value: 'status', label: 'Status do relatório' },
];

/**
 * Relatórios › Relatórios técnicos — protótipo aprovado do Backoffice
 * ("Versão Final", aprovado em 06/10/2026).
 *
 * "OS disponíveis para relatório técnico": toda OS executada ou concluída tem
 * um relatório (nasce da execução, v1). A linha abre o editor em painel
 * lateral.
 */
export function RelatoriosTecnicos() {
  const { showToast } = useToast();
  const [linhas, setLinhas] = useState<LinhaRelatorio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<string | null>(null);

  const [busca, setBusca] = useFiltroUrl('q', '');
  const [ordem, setOrdem] = useFiltroUrl('ordem', 'exec', ORDENS.map((o) => o.value));
  const [fCliente, setFCliente] = useFiltroUrl('cliente', 'todos');
  const [fTipo, setFTipo] = useFiltroUrl('tipo', 'todos');
  const [fStatus, setFStatus] = useFiltroUrl('status', 'todos', ['todos', 'rascunho', 'pub']);
  const [fDe, setFDe] = useFiltroUrl('de', '');
  const [fAte, setFAte] = useFiltroUrl('ate', '');

  const carregar = useCallback(() => {
    setCarregando(true);
    listarRelatoriosTecnicos()
      .then(setLinhas)
      .catch((e) => showToast((e as Error).message))
      .finally(() => setCarregando(false));
  }, [showToast]);
  useEffect(() => { carregar(); }, [carregar]);

  const clientes = useMemo(() => [...new Set(linhas.map((l) => l.cliente))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [linhas]);
  const tipos = useMemo(() => [...new Set(linhas.map((l) => l.tipos))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [linhas]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const r = linhas.filter((l) =>
      (!q || `${l.codigo} ${l.cliente}`.toLowerCase().includes(q))
      && (fCliente === 'todos' || l.cliente === fCliente)
      && (fTipo === 'todos' || l.tipos === fTipo)
      && (fStatus === 'todos' || (fStatus === 'pub') === (l.versaoPublicada != null))
      && (!fDe || (l.dataExecucao ?? '') >= fDe)
      && (!fAte || (l.dataExecucao ?? '') <= fAte));
    return r.sort((a, b) => {
      if (ordem === 'cliente') return a.cliente.localeCompare(b.cliente, 'pt-BR');
      if (ordem === 'tipo') return a.tipos.localeCompare(b.tipos, 'pt-BR');
      if (ordem === 'status') return Number(b.versaoPublicada != null) - Number(a.versaoPublicada != null);
      return (b.dataExecucao ?? '').localeCompare(a.dataExecucao ?? '');
    });
  }, [linhas, busca, fCliente, fTipo, fStatus, fDe, fAte, ordem]);

  const limpar = () => { setBusca(''); setFCliente('todos'); setFTipo('todos'); setFStatus('todos'); setFDe(''); setFAte(''); };

  const th = 'px-4 py-3 text-left text-xs font-bold uppercase text-ink-400';

  return (
    <>
      <Topbar title="Relatórios técnicos" breadcrumb="Início  /  Relatórios  /  Relatórios técnicos" />
      <div className="flex-1 px-8 py-6">
        <div className="mb-5 rounded-xl border border-ink-100 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <SearchInput containerClassName="w-[340px]" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por código da OS ou cliente" />
            <SelectField className="min-w-[230px]" value={ordem} onChange={(e) => setOrdem(e.target.value)} options={ORDENS} aria-label="Ordenar" />
            <Button variant="secondary" onClick={limpar}><FilterX className="h-4 w-4" />Limpar filtros</Button>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            <SelectField label="Cliente" value={fCliente} onChange={(e) => setFCliente(e.target.value)}
              options={[{ value: 'todos', label: 'Todos os clientes' }, ...clientes.map((c) => ({ value: c, label: c }))]} />
            <SelectField label="Tipo de serviço" value={fTipo} onChange={(e) => setFTipo(e.target.value)}
              options={[{ value: 'todos', label: 'Todos os serviços' }, ...tipos.map((t) => ({ value: t, label: t }))]} />
            <SelectField label="Status do relatório" value={fStatus} onChange={(e) => setFStatus(e.target.value)}
              options={[{ value: 'todos', label: 'Rascunho e publicado' }, { value: 'rascunho', label: 'Somente rascunho' }, { value: 'pub', label: 'Somente publicado' }]} />
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-ink-700">Execução · de / até</p>
              <div className="flex gap-1.5">
                <TextField type="date" value={fDe} onChange={(e) => setFDe(e.target.value)} aria-label="Execução de" />
                <TextField type="date" value={fAte} onChange={(e) => setFAte(e.target.value)} aria-label="Execução até" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-100 px-5 py-3.5">
            <h2 className="text-[15px] font-bold text-ink-900">OS disponíveis para relatório técnico</h2>
            <span className="text-[13px] text-ink-500">Somente OS executada ou concluída · {filtradas.length} no total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-ink-50">
                <tr>
                  <th className={th}>OS</th><th className={th}>Cliente</th><th className={th}>Tipo de serviço</th>
                  <th className={th}>Execução</th><th className={th}>Status da OS</th><th className={th}>Relatório</th>
                  <th className={th}>Versão</th><th className={th}>Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtradas.map((l) => (
                  <tr key={l.osId} onClick={() => setAberto(l.osId)} className="cursor-pointer hover:bg-[#fafcfa]">
                    <td className="px-4 py-3 text-sm font-semibold text-ink-900">{l.codigo}</td>
                    <td className="px-4 py-3 text-sm text-ink-700">{l.cliente}</td>
                    <td className="px-4 py-3 text-[13px] text-ink-500">{l.tipos}</td>
                    <td className="px-4 py-3 text-[13px] tabular-nums text-ink-700">{br(l.dataExecucao)}</td>
                    <td className="px-4 py-3"><Badge cores={corDoStatus(l.statusOs)}>{rotuloStatus(l.statusOs)}</Badge></td>
                    <td className="px-4 py-3">
                      {l.versaoPublicada != null
                        ? <Badge tone="success"><span className="inline-flex items-center gap-1"><Cloud className="h-3.5 w-3.5" />Publicado</span></Badge>
                        : <Badge tone="softWarn"><span className="inline-flex items-center gap-1"><FilePenLine className="h-3.5 w-3.5" />Rascunho</span></Badge>}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-ink-500">v{l.versaoAtual}</td>
                    <td className="px-4 py-3">
                      <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setAberto(l.osId); }}>
                        <FileText className="h-4 w-4" />Abrir relatório
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!carregando && filtradas.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-ink-400">
              {linhas.length ? 'Nenhuma OS com estes filtros.' : 'Nenhuma OS executada ainda. O relatório nasce quando a OS é executada.'}
            </p>
          )}
          <p className="border-t border-ink-100 px-5 py-3 text-[13px] text-ink-400">
            O relatório não é criado do zero: ele nasce da execução da OS e é complementado pelo técnico.
          </p>
        </div>
      </div>

      {aberto && (
        <RelatorioTecnicoDrawer osId={aberto} onClose={() => setAberto(null)} onSalvo={carregar} />
      )}
    </>
  );
}
