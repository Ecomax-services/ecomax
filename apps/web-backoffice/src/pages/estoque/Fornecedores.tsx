import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Star, ChevronsUpDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { Tabs } from '@/components/ui/Tabs';
import { SelectField, SearchInput, TextField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import {
  listFornecedores, createFornecedor, updateFornecedor, setFornecedorAtivo,
  listContatos, addContato, deleteContato, listFornProdutos, vincularProduto, desvincularProduto, listProdutosParaVincular,
  type FornRow, type FornContato, type FornProduto,
} from '@/lib/estoque';
import { maskCNPJ, maskPhone } from '@/lib/masks';

type SortKey = 'razao' | 'aval';
type DetailTab = 'dados' | 'contatos' | 'produtos';
const CATEGORIAS = ['Químicos', 'Desinfetantes', 'EPIs', 'Equipamentos', 'Outros'];
const emptyForm = { razao_social: '', cnpj: '', email: '', telefone: '', categoria: 'Químicos' };

export function Fornecedores() {
  const { showToast } = useToast();
  const { can } = useAuth();
  const canCreate = can('estoque', 'criar');
  const canEdit = can('estoque', 'editar');

  const [list, setList] = useState<FornRow[]>([]);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('todos');
  const [statusF, setStatusF] = useState('todos');
  const [aval, setAval] = useState('todos');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null);
  const [drawer, setDrawer] = useState<{ forn?: FornRow; isNew: boolean } | null>(null);
  const [detail, setDetail] = useState<FornRow | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('dados');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setList(await listFornecedores()); } catch (e) { showToast((e as Error).message); }
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(emptyForm); setDrawer({ isNew: true }); };
  const openEdit = (f: FornRow) => {
    setForm({ razao_social: f.razao, cnpj: f.cnpj === '—' ? '' : f.cnpj, email: f.contato === '—' ? '' : f.contato, telefone: f.telefone, categoria: f.cat });
    setDetail(null);
    setDrawer({ forn: f, isNew: false });
  };

  const rows = useMemo(() => {
    let l = list.filter((f) => {
      if (!`${f.razao} ${f.cnpj} ${f.contato}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (cat !== 'todos' && f.cat !== cat) return false;
      if (statusF !== 'todos' && f.status !== statusF) return false;
      if (aval === 'alta' && f.aval < 4.5) return false;
      if (aval === 'media' && !(f.aval >= 4 && f.aval < 4.5)) return false;
      if (aval === 'baixa' && f.aval >= 4) return false;
      return true;
    });
    if (sort) {
      l = [...l].sort((a, b) => (sort.key === 'aval' ? a.aval - b.aval : a.razao.localeCompare(b.razao)));
      if (sort.dir === 'desc') l.reverse();
    }
    return l;
  }, [list, search, cat, statusF, aval, sort]);

  const toggleSort = (key: SortKey) => setSort((s) => (s?.key === key && s.dir === 'asc' ? { key, dir: 'desc' } : { key, dir: 'asc' }));

  const save = async () => {
    if (!form.razao_social.trim()) return showToast('Informe a razão social.');
    setSaving(true);
    try {
      const payload = { razao_social: form.razao_social.trim(), cnpj: form.cnpj || null, email: form.email || null, telefone: form.telefone || null, categoria: form.categoria };
      if (drawer?.isNew) await createFornecedor(payload);
      else if (drawer?.forn) await updateFornecedor(drawer.forn.id, payload);
      setDrawer(null);
      showToast('Fornecedor salvo');
      await load();
    } catch (e) { showToast((e as Error).message); } finally { setSaving(false); }
  };

  const toggleAtivo = async (f: FornRow) => {
    try {
      await setFornecedorAtivo(f.id, f.status !== 'Ativo');
      setDetail(null);
      showToast(`Fornecedor ${f.status === 'Ativo' ? 'inativado' : 'ativado'}`);
      await load();
    } catch (e) { showToast((e as Error).message); }
  };

  const th = 'px-4 py-3 text-left text-xs font-bold uppercase text-ink-400';
  const sortTh = (key: SortKey, label: string, align: 'left' | 'center' = 'left') => (
    <th onClick={() => toggleSort(key)} className={cn('cursor-pointer select-none whitespace-nowrap px-4 py-3 text-xs font-bold uppercase', align === 'center' ? 'text-center' : 'text-left', sort?.key === key ? 'text-forest-900' : 'text-ink-400')}>
      <span className="inline-flex items-center gap-1">{label}<ChevronsUpDown className="h-3.5 w-3.5" /></span>
    </th>
  );
  const up = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  return (
    <>
      <div className="mb-[18px] flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] font-bold text-ink-900">{rows.length}</span>
          <span className="text-[15px] text-ink-500">fornecedores</span>
        </div>
        {canCreate && <Button onClick={openNew}><Plus className="h-5 w-5" />Novo fornecedor</Button>}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput containerClassName="w-[280px]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar razão social, CNPJ ou contato" />
        <SelectField value={cat} onChange={(e) => setCat(e.target.value)} options={[{ value: 'todos', label: 'Todas as categorias' }, ...CATEGORIAS.map((c) => ({ value: c, label: c }))]} />
        <SelectField value={statusF} onChange={(e) => setStatusF(e.target.value)} options={[{ value: 'todos', label: 'Todos os status' }, { value: 'Ativo', label: 'Ativo' }, { value: 'Inativo', label: 'Inativo' }]} />
        <SelectField value={aval} onChange={(e) => setAval(e.target.value)} options={[{ value: 'todos', label: 'Toda avaliação' }, { value: 'alta', label: '★ 4.5+' }, { value: 'media', label: '★ 4.0–4.5' }, { value: 'baixa', label: '★ < 4.0' }]} />
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr className="bg-ink-50">
                {sortTh('razao', 'Razão social')}
                <th className={th}>CNPJ</th>
                <th className={th}>Categoria</th>
                <th className={th}>Compras 12m</th>
                {sortTh('aval', 'Avaliação', 'center')}
                <th className={cn(th, 'pr-6')}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-400">Nenhum fornecedor.</td></tr>}
              {rows.map((f) => (
                <tr key={f.id} onClick={() => { setDetail(f); setDetailTab('dados'); }} className="cursor-pointer border-t border-ink-100 hover:bg-forest-50/60">
                  <td className="px-4 py-3.5 pl-6 text-sm font-semibold text-ink-800">{f.razao}<div className="text-xs font-normal text-ink-400">{f.contato}</div></td>
                  <td className="px-4 py-3.5 text-sm text-ink-700">{f.cnpj}</td>
                  <td className="px-4 py-3.5 text-sm text-ink-700">{f.cat}</td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-ink-900">{f.compras}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-tag-warnFg"><Star className="h-[17px] w-[17px] fill-[#e8821a] text-[#e8821a]" />{f.aval}</span>
                  </td>
                  <td className="px-4 py-3.5 pr-6"><Badge tone={f.status === 'Ativo' ? 'success' : 'muted'}>{f.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer novo/editar */}
      <Drawer
        open={!!drawer}
        onClose={() => setDrawer(null)}
        width={520}
        title={drawer?.isNew ? 'Novo fornecedor' : 'Editar fornecedor'}
        subtitle="Cadastro do fornecedor"
        footer={
          <>
            <Button variant="secondary" fullWidth onClick={() => setDrawer(null)} className="h-[52px]">Cancelar</Button>
            <Button fullWidth onClick={save} disabled={saving} className="h-[52px]">{saving ? 'Salvando…' : 'Salvar fornecedor'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <TextField label="Razão social" required value={form.razao_social} onChange={(e) => up('razao_social', e.target.value)} placeholder="Razão social" />
          <div className="grid grid-cols-2 gap-3.5">
            <TextField label="CNPJ" inputMode="numeric" value={form.cnpj} onChange={(e) => up('cnpj', maskCNPJ(e.target.value))} placeholder="00.000.000/0000-00" />
            <SelectField label="Categoria" value={form.categoria} onChange={(e) => up('categoria', e.target.value)} options={CATEGORIAS.map((c) => ({ value: c, label: c }))} />
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <TextField label="E-mail" value={form.email} onChange={(e) => up('email', e.target.value)} placeholder="contato@fornecedor.com" />
            <TextField label="Telefone" inputMode="numeric" value={form.telefone} onChange={(e) => up('telefone', maskPhone(e.target.value))} placeholder="(00) 0000-0000" />
          </div>
        </div>
      </Drawer>

      {/* Drawer detalhe */}
      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        width={560}
        title={detail?.razao ?? ''}
        subtitle={detail ? `${detail.cnpj} · ${detail.cat}` : ''}
        headerExtra={
          <Tabs
            tabs={[{ key: 'dados', label: 'Dados cadastrais' }, { key: 'contatos', label: 'Contatos' }, { key: 'produtos', label: 'Produtos fornecidos' }]}
            value={detailTab}
            onChange={setDetailTab}
          />
        }
        footer={
          detail && canEdit ? (
            <>
              <Button variant="secondary" fullWidth onClick={() => toggleAtivo(detail)} className="h-[52px]">{detail.status === 'Ativo' ? 'Inativar' : 'Ativar'}</Button>
              <Button fullWidth onClick={() => openEdit(detail)} className="h-[52px]">Editar</Button>
            </>
          ) : undefined
        }
      >
        {detail && detailTab === 'dados' && (
          <div className="grid grid-cols-2 gap-x-6">
            <Info label="CNPJ" value={detail.cnpj} />
            <Info label="Categoria" value={detail.cat} />
            <Info label="E-mail principal" value={detail.contato} />
            <Info label="Telefone" value={detail.telefone || '—'} />
            <Info label="Compras recebidas" value={detail.compras} />
            <Info label="Status" value={detail.status} />
            <div className="col-span-2 py-3">
              <div className="text-[13px] text-ink-400">Avaliação (automática, do histórico)</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[15px] text-ink-800"><Star className="h-[18px] w-[18px] fill-[#e8821a] text-[#e8821a]" />{detail.aval}</div>
            </div>
          </div>
        )}
        {detail && detailTab === 'contatos' && <ContatosTab fornecedorId={detail.id} canEdit={canEdit} showToast={showToast} />}
        {detail && detailTab === 'produtos' && <ProdutosTab fornecedorId={detail.id} canEdit={canEdit} showToast={showToast} />}
      </Drawer>
    </>
  );
}

function ContatosTab({ fornecedorId, canEdit, showToast }: { fornecedorId: string; canEdit: boolean; showToast: (m: string) => void }) {
  const [contatos, setContatos] = useState<FornContato[]>([]);
  const [form, setForm] = useState({ nome: '', cargo: '', email: '', telefone: '', principal: false });
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => { listContatos(fornecedorId).then(setContatos).catch((e) => showToast((e as Error).message)); }, [fornecedorId, showToast]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.nome.trim()) return showToast('Informe o nome do contato.');
    setSaving(true);
    try {
      await addContato(fornecedorId, { nome: form.nome.trim(), cargo: form.cargo.trim() || null, email: form.email.trim() || null, telefone: form.telefone.trim() || null, principal: form.principal });
      setForm({ nome: '', cargo: '', email: '', telefone: '', principal: false }); setAdding(false); showToast('Contato adicionado'); load();
    } catch (e) { showToast((e as Error).message); } finally { setSaving(false); }
  };
  const remove = async (id: string) => { try { await deleteContato(id); showToast('Contato removido'); load(); } catch (e) { showToast((e as Error).message); } };
  const up = (k: keyof typeof form, v: string | boolean) => setForm((s) => ({ ...s, [k]: v }));

  return (
    <div className="flex flex-col gap-3">
      {contatos.length === 0 && !adding && <p className="py-6 text-center text-[13px] text-ink-400">Nenhum contato cadastrado.</p>}
      {contatos.map((c) => (
        <div key={c.id} className="flex items-start justify-between gap-3 rounded-[10px] border border-ink-100 px-4 py-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-ink-800">{c.nome}{c.principal && <Badge tone="success">Principal</Badge>}</div>
            <div className="text-[13px] text-ink-500">{[c.cargo, c.email, c.telefone].filter(Boolean).join(' · ') || '—'}</div>
          </div>
          {canEdit && <button onClick={() => remove(c.id)} className="text-ink-400 hover:text-danger-bright"><Trash2 className="h-[18px] w-[18px]" /></button>}
        </div>
      ))}
      {canEdit && !adding && <Button variant="secondary" size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Novo contato</Button>}
      {adding && (
        <div className="flex flex-col gap-3 rounded-[10px] border border-forest-accent bg-forest-50/40 p-3.5">
          <TextField label="Nome" required value={form.nome} onChange={(e) => up('nome', e.target.value)} placeholder="Nome do contato" />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Cargo" value={form.cargo} onChange={(e) => up('cargo', e.target.value)} placeholder="Ex.: Vendedor" />
            <TextField label="Telefone" inputMode="numeric" value={form.telefone} onChange={(e) => up('telefone', maskPhone(e.target.value))} placeholder="(00) 0000-0000" />
          </div>
          <TextField label="E-mail" value={form.email} onChange={(e) => up('email', e.target.value)} placeholder="contato@fornecedor.com" />
          <label className="flex items-center gap-2 text-sm text-ink-800"><input type="checkbox" checked={form.principal} onChange={(e) => up('principal', e.target.checked)} className="h-4 w-4 accent-forest-600" />Contato principal</label>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setAdding(false)}>Cancelar</Button>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Adicionar'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProdutosTab({ fornecedorId, canEdit, showToast }: { fornecedorId: string; canEdit: boolean; showToast: (m: string) => void }) {
  const [produtos, setProdutos] = useState<FornProduto[]>([]);
  const [opts, setOpts] = useState<{ id: string; nome: string }[]>([]);
  const [sel, setSel] = useState('');

  const load = useCallback(() => {
    listFornProdutos(fornecedorId).then(setProdutos).catch((e) => showToast((e as Error).message));
    listProdutosParaVincular(fornecedorId).then(setOpts).catch(() => {});
  }, [fornecedorId, showToast]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!sel) return;
    try { await vincularProduto(fornecedorId, sel); setSel(''); showToast('Produto vinculado'); load(); }
    catch (e) { showToast((e as Error).message); }
  };
  const remove = async (id: string) => { try { await desvincularProduto(id); showToast('Produto desvinculado'); load(); } catch (e) { showToast((e as Error).message); } };

  return (
    <div className="flex flex-col gap-3">
      {canEdit && (
        <div className="flex items-end gap-2">
          <SelectField label="Vincular produto" className="flex-1" value={sel} onChange={(e) => setSel(e.target.value)} options={[{ value: '', label: opts.length ? 'Selecione…' : 'Todos já vinculados' }, ...opts.map((o) => ({ value: o.id, label: o.nome }))]} />
          <Button onClick={add} disabled={!sel} className="h-11">Vincular</Button>
        </div>
      )}
      {produtos.length === 0 && <p className="py-6 text-center text-[13px] text-ink-400">Nenhum produto vinculado.</p>}
      {produtos.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-3 rounded-[10px] border border-ink-100 px-4 py-3">
          <div className="text-sm text-ink-800">{p.nome}<span className="ml-2 text-xs text-ink-400">{p.codigo}</span></div>
          {canEdit && <button onClick={() => remove(p.id)} className="text-ink-400 hover:text-danger-bright"><Trash2 className="h-[18px] w-[18px]" /></button>}
        </div>
      ))}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-ink-100 py-3">
      <div className="text-[13px] text-ink-400">{label}</div>
      <div className="mt-0.5 text-[15px] text-ink-800">{value}</div>
    </div>
  );
}
