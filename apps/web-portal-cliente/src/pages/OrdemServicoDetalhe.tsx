/**
 * Detalhe da ordem de serviço.
 *
 * O protótipo abre a OS a partir da lista e organiza o conteúdo em quatro abas
 * com contador: Relatórios Técnicos, Mapeamento, Cronograma e Certificado.
 *
 * Antes, Relatórios e Cronograma eram duas seções soltas na própria lista,
 * misturando tudo de todas as OS — quem tinha seis ordens via uma pilha única
 * de relatórios e precisava conferir o número da OS em cada linha. As outras
 * duas abas não existiam.
 *
 * Cada aba carrega sob demanda. Carregar as quatro de uma vez faria três
 * consultas que talvez ninguém abrisse, e a primeira aba é a que quase todo
 * mundo quer.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, MapPin, CalendarDays, Award } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { cn } from '@/lib/cn';
import { Empty, ErrorBanner, Loading, TH } from '@/components/ui/DataSection';
import { VisualizadorDocumento, type DocumentoParaVer } from '@/components/VisualizadorDocumento';
import {
  getOsDetalhe, listRelatoriosDaOs, listMapeamentoDaOs, listCronogramaDaOs,
  listCertificadosDaOs, estiloStatus, situacaoPontoCor,
  type OsDetalhe, type RelatorioCliente, type PlanoDeControle,
  type CronogramaCliente, type AnexoCliente,
} from '@/lib/operacional';

type AbaId = 'relatorios' | 'mapeamento' | 'cronograma' | 'certificado';

const ABAS: { id: AbaId; label: string; icone: typeof FileText }[] = [
  { id: 'relatorios', label: 'Relatórios Técnicos', icone: FileText },
  { id: 'mapeamento', label: 'Mapeamento', icone: MapPin },
  { id: 'cronograma', label: 'Cronograma', icone: CalendarDays },
  { id: 'certificado', label: 'Certificado', icone: Award },
];

export function OrdemServicoDetalhe() {
  const { id = '' } = useParams();

  const [os, setOs] = useState<OsDetalhe | null>(null);
  const [carregandoOs, setCarregandoOs] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<AbaId>('relatorios');
  const [vendo, setVendo] = useState<DocumentoParaVer | null>(null);

  const [relatorios, setRelatorios] = useState<RelatorioCliente[] | null>(null);
  const [mapeamento, setMapeamento] = useState<PlanoDeControle[] | null>(null);
  const [cronograma, setCronograma] = useState<CronogramaCliente[] | null>(null);
  const [certificados, setCertificados] = useState<AnexoCliente[] | null>(null);

  useEffect(() => {
    setCarregandoOs(true);
    getOsDetalhe(id)
      .then(setOs)
      .catch((e) => setErro((e as Error).message))
      .finally(() => setCarregandoOs(false));
  }, [id]);

  const carregarAba = useCallback(
    (qual: AbaId) => {
      const falhou = (e: unknown) => setErro((e as Error).message);
      if (qual === 'relatorios' && relatorios === null) listRelatoriosDaOs(id).then(setRelatorios).catch(falhou);
      if (qual === 'mapeamento' && mapeamento === null) listMapeamentoDaOs(id).then(setMapeamento).catch(falhou);
      if (qual === 'cronograma' && cronograma === null) listCronogramaDaOs(id).then(setCronograma).catch(falhou);
      if (qual === 'certificado' && certificados === null) listCertificadosDaOs(id).then(setCertificados).catch(falhou);
    },
    [id, relatorios, mapeamento, cronograma, certificados],
  );

  useEffect(() => {
    if (os) carregarAba(aba);
  }, [os, aba, carregarAba]);

  /**
   * Contador ao lado do nome da aba.
   *
   * Só aparece depois que a aba carregou. Mostrar zero antes de consultar diria
   * "não há nada aqui" sobre algo que ainda não foi perguntado.
   */
  const contagens = useMemo<Record<AbaId, number | null>>(
    () => ({
      relatorios: relatorios?.length ?? null,
      mapeamento: mapeamento?.reduce((n, p) => n + p.pontos.length, 0) ?? null,
      cronograma: cronograma?.length ?? null,
      certificado: certificados?.length ?? null,
    }),
    [relatorios, mapeamento, cronograma, certificados],
  );

  if (carregandoOs) {
    return (
      <>
        <Topbar title="Ordem de Serviço" breadcrumb="Início  /  Ordens de Serviço" />
        <div className="px-8 py-6"><Loading /></div>
      </>
    );
  }

  // A RLS devolve zero linhas para OS de outro cliente — indistinguível de um
  // id que não existe, e é bom que seja: dizer "existe, mas não é sua" já conta
  // que ela existe.
  if (!os) {
    return (
      <>
        <Topbar title="Ordem de Serviço" breadcrumb="Início  /  Ordens de Serviço" />
        <div className="px-8 py-6">
          <Empty>Esta ordem de serviço não está disponível para a sua conta.</Empty>
          <Link to="/ordens" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-forest-600 hover:underline">
            <ArrowLeft className="h-4 w-4" />Voltar para Ordens de Serviço
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar
        title={`${os.codigo} · ${os.identificacao}`}
        breadcrumb={`Início  /  Ordens de Serviço  /  ${os.codigo}`}
      />

      <div className="px-8 py-6">
        {erro && <ErrorBanner>{erro}</ErrorBanner>}

        <Link to="/ordens" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-forest-600 hover:underline">
          <ArrowLeft className="h-4 w-4" />Voltar
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-ink-200 bg-white px-6 py-4">
          <Campo rotulo="Serviço" valor={os.tipos} />
          <Campo rotulo="Data" valor={os.data} />
          <span>
            <span className="block text-[11px] font-bold uppercase tracking-wide text-ink-400">Situação</span>
            <span className="mt-1 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold" style={estiloStatus(os.status)}>
              {os.statusLabel}
            </span>
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {ABAS.map((a) => {
            const n = contagens[a.id];
            const ativa = aba === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setAba(a.id)}
                aria-current={ativa ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition',
                  ativa ? 'bg-forest-600 text-white' : 'border border-ink-200 bg-white text-ink-700 hover:bg-ink-50',
                )}
              >
                <a.icone className="h-4 w-4" />
                {a.label}
                {n !== null && (
                  <span className={cn('rounded-full px-1.5 text-[11px]', ativa ? 'bg-white/20' : 'bg-ink-100 text-ink-500')}>
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          {aba === 'relatorios' && <AbaRelatorios dados={relatorios} onVer={setVendo} />}
          {aba === 'mapeamento' && <AbaMapeamento dados={mapeamento} />}
          {aba === 'cronograma' && <AbaCronograma dados={cronograma} />}
          {aba === 'certificado' && <AbaCertificado dados={certificados} onVer={setVendo} />}
        </div>
      </div>

      {vendo && <VisualizadorDocumento doc={vendo} onClose={() => setVendo(null)} />}
    </>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <span>
      <span className="block text-[11px] font-bold uppercase tracking-wide text-ink-400">{rotulo}</span>
      <span className="mt-1 block text-sm font-medium text-ink-900">{valor}</span>
    </span>
  );
}

function Quadro({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">{children}</div>;
}

function AbaRelatorios({ dados, onVer }: { dados: RelatorioCliente[] | null; onVer: (d: DocumentoParaVer) => void }) {
  if (dados === null) return <Loading />;
  if (!dados.length) return <Empty>Nenhum relatório publicado para esta ordem de serviço.</Empty>;
  return (
    <Quadro>
      <ul className="divide-y divide-ink-100">
        {dados.map((r) => (
          <li key={r.id} className="flex items-center gap-4 px-5 py-3.5">
            <FileText className="h-[18px] w-[18px] shrink-0 text-forest-600" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-900">{r.titulo}</p>
              <p className="text-[13px] text-ink-500">Publicado em {r.publicadoEm}</p>
            </div>
            {r.arquivoUrl ? (
              <button
                onClick={() => onVer({ caminho: r.arquivoUrl!, titulo: r.titulo, sub: `Publicado em ${r.publicadoEm}` })}
                title="Clique para abrir"
                className="shrink-0 text-[13px] font-semibold text-forest-600 hover:underline"
              >
                Abrir
              </button>
            ) : (
              <span className="shrink-0 text-[13px] text-ink-400">Sem arquivo</span>
            )}
          </li>
        ))}
      </ul>
    </Quadro>
  );
}

function AbaMapeamento({ dados }: { dados: PlanoDeControle[] | null }) {
  if (dados === null) return <Loading />;
  if (!dados.length) return <Empty>Esta ordem de serviço não tem plano de controle registrado.</Empty>;

  return (
    <div className="space-y-5">
      {dados.map((p) => (
        <Quadro key={p.id}>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-ink-100 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-ink-900">{p.tipoControle}</h3>
            <span className="text-[13px] text-ink-500">{p.frequencia}</span>
            {/* Previstos contra registrados: é o que diz se a visita cobriu o
                combinado. Sem os dois números, "8 pontos" não significa nada. */}
            <span className="ml-auto text-[13px] text-ink-500">
              {p.pontos.length} de {p.pontosPrevistos} ponto{p.pontosPrevistos === 1 ? '' : 's'} registrado
              {p.pontos.length === 1 ? '' : 's'}
            </span>
          </div>
          {p.pontos.length === 0 ? (
            <p className="px-5 py-4 text-[13px] text-ink-400">Nenhum ponto registrado neste plano.</p>
          ) : (
            <table className="w-full">
              <thead className="bg-ink-50">
                <tr>
                  <th className={cn(TH, 'w-16 text-center')}>Nº</th>
                  <th className={TH}>Ponto</th>
                  <th className={TH}>Situação</th>
                  <th className={TH}>Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {p.pontos.map((pt) => {
                  const cor = situacaoPontoCor[pt.situacao] ?? { bg: '#f2f3f4', fg: '#686f7d' };
                  return (
                    <tr key={pt.id}>
                      <td className="px-4 py-3 text-center text-[13px] tabular-nums text-ink-500">{pt.numero}</td>
                      <td className="px-4 py-3 text-sm text-ink-900">{pt.identificacao}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
                          style={{ backgroundColor: cor.bg, color: cor.fg }}
                        >
                          {pt.situacaoLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-ink-500">{pt.observacao || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Quadro>
      ))}
    </div>
  );
}

function AbaCronograma({ dados }: { dados: CronogramaCliente[] | null }) {
  if (dados === null) return <Loading />;
  if (!dados.length) return <Empty>Sem visitas agendadas para esta ordem de serviço.</Empty>;
  return (
    <Quadro>
      <ul className="divide-y divide-ink-100">
        {dados.map((c) => (
          <li key={c.id} className="flex items-center gap-4 px-5 py-3.5">
            <CalendarDays className="h-[18px] w-[18px] shrink-0 text-forest-600" />
            <p className="flex-1 text-sm font-medium text-ink-900">{c.data}</p>
            <span className="text-[13px] text-ink-500">
              {c.status === 'concluida' ? 'Concluída' : 'Prevista'}
            </span>
          </li>
        ))}
      </ul>
    </Quadro>
  );
}

function AbaCertificado({ dados, onVer }: { dados: AnexoCliente[] | null; onVer: (d: DocumentoParaVer) => void }) {
  if (dados === null) return <Loading />;
  if (!dados.length) {
    return <Empty>O certificado desta ordem de serviço ainda não foi emitido.</Empty>;
  }
  return (
    <Quadro>
      <ul className="divide-y divide-ink-100">
        {dados.map((a) => (
          <li key={a.id} className="flex items-center gap-4 px-5 py-3.5">
            <Award className="h-[18px] w-[18px] shrink-0 text-forest-600" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-900">{a.nome}</p>
              <p className="text-[13px] text-ink-500">Emitido em {a.criadoEm}</p>
            </div>
            {a.arquivoUrl ? (
              <button
                onClick={() => onVer({ caminho: a.arquivoUrl!, titulo: a.nome, sub: `Emitido em ${a.criadoEm}` })}
                title="Clique para abrir"
                className="shrink-0 text-[13px] font-semibold text-forest-600 hover:underline"
              >
                Abrir
              </button>
            ) : (
              <span className="shrink-0 text-[13px] text-ink-400">Sem arquivo</span>
            )}
          </li>
        ))}
      </ul>
    </Quadro>
  );
}
