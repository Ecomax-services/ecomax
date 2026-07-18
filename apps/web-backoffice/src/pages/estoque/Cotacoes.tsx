import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { SelectField, SearchInput, TextField, FieldLabel } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import {
  listCotacoes, getCotacaoRespostas, createCotacao, registrarResposta, aprovarCotacao,
  listProdutos, listFornecedorOptions,
  type CotacaoRow, type CotacaoResposta, type Produto,
} from '@/lib/estoque';

const STATUS_OPTS = [
  { value: 'todos', label: 'Todos os status' },
  { value: 'aguardando', label: 'Aguardando respostas' },
  { value: 'respondida', label: 'Respondida' },
  { value: 'aprovada', label: 'Aprovada' },
  { value: 'cancelada', label: 'Cancelada' },
];
const emptyForm = { produto_id: '', quantidade: '' };

export function Cotacoes() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = useAuth();
  const canCreate = can('estoque', 'criar');
  const canEdit = can('estoque', 'editar');

  const [list, setList] = useState<CotacaoRow[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [forns, setForns] = useState<{ id: string; nome: string }[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('todos');
  const [drawer, setDrawer] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selForns, setSelForns] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<CotacaoRow | null>(null);

  const load = useCallback(async () => {
    try { setList(await listCotacoes()); } catch (e) { showToast((e as Error).message); }
  }, [showToast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    listProdutos().then((p) => setProdutos(p.filter((x) => x.status === 'Ativo'))).catch(() => {});
    listFornecedorOptions().then(setForns).catch(() => {});
  }, []);

  const rows = useMemo(
    () => list.filter((c) => {
      if (!`${c.cod} ${c.prod}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (status !== 'todos' && c.statusKey !== status) return false;
      return true;
    }),
    [list, search, status],
  );

  const up = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));
  const openNew = () => { setForm(emptyForm); setSelForns([]); setDrawer(true); };
  const toggleForn = (id: string) => setSelForns((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const save = async () => {
    if (!form.produto_id) return showToast('Selecione um produto.');
    if (!form.quantidade.trim()) return showToast('Informe a quantidade.');
    if (!selForns.length) return showToast('Selecione ao menos um fornecedor.');
    setSaving(true);
    try {
      await createCotacao({ produto_id: form.produto_id, quantidade: form.quantidade.trim(), fornecedor_ids: selForns });
      setDrawer(false);
      showToast('Cotação criada · aguardando respostas');
      await load();
    } catch (e) { showToast((e as Error).message); } finally { setSaving(false); }
  };

  const th = 'px-4 py-3 text-left text-xs font-bold uppercase text-ink-400';

  return (
    <>
      <div className="mb-[18px] flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] font-bold text-ink-900">{rows.length}</span>
          <span className="text-[15px] text-ink-500">cotações</span>
        </div>
        {canCreate && <Button onClick={openNew}><Plus className="h-5 w-5" />Nova cotação</Button>}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput containerClassName="w-[280px]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar código ou produto" />
        <SelectField value={status} onChange={(e) => setStatus(e.target.value)} options={STATUS_OPTS} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-ink-50">
              <th className={cn(th, 'pl-6')}>Código</th>
              <th className={th}>Produto</th>
              <th className={th}>Qtd</th>
              <th className={th}>Data</th>
              <th className={cn(th, 'pr-6')}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-400">Nenhuma cotação.</td></tr>}
            {rows.map((c) => (
              <tr key={c.id} onClick={() => setDetail(c)} className="cursor-pointer border-t border-ink-100 hover:bg-forest-50/60">
                <td className="px-4 py-3.5 pl-6 text-sm font-semibold text-forest-900">{c.cod}</td>
                <td className="px-4 py-3.5 text-sm text-ink-800">{c.prod}</td>
                <td className="px-4 py-3.5 text-sm text-ink-700">{c.qtd}</td>
                <td className="px-4 py-3.5 text-sm text-ink-600">{c.date}</td>
                <td className="px-4 py-3.5 pr-6"><Badge tone={c.tone}>{c.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer: nova cotação */}
      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Nova cotação"
        subtitle="Solicitar preços a fornecedores"
        footer={
          <>
            <Button variant="secondary" fullWidth onClick={() => setDrawer(false)} className="h-[52px]">Cancelar</Button>
            <Button fullWidth onClick={save} disabled={saving} className="h-[52px]">{saving ? 'Criando…' : 'Criar cotação'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[2fr_1fr] gap-3.5">
            <SelectField label="Produto" required value={form.produto_id} onChange={(e) => up('produto_id', e.target.value)} options={[{ value: '', label: 'Selecione…' }, ...produtos.map((p) => ({ value: p.id, label: p.name }))]} />
            <TextField label="Qtd" required value={form.quantidade} onChange={(e) => up('quantidade', e.target.value)} placeholder="0" />
          </div>
          <div>
            <FieldLabel>Fornecedores</FieldLabel>
            <div className="flex flex-col gap-1.5 rounded-[10px] border border-ink-100 p-3">
              {forns.length === 0 && <span className="text-[13px] text-ink-400">Nenhum fornecedor ativo.</span>}
              {forns.map((f) => (
                <label key={f.id} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-800">
                  <input type="checkbox" checked={selForns.includes(f.id)} onChange={() => toggleForn(f.id)} className="h-4 w-4 accent-forest-600" />
                  {f.nome}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Drawer>

      {/* Modal: detalhe / respostas */}
      {detail && (
        <CotacaoModal
          cot={detail}
          canEdit={canEdit}
          onClose={() => setDetail(null)}
          showToast={showToast}
          onChanged={load}
          onApproved={async (codigo) => { setDetail(null); await load(); showToast(`Cotação aprovada → ${codigo} gerada em Requisições`); navigate('/estoque/requisicoes'); }}
        />
      )}
    </>
  );
}

function CotacaoModal({
  cot, canEdit, onClose, showToast, onChanged, onApproved,
}: {
  cot: CotacaoRow; canEdit: boolean; onClose: () => void; showToast: (m: string) => void;
  onChanged: () => void | Promise<void>; onApproved: (codigo: string) => void | Promise<void>;
}) {
  const [respostas, setRespostas] = useState<CotacaoResposta[]>([]);
  const [fornId, setFornId] = useState('');
  const [valor, setValor] = useState('');
  const [prazo, setPrazo] = useState('');
  const [cond, setCond] = useState('');
  const [busy, setBusy] = useState(false);
  const closed = cot.statusKey === 'aprovada' || cot.statusKey === 'cancelada';

  const loadResp = useCallback(async () => {
    try { setRespostas(await getCotacaoRespostas(cot.id)); } catch (e) { showToast((e as Error).message); }
  }, [cot.id, showToast]);
  useEffect(() => { loadResp(); }, [loadResp]);

  // fornecedores já vinculados à cotação (podem ainda não ter respondido)
  const pendentes = respostas.filter((r) => r.valor == null);
  useEffect(() => { if (pendentes.length && !fornId) setFornId(pendentes[0].fornecedor_id ?? ''); }, [pendentes, fornId]);

  const registrar = async () => {
    if (!fornId) return showToast('Selecione o fornecedor.');
    const v = Number(valor.replace(',', '.').replace(/[^\d.]/g, ''));
    if (!v || v <= 0) return showToast('Informe um valor válido.');
    setBusy(true);
    try {
      await registrarResposta(cot.id, { fornecedor_id: fornId, valor: v, prazo: prazo.trim(), condicao: cond.trim() });
      setValor(''); setPrazo(''); setCond('');
      showToast('Resposta registrada');
      await loadResp();
      await onChanged();
    } catch (e) { showToast((e as Error).message); } finally { setBusy(false); }
  };

  const aprovar = async () => {
    if (!respostas.some((r) => r.valor != null)) return showToast('Registre ao menos uma resposta antes de aprovar.');
    setBusy(true);
    try { const codigo = await aprovarCotacao(cot.id); await onApproved(codigo); }
    catch (e) { showToast((e as Error).message); setBusy(false); }
  };

  const fornOpts = pendentes.map((r) => ({ value: r.fornecedor_id ?? '', label: r.forn }));

  return (
    <Modal open onClose={onClose}>
      <div className="flex items-center justify-between border-b border-ink-100 px-7 py-[22px]">
        <div>
          <h2 className="text-[19px] font-bold text-ink-900">{cot.cod} · {cot.prod}</h2>
          <p className="mt-0.5 text-[13px] text-ink-400">Qtd: {cot.qtd} · <Badge tone={cot.tone}>{cot.status}</Badge></p>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-7 py-6">
        {/* Comparativo */}
        <div>
          <h3 className="mb-2.5 text-[13px] font-bold uppercase text-ink-400">Comparativo</h3>
          {respostas.length === 0 && <p className="text-[13px] text-ink-400">Nenhum fornecedor vinculado.</p>}
          <div className="grid grid-cols-2 gap-3">
            {respostas.map((r) => (
              <div key={r.id} className={cn('relative rounded-[13px] border p-4', r.best ? 'border-forest-accent bg-primary50' : 'border-ink-100 bg-white')}>
                {r.best && <span className="absolute right-3 top-3 rounded-full bg-forest-accent px-2.5 py-0.5 text-[11px] font-bold text-white">Melhor</span>}
                <div className="mb-2.5 text-sm font-bold text-ink-900">{r.forn}</div>
                <Row label="Valor" value={r.valor == null ? 'Aguardando' : r.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} bold />
                <Row label="Prazo" value={r.prazo} />
                <Row label="Condição" value={r.cond} last />
              </div>
            ))}
          </div>
        </div>

        {/* Registrar resposta */}
        {canEdit && !closed && pendentes.length > 0 && (
          <div className="border-t border-ink-100 pt-5">
            <h3 className="mb-2.5 text-[13px] font-bold uppercase text-ink-400">Registrar resposta</h3>
            <div className="flex flex-col gap-3">
              <SelectField label="Fornecedor" value={fornId} onChange={(e) => setFornId(e.target.value)} options={fornOpts} />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Valor" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="R$ 0,00" />
                <TextField label="Prazo de entrega" value={prazo} onChange={(e) => setPrazo(e.target.value)} placeholder="Ex.: 5 dias" />
              </div>
              <TextField label="Condições" value={cond} onChange={(e) => setCond(e.target.value)} placeholder="Ex.: 30 dias" />
              <Button variant="secondary" onClick={registrar} disabled={busy} className="h-[46px]">Registrar resposta</Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 px-7 pb-6">
        <Button variant="secondary" fullWidth onClick={onClose} className="h-[52px]">Fechar</Button>
        {canEdit && !closed && (
          <Button fullWidth onClick={aprovar} disabled={busy} className="h-[52px]">Aprovar vencedora → requisição</Button>
        )}
      </div>
    </Modal>
  );
}

function Row({ label, value, bold, last }: { label: string; value: string; bold?: boolean; last?: boolean }) {
  return (
    <div className={cn('flex justify-between py-1.5', !last && 'border-b border-ink-100')}>
      <span className="text-[13px] text-ink-500">{label}</span>
      <span className={cn('text-ink-800', bold ? 'text-sm font-bold text-ink-900' : 'text-sm')}>{value}</span>
    </div>
  );
}
