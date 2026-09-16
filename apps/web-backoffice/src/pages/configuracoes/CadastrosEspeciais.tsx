/**
 * Os dois catálogos com painel próprio de Cadastros Auxiliares.
 *
 * Não são listas de itens soltos como os demais — cada um é uma matriz com o
 * tipo de serviço num eixo, e por isso ganham abas em vez de uma tabela única:
 *
 *   • Planilha por tipo de serviço — as legendas com que o operador preenche
 *     cada ponto de controle. "Consumo parcial" existe em desratização e não
 *     faz sentido em sanitização; por isso a lista é por tipo.
 *   • Produtos por tipo de serviço — os produtos do almoxarifado que já vêm
 *     previstos ao criar uma OS daquele tipo.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Check, ListPlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TextField, TextareaField, SearchInput } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { PALETA_TAGS } from '@/lib/paletaTags';
import { maskDecimal } from '@/lib/masks';
import {
  listCatalogoAtivos,
  listPlanilhaItens, createPlanilhaItem, updatePlanilhaItem,
  contarPlanilhaPorTipo, type PlanilhaItem,
  listProdutosDoTipo, listProdutosParaVincularNoTipo, vincularProdutosAoTipo,
  setQtdPadraoDoTipo, desvincularProdutoDoTipo, contarProdutosPorTipo,
  type TipoServicoProduto,
} from '@/lib/configuracoes';

const th = 'px-4 py-3 text-left text-xs font-bold uppercase text-ink-400';

export interface PermissoesCatalogo {
  canCreate: boolean;
  canEdit: boolean;
  /**
   * Só o painel de produtos usa. Desvincular não é excluir: o produto continua
   * no almoxarifado, ele apenas deixa de vir previsto neste tipo de serviço.
   * As listas de catálogo não têm exclusão — o protótipo dá "Editar" e
   * "Inativar", e a regra é que item com uso registrado se inativa.
   */
  canDesvincular?: boolean;
}

