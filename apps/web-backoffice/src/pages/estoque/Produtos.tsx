import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  TrendingDown,
  HelpCircle,
  ReceiptText,
  ClipboardList,
  Plus,
  MoreVertical,
  Pencil,
  History,
  ToggleRight,
  ChevronsUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/KpiCard';
import { Drawer } from '@/components/ui/Drawer';
import { SelectField, SearchInput, TextField, TextareaField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { alertMeta } from '@/data/estoque';
import {
  listProdutos, getProdutoKpis, createProduto, updateProduto, setProdutoAtivo, codigoExists,
  listFornecedorOptions, type Produto, type ProdutoKpis,
} from '@/lib/estoque';
import { listCatalogoAtivos } from '@/lib/configuracoes';
import { maskInt } from '@/lib/masks';

type SortKey = 'name' | 'cat' | 'stock' | 'status';
// Fallbacks caso o catálogo ainda não tenha sido carregado.
const UNIDADES_FALLBACK = ['L', 'mL', 'kg', 'g', 'un', 'par'];
const CATEGORIAS_FALLBACK = ['Inseticida', 'Raticida', 'Larvicida', 'Desinfetante', 'Equipamento', 'EPI'];

const emptyForm = { nome: '', codigo: '', categoria: 'Inseticida', unidade: 'un', min: '', max: '', fornecedor_id: '' };

export function Produtos() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = useAuth();
  const canCreate = can('estoque', 'criar');
  const canEdit = can('estoque', 'editar');

  const [products, setProducts] = useState<Produto[]>([]);
  const [kpiData, setKpiData] = useState<ProdutoKpis>({ ativos: 0, abaixoMin: 0, semForn: 0, cotacoesAbertas: 0, reqAprovar: 0 });
  const [fornOpts, setFornOpts] = useState<{ id: string; nome: string }[]>([]);
  const [categorias, setCategorias] = useState<string[]>(CATEGORIAS_FALLBACK);
  const [unidades, setUnidades] = useState<string[]>(UNIDADES_FALLBACK);

  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('todos');
  const [forn, setForn] = useState('todos');
  const [status, setStatus] = useState('todos');
  const [faixa, setFaixa] = useState('todos');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ product?: Produto; isNew: boolean } | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [codeErr, setCodeErr] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, k] = await Promise.all([listProdutos(), getProdutoKpis()]);
      setProducts(p);
      setKpiData(k);
    } catch (e) {
      showToast((e as Error).message);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { listFornecedorOptions().then(setFornOpts); }, []);
  useEffect(() => {
    listCatalogoAtivos('categorias_produto').then((v) => v.length && setCategorias(v)).catch(() => {});
    listCatalogoAtivos('unidades').then((v) => v.length && setUnidades(v)).catch(() => {});
  }, []);

  const openDrawer = (d: { product?: Produto; isNew: boolean }) => {
    setCodeErr('');
    setForm(
      d.product
        ? { nome: d.product.name, codigo: d.product.cod, categoria: d.product.cat, unidade: d.product.un, min: String(d.product.min), max: String(d.product.max || ''), fornecedor_id: d.product.fornecedor_id ?? '' }
        : emptyForm,
    );
    setDrawer(d);
  };

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    let list = products.filter((p) => {
      if (!`${p.name} ${p.cat} ${p.forn} ${p.cod}`.toLowerCase().includes(q)) return false;
      if (cat !== 'todos' && p.cat !== cat) return false;
      if (forn !== 'todos' && p.forn !== forn) return false;
      if (status !== 'todos' && p.status !== status) return false;
      if (faixa !== 'todos' && p.alert !== faixa) return false;
      return true;
    });
    if (sort) {
      list = [...list].sort((a, b) => {
        if (sort.key === 'stock') return a.stock - b.stock;
        const x = String(a[sort.key]).toLowerCase();
        const y = String(b[sort.key]).toLowerCase();
        return x > y ? 1 : x < y ? -1 : 0;
      });
      if (sort.dir === 'desc') list.reverse();
    }
    return list;
  }, [products, search, cat, forn, status, faixa, sort]);

  const kpis = [
    { icon: Boxes, tone: 'green' as const, label: 'Produtos ativos', value: kpiData.ativos },
    { icon: TrendingDown, tone: 'red' as const, label: 'Abaixo do mínimo', value: kpiData.abaixoMin },
    { icon: HelpCircle, tone: 'amber' as const, label: 'Sem fornecedor', value: kpiData.semForn },
    { icon: ReceiptText, tone: 'blue' as const, label: 'Cotações abertas', value: kpiData.cotacoesAbertas },
    { icon: ClipboardList, tone: 'amber' as const, label: 'Requisições p/ aprovar', value: kpiData.reqAprovar },
  ];

  const catOptions = [{ value: 'todos', label: 'Todas as categorias' }, ...[...new Set(products.map((p) => p.cat))].map((c) => ({ value: c, label: c }))];
  const fornFilterOptions = [{ value: 'todos', label: 'Todos os fornecedores' }, ...[...new Set(products.map((p) => p.forn).filter((f) => f !== '—'))].map((f) => ({ value: f, label: f }))];

  const toggleSort = (key: SortKey) => setSort((s) => (s?.key === key && s.dir === 'asc' ? { key, dir: 'desc' } : { key, dir: 'asc' }));

  const toggleAtivo = async (p: Produto) => {
    setMenu(null);
    try {
      await setProdutoAtivo(p.id, p.status !== 'Ativo');
      showToast(`${p.name} ${p.status === 'Ativo' ? 'inativado' : 'ativado'} · auditado`);
      await load();
    } catch (e) { showToast((e as Error).message); }
  };

  const save = async () => {
    if (!form.nome.trim() || !form.codigo.trim()) return showToast('Informe nome e código.');
    setSaving(true);
    try {
      const payload = {
        codigo: form.codigo.trim(), nome: form.nome.trim(), categoria: form.categoria, unidade: form.unidade,
        estoque_min: Number(form.min) || 0, estoque_max: form.max ? Number(form.max) : null, fornecedor_id: form.fornecedor_id || null,
      };
      if (drawer?.isNew) {
        if (await codigoExists(payload.codigo)) { setSaving(false); return setCodeErr('Código já cadastrado.'); }
        await createProduto(payload);
      } else if (drawer?.product) {
        await updateProduto(drawer.product.id, payload);
      }
      setDrawer(null);
      showToast('Produto salvo');
      await load();
    } catch (e) { showToast((e as Error).message); } finally { setSaving(false); }
  };

  const th = 'px-4 py-3 text-left text-xs font-bold uppercase text-ink-400';
  const sortTh = (key: SortKey, label: string, align: 'left' | 'center' = 'left') => (
    <th onClick={() => toggleSort(key)} className={cn('cursor-pointer select-none whitespace-nowrap px-4 py-3 text-xs font-bold uppercase', align === 'center' ? 'text-center' : 'text-left', sort?.key === key ? 'text-forest-900' : 'text-ink-400')}>
      <span className="inline-flex items-center gap-1">{label}<ChevronsUpDown className="h-3.5 w-3.5" /></span>
    </th>
  );

  const up = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const canSave = drawer?.isNew ? canCreate : canEdit;

  return (
    <>
      <div className="mb-6 grid grid-cols-5 gap-3.5">
        {kpis.map((k) => <KpiCard key={k.label} {...k} layout="stack" />)}
      </div>

      <div className="mb-[18px] flex items-center justify-between gap-5">
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] font-bold text-ink-900">{rows.length}</span>
          <span className="text-[15px] text-ink-500">produtos cadastrados</span>
        </div>
        <div className="flex gap-3">
          <SearchInput containerClassName="w-[300px]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto, categoria ou fornecedor" />
          {canCreate && (
            <Button className="whitespace-nowrap" onClick={() => openDrawer({ isNew: true })}><Plus className="h-5 w-5" />Novo produto</Button>
          )}
        </div>
      </div>

      <div className="mb-[18px] flex flex-wrap gap-3">
        <SelectField className="min-w-[170px]" value={cat} onChange={(e) => setCat(e.target.value)} options={catOptions} />
        <SelectField className="min-w-[190px]" value={forn} onChange={(e) => setForn(e.target.value)} options={fornFilterOptions} />
        <SelectField value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'todos', label: 'Todos os status' }, { value: 'Ativo', label: 'Ativo' }, { value: 'Inativo', label: 'Inativo' }]} />
        <SelectField value={faixa} onChange={(e) => setFaixa(e.target.value)} options={[{ value: 'todos', label: 'Toda faixa de estoque' }, { value: 'low', label: 'Abaixo do mínimo' }, { value: 'ok', label: 'Normal' }, { value: 'high', label: 'Acima do máximo' }]} />
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse">
            <thead>
              <tr className="bg-ink-50">
                {sortTh('name', 'Produto')}
                {sortTh('cat', 'Categoria')}
                {sortTh('stock', 'Estoque', 'center')}
                <th className={cn(th, 'text-center')}>Mín / Máx</th>
                <th className={th}>Fornecedor</th>
                <th className={th}>Alerta</th>
                {sortTh('status', 'Status')}
                <th className={cn(th, 'pr-6 text-right')}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-ink-400">Nenhum produto.</td></tr>
              )}
              {rows.map((p) => (
                <tr key={p.id} onClick={() => openDrawer({ product: p, isNew: false })} className="cursor-pointer border-t border-ink-100 hover:bg-forest-50/60">
                  <td className="px-4 py-3.5 pl-6">
                    <div className="text-sm font-semibold text-ink-800">{p.name}</div>
                    <div className="text-xs text-ink-400">{p.cod} · {p.un}</div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-ink-700">{p.cat}</td>
                  <td className="px-4 py-3.5 text-center text-[15px] font-bold text-ink-900">{p.stock}</td>
                  <td className="px-4 py-3.5 text-center text-sm text-ink-500">{p.min} / {p.max || '—'}</td>
                  <td className={cn('px-4 py-3.5 text-sm', p.noForn ? 'font-semibold text-tag-warnFg' : 'text-ink-700')}>{p.forn}</td>
                  <td className="px-4 py-3.5"><Badge tone={alertMeta[p.alert].tone}>{alertMeta[p.alert].label}</Badge></td>
                  <td className="px-4 py-3.5"><Badge tone={p.status === 'Ativo' ? 'success' : 'muted'}>{p.status}</Badge></td>
                  <td className="relative px-4 py-3.5 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setMenu((m) => (m === p.id ? null : p.id))} className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border border-ink-100 bg-white text-ink-500 hover:bg-ink-100">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    {menu === p.id && (
                      <div className="absolute right-6 top-[52px] z-50 w-[230px] overflow-hidden rounded-xl border border-ink-100 bg-white text-left shadow-modal">
                        {canEdit && <MenuItem icon={Pencil} onClick={() => { openDrawer({ product: p, isNew: false }); setMenu(null); }}>Editar</MenuItem>}
                        <MenuItem icon={History} onClick={() => { setMenu(null); navigate('/estoque/saldo'); }}>Ver histórico de mov.</MenuItem>
                        {canCreate && <MenuItem icon={ReceiptText} onClick={() => { setMenu(null); navigate('/estoque/cotacoes'); }}>Solicitar cotação</MenuItem>}
                        {canEdit && <MenuItem icon={ToggleRight} border onClick={() => toggleAtivo(p)}>{p.status === 'Ativo' ? 'Inativar' : 'Ativar'}</MenuItem>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer
        open={!!drawer}
        onClose={() => setDrawer(null)}
        width={520}
        title={drawer?.isNew ? 'Novo produto' : 'Editar produto'}
        subtitle="Cadastro mestre de produto"
        footer={
          <>
            <Button variant="secondary" fullWidth onClick={() => setDrawer(null)} className="h-[52px]">{canSave ? 'Cancelar' : 'Fechar'}</Button>
            {canSave && <Button fullWidth onClick={save} disabled={saving} className="h-[52px]">{saving ? 'Salvando…' : 'Salvar produto'}</Button>}
          </>
        }
      >
        {drawer && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-[2fr_1fr] gap-4">
              <TextField label="Nome" required value={form.nome} onChange={(e) => up('nome', e.target.value)} placeholder="Nome do produto" />
              <TextField label="Código" required value={form.codigo} onChange={(e) => { up('codigo', e.target.value); setCodeErr(''); }} placeholder="COD-0000" error={codeErr || undefined} disabled={!drawer.isNew} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Categoria" value={form.categoria} onChange={(e) => up('categoria', e.target.value)} options={categorias.map((c) => ({ value: c, label: c }))} />
              <SelectField label="Unidade" value={form.unidade} onChange={(e) => up('unidade', e.target.value)} options={unidades.map((u) => ({ value: u, label: u }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="Estoque mínimo" inputMode="numeric" value={form.min} onChange={(e) => up('min', maskInt(e.target.value))} placeholder="0" />
              <TextField label="Estoque máximo" inputMode="numeric" value={form.max} onChange={(e) => up('max', maskInt(e.target.value))} placeholder="0" />
            </div>
            <SelectField label="Fornecedor principal" value={form.fornecedor_id} onChange={(e) => up('fornecedor_id', e.target.value)} options={[{ value: '', label: 'Sem fornecedor' }, ...fornOpts.map((f) => ({ value: f.id, label: f.nome }))]} />
            <TextareaField label="Observações" placeholder="Notas internas" />
          </div>
        )}
      </Drawer>
    </>
  );
}

function MenuItem({ icon: Icon, children, onClick, border }: { icon: typeof Pencil; children: React.ReactNode; onClick: () => void; border?: boolean }) {
  return (
    <button onClick={onClick} className={cn('flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink-800 hover:bg-forest-50', border && 'border-t border-ink-100')}>
      <Icon className="h-[19px] w-[19px] text-ink-500" />
      {children}
    </button>
  );
}
