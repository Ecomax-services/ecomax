import { useState } from 'react';
import { Warehouse, TrendingDown, Clock, RefreshCw, Plus, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/KpiCard';
import { Drawer } from '@/components/ui/Drawer';
import { Tabs } from '@/components/ui/Tabs';
import { SelectField, SearchInput, TextField, TextareaField, FieldLabel } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { BASE_ROWS, type BaseRow } from '@/data/estoque';

type DetailTab = 'dados' | 'estoque' | 'hist' | 'ops';

const kpis = [
  { icon: Warehouse, tone: 'green' as const, label: 'Bases ativas', value: 2 },
  { icon: TrendingDown, tone: 'red' as const, label: 'Bases abaixo do mínimo', value: 1 },
  { icon: Clock, tone: 'muted' as const, label: 'Sem movimentação (30d)', value: 0 },
  { icon: RefreshCw, tone: 'amber' as const, label: 'Transferências pendentes', value: 1 },
];

export function Bases() {
  const { showToast } = useToast();
  const { can } = useAuth();
  const canCreate = can('estoque', 'criar');
  const canEdit = can('estoque', 'editar');
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [detail, setDetail] = useState<BaseRow | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('dados');

  const rows = BASE_ROWS.filter((b) => `${b.nome} ${b.cidade} ${b.resp}`.toLowerCase().includes(search.toLowerCase()));
  const th = 'px-4 py-3 text-left text-xs font-bold uppercase text-ink-400';

  return (
    <>
      <div className="mb-5 grid grid-cols-4 gap-3.5">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput containerClassName="w-[280px]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar base, cidade ou responsável" />
        {canCreate && <Button onClick={() => setDrawer(true)}><Plus className="h-5 w-5" />Nova base</Button>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-ink-50">
              <th className={cn(th, 'pl-6')}>Base</th>
              <th className={th}>Cidade / UF</th>
              <th className={th}>Responsável</th>
              <th className={cn(th, 'text-center')}>Produtos</th>
              <th className={th}>Valor estoque</th>
              <th className={cn(th, 'pr-6')}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.nome} onClick={() => { setDetail(b); setDetailTab('dados'); }} className="cursor-pointer border-t border-ink-100 hover:bg-forest-50/60">
                <td className="px-4 py-3.5 pl-6 text-sm font-semibold text-forest-900">{b.nome}</td>
                <td className="px-4 py-3.5 text-sm text-ink-700">{b.cidade} / {b.uf}</td>
                <td className="px-4 py-3.5 text-sm text-ink-700">{b.resp}</td>
                <td className="px-4 py-3.5 text-center text-[15px] font-bold text-ink-900">{b.prods}</td>
                <td className="px-4 py-3.5 text-sm font-semibold text-ink-900">{b.valor}</td>
                <td className="px-4 py-3.5 pr-6"><Badge tone={b.tone}>{b.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-ink-100 px-6 py-3.5 text-[13px] text-ink-400">
          Base com estoque maior que zero não pode ser inativada · divergência em transferência exige justificativa.
        </p>
      </div>

      {/* Drawer: nova base */}
      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Nova base"
        subtitle="Localização física intermediária"
        footer={
          <>
            <Button variant="secondary" fullWidth onClick={() => setDrawer(false)} className="h-[52px]">Cancelar</Button>
            <Button fullWidth onClick={() => { setDrawer(false); showToast('Base salva'); }} className="h-[52px]">Salvar base</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <TextField label="Nome da base" required placeholder="Ex.: Base Campinas" />
          <TextField label="Endereço" placeholder="Rua, número, cidade/UF" />
          <SelectField label="Responsável principal"><option>Marina Lopes Ferreira</option><option>Rafael Oliveira Lima</option><option>Eliana Martins</option></SelectField>
          <div>
            <FieldLabel>Operadores vinculados</FieldLabel>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-primary50 px-3 py-1.5 text-[13px] font-semibold text-forest-700">Carlos H. Souza ✕</span>
              <span className="rounded-full bg-ink-100 px-3 py-1.5 text-[13px] font-medium text-ink-500">+ Vincular</span>
            </div>
          </div>
          <TextareaField label="Observações" placeholder="Notas internas" />
        </div>
      </Drawer>

      {/* Drawer: detalhe base */}
      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        width={560}
        title={
          <span className="flex items-center gap-2.5">
            {detail?.nome}
            {detail && <Badge tone={detail.tone}>{detail.status}</Badge>}
          </span>
        }
        headerExtra={
          <Tabs
            tabs={[
              { key: 'dados', label: 'Dados cadastrais' },
              { key: 'estoque', label: 'Estoque atual' },
              { key: 'hist', label: 'Histórico de transferências' },
              { key: 'ops', label: 'Operadores vinculados' },
            ]}
            value={detailTab}
            onChange={setDetailTab}
          />
        }
      >
        {detail && detailTab === 'dados' && (
          <>
            <div className="grid grid-cols-2 gap-x-6">
              <Info2 label="Cidade / UF" value={`${detail.cidade} / ${detail.uf}`} />
              <Info2 label="Responsável" value={detail.resp} />
              <Info2 label="Produtos" value={String(detail.prods)} />
              <Info2 label="Valor em estoque" value={detail.valor} />
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-[#f6e0b0] bg-tag-softWarnBg px-4 py-3 text-[13px] text-tag-softWarnFg">
              <Info className="h-[18px] w-[18px]" />
              Base com estoque maior que zero não pode ser inativada.
            </div>
            {canEdit && (
              <div className="mt-4 flex gap-2.5">
                <Button size="sm">Editar base</Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="border-[#ffb8a8] text-danger-bright"
                  onClick={() => (detail.prods > 0 ? showToast('Base com estoque > 0 não pode ser inativada') : (setDetail(null), showToast('Base inativada')))}
                >
                  Inativar base
                </Button>
              </div>
            )}
          </>
        )}
        {detail && detailTab === 'estoque' && (
          <>
            <p className="mb-3 text-[13px] text-ink-400">Espelho do estoque da base.</p>
            <MiniTable head={['Produto', 'Lote', 'Qtd']} rows={[['Inseticida Permetrina', 'LP-2455', '30'], ['Gel Formicida', 'GF-7720', '4']]} />
          </>
        )}
        {detail && detailTab === 'hist' && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-ink-50">
                {['Data', 'Movimentação', 'Status'].map((h) => (
                  <th key={h} className="px-3.5 py-2.5 text-left text-xs font-bold uppercase text-ink-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-ink-100">
                <td className="px-3.5 py-3 text-sm text-ink-600">22/02</td>
                <td className="px-3.5 py-3 text-sm text-ink-800">Ecomax → Base · Raticida 10kg</td>
                <td className="px-3.5 py-3"><Badge tone="success">Recebida</Badge></td>
              </tr>
              <tr className="border-t border-ink-100">
                <td className="px-3.5 py-3 text-sm text-ink-600">24/02</td>
                <td className="px-3.5 py-3 text-sm text-ink-800">Ecomax → Base · Inseticida 20mL</td>
                <td className="px-3.5 py-3"><Badge tone="info">Em trânsito</Badge></td>
              </tr>
            </tbody>
          </table>
        )}
        {detail && detailTab === 'ops' && (
          <div className="flex flex-col gap-2.5">
            {[['CS', 'Carlos Henrique Souza'], ['ML', 'Marina Lopes Ferreira']].map(([ini, nome]) => (
              <div key={nome} className="flex items-center gap-3 rounded-[10px] border border-ink-100 px-3.5 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-700 text-xs font-bold text-white">{ini}</span>
                <span className="text-sm text-ink-800">{nome}</span>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
}

function Info2({ label, value }: { label: string; value: string }) {
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
          {head.map((h, i) => (
            <th key={h} className={cn('px-3.5 py-2.5 text-xs font-bold uppercase text-ink-400', i === 2 ? 'text-center' : 'text-left')}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-ink-100">
            <td className="px-3.5 py-3 text-sm text-ink-800">{r[0]}</td>
            <td className="px-3.5 py-3 text-sm text-ink-600">{r[1]}</td>
            <td className="px-3.5 py-3 text-center text-sm font-bold text-ink-900">{r[2]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