// ============================================================
// Abas de tipo de serviço — compartilhadas pelos dois painéis
// ============================================================
function AbasTipo({
  tipos, sel, onSel, contagens,
}: { tipos: string[]; sel: string; onSel: (t: string) => void; contagens: Record<string, number> }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {tipos.map((t) => (
        <button
          key={t}
          onClick={() => onSel(t)}
          className={cn(
            'flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors',
            t === sel ? 'border-forest-accent bg-forest-50 text-forest-900' : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50',
          )}
        >
          {t}
          <span className={cn('text-xs font-bold', t === sel ? 'text-forest-700' : 'text-ink-400')}>{contagens[t] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Tipos de serviço ativos, que é o eixo dos dois painéis.
 *
 * Vem do catálogo `tipos_servico`, não de uma constante: criar um tipo de
 * serviço passa a abrir automaticamente uma aba nos dois painéis, que é o que
 * faz o catálogo ser fonte da verdade de fato e não só de nome.
 */
function useTiposServico(): { tipos: string[]; carregando: boolean } {
  const { showToast } = useToast();
  const [tipos, setTipos] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    let vivo = true;
    listCatalogoAtivos('tipos_servico')
      .then((t) => { if (vivo) setTipos(t); })
      .catch((e) => showToast((e as Error).message))
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [showToast]);
  return { tipos, carregando };
}

// ============================================================
// Planilha por tipo de serviço
// ============================================================
type PlanilhaDrawer = { item?: PlanilhaItem; isNew: boolean };

export function PainelPlanilha({ perms }: { perms: PermissoesCatalogo }) {
  const { showToast } = useToast();
  const { tipos, carregando } = useTiposServico();
  const [sel, setSel] = useState('');
  const [itens, setItens] = useState<PlanilhaItem[]>([]);
  const [contagens, setContagens] = useState<Record<string, number>>({});
  const [busca, setBusca] = useState('');
  const [drawer, setDrawer] = useState<PlanilhaDrawer | null>(null);
  const [form, setForm] = useState({ nome: '', observacao: '', cor_bg: PALETA_TAGS[0].bg, cor_fg: PALETA_TAGS[0].fg, ativo: true });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { if (!sel && tipos.length) setSel(tipos[0]); }, [tipos, sel]);

  const load = useCallback(async () => {
    if (!sel) return;
    try {
      const [lista, totais] = await Promise.all([listPlanilhaItens(sel), contarPlanilhaPorTipo()]);
      setItens(lista);
      setContagens(totais);
    } catch (e) { showToast((e as Error).message); }
  }, [sel, showToast]);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(
    () => itens.filter((it) => it.nome.toLowerCase().includes(busca.toLowerCase())),
    [itens, busca],
  );

  const abrirNovo = () => {
    setForm({ nome: '', observacao: '', cor_bg: PALETA_TAGS[0].bg, cor_fg: PALETA_TAGS[0].fg, ativo: true });
    setDrawer({ isNew: true });
  };
  const abrirEdicao = (it: PlanilhaItem) => {
    setForm({
      nome: it.nome, observacao: it.observacao ?? '',
      cor_bg: it.cor_bg ?? PALETA_TAGS[0].bg, cor_fg: it.cor_fg ?? PALETA_TAGS[0].fg, ativo: it.ativo,
    });
    setDrawer({ item: it, isNew: false });
  };

  const salvar = async () => {
    if (!form.nome.trim()) return showToast('Informe o nome do status.');
    setSalvando(true);
    try {
      const payload = {
        tipo_servico: sel, nome: form.nome.trim(),
        cor_bg: form.cor_bg, cor_fg: form.cor_fg,
        observacao: form.observacao.trim() || null, ativo: form.ativo,
      };
      if (drawer?.isNew) await createPlanilhaItem(payload);
      else if (drawer?.item) await updatePlanilhaItem(drawer.item.id, payload);
      setDrawer(null);
      showToast('Status salvo');
      await load();
    } catch (e) { showToast((e as Error).message); } finally { setSalvando(false); }
  };

  const alternarAtivo = async (it: PlanilhaItem) => {
    try { await updatePlanilhaItem(it.id, { ativo: !it.ativo }); showToast(it.ativo ? 'Status inativado' : 'Status reativado'); await load(); }
    catch (e) { showToast((e as Error).message); }
  };

  if (carregando) return <p className="text-sm text-ink-400">Carregando tipos de serviço…</p>;
  if (!tipos.length) {
    return (
      <p className="rounded-2xl border border-ink-100 bg-white px-6 py-8 text-center text-sm text-ink-400">
        Nenhum tipo de serviço ativo. Cadastre um em “Tipos de serviço” para montar a planilha dele.
      </p>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-ink-100 bg-white">
        <div className="border-b border-ink-100 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-[17px] font-bold text-ink-900">Planilha por tipo de serviço</h2>
              <p className="mt-0.5 text-[13px] text-ink-400">
                Cada tipo de serviço tem a própria planilha de execução, com status e legendas próprios.
              </p>
            </div>
            {perms.canCreate && <Button onClick={abrirNovo}><Plus className="h-5 w-5" />Novo status</Button>}
          </div>
          <AbasTipo tipos={tipos} sel={sel} onSel={(t) => { setSel(t); setBusca(''); }} contagens={contagens} />
        </div>

        <div className="flex items-center gap-2 border-b border-ink-100 bg-forest-50 px-6 py-3.5 text-[13px] text-forest-800">
          <Check className="h-4 w-4 shrink-0 text-forest-700" />
          <span>Planilha de <strong>{sel}</strong> — usada pelo operador ao preencher cada ponto de controle da OS desse tipo de serviço.</span>
        </div>

        <div className="px-6 py-4">
          <SearchInput containerClassName="w-[280px]" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar status" />
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-ink-50">
              {/* "Nome", e não "Status / legenda" como no protótipo: o nome é a
                  própria etiqueta colorida, e com o rótulo antigo quem abria a
                  tela procurava uma coluna de nome que já estava na frente. */}
              <th className={cn(th, 'pl-6')}>Nome</th>
              <th className={cn(th, 'text-center')}>Em uso</th>
              <th className={cn(th, 'text-center')}>Situação</th>
              <th className={cn(th, 'pr-6 text-right')}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-400">Nenhum status nesta planilha.</td></tr>}
            {rows.map((it) => (
              <tr key={it.id} className="border-t border-ink-100">
                <td className="px-4 py-3.5 pl-6">
                  <span
                    className="inline-block rounded-full px-3 py-1 text-[13px] font-semibold"
                    style={{ background: it.cor_bg ?? '#f2f3f4', color: it.cor_fg ?? '#686f7d' }}
                  >
                    {it.nome}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center text-sm text-ink-600">
                  {it.uso > 0 ? `${it.uso} ${it.uso === 1 ? 'ponto' : 'pontos'}` : '—'}
                </td>
                <td className="px-4 py-3.5 text-center"><Badge tone={it.ativo ? 'success' : 'muted'}>{it.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
                <td className="px-4 py-3.5 pr-6 text-right">
                  {!perms.canEdit && <span className="text-[13px] text-ink-400">—</span>}
                  <div className="inline-flex justify-end gap-2">
                    {perms.canEdit && <BotaoAcao onClick={() => abrirEdicao(it)}>Editar</BotaoAcao>}
                    {perms.canEdit && <BotaoAcao onClick={() => alternarAtivo(it)}>{it.ativo ? 'Inativar' : 'Reativar'}</BotaoAcao>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-ink-100 px-6 py-3.5 text-[13px] text-ink-400">
          Status que saem de uso são inativados: as execuções já registradas com eles continuam legíveis.
        </p>
      </div>

      <Drawer
        open={!!drawer}
        onClose={() => setDrawer(null)}
        title={drawer?.isNew ? 'Novo status' : 'Editar status'}
        subtitle={`Planilha de ${sel}`}
        footer={
          <>
            <Button variant="secondary" fullWidth onClick={() => setDrawer(null)} className="h-[52px]">Cancelar</Button>
            <Button fullWidth onClick={salvar} disabled={salvando} className="h-[52px]">{salvando ? 'Salvando…' : 'Salvar status'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <TextField label="Nome" required value={form.nome} onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))} placeholder="Ex.: Consumo parcial" />
          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink-700">Cor da etiqueta</p>
            <div className="flex flex-wrap gap-2">
              {PALETA_TAGS.map((p) => {
                const ativo = form.cor_bg === p.bg && form.cor_fg === p.fg;
                return (
                  <button
                    key={p.bg}
                    type="button"
                    onClick={() => setForm((s) => ({ ...s, cor_bg: p.bg, cor_fg: p.fg }))}
                    className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold ring-2 ring-offset-1', ativo ? 'ring-forest-accent' : 'ring-transparent')}
                    style={{ background: p.bg, color: p.fg }}
                  >
                    {ativo && <Check className="h-3.5 w-3.5" />}{form.nome || p.nome}
                  </button>
                );
              })}
            </div>
          </div>
          <TextareaField label="Observação" value={form.observacao} onChange={(e) => setForm((s) => ({ ...s, observacao: e.target.value }))} placeholder="Quando usar este status (opcional)" />
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-800">
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm((s) => ({ ...s, ativo: e.target.checked }))} className="h-4 w-4 accent-forest-600" />
            Status ativo
          </label>
          {drawer?.item && drawer.item.uso > 0 && (
            <p className="rounded-[10px] border border-[#f6e0b0] bg-tag-softWarnBg px-4 py-3 text-[13px] text-tag-softWarnFg">
              Já usado em {drawer.item.uso} ponto(s) de execução: pode ser inativado, mas não excluído.
            </p>
          )}
        </div>
      </Drawer>

    </>
  );
}

// ============================================================
// Produtos por tipo de serviço
// ============================================================
export function PainelProdutosPorTipo({ perms }: { perms: PermissoesCatalogo }) {
  const { showToast } = useToast();
  const { tipos, carregando } = useTiposServico();
  const [sel, setSel] = useState('');
  const [linhas, setLinhas] = useState<TipoServicoProduto[]>([]);
  const [contagens, setContagens] = useState<Record<string, number>>({});
  const [picker, setPicker] = useState(false);
  const [confirmDel, setConfirmDel] = useState<TipoServicoProduto | null>(null);

  useEffect(() => { if (!sel && tipos.length) setSel(tipos[0]); }, [tipos, sel]);

  const load = useCallback(async () => {
    if (!sel) return;
    try {
      const [lista, totais] = await Promise.all([listProdutosDoTipo(sel), contarProdutosPorTipo()]);
      setLinhas(lista);
      setContagens(totais);
    } catch (e) { showToast((e as Error).message); }
  }, [sel, showToast]);
  useEffect(() => { load(); }, [load]);

  /**
   * A quantidade é editada direto na célula. O valor só vai para o banco no
   * blur, e não a cada tecla: salvar por caractere gravaria "1" no caminho de
   * quem está digitando "10".
   */
  const gravarQtd = async (linha: TipoServicoProduto, texto: string) => {
    const valor = Number(texto.replace(',', '.'));
    if (!(valor > 0)) { showToast('A quantidade padrão precisa ser maior que zero.'); await load(); return; }
    if (valor === linha.qtd_padrao) return;
    try { await setQtdPadraoDoTipo(linha.id, valor); await load(); }
    catch (e) { showToast((e as Error).message); await load(); }
  };

  const desvincular = async () => {
    if (!confirmDel) return;
    try { await desvincularProdutoDoTipo(confirmDel.id); setConfirmDel(null); showToast('Produto desvinculado'); await load(); }
    catch (e) { showToast((e as Error).message); }
  };

  if (carregando) return <p className="text-sm text-ink-400">Carregando tipos de serviço…</p>;
  if (!tipos.length) {
    return (
      <p className="rounded-2xl border border-ink-100 bg-white px-6 py-8 text-center text-sm text-ink-400">
        Nenhum tipo de serviço ativo. Cadastre um em “Tipos de serviço” para vincular produtos a ele.
      </p>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-ink-100 bg-white">
        <div className="border-b border-ink-100 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-[17px] font-bold text-ink-900">Produtos por tipo de serviço</h2>
              <p className="mt-0.5 text-[13px] text-ink-400">
                Produtos padrão do almoxarifado que já vêm previstos ao criar uma OS desse tipo.
              </p>
            </div>
            {perms.canCreate && <Button onClick={() => setPicker(true)}><ListPlus className="h-5 w-5" />Vincular produtos</Button>}
          </div>
          <AbasTipo tipos={tipos} sel={sel} onSel={setSel} contagens={contagens} />
        </div>

        <div className="flex items-center gap-2 border-b border-ink-100 bg-forest-50 px-6 py-3.5 text-[13px] text-forest-800">
          <Check className="h-4 w-4 shrink-0 text-forest-700" />
          <span>Padrão de <strong>{sel}</strong> — a homologação por cliente continua valendo e filtra o que pode ser aplicado.</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="bg-ink-50">
                <th className={cn(th, 'pl-6')}>Produto</th>
                <th className={th}>Categoria</th>
                <th className={cn(th, 'text-center')}>Qtd padrão</th>
                <th className={cn(th, 'pr-6 text-right')}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-400">Nenhum produto vinculado a este tipo de serviço.</td></tr>
              )}
              {linhas.map((r) => (
                <tr key={r.id} className="border-t border-ink-100">
                  <td className="px-4 py-3.5 pl-6 text-sm font-semibold text-ink-800">{r.produto}</td>
                  <td className="px-4 py-3.5 text-sm text-ink-700">{r.categoria}</td>
                  <td className="px-4 py-3.5 text-center">
                    <input
                      defaultValue={String(r.qtd_padrao)}
                      key={`${r.id}-${r.qtd_padrao}`}
                      disabled={!perms.canEdit}
                      onChange={(e) => { e.target.value = maskDecimal(e.target.value); }}
                      onBlur={(e) => gravarQtd(r, e.target.value)}
                      className="w-[76px] rounded-lg border border-ink-200 px-2.5 py-1.5 text-center text-sm text-ink-800 outline-none focus:border-forest-accent disabled:bg-ink-50"
                    />
                    <span className="ml-1.5 text-[13px] text-ink-400">{r.unidade}</span>
                  </td>
                  <td className="px-4 py-3.5 pr-6 text-right">
                    {perms.canDesvincular
                      ? <BotaoAcao danger onClick={() => setConfirmDel(r)}>Desvincular</BotaoAcao>
                      : <span className="text-[13px] text-ink-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {picker && (
        <SeletorDeProdutos
          tipo={sel}
          onClose={() => setPicker(false)}
          onConfirm={async (ids) => {
            try {
              await vincularProdutosAoTipo(sel, ids);
              setPicker(false);
              showToast(`${ids.length} produto(s) vinculado(s) a ${sel}`);
              await load();
            } catch (e) { showToast((e as Error).message); }
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={desvincular}
        title={confirmDel ? `Desvincular "${confirmDel.produto}"` : ''}
        description="O produto deixa de vir previsto nas próximas OS deste tipo. As OS já emitidas não mudam."
        confirmLabel="Desvincular"
        cancelLabel="Cancelar"
        destructive
      />
    </>
  );
}

function SeletorDeProdutos({
  tipo, onClose, onConfirm,
}: { tipo: string; onClose: () => void; onConfirm: (ids: string[]) => void }) {
  const { showToast } = useToast();
  const [opcoes, setOpcoes] = useState<{ id: string; nome: string; categoria: string; unidade: string }[]>([]);
  const [busca, setBusca] = useState('');
  const [sel, setSel] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    listProdutosParaVincularNoTipo(tipo)
      .then((o) => { if (vivo) setOpcoes(o); })
      .catch((e) => showToast((e as Error).message))
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [tipo, showToast]);

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    if (!q) return opcoes;
    return opcoes.filter((p) => p.nome.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q));
  }, [opcoes, busca]);

  const alternar = (id: string) =>
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Modal open onClose={onClose}>
      <div className="border-b border-ink-100 px-7 py-[22px]">
        <h2 className="text-[19px] font-bold text-ink-900">Vincular produtos</h2>
        <p className="mt-1 text-[13px] text-ink-500">Padrão de {tipo}</p>
      </div>

      <div className="flex flex-col gap-3 px-7 py-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto ou categoria"
            className="w-full rounded-[10px] border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-forest-accent"
          />
        </div>

        {carregando && <p className="py-6 text-center text-sm text-ink-400">Carregando produtos…</p>}
        {!carregando && filtrados.length === 0 && (
          <p className="py-6 text-center text-sm text-ink-400">
            {opcoes.length === 0 ? 'Todos os produtos já estão vinculados a este tipo.' : 'Nenhum produto encontrado.'}
          </p>
        )}

        <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto">
          {filtrados.map((p) => {
            const marcado = sel.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => alternar(p.id)}
                className={cn(
                  'flex items-center gap-3 rounded-[11px] border px-3.5 py-2.5 text-left',
                  marcado ? 'border-forest-accent bg-forest-50' : 'border-ink-100 bg-white hover:bg-ink-50',
                )}
              >
                <span className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2',
                  marcado ? 'border-forest-600 bg-forest-600 text-white' : 'border-ink-300 bg-white',
                )}>
                  {marcado && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink-800">{p.nome}</span>
                  <span className="block text-[13px] text-ink-400">{p.categoria} · {p.unidade}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-ink-100 px-7 py-4">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button disabled={sel.length === 0} onClick={() => onConfirm(sel)}>
          {sel.length === 0 ? 'Vincular' : `Vincular ${sel.length}`}
        </Button>
      </div>
    </Modal>
  );
}

function BotaoAcao({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn('rounded-lg border px-3 py-1.5 text-[13px] font-semibold', danger ? 'border-[#ffb8a8] bg-white text-danger-bright' : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50')}
    >
      {children}
    </button>
  );
}
