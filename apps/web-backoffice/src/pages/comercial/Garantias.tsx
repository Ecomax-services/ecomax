import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Link2, ChevronLeft, ChevronRight, Bookmark, Download, RefreshCw,
  MoreVertical, Eye, ArrowUp, ArrowDown,
} from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { SearchInput, SelectField, TextareaField, TextField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { useCatalogo } from '@/lib/useCatalogo';
import { baixarArquivo } from '@/lib/download';
import { FiltrosSalvosDrawer } from './FiltrosSalvos';
import {
  listGarantias, garantiaTone, GARANTIA_STATUS, podeGerarLink,
  gerarLinksEmLote, mudarStatusEmLote, garantiasParaCsv,
  type GarantiaRow, type GarantiaAba,
} from '@/lib/comercial';
import { listCatalogoAtivos } from '@/lib/configuracoes';

const ABAS: { key: GarantiaAba; label: string }[] = [
  { key: 'vencendo', label: 'Vencendo' },
  { key: 'aguardando', label: 'Aguardando retorno' },
  { key: 'todas', label: 'Todas' },
];

const TH = 'px-4 py-2.5 text-left text-xs font-bold uppercase text-ink-400';
const PAGE_SIZE = 25;

const VALIDADE_OPCOES = [
  { value: 'todos', label: 'Qualquer vencimento' },
  { value: 'vencidas', label: 'Já vencidas' },
  { value: '30', label: 'Vencem em 30 dias' },
  { value: '60', label: 'Vencem em 60 dias' },
  { value: '90', label: 'Vencem em 90 dias' },
];

/** Cor da pill de classificação ABC (nota 11 do Discovery). */
const abcClasse: Record<string, string> = {
  A: 'bg-forest-100 text-forest-900',
  B: 'bg-tag-softWarnBg text-tag-warnFg',
  C: 'bg-ink-100 text-ink-500',
};

type Ordem = 'validade' | 'cliente' | 'abc' | 'status';

/** Tela 5.2 - Garantias de OS avulsas. */
export function Garantias() {
  const { showToast } = useToast();
  const { can } = useAuth();
  const podeEditar = can('comercial', 'editar');
  const navigate = useNavigate();

  const [rows, setRows] = useState<GarantiaRow[]>([]);
  const [total, setTotal] = useState(0);
  const [aba, setAba] = useState<GarantiaAba>('vencendo');
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('todos');
  const [abc, setAbc] = useState('todos');
  const [validade, setValidade] = useState('todos');
  const [tipo, setTipo] = useState('todos');
  const [ordem, setOrdem] = useState<Ordem>('validade');
  const [ordemDesc, setOrdemDesc] = useState(false);
  const statusOpcoes = useCatalogo('status_garantia', GARANTIA_STATUS);
  const [tiposServico, setTiposServico] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [sel, setSel] = useState<string[]>([]);
  const [menu, setMenu] = useState<string | null>(null);
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [linkModal, setLinkModal] = useState<{ alvos: GarantiaRow[] } | null>(null);
  const [statusModal, setStatusModal] = useState<{ alvos: GarantiaRow[] } | null>(null);

  useEffect(() => {
    listCatalogoAtivos('tipos_servico').then(setTiposServico).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    listGarantias({ aba, busca, status, abc, validade, tipo, ordem, ordemDesc, page, pageSize: PAGE_SIZE })
      .then((r) => { setRows(r.rows); setTotal(r.total); })
      .catch((e) => showToast((e as Error).message))
      .finally(() => setLoading(false));
  }, [aba, busca, status, abc, validade, tipo, ordem, ordemDesc, page, showToast]);
  useEffect(() => { load(); }, [load]);

  // Voltar para a primeira página ao mudar o recorte: continuar na página 7 de
  // um filtro que agora tem 2 páginas mostraria uma tela vazia sem explicação.
  useEffect(() => { setPage(1); }, [aba, status, busca, abc, validade, tipo]);

  // A seleção é por página, e some quando a página muda. Guardar ids de uma
  // página que não está mais à vista produz "3 selecionadas" sem nenhuma linha
  // marcada na tela — e uma ação em lote sobre registros que o usuário não vê.
  useEffect(() => { setSel([]); }, [page, aba, status, busca, abc, validade, tipo]);

  const paginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selecionadas = useMemo(() => rows.filter((r) => sel.includes(r.id)), [rows, sel]);
  const todasMarcadas = rows.length > 0 && sel.length === rows.length;

  const alternarTodas = () => setSel(todasMarcadas ? [] : rows.map((r) => r.id));
  const alternar = (id: string) =>
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const ordenarPor = (col: Ordem) => {
    if (ordem === col) setOrdemDesc((d) => !d);
    else { setOrdem(col); setOrdemDesc(false); }
  };

  const exportar = (alvos: GarantiaRow[]) => {
    if (alvos.length === 0) return showToast('Nada para exportar neste recorte.');
    baixarArquivo(garantiasParaCsv(alvos), 'garantias.csv', 'text/csv;charset=utf-8;');
    showToast(`${alvos.length} garantia(s) exportada(s)`);
  };

  const abrirLink = (alvos: GarantiaRow[]) => {
    if (alvos.length === 0) return showToast('Selecione ao menos uma garantia.');
    setLinkModal({ alvos });
    setMenu(null);
  };

  return (
    <>
      <Topbar
        title="Garantias de OS avulsas"
        breadcrumb="Início  /  Comercial  /  Garantias"
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setFiltrosOpen(true)}>
              <Bookmark className="h-4 w-4" />Filtros salvos
            </Button>
            {podeEditar && (
              <Button onClick={() => abrirLink(selecionadas)}>
                <Link2 className="h-4 w-4" />Gerar link
              </Button>
            )}
          </div>
        }
      />
      <div className="flex-1 px-8 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs tabs={ABAS} value={aba} onChange={setAba} />
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por cliente ou código da OS" />
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <SelectField
            className="w-[168px]" value={abc} onChange={(e) => setAbc(e.target.value)}
            options={[{ value: 'todos', label: 'Todas as classes' }, ...['A', 'B', 'C'].map((c) => ({ value: c, label: `Classe ${c}` }))]}
          />
          <SelectField
            className="w-[190px]" value={status} onChange={(e) => setStatus(e.target.value)}
            options={[{ value: 'todos', label: 'Todos os status' }, ...statusOpcoes.map((s) => ({ value: s, label: s }))]}
          />
          <SelectField
            className="w-[200px]" value={validade} onChange={(e) => setValidade(e.target.value)}
            options={VALIDADE_OPCOES}
          />
          <SelectField
            className="w-[190px]" value={tipo} onChange={(e) => setTipo(e.target.value)}
            options={[{ value: 'todos', label: 'Todos os serviços' }, ...tiposServico.map((t) => ({ value: t, label: t }))]}
          />
          <span className="ml-auto text-[13px] text-ink-400">
            <strong className="text-ink-700">{rows.length}</strong> de {total} garantias
          </span>
        </div>

        {sel.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-forest-accent bg-forest-50 px-4 py-2.5">
            <span className="text-[13px] font-semibold text-forest-900">{sel.length} selecionada(s)</span>
            <div className="flex flex-wrap gap-2">
              {podeEditar && (
                <>
                  <button onClick={() => abrirLink(selecionadas)} className="flex items-center gap-1.5 rounded-[9px] bg-greenSoft px-4 py-2 text-[13px] font-semibold text-forest-900">
                    <Link2 className="h-4 w-4" />Gerar link em lote
                  </button>
                  <button onClick={() => { setStatusModal({ alvos: selecionadas }); }} className="flex items-center gap-1.5 rounded-[9px] border border-ink-200 bg-white px-4 py-2 text-[13px] font-semibold text-ink-700">
                    <RefreshCw className="h-4 w-4" />Atualizar status
                  </button>
                </>
              )}
              <button onClick={() => exportar(selecionadas)} className="flex items-center gap-1.5 rounded-[9px] border border-ink-200 bg-white px-4 py-2 text-[13px] font-semibold text-ink-700">
                <Download className="h-4 w-4" />Exportar CSV
              </button>
              <button onClick={() => setSel([])} className="px-2 py-2 text-[13px] font-semibold text-ink-500">Limpar</button>
            </div>
          </div>
        )}

        {/* Sem `overflow-hidden`: o menu de ações é `absolute` dentro deste card,
          e recortar o que passa da borda cortava o menu das últimas linhas. */}
        <div className="rounded-2xl border border-ink-100 bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-ink-50">
                <th className={cn(TH, 'w-10 pl-6')}>
                  <input
                    type="checkbox" checked={todasMarcadas} onChange={alternarTodas}
                    aria-label="Selecionar todas as garantias desta página"
                    className="h-4 w-4 cursor-pointer accent-forest-600"
                  />
                </th>
                <th className={TH}>Código OS</th>
                <ThOrdenavel label="Cliente" col="cliente" ordem={ordem} desc={ordemDesc} onClick={ordenarPor} />
                <ThOrdenavel label="ABC" col="abc" ordem={ordem} desc={ordemDesc} onClick={ordenarPor} />
                <th className={TH}>Execução</th>
                <ThOrdenavel label="Validade" col="validade" ordem={ordem} desc={ordemDesc} onClick={ordenarPor} />
                <ThOrdenavel label="Status" col="status" ordem={ordem} desc={ordemDesc} onClick={ordenarPor} />
                <th className={TH}>Link</th>
                <th className={TH}>Contato</th>
                <th className={cn(TH, 'pr-6 text-right')}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-ink-400">Carregando…</td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-ink-400">Nenhuma garantia neste recorte.</td></tr>
              )}
              {rows.map((g) => (
                <tr
                  key={g.id}
                  onClick={() => navigate(`/comercial/garantias/${g.id}`)}
                  className={cn('cursor-pointer border-t border-ink-100 hover:bg-ink-50/60', sel.includes(g.id) && 'bg-forest-50/50')}
                >
                  <td className="px-4 py-3 pl-6" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox" checked={sel.includes(g.id)} onChange={() => alternar(g.id)}
                      aria-label={`Selecionar garantia da OS ${g.osCodigo}`}
                      className="h-4 w-4 cursor-pointer accent-forest-600"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-forest-900">{g.osCodigo}</td>
                  <td className="px-4 py-3 text-sm text-ink-800">{g.cliente}</td>
                  <td className="px-4 py-3">
                    {g.abc ? (
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', abcClasse[g.abc])}>{g.abc}</span>
                    ) : <span className="text-[13px] text-ink-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-500">{g.dataExecucao}</td>
                  {/* Validade e prazo na mesma célula, como no protótipo: são a
                      mesma informação lida junto, e em colunas separadas o olho
                      precisa pular de uma para a outra. */}
                  <td className="px-4 py-3 text-sm">
                    <div className="text-ink-700">{g.dataValidade}</div>
                    <div className="text-[12px]">
                      {g.diasRestantes === null ? <span className="text-ink-400">—</span>
                        : g.diasRestantes < 0 ? <span className="font-semibold text-danger-bright">Vencida há {Math.abs(g.diasRestantes)} d</span>
                        : g.diasRestantes <= 60 ? <span className="font-semibold text-tag-warnFg">faltam {g.diasRestantes} d</span>
                        : <span className="text-ink-400">faltam {g.diasRestantes} d</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge tone={garantiaTone[g.status] ?? 'muted'}>{g.status}</Badge></td>
                  <td className="px-4 py-3 text-sm">
                    {g.temLink ? (
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-forest-700">
                        <Link2 className="h-3.5 w-3.5" />Gerado
                      </span>
                    ) : <span className="text-[13px] text-ink-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-500">{g.dataContato}</td>
                  <td className="relative px-4 py-3 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setMenu(menu === g.id ? null : g.id)}
                      aria-label={`Ações da garantia da OS ${g.osCodigo}`}
                      className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menu === g.id && (
                      <div className="absolute right-6 top-11 z-20 w-[186px] rounded-xl border border-ink-100 bg-white py-1.5 text-left shadow-modal">
                        <ItemMenu onClick={() => navigate(`/comercial/garantias/${g.id}`)}>
                          <Eye className="h-4 w-4" />Ver detalhes
                        </ItemMenu>
                        {podeEditar && (
                          <ItemMenu
                            onClick={() => abrirLink([g])}
                            desabilitado={!podeGerarLink(g.status)}
                            titulo={podeGerarLink(g.status) ? '' : `Indisponível com a garantia em "${g.status}"`}
                          >
                            <Link2 className="h-4 w-4" />Gerar link
                          </ItemMenu>
                        )}
                        <ItemMenu onClick={() => { exportar([g]); setMenu(null); }}>
                          <Download className="h-4 w-4" />Exportar CSV
                        </ItemMenu>
                      </div>
                    )}
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
          Classificação ABC vem de Gestão de Clientes (somente leitura) · clique numa linha para abrir os detalhes ·{' '}
          <Link to="/comercial" className="font-semibold text-forest-700 hover:underline">Voltar ao Comercial</Link>
        </p>
      </div>

      {filtrosOpen && <FiltrosSalvosDrawer modulo="comercial" onClose={() => setFiltrosOpen(false)} />}
      {linkModal && (
        <ModalGerarLink
          alvos={linkModal.alvos}
          onClose={() => setLinkModal(null)}
          onPronto={() => { setLinkModal(null); setSel([]); load(); }}
        />
      )}
      {statusModal && (
        <ModalStatusLote
          alvos={statusModal.alvos}
          opcoes={statusOpcoes}
          onClose={() => setStatusModal(null)}
          onPronto={() => { setStatusModal(null); setSel([]); load(); }}
        />
      )}
    </>
  );
}

function ThOrdenavel({
  label, col, ordem, desc, onClick,
}: { label: string; col: Ordem; ordem: Ordem; desc: boolean; onClick: (c: Ordem) => void }) {
  const ativo = ordem === col;
  return (
    <th className={TH}>
      <button onClick={() => onClick(col)} className="inline-flex items-center gap-1 uppercase hover:text-ink-700">
        {label}
        {ativo && (desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
      </button>
    </th>
  );
}

function ItemMenu({
  children, onClick, desabilitado, titulo,
}: { children: React.ReactNode; onClick: () => void; desabilitado?: boolean; titulo?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={desabilitado}
      title={titulo}
      className="flex w-full items-center gap-2 px-3.5 py-2 text-[13px] font-medium text-ink-700 hover:bg-ink-50 disabled:cursor-not-allowed disabled:text-ink-300 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

/**
 * Gera o link público de uma ou de várias garantias.
 *
 * O resultado lista o que foi gerado e o que foi recusado, com o motivo. Uma
 * seleção de dez costuma ter alguma garantia em status que não permite link
 * ("Renovado", "Não Aplicável"); dizer só "5 links gerados" esconderia que as
 * outras cinco não saíram.
 */
function ModalGerarLink({
  alvos, onClose, onPronto,
}: { alvos: GarantiaRow[]; onClose: () => void; onPronto: () => void }) {
  const { showToast } = useToast();
  const [dias, setDias] = useState('30');
  const [rodando, setRodando] = useState(false);
  const [res, setRes] = useState<{ gerados: { osCodigo: string; url: string }[]; ignorados: { osCodigo: string; motivo: string }[] } | null>(null);

  const elegiveis = alvos.filter((g) => podeGerarLink(g.status));

  const gerar = async () => {
    const n = Number(dias);
    if (!(n >= 1 && n <= 90)) return showToast('A validade do link deve ficar entre 1 e 90 dias.');
    setRodando(true);
    try {
      const r = await gerarLinksEmLote(alvos.map((g) => ({ id: g.id, osCodigo: g.osCodigo, status: g.status })), n);
      setRes(r);
      if (r.gerados.length) showToast(`${r.gerados.length} link(s) gerado(s)`);
      else showToast('Nenhum link gerado.');
    } catch (e) { showToast((e as Error).message); } finally { setRodando(false); }
  };

  const copiarTodos = async () => {
    if (!res?.gerados.length) return;
    await navigator.clipboard.writeText(res.gerados.map((g) => `${g.osCodigo}: ${g.url}`).join('\n'));
    showToast('Links copiados');
  };

  return (
    <Modal open onClose={res ? onPronto : onClose}>
      <div className="border-b border-ink-100 px-7 py-[22px]">
        <h2 className="text-[19px] font-bold text-ink-900">
          {alvos.length === 1 ? 'Gerar link público' : `Gerar link para ${alvos.length} garantias`}
        </h2>
        <p className="mt-1 text-[13px] text-ink-500">
          O link vai para o cliente responder sobre a renovação.
        </p>
      </div>

      <div className="flex max-h-[420px] flex-col gap-4 overflow-y-auto px-7 py-6">
        {!res && (
          <>
            <TextField
              label="Validade do link (dias)" inputMode="numeric" value={dias}
              onChange={(e) => setDias(e.target.value.replace(/\D/g, '').slice(0, 2))}
              placeholder="30"
            />
            {elegiveis.length !== alvos.length && (
              <p className="rounded-[10px] border border-[#f6e0b0] bg-tag-softWarnBg px-4 py-3 text-[13px] text-tag-softWarnFg">
                {alvos.length - elegiveis.length} de {alvos.length} não vão gerar link: só vale para
                garantias em “A renovar” ou “Aguardando Retorno”.
              </p>
            )}
          </>
        )}

        {res && (
          <>
            {res.gerados.length > 0 && (
              <div>
                <p className="mb-2 text-[13px] font-semibold text-forest-900">{res.gerados.length} link(s) gerado(s)</p>
                <div className="flex flex-col gap-1.5">
                  {res.gerados.map((g) => (
                    <div key={g.osCodigo} className="rounded-[10px] border border-ink-100 bg-ink-50/60 px-3 py-2">
                      <div className="text-[13px] font-semibold text-ink-800">{g.osCodigo}</div>
                      <div className="break-all text-[12px] text-ink-500">{g.url}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {res.ignorados.length > 0 && (
              <div>
                <p className="mb-2 text-[13px] font-semibold text-ink-700">{res.ignorados.length} não gerado(s)</p>
                <div className="flex flex-col gap-1.5">
                  {res.ignorados.map((g) => (
                    <div key={g.osCodigo} className="rounded-[10px] border border-ink-100 px-3 py-2 text-[13px] text-ink-500">
                      <strong className="text-ink-700">{g.osCodigo}</strong> — {g.motivo}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-ink-100 px-7 py-4">
        {!res && <Button variant="secondary" onClick={onClose}>Cancelar</Button>}
        {!res && <Button onClick={gerar} disabled={rodando}>{rodando ? 'Gerando…' : 'Gerar link'}</Button>}
        {res && res.gerados.length > 0 && <Button variant="secondary" onClick={copiarTodos}>Copiar links</Button>}
        {res && <Button onClick={onPronto}>Fechar</Button>}
      </div>
    </Modal>
  );
}

/** Muda o status de várias garantias, com o mesmo comentário. */
function ModalStatusLote({
  alvos, opcoes, onClose, onPronto,
}: { alvos: GarantiaRow[]; opcoes: readonly string[]; onClose: () => void; onPronto: () => void }) {
  const { showToast } = useToast();
  const [novo, setNovo] = useState(opcoes[0] ?? '');
  const [comentario, setComentario] = useState('');
  const [rodando, setRodando] = useState(false);
  const [falhas, setFalhas] = useState<{ osCodigo: string; motivo: string }[] | null>(null);

  const aplicar = async () => {
    if (!novo) return showToast('Escolha o novo status.');
    setRodando(true);
    try {
      const r = await mudarStatusEmLote(alvos.map((g) => ({ id: g.id, osCodigo: g.osCodigo })), novo, comentario);
      if (r.ok.length) showToast(`${r.ok.length} garantia(s) atualizada(s)`);
      if (r.falhas.length) setFalhas(r.falhas);
      else onPronto();
    } catch (e) { showToast((e as Error).message); } finally { setRodando(false); }
  };

  return (
    <Modal open onClose={falhas ? onPronto : onClose}>
      <div className="border-b border-ink-100 px-7 py-[22px]">
        <h2 className="text-[19px] font-bold text-ink-900">Atualizar status de {alvos.length} garantia(s)</h2>
        <p className="mt-1 text-[13px] text-ink-500">A mudança entra no histórico de cada uma.</p>
      </div>

      <div className="flex max-h-[380px] flex-col gap-4 overflow-y-auto px-7 py-6">
        {!falhas && (
          <>
            <SelectField
              label="Novo status" required value={novo} onChange={(e) => setNovo(e.target.value)}
              options={opcoes.map((s) => ({ value: s, label: s }))}
            />
            <TextareaField
              label="Comentário" rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)}
              placeholder="Obrigatório para “Renovação Recusada” e “Não Aplicável”."
            />
          </>
        )}
        {falhas && (
          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink-700">{falhas.length} não mudaram</p>
            <div className="flex flex-col gap-1.5">
              {falhas.map((f) => (
                <div key={f.osCodigo} className="rounded-[10px] border border-ink-100 px-3 py-2 text-[13px] text-ink-500">
                  <strong className="text-ink-700">{f.osCodigo}</strong> — {f.motivo}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-ink-100 px-7 py-4">
        {!falhas && <Button variant="secondary" onClick={onClose}>Cancelar</Button>}
        {!falhas && <Button onClick={aplicar} disabled={rodando}>{rodando ? 'Aplicando…' : 'Aplicar'}</Button>}
        {falhas && <Button onClick={onPronto}>Fechar</Button>}
      </div>
    </Modal>
  );
}
