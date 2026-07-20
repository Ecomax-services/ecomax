import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, GitBranch, Upload, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SelectField, SearchInput, TextField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import {
  listRequisicoes, createRequisicao, setRequisicaoStatus, aprovarRequisicao, receberRequisicao, uploadNota,
  listProdutos, listFornecedorOptions, listBaseOptions,
  reqStatusTone, reqStatusText, type ReqRow, type ReqStatus, type Produto,
} from '@/lib/estoque';
import { listGestores } from '@/lib/funcionarios';
import { maskInt } from '@/lib/masks';

const STATUS_OPTS: { value: string; label: string }[] = [
  { value: 'todos', label: 'Todos os status' },
  { value: 'aguardando_aprovacao', label: 'Aguardando aprovação' },
  { value: 'aprovada', label: 'Aprovada' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'recebida', label: 'Recebida' },
  { value: 'recusada', label: 'Recusada' },
  { value: 'cancelada', label: 'Cancelada' },
];
const emptyForm = { produto_id: '', quantidade: '', fornecedor_id: '', aprovador_id: '' };

export function Requisicoes() {
  const { showToast } = useToast();
  const { can } = useAuth();
  const canCreate = can('estoque', 'criar');
  const canEdit = can('estoque', 'editar');

  const [list, setList] = useState<ReqRow[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [forns, setForns] = useState<{ id: string; nome: string }[]>([]);
  const [gestores, setGestores] = useState<{ id: string; nome: string }[]>([]);
  const [bases, setBases] = useState<{ id: string; nome: string }[]>([]);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('todos');
  const [drawer, setDrawer] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [receber, setReceber] = useState<ReqRow | null>(null);
  const [reject, setReject] = useState<ReqRow | null>(null);
  const [cancel, setCancel] = useState<ReqRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setList(await listRequisicoes()); } catch (e) { showToast((e as Error).message); }
  }, [showToast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    listProdutos().then((p) => setProdutos(p.filter((x) => x.status === 'Ativo'))).catch(() => {});
    listFornecedorOptions().then(setForns).catch(() => {});
    listGestores().then(setGestores).catch(() => {});
    listBaseOptions().then(setBases).catch(() => {});
  }, []);

  const rows = useMemo(
    () => list.filter((r) => {
      if (!`${r.cod} ${r.prod} ${r.forn}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusF !== 'todos' && r.status !== statusF) return false;
      return true;
    }),
    [list, search, statusF],
  );

  const up = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));
  const openNew = () => { setForm(emptyForm); setDrawer(true); };

  const save = async () => {
    if (!form.produto_id) return showToast('Selecione um produto.');
    if (!form.quantidade.trim()) return showToast('Informe a quantidade.');
    if (!form.aprovador_id) return showToast('Selecione o aprovador (nível 2).');
    setSaving(true);
    try {
      await createRequisicao({ produto_id: form.produto_id, fornecedor_id: form.fornecedor_id || null, quantidade: form.quantidade.trim(), valor: null, aprovador_id: form.aprovador_id });
      setDrawer(false);
      showToast('Requisição criada · aguardando aprovação');
      await load();
    } catch (e) { showToast((e as Error).message); } finally { setSaving(false); }
  };

  const changeStatus = async (r: ReqRow, status: ReqStatus, msg: string) => {
    setBusy(r.id);
    try { await setRequisicaoStatus(r.id, status); showToast(msg); await load(); }
    catch (e) { showToast((e as Error).message); } finally { setBusy(null); }
  };

  const aprovar = async (r: ReqRow) => {
    setBusy(r.id);
    try { await aprovarRequisicao(r.id); showToast(`${r.cod} aprovada por você (nível 2)`); await load(); }
    catch (e) { showToast((e as Error).message); } finally { setBusy(null); }
  };

  const th = 'px-4 py-3 text-left text-xs font-bold uppercase text-ink-400';

  return (
    <>
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] font-bold text-ink-900">{rows.length}</span>
          <span className="text-[15px] text-ink-500">requisições</span>
        </div>
        {canCreate && <Button onClick={openNew}><Plus className="h-5 w-5" />Nova requisição</Button>}
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-[#f6e0b0] bg-tag-softWarnBg px-[18px] py-3 text-[13px] text-tag-softWarnFg">
        <GitBranch className="h-[18px] w-[18px]" />
        Fluxo: aguardando aprovação → aprovada → enviada → recebida. "Receber" dá entrada no estoque.
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput containerClassName="w-[280px]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar código, produto ou fornecedor" />
        <SelectField value={statusF} onChange={(e) => setStatusF(e.target.value)} options={STATUS_OPTS} />
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr className="bg-ink-50">
                <th className={cn(th, 'pl-6')}>Código</th>
                <th className={th}>Produto</th>
                <th className={th}>Fornecedor</th>
                <th className={th}>Valor</th>
                <th className={th}>Status</th>
                <th className={cn(th, 'pr-6 text-right')}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-400">Nenhuma requisição.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-ink-100">
                  <td className="px-4 py-3.5 pl-6 text-sm font-semibold text-forest-900">{r.cod}</td>
                  <td className="px-4 py-3.5 text-sm text-ink-800">
                    {r.prod}
                    <div className="text-xs text-ink-400">Qtd: {r.qtd} · Aprovador: {r.aprovador}{r.aprovadoEm ? ` · aprovada ${r.aprovadoEm}` : ''}</div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-ink-700">{r.forn}</td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-ink-900">{r.valor}</td>
                  <td className="px-4 py-3.5"><Badge tone={reqStatusTone[r.status]}>{reqStatusText(r.status)}</Badge></td>
                  <td className="px-4 py-3.5 pr-6 text-right">
                    {!canEdit && <span className="text-[13px] text-ink-400">—</span>}
                    <div className={cn('inline-flex flex-wrap justify-end gap-2', busy === r.id && 'opacity-60', !canEdit && 'hidden')}>
                      {r.status === 'aguardando_aprovacao' && (
                        <>
                          <ActionBtn tone="green" disabled={busy === r.id} onClick={() => aprovar(r)}>Aprovar</ActionBtn>
                          <ActionBtn tone="red" disabled={busy === r.id} onClick={() => setReject(r)}>Recusar</ActionBtn>
                        </>
                      )}
                      {r.status === 'aprovada' && (
                        <ActionBtn tone="blue" disabled={busy === r.id} onClick={() => changeStatus(r, 'enviada', `${r.cod} marcada como enviada`)}>Marcar enviada</ActionBtn>
                      )}
                      {r.status === 'enviada' && (
                        <ActionBtn tone="primary" disabled={busy === r.id} onClick={() => setReceber(r)}>Receber</ActionBtn>
                      )}
                      {!['recebida', 'cancelada', 'recusada'].includes(r.status) && (
                        <ActionBtn tone="ghost" disabled={busy === r.id} onClick={() => setCancel(r)}>Cancelar</ActionBtn>
                      )}
                      {['recebida', 'cancelada', 'recusada'].includes(r.status) && <span className="text-[13px] text-ink-300">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer: nova requisição */}
      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Nova requisição de compra"
        subtitle="Solicitação manual"
        footer={
          <>
            <Button variant="secondary" fullWidth onClick={() => setDrawer(false)} className="h-[52px]">Cancelar</Button>
            <Button fullWidth onClick={save} disabled={saving} className="h-[52px]">{saving ? 'Criando…' : 'Criar requisição'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[2fr_1fr] gap-3.5">
            <SelectField label="Produto" required value={form.produto_id} onChange={(e) => up('produto_id', e.target.value)} options={[{ value: '', label: 'Selecione…' }, ...produtos.map((p) => ({ value: p.id, label: p.name }))]} />
            <TextField label="Qtd" required inputMode="numeric" value={form.quantidade} onChange={(e) => up('quantidade', maskInt(e.target.value))} placeholder="0" />
          </div>
          <SelectField label="Fornecedor" value={form.fornecedor_id} onChange={(e) => up('fornecedor_id', e.target.value)} options={[{ value: '', label: 'A definir' }, ...forns.map((f) => ({ value: f.id, label: f.nome }))]} />
          <SelectField label="Aprovador (nível 2)" required value={form.aprovador_id} onChange={(e) => up('aprovador_id', e.target.value)} options={[{ value: '', label: 'Selecione…' }, ...gestores.map((g) => ({ value: g.id, label: g.nome }))]} />
          <p className="text-[13px] text-ink-400">Fluxo em 2 níveis: você (solicitante) cria e o <b>aprovador</b> designado libera. Segue até o recebimento.</p>
        </div>
      </Drawer>

      {/* Modal: receber */}
      {receber && <ReceberModal req={receber} bases={bases} onClose={() => setReceber(null)} onDone={async () => { setReceber(null); await load(); }} showToast={showToast} />}

      {/* Recusar */}
      <ConfirmDialog
        open={!!reject}
        onClose={() => setReject(null)}
        onConfirm={() => { if (reject) changeStatus(reject, 'recusada', `${reject.cod} recusada`); setReject(null); }}
        title={reject ? `Recusar ${reject.cod}` : ''}
        description="A recusa encerra o fluxo desta requisição."
        confirmLabel="Recusar requisição"
        cancelLabel="Voltar"
        destructive
      />

      {/* Cancelar */}
      <ConfirmDialog
        open={!!cancel}
        onClose={() => setCancel(null)}
        onConfirm={() => { if (cancel) changeStatus(cancel, 'cancelada', `${cancel.cod} cancelada`); setCancel(null); }}
        title={cancel ? `Cancelar ${cancel.cod}` : ''}
        description="O cancelamento encerra o fluxo desta requisição."
        confirmLabel="Cancelar requisição"
        cancelLabel="Voltar"
        destructive
      />
    </>
  );
}

function ReceberModal({
  req, bases, onClose, onDone, showToast,
}: {
  req: ReqRow; bases: { id: string; nome: string }[]; onClose: () => void; onDone: () => void | Promise<void>; showToast: (m: string) => void;
}) {
  const [baseId, setBaseId] = useState('');
  const [qtd, setQtd] = useState(String(req.qtd).replace(/\D/g, ''));
  const [lote, setLote] = useState('');
  const [validade, setValidade] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (bases.length && !baseId) setBaseId(bases[0].id); }, [bases, baseId]);

  // validade: aceita "mm/aaaa" → ISO (primeiro dia do mês)
  const m = validade.match(/^(\d{2})\/(\d{4})$/);
  const validadeISO = m ? `${m[2]}-${m[1]}-01` : null;

  const confirm = async () => {
    if (!baseId) return showToast('Selecione a base de destino.');
    if (!lote.trim()) return showToast('Informe o lote recebido.');
    const q = Number(qtd);
    if (!q || q <= 0) return showToast('Informe a quantidade recebida.');
    if (validade && !validadeISO) return showToast('Validade inválida (use mm/aaaa).');
    if (!file) return showToast('Anexe a nota fiscal (obrigatória).');
    setSaving(true);
    try {
      const notaUrl = await uploadNota(file, req.id);
      await receberRequisicao({ id: req.id, produto_id: req.produto_id, base_id: baseId, lote: lote.trim(), validade: validadeISO, quantidade: q, notaUrl });
      showToast('Recebimento confirmado · estoque atualizado');
      await onDone();
    } catch (e) { showToast((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose}>
      <div className="flex items-center justify-between border-b border-ink-100 px-7 py-[22px]">
        <div>
          <h2 className="text-[19px] font-bold text-ink-900">Receber requisição</h2>
          <p className="mt-0.5 text-[13px] text-ink-400">{req.cod} · {req.prod}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3.5 px-7 py-6">
        <SelectField label="Base de destino" value={baseId} onChange={(e) => setBaseId(e.target.value)} options={bases.map((b) => ({ value: b.id, label: b.nome }))} />
        <div className="grid grid-cols-2 gap-3.5">
          <TextField label="Quantidade recebida" inputMode="numeric" value={qtd} onChange={(e) => setQtd(maskInt(e.target.value))} placeholder="0" />
          <TextField label="Lote" value={lote} onChange={(e) => setLote(e.target.value)} placeholder="Lote recebido" />
        </div>
        <TextField label="Validade" value={validade} onChange={(e) => setValidade(e.target.value)} placeholder="mm/aaaa" />
        <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-2 rounded-[9px] border border-dashed border-ink-200 bg-ink-50 px-3.5 py-3 text-[13px] font-semibold text-ink-700">
          {file ? <Check className="h-[18px] w-[18px] text-forest-600" /> : <Upload className="h-[18px] w-[18px]" />}
          {file ? file.name : 'Anexar NF (obrigatória)'}
        </button>
      </div>
      <div className="flex gap-3 px-7 pb-6">
        <Button variant="secondary" fullWidth onClick={onClose} className="h-[52px]">Cancelar</Button>
        <Button fullWidth onClick={confirm} disabled={saving} className="h-[52px]">{saving ? 'Confirmando…' : 'Confirmar recebimento'}</Button>
      </div>
    </Modal>
  );
}

function ActionBtn({ tone, children, onClick, disabled }: { tone: 'green' | 'red' | 'blue' | 'primary' | 'ghost'; children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  const map: Record<string, string> = {
    green: 'bg-greenSoft text-forest-900',
    red: 'bg-[#fff2ee] text-danger-bright',
    blue: 'bg-tag-infoBg text-[#26408a]',
    primary: 'bg-forest-600 text-white',
    ghost: 'border border-ink-200 bg-white text-ink-500',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={cn('rounded-lg px-3.5 py-2 text-[13px] font-semibold disabled:opacity-50', map[tone])}>
      {children}
    </button>
  );
}
