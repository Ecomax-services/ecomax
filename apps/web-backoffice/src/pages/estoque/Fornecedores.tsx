import { useMemo, useState } from 'react';
import { Plus, Star, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { Tabs } from '@/components/ui/Tabs';
import { SelectField, SearchInput, TextField, TextareaField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { FORN_ROWS, type FornRow } from '@/data/estoque';

type SortKey = 'razao' | 'aval';
type DetailTab = 'dados' | 'cot' | 'compras';

export function Fornecedores() {
  const { showToast } = useToast();
  const { can } = useAuth();
  const canCreate = can('estoque', 'criar');
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('todos');
  const [statusF, setStatusF] = useState('todos');
  const [aval, setAval] = useState('todos');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [detail, setDetail] = useState<FornRow | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('dados');

  const rows = useMemo(() => {
    let list = FORN_ROWS.filter((f) => {
      if (!`${f.razao} ${f.cnpj} ${f.contato}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (cat !== 'todos' && f.cat !== cat) return false;
      if (statusF !== 'todos' && f.status !== statusF) return false;
      if (aval === 'alta' && f.aval < 4.5) return false;
      if (aval === 'media' && !(f.aval >= 4 && f.aval < 4.5)) return false;
      if (aval === 'baixa' && f.aval >= 4) return false;
      return true;
    });
    if (sort) {
      list = [...list].sort((a, b) => (sort.key === 'aval' ? a.aval - b.aval : a.razao.localeCompare(b.razao)));
      if (sort.dir === 'desc') list.reverse();
    }
    return list;
  }, [search, cat, statusF, aval, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s?.key === key && s.dir === 'asc' ? { key, dir: 'desc' } : { key, dir: 'asc' }));

  const th = 'px-4 py-3 text-left text-xs font-bold uppercase text-ink-400';
  const sortTh = (key: SortKey, label: string, align: 'left' | 'center' = 'left') => (
    <th onClick={() => toggleSort(key)} className={cn('cursor-pointer select-none whitespace-nowrap px-4 py-3 text-xs font-bold uppercase', align === 'center' ? 'text-center' : 'text-left', sort?.key === key ? 'text-forest-900' : 'text-ink-400')}>
      <span className="inline-flex items-center gap-1">{label}<ChevronsUpDown className="h-3.5 w-3.5" /></span>
    </th>
  );

  return (
    <>
      <div className="mb-[18px] flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] font-bold text-ink-900">{rows.length}</span>
          <span className="text-[15px] text-ink-500">fornecedores</span>
        </div>
        {canCreate && <Button onClick={() => setDrawer(true)}><Plus className="h-5 w-5" />Novo fornecedor</Button>}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput containerClassName="w-[280px]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar razão social, CNPJ ou contato" />
        <SelectField value={cat} onChange={(e) => setCat(e.target.value)} options={[{ value: 'todos', label: 'Todas as categorias' }, { value: 'Químicos', label: 'Químicos' }, { value: 'Desinfetantes', label: 'Desinfetantes' }]} />
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
              {rows.map((f) => (
                <tr key={f.cnpj} onClick={() => { setDetail(f); setDetailTab('dados'); }} className="cursor-pointer border-t border-ink-100 hover:bg-forest-50/60">
                  <td className="px-4 py-3.5 pl-6 text-sm font-semibold text-ink-800">
                    {f.razao}
                    <div className="text-xs font-normal text-ink-400">{f.contato}</div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-ink-700">{f.cnpj}</td>
                  <td className="px-4 py-3.5 text-sm text-ink-700">{f.cat}</td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-ink-900">{f.compras}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-tag-warnFg">
                      <Star className="h-[17px] w-[17px] fill-[#e8821a] text-[#e8821a]" />
                      {f.aval}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 pr-6"><Badge tone={f.status === 'Ativo' ? 'success' : 'muted'}>{f.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer: novo fornecedor */}
      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        width={520}
        title="Novo fornecedor"
        subtitle="Cadastro completo"
        footer={
          <>
            <Button variant="secondary" fullWidth onClick={() => setDrawer(false)} className="h-[52px]">Cancelar</Button>
            <Button fullWidth onClick={() => { setDrawer(false); showToast('Fornecedor cadastrado'); }} className="h-[52px]">Salvar fornecedor</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3.5">
            <TextField label="Razão social" required placeholder="Razão social" />
            <TextField label="Nome fantasia" placeholder="Nome fantasia" />
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <TextField label="CNPJ" required placeholder="00.000.000/0000-00" hint="Validado automaticamente contra duplicidade." />
            <TextField label="Inscrição estadual" placeholder="IE" />
          </div>
          <TextField label="Endereço" placeholder="Rua, número, cidade/UF" />
          <div>
            <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-ink-400">Contatos</p>
            <div className="grid grid-cols-2 gap-3.5">
              <TextField placeholder="Contato principal" />
              <TextField placeholder="E-mail / telefone" />
            </div>
          </div>
          <div>
            <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-ink-400">Dados bancários</p>
            <div className="grid grid-cols-[2fr_1fr_1fr] gap-3.5">
              <TextField placeholder="Banco" />
              <TextField placeholder="Agência" />
              <TextField placeholder="Conta" />
            </div>
          </div>
          <TextareaField label="Observações" placeholder="Notas internas" />
        </div>
      </Drawer>

      {/* Drawer: detalhe fornecedor */}
      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        width={560}
        title={detail?.razao ?? ''}
        subtitle={detail ? `${detail.cnpj} · ${detail.cat}` : ''}
        headerExtra={
          <Tabs
            tabs={[
              { key: 'dados', label: 'Dados cadastrais' },
              { key: 'cot', label: 'Histórico de cotações' },
              { key: 'compras', label: 'Histórico de compras' },
            ]}
            value={detailTab}
            onChange={setDetailTab}
          />
        }
      >
        {detail && detailTab === 'dados' && (
          <div className="grid grid-cols-2 gap-x-6">
            <Info label="CNPJ" value={detail.cnpj} />
            <Info label="Categoria" value={detail.cat} />
            <Info label="Contato" value={detail.contato} />
            <Info label="Compras 12m" value={detail.compras} />
            <div className="col-span-2 py-3">
              <div className="text-[13px] text-ink-400">Avaliação automática</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[15px] text-ink-800">
                <Star className="h-[18px] w-[18px] fill-[#e8821a] text-[#e8821a]" />
                {detail.aval} · prazo médio 5d · taxa de resposta 92%
              </div>
            </div>
          </div>
        )}
        {detail && detailTab === 'cot' && (
          <MiniTable head={['Cotação', 'Data', 'Valor']} rows={[['COT-0231', '20/02/2026', 'R$ 1.180,00'], ['COT-0224', '12/02/2026', 'R$ 940,00']]} />
        )}
        {detail && detailTab === 'compras' && (
          <MiniTable head={['Requisição', 'Data', 'Valor']} rows={[['REQ-0142', '21/02/2026', 'R$ 1.180,00'], ['REQ-0119', '03/01/2026', 'R$ 2.360,00']]} />
        )}
      </Drawer>
    </>
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

function MiniTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-ink-50">
          {head.map((h) => (
            <th key={h} className="px-3.5 py-2.5 text-left text-xs font-bold uppercase text-ink-400">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-ink-100">
            <td className="px-3.5 py-3 text-sm font-semibold text-forest-900">{r[0]}</td>
            <td className="px-3.5 py-3 text-sm text-ink-600">{r[1]}</td>
            <td className="px-3.5 py-3 text-sm text-ink-800">{r[2]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
