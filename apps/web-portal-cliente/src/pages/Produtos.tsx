import { useEffect, useMemo, useState } from 'react';
import { FileText, Siren, FlaskConical, ExternalLink } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { cn } from '@/lib/cn';
import {
  CountHeadline, Empty, ErrorBanner, Loading, SearchInput, TH,
} from '@/components/ui/DataSection';
import { listProdutos, type ProdutoCliente } from '@/lib/portal';
import { VisualizadorDocumento, type DocumentoParaVer } from '@/components/VisualizadorDocumento';

/**
 * Consulta pública da ANVISA.
 *
 * A coluna "ANVISA / Rótulo" é a única que não abre o visualizador: o protótipo
 * manda para a consulta oficial em aba nova, porque o que interessa ali é o
 * registro vigente no órgão, não uma cópia guardada por nós.
 */
const CONSULTA_ANVISA = 'https://consultas.anvisa.gov.br/';

/**
 * Aparência da etiqueta de disponibilidade.
 *
 * Fica aqui, e não solta no JSX, porque a legenda precisa mostrar exatamente a
 * mesma etiqueta que aparece na linha. Legenda com bolinha ao lado de uma
 * tabela com etiqueta escrita obriga a pessoa a traduzir uma coisa na outra.
 */
const ETIQUETA = {
  disponivel: 'bg-forest-100 text-forest-900',
  indisponivel: 'bg-ink-50 text-ink-400',
} as const;

const classeEtiqueta = (disponivel: boolean) =>
  `rounded-full px-2 py-0.5 text-[10px] font-semibold ${disponivel ? ETIQUETA.disponivel : ETIQUETA.indisponivel}`;

/** Tela 5 - Produtos, com o bloco regulatório de cada um. */
export function Produtos() {
  const [rows, setRows] = useState<ProdutoCliente[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [vendo, setVendo] = useState<DocumentoParaVer | null>(null);

  useEffect(() => {
    listProdutos()
      .then(setRows)
      .catch((e) => setErro((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((p) => `${p.nome} ${p.codigo} ${p.categoria}`.toLowerCase().includes(q));
  }, [rows, busca]);

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
              <CountHeadline n={visiveis.length} singular="produto cadastrado" plural="produtos cadastrados" />
              <div className="flex items-center gap-3">
                {/* Faixa informativa, não filtro — é o que o protótipo desenha.
                    A lista de produtos homologados de um cliente cabe na tela, e
                    filtrar esconderia justamente o indisponível, que é o que ele
                    precisa notar. */}
                <div className="flex items-center gap-3 rounded-lg bg-forest-50 px-4 py-2">
                  <span className={classeEtiqueta(true)}>Disponível</span>
                  <span className={classeEtiqueta(false)}>Indisponível</span>
                </div>
                <SearchInput
                  value={busca}
                  onChange={setBusca}
                  placeholder="Buscar por nome do produto"
                  label="Buscar produto"
                />
              </div>
            </div>

            {visiveis.length === 0 ? (
              <Empty>
                {rows.length === 0
                  ? 'Nenhum produto associado ao seu contrato ainda.'
                  : 'Nenhum produto para esta busca.'}
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
                            <span className={classeEtiqueta(p.disponivel)}>
                              {p.disponivel ? 'Disponível' : 'Indisponível'}
                            </span>
                          </div>
                          <p className="text-[13px] text-ink-500">
                            {p.codigo} · {p.categoria}
                            {p.registroAnvisa && ` · Registro ${p.registroAnvisa}`}
                          </p>
                        </td>
                        <Doc url={p.fichaTecnicaUrl} icon={FileText} rotulo="ficha técnica" nome={p.nome} onVer={setVendo} />
                        <Doc url={p.fichaEmergenciaUrl} icon={Siren} rotulo="ficha de emergência" nome={p.nome} onVer={setVendo} />
                        <Doc url={p.fdsUrl} icon={FlaskConical} rotulo="FDS" nome={p.nome} onVer={setVendo} />
                        <Doc url={p.anvisaUrl} icon={ExternalLink} rotulo="registro na ANVISA" nome={p.nome} externo={CONSULTA_ANVISA} />
                      </tr>
                    ))}
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
  onVer,
  externo,
}: {
  url: string | null;
  icon: React.ComponentType<{ className?: string }>;
  rotulo: string;
  nome: string;
  /** Abre o documento no visualizador. */
  onVer?: (d: DocumentoParaVer) => void;
  /** Endereço fixo em aba nova, no lugar do visualizador (consulta da ANVISA). */
  externo?: string;
}) {
  if (!url) {
    return (
      <td className="px-4 py-3 text-center">
        <span className="text-[13px] text-ink-300" title="Indisponível">—</span>
      </td>
    );
  }

  const comum =
    'inline-flex h-8 w-8 items-center justify-center rounded-lg text-forest-600 transition hover:bg-forest-100';

  return (
    <td className="px-4 py-3 text-center">
      {externo ? (
        <a
          href={externo}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Consultar ${rotulo} de ${nome} na ANVISA`}
          title="Consulta ANVISA · abre em nova aba"
          className={comum}
        >
          <Icon className="h-[18px] w-[18px]" />
        </a>
      ) : (
        <button
          onClick={() => onVer?.({ caminho: url, titulo: `${rotulo}: ${nome}` })}
          aria-label={`Abrir ${rotulo} de ${nome}`}
          title="Clique para abrir"
          className={comum}
        >
          <Icon className="h-[18px] w-[18px]" />
        </button>
      )}
    </td>
  );
}
