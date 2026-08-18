import { useEffect, useMemo, useState } from 'react';
import { FileText, Siren, FlaskConical, ExternalLink } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { cn } from '@/lib/cn';
import {
  CountHeadline, Empty, ErrorBanner, Loading, SearchInput, TH,
} from '@/components/ui/DataSection';
import { listProdutos, abrirDocumento, type ProdutoCliente } from '@/lib/portal';

type Filtro = 'todos' | 'disponivel' | 'indisponivel';

const filtros: { key: Filtro; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'disponivel', label: 'Disponível' },
  { key: 'indisponivel', label: 'Indisponível' },
];

/** Tela 5 - Produtos, com o bloco regulatório de cada um. */
export function Produtos() {
  const [rows, setRows] = useState<ProdutoCliente[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    listProdutos()
      .then(setRows)
      .catch((e) => setErro((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((p) => {
      if (filtro === 'disponivel' && !p.disponivel) return false;
      if (filtro === 'indisponivel' && p.disponivel) return false;
      return !q || `${p.nome} ${p.codigo} ${p.categoria}`.toLowerCase().includes(q);
    });
  }, [rows, filtro, busca]);

  return (
    <>
      <Topbar title="Produtos" breadcrumb="Início  /  Produtos" />
      <div className="flex-1 px-8 py-6">
        {erro && <ErrorBanner>{erro}</ErrorBanner>}
        {loading ? (
          <Loading />
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CountHeadline n={visiveis.length} singular="produto" plural="produtos" />
              <div className="flex items-center gap-3">
                <div className="flex rounded-lg border border-ink-200 bg-white p-px">
                  {filtros.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFiltro(f.key)}
                      className={cn(
                        'h-8 px-3.5 rounded-md text-[13px] transition-colors',
                        filtro === f.key ? 'bg-forest-100 font-medium text-forest-500' : 'text-ink-500 hover:text-ink-900',
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <SearchInput
                  value={busca}
                  onChange={setBusca}
                  placeholder="Buscar produto"
                  label="Buscar produto"
                />
              </div>
            </div>

            {visiveis.length === 0 ? (
              <Empty>
                {rows.length === 0
                  ? 'Nenhum produto associado ao seu contrato ainda.'
                  : 'Nenhum produto para este filtro.'}
              </Empty>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-ink-200 bg-white">
                <table className="w-full min-w-[860px] border-collapse">
                  <thead>
                    <tr className="bg-ink-50">
                      <th className={TH}>Produto</th>
                      <th className={cn(TH, 'text-center')}>Ficha técnica</th>
                      <th className={cn(TH, 'text-center')}>Ficha de emergência</th>
                      <th className={cn(TH, 'text-center')}>FDS</th>
                      <th className={cn(TH, 'text-center')}>ANVISA / rótulo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((p) => (
                      <tr key={p.id} className="border-t border-ink-200">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-ink-900">{p.nome}</p>
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                p.disponivel ? 'bg-forest-100 text-forest-900' : 'bg-ink-50 text-ink-400',
                              )}
                            >
                              {p.disponivel ? 'Disponível' : 'Indisponível'}
                            </span>
                          </div>
                          <p className="text-[13px] text-ink-500">
                            {p.codigo} · {p.categoria}
                            {p.registroAnvisa && ` · Registro ${p.registroAnvisa}`}
                          </p>
                        </td>
                        <Doc url={p.fichaTecnicaUrl} icon={FileText} rotulo="ficha técnica" nome={p.nome} />
                        <Doc url={p.fichaEmergenciaUrl} icon={Siren} rotulo="ficha de emergência" nome={p.nome} />
                        <Doc url={p.fdsUrl} icon={FlaskConical} rotulo="FDS" nome={p.nome} />
                        <Doc url={p.anvisaUrl} icon={ExternalLink} rotulo="registro na ANVISA" nome={p.nome} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Célula de documento.
 *
 * Quando não há arquivo mostra um traço, e não um botão desabilitado: um botão
 * que não faz nada convida ao clique e não explica por quê.
 */
function Doc({
  url,
  icon: Icon,
  rotulo,
  nome,
}: {
  url: string | null;
  icon: React.ComponentType<{ className?: string }>;
  rotulo: string;
  nome: string;
}) {
  return (
    <td className="px-4 py-3 text-center">
      {url ? (
        <button
          onClick={() => abrirDocumento(url)}
          aria-label={`Abrir ${rotulo} de ${nome}`}
          title={`Abrir ${rotulo}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-forest-600 transition hover:bg-forest-100"
        >
          <Icon className="h-[18px] w-[18px]" />
        </button>
      ) : (
        <span className="text-[13px] text-ink-300">—</span>
      )}
    </td>
  );
}
