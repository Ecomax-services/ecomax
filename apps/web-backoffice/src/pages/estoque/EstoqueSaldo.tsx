import { useCallback, useEffect, useMemo, useState } from 'react';
import { TrendingDown, TrendingUp, Clock, Boxes, SlidersHorizontal, Gauge, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/KpiCard';
import { Segmented } from '@/components/ui/Segmented';
import { Modal } from '@/components/ui/Modal';
import { SelectField, SearchInput, TextField, TextareaField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { alertMeta } from '@/data/estoque';
import {
  listBases, listLotes, listMovimentacoes, listProdutos, ajusteEstoque,
  getNiveis, setNivel, replicarNivel,
  getInventarioAberto, iniciarInventario, registrarContagens, fecharInventario, cancelarInventario,
  type StockRow, type MovRow, type Produto, type NivelRow, type Inventario, type InventarioItem,
} from '@/lib/estoque';
import { listCatalogoAtivos } from '@/lib/configuracoes';
import { maskInt } from '@/lib/masks';

type Tab = 'estoque' | 'mov' | 'inv';
const MOTIVOS_FALLBACK = ['Correção de contagem', 'Perda / avaria', 'Vencimento', 'Devolução'];

export function EstoqueSaldo() {
  const { showToast } = useToast();
  const { can } = useAuth();
  const canWrite = can('estoque', 'editar');

  const [bases, setBases] = useState<{ id: string; nome: string }[]>([]);
  const [loc, setLoc] = useState<string>('consolidado');
  const [tab, setTab] = useState<Tab>('estoque');
  const [lotes, setLotes] = useState<StockRow[]>([]);
  const [movs, setMovs] = useState<MovRow[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [motivos, setMotivos] = useState<string[]>(MOTIVOS_FALLBACK);
  const [search, setSearch] = useState('');
  const [catF, setCatF] = useState('todos');
  const [alertF, setAlertF] = useState('todos');
  const [ajuste, setAjuste] = useState(false);
  const [niveis, setNiveis] = useState(false);

  useEffect(() => {
    listBases().then((b) => setBases(b.map((x) => ({ id: x.id, nome: x.nome })))).catch(() => {});
    listProdutos().then((p) => setProdutos(p.filter((x) => x.status === 'Ativo'))).catch(() => {});
    listCatalogoAtivos('motivos_ajuste').then((v) => v.length && setMotivos(v)).catch(() => {});
  }, []);

  const loadLotes = useCallback(async () => {
    try { setLotes(await listLotes(loc === 'consolidado' ? undefined : loc)); }
    catch (e) { showToast((e as Error).message); }
  }, [loc, showToast]);
  useEffect(() => { loadLotes(); }, [loadLotes]);
  useEffect(() => { if (tab === 'mov') listMovimentacoes().then(setMovs).catch((e) => showToast((e as Error).message)); }, [tab, showToast]);

  const cats = useMemo(() => [...new Set(lotes.map((l) => l.cat))].filter((c) => c && c !== '—').sort(), [lotes]);

  const rows = useMemo(
    () => lotes.filter((r) => {
      if (!`${r.prod} ${r.lote}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (catF !== 'todos' && r.cat !== catF) return false;
      if (alertF !== 'todos' && r.alert !== alertF) return false;
      return true;
    }),
    [lotes, search, catF, alertF],
  );

  const kpis = [
    { icon: TrendingDown, tone: 'red' as const, label: 'Abaixo do mínimo', value: lotes.filter((r) => r.alert === 'low').length },
    { icon: TrendingUp, tone: 'amber' as const, label: 'Acima do máximo', value: lotes.filter((r) => r.alert === 'high').length },
    { icon: Clock, tone: 'amber' as const, label: 'Lotes vencendo (60d)', value: lotes.filter((r) => r.alert === 'exp').length },
    { icon: Boxes, tone: 'green' as const, label: 'Total de itens', value: lotes.reduce((s, r) => s + r.qtd, 0) },
  ];

  const locOptions = [{ key: 'consolidado', label: 'Consolidado' }, ...bases.map((b) => ({ key: b.id, label: b.nome }))];
  const th = 'px-4 py-3 text-left text-xs font-bold uppercase text-ink-400';

  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-ink-500">Localização:</span>
          <Segmented options={locOptions} value={loc} onChange={setLoc} />
        </div>
        <div className="flex gap-2">
          {canWrite && loc !== 'consolidado' && <Button variant="secondary" onClick={() => setNiveis(true)}><Gauge className="h-5 w-5" />Níveis</Button>}
          {canWrite && <Button onClick={() => setAjuste(true)}><SlidersHorizontal className="h-5 w-5" />Ajuste manual</Button>}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-4 gap-3.5">{kpis.map((k) => <KpiCard key={k.label} {...k} />)}</div>

      <div className="mb-[18px] flex gap-0.5 border-b border-ink-100">
        {([{ key: 'estoque', label: 'Estoque' }, { key: 'mov', label: 'Movimentações' }, { key: 'inv', label: 'Inventário Físico' }] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn('border-b-2 px-[18px] py-2.5 text-sm transition-colors', tab === t.key ? 'border-forest-accent font-semibold text-forest-900' : 'border-transparent font-medium text-ink-500 hover:text-ink-900')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'estoque' && (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <SearchInput containerClassName="w-[280px]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto ou lote" />
            <SelectField value={catF} onChange={(e) => setCatF(e.target.value)} options={[{ value: 'todos', label: 'Todas as categorias' }, ...cats.map((c) => ({ value: c, label: c }))]} />
            <SelectField
              value={alertF}
              onChange={(e) => setAlertF(e.target.value)}
              options={[
                { value: 'todos', label: 'Todos os alertas' },
                { value: 'low', label: 'Abaixo do mínimo' },
                { value: 'ok', label: 'Normal' },
                { value: 'high', label: 'Acima do máximo' },
                { value: 'exp', label: 'Lote vencendo' },
              ]}
            />
          </div>
          <div className="rounded-2xl border border-ink-100 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="bg-ink-50">
                    <th className={cn(th, 'pl-6')}>Produto</th>
                    <th className={th}>Lote</th>
                    <th className={th}>Validade</th>
                    <th className={cn(th, 'text-center')}>Qtd</th>
                    <th className={cn(th, 'text-center')}>Mín / Máx</th>
                    <th className={th}>Localização</th>
                    <th className={cn(th, 'pr-6')}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-400">Nenhum lote em estoque.</td></tr>}
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-ink-100">
                      <td className="px-4 py-3.5 pl-6 text-sm font-medium text-ink-800">{r.prod}</td>
                      <td className="px-4 py-3.5 text-sm text-ink-700">{r.lote}</td>
                      <td className="px-4 py-3.5 text-sm text-ink-600">{r.val}</td>
                      <td className="px-4 py-3.5 text-center text-[15px] font-bold text-ink-900">{r.qtd}</td>
                      <td className="px-4 py-3.5 text-center text-sm text-ink-500">{r.min} / {r.max || '—'}</td>
                      <td className="px-4 py-3.5 text-sm text-ink-700">{r.loc}</td>
                      <td className="px-4 py-3.5 pr-6"><Badge tone={alertMeta[r.alert].tone}>{alertMeta[r.alert].label}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'mov' && (
        <div className="rounded-2xl border border-ink-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <thead>
                <tr className="bg-ink-50">
                  <th className={cn(th, 'pl-6')}>Data/hora</th>
                  <th className={th}>Tipo</th>
                  <th className={th}>Produto / Qtd</th>
                  <th className={cn(th, 'pr-6')}>Descrição</th>
                </tr>
              </thead>
              <tbody>
                {movs.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-400">Nenhuma movimentação.</td></tr>}
                {movs.map((m) => (
                  <tr key={m.id} className="border-t border-ink-100">
                    <td className="px-4 py-3.5 pl-6 text-sm text-ink-600">{m.dt}</td>
                    <td className="px-4 py-3.5"><Badge tone={m.tone}>{m.tipo}</Badge></td>
                    <td className="px-4 py-3.5 text-sm text-ink-800">{m.prod}</td>
                    <td className="px-4 py-3.5 pr-6 text-sm text-ink-600">{m.descricao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'inv' && (
        loc === 'consolidado' ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center">
            <p className="text-[15px] font-semibold text-ink-800">Inventário físico</p>
            <p className="mt-1 text-[13px] text-ink-400">Selecione uma localização específica acima para iniciar uma contagem física. Ajustes só são aplicados à localização contada.</p>
          </div>
        ) : (
          <InventarioFisicoTab baseId={loc} baseNome={bases.find((b) => b.id === loc)?.nome ?? ''} canWrite={canWrite} onChanged={loadLotes} showToast={showToast} />
        )
      )}

      {/* Modal: ajuste manual */}
      {ajuste && <AjusteModal bases={bases} produtos={produtos} motivos={motivos} defaultBase={loc === 'consolidado' ? '' : loc} onClose={() => setAjuste(false)} onDone={async () => { setAjuste(false); await loadLotes(); if (tab === 'mov') setMovs(await listMovimentacoes()); }} showToast={showToast} />}

      {/* Modal: níveis por localização */}
      {niveis && loc !== 'consolidado' && (
        <NiveisModal
          baseId={loc}
          baseNome={bases.find((b) => b.id === loc)?.nome ?? ''}
          bases={bases}
          onClose={() => setNiveis(false)}
          onDone={async () => { setNiveis(false); await loadLotes(); }}
          showToast={showToast}
        />
      )}
    </>
  );
}

function AjusteModal({
  bases, produtos, motivos, defaultBase, onClose, onDone, showToast,
}: {
  bases: { id: string; nome: string }[]; produtos: Produto[]; motivos: string[]; defaultBase: string;
  onClose: () => void; onDone: () => void | Promise<void>; showToast: (m: string) => void;
}) {
  const [produtoId, setProdutoId] = useState('');
  const [baseId, setBaseId] = useState(defaultBase);
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada');
  const [qtd, setQtd] = useState('');
  const [motivo, setMotivo] = useState(motivos[0] ?? '');
  const [obs, setObs] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (bases.length && !baseId) setBaseId(bases[0].id); }, [bases, baseId]);

  const confirm = async () => {
    if (!produtoId) return showToast('Selecione o produto.');
    if (!baseId) return showToast('Selecione a localização.');
    const q = Number(qtd);
    if (!q || q <= 0) return showToast('Informe a quantidade.');
    setSaving(true);
    try {
      await ajusteEstoque({ produto_id: produtoId, base_id: baseId, delta: tipo === 'saida' ? -q : q, motivo, observacao: obs || undefined });
      showToast('Ajuste registrado · estoque atualizado');
      await onDone();
    } catch (e) { showToast((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} labelledBy="ajuste-title">
      <div className="flex items-center justify-between border-b border-ink-100 px-7 py-[22px]">
        <h2 id="ajuste-title" className="text-[19px] font-bold text-ink-900">Ajuste manual de estoque</h2>
      </div>
      <div className="flex flex-col gap-3.5 px-7 py-6">
        <SelectField label="Produto" required value={produtoId} onChange={(e) => setProdutoId(e.target.value)} options={[{ value: '', label: 'Selecione…' }, ...produtos.map((p) => ({ value: p.id, label: p.name }))]} />
        <SelectField label="Localização" required value={baseId} onChange={(e) => setBaseId(e.target.value)} options={bases.map((b) => ({ value: b.id, label: b.nome }))} />
        <div className="grid grid-cols-2 gap-3.5">
          <SelectField label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as 'entrada' | 'saida')} options={[{ value: 'entrada', label: 'Entrada (+)' }, { value: 'saida', label: 'Saída (−)' }]} />
          <TextField label="Quantidade" inputMode="numeric" value={qtd} onChange={(e) => setQtd(maskInt(e.target.value))} placeholder="0" />
        </div>
        <SelectField label="Motivo" required value={motivo} onChange={(e) => setMotivo(e.target.value)} options={motivos.map((m) => ({ value: m, label: m }))} />
        <TextareaField label="Observação" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Detalhe o ajuste" />
        <p className="flex items-center gap-1.5 text-[13px] text-ink-400">
          <Info className="h-[17px] w-[17px]" />
          O ajuste registra uma movimentação com data/hora e responsável.
        </p>
      </div>
      <div className="flex gap-3 px-7 pb-6">
        <Button variant="secondary" fullWidth onClick={onClose} className="h-[52px]">Cancelar</Button>
        <Button fullWidth onClick={confirm} disabled={saving} className="h-[52px]">{saving ? 'Registrando…' : 'Confirmar ajuste'}</Button>
      </div>
    </Modal>
  );
}

function NiveisModal({
  baseId, baseNome, bases, onClose, onDone, showToast,
}: {
  baseId: string; baseNome: string; bases: { id: string; nome: string }[];
  onClose: () => void; onDone: () => void | Promise<void>; showToast: (m: string) => void;
}) {
  const [rows, setRows] = useState<NivelRow[]>([]);
  const [initial, setInitial] = useState<Record<string, { min: number; max: number | null }>>({});
  const [replicar, setReplicar] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getNiveis(baseId).then((r) => {
      setRows(r);
      setInitial(Object.fromEntries(r.map((x) => [x.produto_id, { min: x.min, max: x.max }])));
    }).catch((e) => showToast((e as Error).message));
  }, [baseId, showToast]);

  const setCell = (id: string, key: 'min' | 'max', v: string) => {
    const digits = maskInt(v);
    const num = digits === '' ? (key === 'max' ? null : 0) : Number(digits);
    setRows((rs) => rs.map((r) => (r.produto_id === id ? { ...r, [key]: num } : r)));
  };

  const outras = bases.filter((b) => b.id !== baseId);
  const filtered = rows.filter((r) => r.nome.toLowerCase().includes(search.toLowerCase()));

  const save = async () => {
    const changed = rows.filter((r) => {
      const i = initial[r.produto_id];
      return !i || i.min !== r.min || i.max !== r.max;
    });
    if (!changed.length && !replicar.length) { onClose(); return; }
    setSaving(true);
    try {
      for (const r of changed) await setNivel(r.produto_id, baseId, r.min, r.max);
      if (replicar.length) {
        for (const r of rows) await replicarNivel(r.produto_id, r.min, r.max, replicar);
      }
      showToast(`Níveis salvos${replicar.length ? ` · replicados para ${replicar.length} base(s)` : ''}`);
      await onDone();
    } catch (e) { showToast((e as Error).message); } finally { setSaving(false); }
  };

  const toggleRep = (id: string) => setReplicar((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Modal open onClose={onClose} labelledBy="niveis-title">
      <div className="border-b border-ink-100 px-7 py-[22px]">
        <h2 id="niveis-title" className="text-[19px] font-bold text-ink-900">Níveis de estoque — {baseNome}</h2>
        <p className="mt-0.5 text-[13px] text-ink-400">Mín/máx por produto nesta localização. Vazio no máx = sem limite.</p>
      </div>
      <div className="max-h-[52vh] overflow-y-auto px-7 py-4">
        <SearchInput containerClassName="mb-3 w-full" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto" />
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-ink-50">
              <th className="px-3 py-2 text-left text-xs font-bold uppercase text-ink-400">Produto</th>
              <th className="px-3 py-2 text-center text-xs font-bold uppercase text-ink-400">Mín</th>
              <th className="px-3 py-2 text-center text-xs font-bold uppercase text-ink-400">Máx</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.produto_id} className="border-t border-ink-100">
                <td className="px-3 py-2 text-sm text-ink-800">
                  {r.nome}
                  {r.custom && <span className="ml-2 rounded-full bg-primary50 px-2 py-0.5 text-[11px] font-semibold text-forest-700">personalizado</span>}
                </td>
                <td className="px-3 py-2 text-center">
                  <input value={r.min} inputMode="numeric" onChange={(e) => setCell(r.produto_id, 'min', e.target.value)} className="w-20 rounded-lg border border-ink-200 px-2 py-1.5 text-center text-sm outline-none" />
                </td>
                <td className="px-3 py-2 text-center">
                  <input value={r.max ?? ''} inputMode="numeric" onChange={(e) => setCell(r.produto_id, 'max', e.target.value)} placeholder="—" className="w-20 rounded-lg border border-ink-200 px-2 py-1.5 text-center text-sm outline-none" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {outras.length > 0 && (
        <div className="border-t border-ink-100 px-7 py-3">
          <p className="mb-1.5 text-[13px] font-semibold text-ink-700">Replicar estes níveis para:</p>
          <div className="flex flex-wrap gap-2">
            {outras.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => toggleRep(b.id)}
                className={cn('rounded-full border px-3 py-1.5 text-[13px] font-semibold', replicar.includes(b.id) ? 'border-forest-accent bg-forest-50 text-forest-900' : 'border-ink-200 bg-white text-ink-600')}
              >
                {b.nome}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-3 border-t border-ink-100 px-7 py-5">
        <Button variant="secondary" fullWidth onClick={onClose} className="h-[52px]">Cancelar</Button>
        <Button fullWidth onClick={save} disabled={saving} className="h-[52px]">{saving ? 'Salvando…' : 'Salvar níveis'}</Button>
      </div>
    </Modal>
  );
}

function InventarioFisicoTab({
  baseId, baseNome, canWrite, onChanged, showToast,
}: {
  baseId: string; baseNome: string; canWrite: boolean; onChanged: () => void | Promise<void>; showToast: (m: string) => void;
}) {
  const [inv, setInv] = useState<Inventario | null>(null);
  const [conta, setConta] = useState<Record<string, string>>({});
  const [prodsBase, setProdsBase] = useState<{ id: string; nome: string }[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const aberto = await getInventarioAberto(baseId);
      setInv(aberto);
      if (aberto) setConta(Object.fromEntries(aberto.itens.map((i) => [i.id, i.qtd_contada != null ? String(i.qtd_contada) : ''])));
      else {
        const lotes = await listLotes(baseId);
        const uniq = Array.from(new Map(lotes.map((l) => [l.produto_id, l.prod])).entries()).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
        setProdsBase(uniq); setSel(new Set(uniq.map((u) => u.id)));
      }
    } catch (e) { showToast((e as Error).message); } finally { setLoading(false); }
  }, [baseId, showToast]);
  useEffect(() => { load(); }, [load]);

  const iniciar = async () => {
    if (sel.size === 0) return showToast('Selecione ao menos um produto.');
    setBusy(true);
    try {
      const todos = sel.size === prodsBase.length;
      const i = await iniciarInventario(baseId, todos ? undefined : [...sel]);
      setInv(i); setConta(Object.fromEntries(i.itens.map((x) => [x.id, '']))); showToast(`${i.codigo} iniciado`);
    } catch (e) { showToast((e as Error).message); } finally { setBusy(false); }
  };
  const toggleSel = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const salvarContagem = async () => {
    if (!inv) return;
    setBusy(true);
    try {
      await registrarContagens(inv.itens.map((i) => ({ id: i.id, qtd_contada: conta[i.id] === '' ? null : Number(conta[i.id]) })));
      showToast('Contagem salva');
      await load();
    } catch (e) { showToast((e as Error).message); } finally { setBusy(false); }
  };

  const fechar = async () => {
    if (!inv) return;
    setBusy(true);
    try {
      await registrarContagens(inv.itens.map((i) => ({ id: i.id, qtd_contada: conta[i.id] === '' ? null : Number(conta[i.id]) })));
      const { ajustes } = await fecharInventario(inv.id);
      showToast(`Inventário fechado · ${ajustes} ajuste(s) aplicado(s) em ${baseNome}`);
      setInv(null); setConta({});
      await onChanged();
    } catch (e) { showToast((e as Error).message); } finally { setBusy(false); }
  };

  const cancelar = async () => {
    if (!inv) return;
    setBusy(true);
    try { await cancelarInventario(inv.id); setInv(null); setConta({}); showToast('Contagem cancelada'); }
    catch (e) { showToast((e as Error).message); } finally { setBusy(false); }
  };

  const dif = (i: InventarioItem) => { const c = conta[i.id]; return c === '' || c == null ? null : Number(c) - i.qtd_sistema; };

  if (loading) return <p className="py-10 text-center text-sm text-ink-400">Carregando…</p>;

  if (!inv) {
    return (
      <div className="rounded-2xl border border-ink-100 bg-white p-6">
        <div className="mb-1 text-center">
          <p className="text-[15px] font-semibold text-ink-800">Inventário físico — {baseNome}</p>
          <p className="mt-1 text-[13px] text-ink-400">
            {canWrite ? 'Selecione os produtos a contar e inicie. O snapshot e os ajustes ficam restritos a esta localização.' : 'Você tem acesso somente de leitura.'}
          </p>
        </div>
        {canWrite && (
          <>
            {prodsBase.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-ink-400">Sem estoque nesta localização para inventariar.</p>
            ) : (
              <>
                <div className="my-4 flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-ink-700">Produtos ({sel.size}/{prodsBase.length})</span>
                  <div className="flex gap-2 text-[13px] font-semibold text-forest-700">
                    <button onClick={() => setSel(new Set(prodsBase.map((p) => p.id)))}>Todos</button>
                    <span className="text-ink-300">·</span>
                    <button onClick={() => setSel(new Set())}>Nenhum</button>
                  </div>
                </div>
                <div className="mb-4 grid max-h-[40vh] grid-cols-2 gap-1.5 overflow-y-auto rounded-[10px] border border-ink-100 p-3">
                  {prodsBase.map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink-800 hover:bg-ink-50">
                      <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggleSel(p.id)} className="h-4 w-4 accent-forest-600" />
                      {p.nome}
                    </label>
                  ))}
                </div>
              </>
            )}
            <div className="flex justify-center">
              <Button onClick={iniciar} disabled={busy || sel.size === 0}>{busy ? 'Iniciando…' : `Iniciar contagem (${sel.size})`}</Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink-100 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-6 py-4">
        <div>
          <h3 className="text-[15px] font-bold text-ink-900">{inv.codigo} · {baseNome}</h3>
          <p className="text-[13px] text-ink-400">Preencha a contagem física; a diferença vira ajuste ao fechar.</p>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={cancelar} disabled={busy}>Cancelar</Button>
            <Button variant="secondary" size="sm" onClick={salvarContagem} disabled={busy}>Salvar contagem</Button>
            <Button size="sm" onClick={fechar} disabled={busy}>Fechar e aplicar</Button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse">
          <thead>
            <tr className="bg-ink-50">
              <th className="px-4 py-2.5 pl-6 text-left text-xs font-bold uppercase text-ink-400">Produto</th>
              <th className="px-4 py-2.5 text-left text-xs font-bold uppercase text-ink-400">Lote</th>
              <th className="px-4 py-2.5 text-center text-xs font-bold uppercase text-ink-400">Sistema</th>
              <th className="px-4 py-2.5 text-center text-xs font-bold uppercase text-ink-400">Contagem</th>
              <th className="px-4 py-2.5 pr-6 text-center text-xs font-bold uppercase text-ink-400">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {inv.itens.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-400">Sem estoque nesta localização.</td></tr>}
            {inv.itens.map((i) => {
              const d = dif(i);
              return (
                <tr key={i.id} className="border-t border-ink-100">
                  <td className="px-4 py-3 pl-6 text-sm text-ink-800">{i.prod}</td>
                  <td className="px-4 py-3 text-sm text-ink-600">{i.lote}</td>
                  <td className="px-4 py-3 text-center text-sm text-ink-700">{i.qtd_sistema}</td>
                  <td className="px-4 py-3 text-center">
                    <input
                      value={conta[i.id] ?? ''}
                      onChange={(e) => setConta((c) => ({ ...c, [i.id]: maskInt(e.target.value) }))}
                      disabled={!canWrite}
                      inputMode="numeric"
                      placeholder="—"
                      className="w-24 rounded-lg border border-ink-200 px-2 py-1.5 text-center text-sm outline-none"
                    />
                  </td>
                  <td className={cn('px-4 py-3 pr-6 text-center text-sm font-semibold', d == null ? 'text-ink-300' : d === 0 ? 'text-forest-700' : d > 0 ? 'text-tag-warnFg' : 'text-danger-bright')}>
                    {d == null ? '—' : d > 0 ? `+${d}` : d}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 border-t border-ink-100 px-6 py-3 text-[13px] text-tag-softWarnFg">
        <Info className="h-[17px] w-[17px]" />
        Ao fechar, cada divergência gera um ajuste de movimentação restrito a {baseNome}.
      </div>
    </div>
  );
}
