import { useMemo, useState } from 'react';
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
import { SelectField, SearchInput, TextField, TextareaField, FieldLabel } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { PRODUCTS, alertMeta, distinctValues, type Produto } from '@/data/estoque';

type SortKey = 'name' | 'cat' | 'stock' | 'status';

export function Produtos() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = useAuth();
  const canCreate = can('estoque', 'criar');
  const canEdit = can('estoque', 'editar');
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('todos');
  const [forn, setForn] = useState('todos');
  const [status, setStatus] = useState('todos');
  const [faixa, setFaixa] = useState('todos');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, 'Ativo' | 'Inativo'>>({});
  const [drawer, setDrawer] = useState<{ product?: Produto; isNew: boolean } | null>(null);

  const effStatus = (p: Produto) => overrides[p.cod] ?? p.status;

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    let list = PRODUCTS.map((p) => ({ ...p, status: effStatus(p) })).filter((p) => {
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
  }, [search, cat, forn, status, faixa, sort, overrides]);

  const kpis = [
    { icon: Boxes, tone: 'green' as const, label: 'Produtos ativos', value: PRODUCTS.filter((p) => effStatus(p) === 'Ativo').length },
    { icon: TrendingDown, tone: 'red' as const, label: 'Abaixo do mínimo', value: PRODUCTS.filter((p) => p.alert === 'low' && effStatus(p) === 'Ativo').length },
    { icon: HelpCircle, tone: 'amber' as const, label: 'Sem fornecedor', value: PRODUCTS.filter((p) => p.noForn).length },
    { icon: ReceiptText, tone: 'blue' as const, label: 'Cotações abertas', value: 3 },
    { icon: ClipboardList, tone: 'amber' as const, label: 'Requisições p/ aprovar', value: 2 },
  ];

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s?.key === key && s.dir === 'asc' ? { key, dir: 'desc' } : { key, dir: 'asc' }));

  const th = 'px-4 py-3 text-left text-xs font-bold uppercase text-ink-400';
  const sortTh = (key: SortKey, label: string, align: 'left' | 'center' = 'left') => (
    <th
      onClick={() => toggleSort(key)}
      className={cn(
        'cursor-pointer select-none whitespace-nowrap px-4 py-3 text-xs font-bold uppercase',
        align === 'center' ? 'text-center' : 'text-left',
        sort?.key === key ? 'text-forest-900' : 'text-ink-400',
      )}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ChevronsUpDown className="h-3.5 w-3.5" />
      </span>
    </th>
  );

  return (
    <>
      <div className="mb-6 grid grid-cols-5 gap-3.5">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} layout="stack" />
        ))}
      </div>

      <div className="mb-[18px] flex items-center justify-between gap-5">
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] font-bold text-ink-900">{rows.length}</span>
          <span className="text-[15px] text-ink-500">produtos cadastrados</span>
        </div>
        <div className="flex gap-3">
          <SearchInput
            containerClassName="w-[300px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto, categoria ou fornecedor"
          />
          {canCreate && (
            <Button className="whitespace-nowrap" onClick={() => setDrawer({ isNew: true })}>
              <Plus className="h-5 w-5" />
              Novo produto
            </Button>
          )}
        </div>
      </div>

      <div className="mb-[18px] flex flex-wrap gap-3">
        <SelectField className="min-w-[170px]" value={cat} onChange={(e) => setCat(e.target.value)} options={distinctValues('cat', 'Todas as categorias')} />
        <SelectField className="min-w-[190px]" value={forn} onChange={(e) => setForn(e.target.value)} options={distinctValues('forn', 'Todos os fornecedores')} />
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
              {rows.map((p) => (
                <tr key={p.cod} onClick={() => setDrawer({ product: p, isNew: false })} className="cursor-pointer border-t border-ink-100 hover:bg-forest-50/60">
                  <td className="px-4 py-3.5 pl-6">
                    <div className="text-sm font-semibold text-ink-800">{p.name}</div>
                    <div className="text-xs text-ink-400">{p.cod} · {p.un}</div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-ink-700">{p.cat}</td>
                  <td className="px-4 py-3.5 text-center text-[15px] font-bold text-ink-900">{p.stock}</td>
                  <td className="px-4 py-3.5 text-center text-sm text-ink-500">{p.min} / {p.max}</td>
                  <td className={cn('px-4 py-3.5 text-sm', p.noForn ? 'font-semibold text-tag-warnFg' : 'text-ink-700')}>{p.forn}</td>
                  <td className="px-4 py-3.5"><Badge tone={alertMeta[p.alert].tone}>{alertMeta[p.alert].label}</Badge></td>
                  <td className="px-4 py-3.5"><Badge tone={p.status === 'Ativo' ? 'success' : 'muted'}>{p.status}</Badge></td>
                  <td className="relative px-4 py-3.5 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setMenu((m) => (m === p.cod ? null : p.cod))}
                      className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border border-ink-100 bg-white text-ink-500 hover:bg-ink-100"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    {menu === p.cod && (
                      <div className="absolute right-6 top-[52px] z-50 w-[230px] overflow-hidden rounded-xl border border-ink-100 bg-white text-left shadow-modal">
                        {canEdit && (
                          <MenuItem icon={Pencil} onClick={() => { setDrawer({ product: p, isNew: false }); setMenu(null); }}>Editar</MenuItem>
                        )}
                        <MenuItem icon={History} onClick={() => { setMenu(null); navigate('/estoque/saldo'); showToast(`Histórico de movimentações de ${p.name}`); }}>Ver histórico de mov.</MenuItem>
                        {canCreate && (
                          <MenuItem icon={ReceiptText} onClick={() => { setMenu(null); navigate('/estoque/cotacoes'); }}>Solicitar cotação</MenuItem>
                        )}
                        {canEdit && (
                          <MenuItem
                            icon={ToggleRight}
                            border
                            onClick={() => {
                              const ns = p.status === 'Ativo' ? 'Inativo' : 'Ativo';
                              setOverrides((o) => ({ ...o, [p.cod]: ns }));
                              setMenu(null);
                              showToast(`${p.name} ${ns === 'Ativo' ? 'ativado' : 'inativado'} · auditado`);
                            }}
                          >
                            {p.status === 'Ativo' ? 'Inativar' : 'Ativar'}
                          </MenuItem>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer de produto */}
      <Drawer
        open={!!drawer}
        onClose={() => setDrawer(null)}
        width={520}
        title={drawer?.isNew ? 'Novo produto' : 'Editar produto'}
        subtitle="Cadastro mestre de produto"
        footer={
          <>
            <Button variant="secondary" fullWidth onClick={() => setDrawer(null)} className="h-[52px]">
              {(drawer?.isNew ? canCreate : canEdit) ? 'Cancelar' : 'Fechar'}
            </Button>
            {(drawer?.isNew ? canCreate : canEdit) && (
              <Button fullWidth onClick={() => { setDrawer(null); showToast('Produto salvo'); }} className="h-[52px]">Salvar produto</Button>
            )}
          </>
        }
      >
        {drawer && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-[2fr_1fr] gap-4">
              <TextField label="Nome" required defaultValue={drawer.product?.name} placeholder="Nome do produto" />
              <TextField label="Código" defaultValue={drawer.product?.cod} placeholder="COD-0000" error="Código já cadastrado." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Categoria" defaultValue={drawer.product?.cat}>
                <option>Químicos</option><option>Equipamentos</option><option>EPIs</option>
              </SelectField>
              <SelectField label="Unidade">
                <option>Litro (L)</option><option>Mililitro (mL)</option><option>Quilograma (kg)</option><option>Unidade (un)</option>
              </SelectField>
            </div>
            <div>
              <FieldLabel>EPIs obrigatórios</FieldLabel>
              <div className="flex flex-wrap gap-2">
                <Tag>Máscara respiratória ✕</Tag>
                <Tag>Luvas nitrílicas ✕</Tag>
                <Tag muted>+ Adicionar</Tag>
              </div>
            </div>
            <div>
              <FieldLabel>Pragas-alvo</FieldLabel>
              <div className="flex flex-wrap gap-2">
                <Tag tone="info">Baratas ✕</Tag>
                <Tag tone="info">Mosquitos ✕</Tag>
                <Tag muted>+ Adicionar</Tag>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="Preço unitário" placeholder="R$ 0,00" />
              <TextField label="Lote padrão" placeholder="Ex.: 500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="Estoque mínimo" defaultValue={drawer.product?.min} placeholder="0" />
              <TextField label="Estoque máximo" defaultValue={drawer.product?.max} placeholder="0" />
            </div>
            <SelectField label="Fornecedor principal">
              <option>Química Brasil Ltda</option><option>PestControl Ltda</option><option>AgroDefensivos S.A.</option>
            </SelectField>
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

function Tag({ children, tone, muted }: { children: React.ReactNode; tone?: 'info'; muted?: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-3 py-1.5 text-[13px] font-semibold',
        muted ? 'bg-ink-100 font-medium text-ink-500' : tone === 'info' ? 'bg-tag-infoBg text-tag-infoFg' : 'bg-primary50 text-forest-700',
      )}
    >
      {children}
    </span>
  );
}
