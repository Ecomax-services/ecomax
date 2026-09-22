import { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { cn } from '@/lib/cn';
import {
  CountHeadline, Empty, ErrorBanner, Loading, SearchInput, TH,
} from '@/components/ui/DataSection';
import {
  listDocumentos, listCategoriasDocumento,
  type DocumentoCliente,
} from '@/lib/portal';
import { VisualizadorDocumento, type DocumentoParaVer } from '@/components/VisualizadorDocumento';

/** Tela 4 - Documentos. Categorias vêm do catálogo; o conteúdo, do RLS. */
export function Documentos() {
  const [docs, setDocs] = useState<DocumentoCliente[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [aba, setAba] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  // O protótipo abre o documento num modal, não em aba nova — e o modal é quem
  // sabe avisar quando o arquivo não existe no armazenamento.
  const [vendo, setVendo] = useState<DocumentoParaVer | null>(null);

  useEffect(() => {
    Promise.all([listDocumentos(), listCategoriasDocumento()])
      .then(([d, c]) => {
        setDocs(d);
        setCategorias(c);
        setAba((a) => a ?? c[0] ?? null);
      })
      .catch((e) => setErro((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const porCategoria = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of docs) m.set(d.categoria, (m.get(d.categoria) ?? 0) + 1);
    return m;
  }, [docs]);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return docs.filter(
      (d) =>
        d.categoria === aba &&
        (!q || `${d.titulo} ${d.descricao ?? ''}`.toLowerCase().includes(q)),
    );
  }, [docs, aba, busca]);

  return (
    <>
      <Topbar title="Documentos" breadcrumb="Início  /  Documentos" />
      <div className="flex-1 px-8 py-6">
        {erro && <ErrorBanner>{erro}</ErrorBanner>}
        {loading ? (
          <Loading />
        ) : (
          <div className="flex flex-col gap-5">
            {/* Abas de categoria. Vêm do catálogo e aparecem mesmo vazias — some
                a aba, some a pista de que aquela categoria existe. */}
            <div className="flex flex-wrap gap-2">
              {categorias.map((c) => (
                <button
                  key={c}
                  onClick={() => setAba(c)}
                  className={cn(
                    'rounded-lg border px-3.5 py-2 text-[13px] transition-colors',
                    aba === c
                      ? 'border-forest-500 bg-forest-100 font-semibold text-forest-900'
                      : 'border-ink-200 bg-white text-ink-600 hover:text-ink-900',
                  )}
                >
                  {c}
                  <span className="ml-2 text-[11px] text-ink-400">{porCategoria.get(c) ?? 0}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <CountHeadline
                n={visiveis.length}
                singular="documento nesta categoria"
                plural="documentos nesta categoria"
              />
              <SearchInput
                value={busca}
                onChange={setBusca}
                placeholder="Buscar documento"
                label="Buscar documento"
              />
            </div>

            {visiveis.length === 0 ? (
              <Empty>
                {busca ? 'Nenhum documento para esta busca.' : 'Nenhum documento nesta categoria.'}
              </Empty>
            ) : (
              <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-ink-50">
                      <th className={TH}>Documento</th>
                      <th className={cn(TH, 'text-right')}>Arquivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((d) => {
                      return (
                        <tr key={d.id} className="border-t border-ink-200">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-ink-900">{d.titulo}</p>
                            {d.descricao && <p className="text-[13px] text-ink-500">{d.descricao}</p>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {d.arquivoUrl ? (
                              <button
                                onClick={() =>
                                  setVendo({ caminho: d.arquivoUrl!, titulo: d.titulo, sub: d.categoria })
                                }
                                title="Clique para abrir"
                                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-forest-600 hover:underline"
                              >
                                <FileText className="h-4 w-4" />
                                Abrir
                              </button>
                            ) : (
                              <span className="text-[13px] text-ink-400">Sem arquivo</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {vendo && <VisualizadorDocumento doc={vendo} onClose={() => setVendo(null)} />}
    </>
  );
}
