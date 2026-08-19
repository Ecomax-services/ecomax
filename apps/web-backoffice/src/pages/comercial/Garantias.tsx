import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Link2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { SearchInput, SelectField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import {
  listGarantias, garantiaTone, GARANTIA_STATUS, type GarantiaRow, type GarantiaAba,
} from '@/lib/comercial';

const ABAS: { key: GarantiaAba; label: string }[] = [
  { key: 'vencendo', label: 'Vencendo' },
  { key: 'aguardando', label: 'Aguardando retorno' },
  { key: 'todas', label: 'Todas' },
];

const TH = 'px-4 py-2.5 text-left text-xs font-bold uppercase text-ink-400';
const PAGE_SIZE = 25;

/** Cor da pill de classificação ABC (nota 11 do Discovery). */
const abcClasse: Record<string, string> = {
  A: 'bg-forest-100 text-forest-900',
  B: 'bg-tag-softWarnBg text-tag-warnFg',
  C: 'bg-ink-100 text-ink-500',
};

/** Tela 5.2 - Garantias de OS avulsas. */
export function Garantias() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<GarantiaRow[]>([]);
  const [total, setTotal] = useState(0);
  const [aba, setAba] = useState<GarantiaAba>('vencendo');
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('todos');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    listGarantias({ aba, busca, status, page, pageSize: PAGE_SIZE })
      .then((r) => { setRows(r.rows); setTotal(r.total); })
      .catch((e) => showToast((e as Error).message))
      .finally(() => setLoading(false));
  }, [aba, busca, status, page, showToast]);
  useEffect(() => { load(); }, [load]);

  // Voltar para a primeira página ao mudar o recorte: continuar na página 7 de
  // um filtro que agora tem 2 páginas mostraria uma tela vazia sem explicação.
  useEffect(() => { setPage(1); }, [aba, status, busca]);

  const paginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <Topbar title="Garantias" breadcrumb="Início  /  Comercial  /  Garantias" />
      <div className="flex-1 px-8 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs tabs={ABAS} value={aba} onChange={setAba} />
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Cliente ou nº da OS" />
            <SelectField
              value={status} onChange={(e) => setStatus(e.target.value)}
              options={[{ value: 'todos', label: 'Todos os status' }, ...GARANTIA_STATUS.map((s) => ({ value: s, label: s }))]}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-ink-50">
                <th className={cn(TH, 'pl-6')}>OS</th>
                <th className={TH}>Cliente</th>
                <th className={TH}>ABC</th>
                <th className={TH}>Execução</th>
                <th className={TH}>Validade</th>
                <th className={TH}>Dias restantes</th>
                <th className={TH}>Status</th>
                <th className={cn(TH, 'pr-6')}>Contato</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-ink-400">Carregando…</td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-ink-400">Nenhuma garantia neste recorte.</td></tr>
              )}
              {rows.map((g) => (
                <tr
                  key={g.id}
                  onClick={() => navigate(`/comercial/garantias/${g.id}`)}
                  className="cursor-pointer border-t border-ink-100 hover:bg-ink-50/60"
                >
                  <td className="px-4 py-3 pl-6 text-sm font-semibold text-forest-900">{g.osCodigo}</td>
                  <td className="px-4 py-3 text-sm text-ink-800">{g.cliente}</td>
                  <td className="px-4 py-3">
                    {g.abc ? (
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', abcClasse[g.abc])}>{g.abc}</span>
                    ) : <span className="text-[13px] text-ink-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-500">{g.dataExecucao}</td>
                  <td className="px-4 py-3 text-sm text-ink-600">{g.dataValidade}</td>
                  <td className="px-4 py-3 text-sm">
                    {g.diasRestantes === null ? '—' : g.diasRestantes < 0 ? (
                      <span className="font-semibold text-danger-bright">Vencida há {Math.abs(g.diasRestantes)} d</span>
                    ) : g.diasRestantes <= 60 ? (
                      <span className="font-semibold text-tag-warnFg">{g.diasRestantes} d</span>
                    ) : <span className="text-ink-500">{g.diasRestantes} d</span>}
                  </td>
                  <td className="px-4 py-3"><Badge tone={garantiaTone[g.status] ?? 'muted'}>{g.status}</Badge></td>
                  <td className="px-4 py-3 pr-6 text-sm text-ink-500">
                    <span className="flex items-center gap-1.5">
                      {g.dataContato}
                      {g.temLink && <Link2 className="h-3.5 w-3.5 text-forest-600" aria-label="Tem link público" />}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação no servidor: são ~9 mil registros, e trazer tudo para
            filtrar no navegador custaria megabytes por abertura de tela. */}
        <div className="mt-3 flex items-center justify-between text-[13px] text-ink-500">
          <span>{total} garantia(s) · página {page} de {paginas}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-ink-200 bg-white px-3 py-1.5 font-medium disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(paginas, p + 1))}
              disabled={page >= paginas}
              className="inline-flex items-center gap-1 rounded-lg border border-ink-200 bg-white px-3 py-1.5 font-medium disabled:opacity-40"
            >
              Próxima<ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="mt-3 text-[13px] text-ink-400">
          <Link to="/comercial" className="font-semibold text-forest-700 hover:underline">Voltar ao Comercial</Link>
        </p>
      </div>
    </>
  );
}
