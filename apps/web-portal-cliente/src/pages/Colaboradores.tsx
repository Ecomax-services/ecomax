import { useEffect, useMemo, useState } from 'react';
import { Info, Mail, X } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { cn } from '@/lib/cn';
import {
  CountHeadline, ErrorBanner, Loading, SearchInput, TH,
} from '@/components/ui/DataSection';
import {
  listColaboradores, listTiposDocumentoColaborador, abrirDocumento, validadeMeta,
  type Colaborador,
} from '@/lib/portal';

/**
 * Tela 6 - Colaboradores.
 *
 * Matriz colaborador x documento. Aparecem apenas as pessoas que estiveram em
 * alguma OS deste cliente — é o recorte que o RLS impõe, e é o certo: o cliente
 * tem interesse legítimo na documentação de quem entra no local dele.
 */
export function Colaboradores() {
  const [rows, setRows] = useState<Colaborador[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listColaboradores(), listTiposDocumentoColaborador()])
      .then(([c, t]) => { setRows(c); setTipos(t); })
      .catch((e) => setErro((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) => `${c.nome} ${c.cargo}`.toLowerCase().includes(q));
  }, [rows, busca]);

  return (
    <>
      <Topbar title="Colaboradores" breadcrumb="Início  /  Colaboradores" />
      <div className="flex-1 px-8 py-6">
        {erro && <ErrorBanner>{erro}</ErrorBanner>}
        {loading ? (
          <Loading />
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CountHeadline n={visiveis.length} singular="colaborador" plural="colaboradores" />
              <SearchInput
                value={busca}
                onChange={setBusca}
                placeholder="Buscar colaborador"
                label="Buscar colaborador"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-lg bg-ink-50 px-4 py-3 text-[13px] text-ink-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Info className="h-4 w-4 text-ink-400" />
                Cada célula mostra a validade. Clique na data para abrir o documento.
              </span>
              <span className="flex items-center gap-3">
                {(['valido', 'vence_em_breve', 'vencido', 'indisponivel'] as const).map((e) => (
                  <span key={e} className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', validadeMeta[e].classe)}>
                    {validadeMeta[e].label}
                  </span>
                ))}
              </span>
            </div>

            {visiveis.length === 0 ? (
              <BuscaSemResultado
                buscou={rows.length > 0}
                termo={busca}
                onLimpar={() => setBusca('')}
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-ink-200 bg-white">
                <table className="w-full border-collapse" style={{ minWidth: 320 + tipos.length * 130 }}>
                  <thead>
                    <tr className="bg-ink-50">
                      <th className={TH}>Colaborador</th>
                      {tipos.map((t) => (
                        <th key={t} className={cn(TH, 'text-center')}>{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((c) => (
                      <tr key={c.id} className="border-t border-ink-200">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-ink-900">{c.nome}</p>
                          <p className="text-[13px] text-ink-500">{c.cargo}</p>
                        </td>
                        {tipos.map((t) => {
                          const doc = c.documentos[t];
                          const meta = validadeMeta[doc?.estado ?? 'indisponivel'];
                          const conteudo = (
                            <span className={cn('inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold', meta.classe)}>
                              {doc?.validade ? doc.validadeBr : meta.label}
                            </span>
                          );
                          return (
                            <td key={t} className="px-4 py-3 text-center">
                              {doc?.arquivoUrl ? (
                                <button
                                  onClick={() => abrirDocumento(doc.arquivoUrl)}
                                  aria-label={`Abrir ${t} de ${c.nome}`}
                                  title={`Abrir ${t}`}
                                  className="transition hover:opacity-75"
                                >
                                  {conteudo}
                                </button>
                              ) : (
                                conteudo
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="text-[13px] text-ink-400">
              Não encontrou um colaborador? Ele aparece aqui depois de ser escalado em uma ordem de
              serviço sua.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * O que o cliente vê quando a busca não acha ninguém.
 *
 * O protótipo não para em "nenhum resultado": oferece o caminho de saída, que
 * é pedir a documentação ao RH da Ecomax. Sem isso o cliente fica olhando uma
 * tela vazia sem saber que existe alguém para perguntar — e a lista aqui só
 * mostra quem já esteve numa OS dele, então "não está na lista" é uma
 * situação normal, não um erro.
 */
function BuscaSemResultado({
  buscou, termo, onLimpar,
}: { buscou: boolean; termo: string; onLimpar: () => void }) {
  const assunto = encodeURIComponent('Documentação de colaborador — solicitação pelo portal');
  const corpo = encodeURIComponent(
    `Olá,\n\nGostaria de solicitar a documentação do colaborador${termo.trim() ? ` "${termo.trim()}"` : ''}.\n\nObrigado.`,
  );
  const rh = import.meta.env.VITE_EMAIL_RH ?? 'contato@ecomax.com.br';

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-ink-200 bg-white px-6 py-8 text-center">
      <p className="text-sm text-ink-500">
        {buscou
          ? <>Nenhum colaborador encontrado para “{termo}”.</>
          : 'Nenhum colaborador atendeu suas ordens de serviço ainda.'}
      </p>
      <p className="max-w-[420px] text-[13px] text-ink-400">
        {buscou
          ? 'Confira a grafia do nome. Se o colaborador não estiver na lista, solicite a documentação ao RH da Ecomax.'
          : 'Assim que uma OS for executada, quem esteve no local aparece aqui com a documentação.'}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <a
          href={`mailto:${rh}?subject=${assunto}&body=${corpo}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-forest-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-forest-700"
        >
          <Mail className="h-4 w-4" />Solicitar ao RH por e-mail
        </a>
        {buscou && (
          <button
            onClick={onLimpar}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-4 py-2 text-[13px] font-semibold text-ink-700 hover:bg-ink-50"
          >
            <X className="h-4 w-4" />Limpar busca
          </button>
        )}
      </div>
    </div>
  );
}
