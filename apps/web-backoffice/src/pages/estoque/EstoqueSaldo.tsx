import { useMemo, useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Clock,
  Wallet,
  SlidersHorizontal,
  Printer,
  Upload,
  ClipboardCheck,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/KpiCard';
import { Segmented } from '@/components/ui/Segmented';
import { Modal } from '@/components/ui/Modal';
import { SelectField, SearchInput, TextField, TextareaField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import {
  STOCK,
  STOCK_BY_LOC,
  LOCATIONS,
  MOV_ROWS,
  alertMeta,
  PRODUCTS,
  type LocationKey,
} from '@/data/estoque';

type Tab = 'estoque' | 'mov' | 'inv';
type InvStep = 'idle' | 'produtos' | 'folha' | 'contagem' | 'done';

const catByProd: Record<string, string> = Object.fromEntries(PRODUCTS.map((p) => [p.name, p.cat]));

export function EstoqueSaldo() {
  const { showToast } = useToast();
  const { can } = useAuth();
  const canWrite = can('estoque', 'editar');
  const [loc, setLoc] = useState<LocationKey>('central');
  const [tab, setTab] = useState<Tab>('estoque');
  const [search, setSearch] = useState('');
  const [catF, setCatF] = useState('todos');
  const [alertF, setAlertF] = useState('todos');
  const [ajuste, setAjuste] = useState(false);
  const [invStep, setInvStep] = useState<InvStep>('idle');
  const [invLoc, setInvLoc] = useState('Ecomax Central');

  const baseRows = useMemo(() => {
    if (loc === 'baseSP' || loc === 'baseRJ') return STOCK_BY_LOC[loc] ?? [];
    if (loc === 'consolidado') return STOCK.map((r) => ({ ...r, loc: 'Todas as localizações' }));
    return STOCK;
  }, [loc]);

  const rows = baseRows.filter((r) => {
    if (!`${r.prod} ${r.lote}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (catF !== 'todos' && catByProd[r.prod] !== catF) return false;
    if (alertF !== 'todos' && r.alert !== alertF) return false;
    return true;
  });

  const kpis = [
    { icon: TrendingDown, tone: 'red' as const, label: 'Abaixo do mínimo', value: baseRows.filter((r) => r.alert === 'low').length },
    { icon: TrendingUp, tone: 'amber' as const, label: 'Acima do máximo', value: baseRows.filter((r) => r.alert === 'high').length },
    { icon: Clock, tone: 'amber' as const, label: 'Lotes vencendo (60d)', value: baseRows.filter((r) => r.alert === 'exp').length },
    { icon: Wallet, tone: 'green' as const, label: 'Valor total em estoque', value: 'R$ 48.250' },
  ];

  const th = 'px-4 py-3 text-left text-xs font-bold uppercase text-ink-400';

  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-ink-500">Localização:</span>
          <Segmented
            options={LOCATIONS.map((l) => ({ key: l.key, label: l.label }))}
            value={loc}
            onChange={setLoc}
          />
        </div>
        {canWrite && (
          <Button onClick={() => setAjuste(true)}>
            <SlidersHorizontal className="h-5 w-5" />
            Ajuste manual
          </Button>
        )}
      </div>

      <div className="mb-5 grid grid-cols-4 gap-3.5">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="mb-[18px] flex gap-0.5 border-b border-ink-100">
        {(
          [
            { key: 'estoque', label: 'Estoque' },
            { key: 'mov', label: 'Movimentações' },
            { key: 'inv', label: 'Inventário Físico' },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'border-b-2 px-[18px] py-2.5 text-sm transition-colors',
              tab === t.key ? 'border-forest-accent font-semibold text-forest-900' : 'border-transparent font-medium text-ink-500 hover:text-ink-900',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'estoque' && (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <SearchInput containerClassName="w-[280px]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto ou lote" />
            <SelectField value={catF} onChange={(e) => setCatF(e.target.value)} options={[{ value: 'todos', label: 'Todas as categorias' }, ...[...new Set(PRODUCTS.map((p) => p.cat))].map((c) => ({ value: c, label: c }))]} />
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
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-ink-100">
                      <td className="px-4 py-3.5 pl-6 text-sm font-medium text-ink-800">{r.prod}</td>
                      <td className="px-4 py-3.5 text-sm text-ink-700">{r.lote}</td>
                      <td className="px-4 py-3.5 text-sm text-ink-600">{r.val}</td>
                      <td className="px-4 py-3.5 text-center text-[15px] font-bold text-ink-900">{r.qtd}</td>
                      <td className="px-4 py-3.5 text-center text-sm text-ink-500">{r.min} / {r.max}</td>
                      <td className="px-4 py-3.5 text-sm text-ink-700">{r.loc}</td>
                      <td className="px-4 py-3.5 pr-6"><Badge tone={alertMeta[r.alert].tone}>{alertMeta[r.alert].label}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-ink-100 px-6 py-3.5 text-[13px] text-ink-400">
              Mín/máx configurados por (produto × localização) · automação editável em lote e replicável entre localizações.
            </p>
          </div>
        </>
      )}

      {tab === 'mov' && (
        <div className="rounded-2xl border border-ink-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="bg-ink-50">
                  <th className={cn(th, 'pl-6')}>Data/hora</th>
                  <th className={th}>Tipo</th>
                  <th className={th}>Produto / Qtd</th>
                  <th className={th}>Origem → Destino</th>
                  <th className={cn(th, 'pr-6')}>Usuário</th>
                </tr>
              </thead>
              <tbody>
                {MOV_ROWS.map((m, i) => (
                  <tr key={i} className="border-t border-ink-100">
                    <td className="px-4 py-3.5 pl-6 text-sm text-ink-600">{m.dt}</td>
                    <td className="px-4 py-3.5"><Badge tone={m.tone}>{m.tipo}</Badge></td>
                    <td className="px-4 py-3.5 text-sm text-ink-800">{m.prod}</td>
                    <td className="px-4 py-3.5 text-sm text-ink-700">{m.orig} → {m.dest}</td>
                    <td className="px-4 py-3.5 pr-6 text-sm text-ink-500">{m.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'inv' && (
        <InventarioFisico
          step={invStep}
          setStep={setInvStep}
          loc={invLoc}
          setLoc={setInvLoc}
          canWrite={canWrite}
          onApprove={() => { showToast(`Fechamento aprovado · ajustes aplicados somente em ${invLoc}`); setInvStep('idle'); }}
        />
      )}

      {/* Modal: ajuste manual */}
      <Modal open={ajuste} onClose={() => setAjuste(false)} labelledBy="ajuste-title">
        <div className="flex items-center justify-between border-b border-ink-100 px-7 py-[22px]">
          <h2 id="ajuste-title" className="text-[19px] font-bold text-ink-900">Ajuste manual de estoque</h2>
        </div>
        <div className="flex flex-col gap-3.5 px-7 py-6">
          <SelectField label="Produto"><option>Inseticida Permetrina 500ml</option><option>Raticida Brodifacoum Blocos</option></SelectField>
          <div className="grid grid-cols-2 gap-3.5">
            <SelectField label="Tipo"><option>Entrada (+)</option><option>Saída (−)</option></SelectField>
            <TextField label="Quantidade" placeholder="0" />
          </div>
          <SelectField label="Motivo" required><option>Correção de contagem</option><option>Perda / avaria</option><option>Vencimento</option><option>Devolução</option></SelectField>
          <TextareaField label="Observação" placeholder="Detalhe o ajuste" />
          <p className="flex items-center gap-1.5 text-[13px] text-ink-400">
            <Info className="h-[17px] w-[17px]" />
            Registrado na auditoria. Saída por consumo de OS é irreversível.
          </p>
        </div>
        <div className="flex gap-3 px-7 pb-6">
          <Button variant="secondary" fullWidth onClick={() => setAjuste(false)} className="h-[52px]">Cancelar</Button>
          <Button fullWidth onClick={() => { setAjuste(false); showToast('Ajuste registrado na auditoria'); }} className="h-[52px]">Confirmar ajuste</Button>
        </div>
      </Modal>
    </>
  );
}

function InventarioFisico({
  step,
  setStep,
  loc,
  setLoc,
  onApprove,
  canWrite,
}: {
  step: InvStep;
  setStep: (s: InvStep) => void;
  loc: string;
  setLoc: (l: string) => void;
  onApprove: () => void;
  canWrite: boolean;
}) {
  const th = 'px-4 py-3 text-xs font-bold uppercase text-ink-400';
  const produtos = ['Inseticida Permetrina 500ml', 'Raticida Brodifacoum Blocos', 'Cupinicida Fipronil 250ml'];
  const compara = [
    { prod: 'Inseticida Permetrina 500ml', sis: 8, cont: 8, dif: '0', tone: 'text-forest-700' },
    { prod: 'Raticida Brodifacoum Blocos', sis: 45, cont: 43, dif: '−2', tone: 'text-danger-bright' },
    { prod: 'Cupinicida Fipronil 250ml', sis: 140, cont: 141, dif: '+1', tone: 'text-tag-warnFg' },
  ];

  const next = () => setStep(({ produtos: 'folha', folha: 'contagem', contagem: 'done' } as Record<InvStep, InvStep>)[step] ?? step);

  return (
    <div className="rounded-2xl border border-ink-100 bg-white px-7 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-ink-900">Inventário físico</h3>
          <p className="mt-0.5 text-[13px] text-ink-400">Contagem manual por localização · fechamento e ajustes restritos à localização contada</p>
        </div>
        {step !== 'idle' && (
          <Button variant="secondary" size="sm" onClick={() => setStep('idle')}>Cancelar contagem</Button>
        )}
      </div>

      {step === 'idle' && (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-ink-200 p-8 text-center">
          <span className="mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary50">
            <ClipboardCheck className="h-7 w-7 text-forest-700" />
          </span>
          <p className="text-[15px] font-semibold text-ink-800">Nenhuma contagem em andamento</p>
          <p className="mb-[18px] text-[13px] text-ink-400">
            {canWrite
              ? 'Selecione a localização para iniciar uma contagem física.'
              : 'Você tem acesso somente de leitura · a contagem física exige permissão de escrita.'}
          </p>
          {canWrite && (
            <div className="flex items-end gap-3 text-left">
              <SelectField label="Localização" className="min-w-[220px]" value={loc} onChange={(e) => setLoc(e.target.value)}>
                <option>Ecomax Central</option><option>Base São Paulo</option><option>Base Rio de Janeiro</option>
              </SelectField>
              <Button onClick={() => setStep('produtos')}>Iniciar contagem</Button>
            </div>
          )}
        </div>
      )}

      {step === 'produtos' && (
        <>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-forest-accent">Passo 1 de 4 · Selecionar produtos — {loc}</p>
          <div className="mb-[18px] overflow-hidden rounded-[10px] border border-ink-100">
            {produtos.map((p, i) => (
              <label key={p} className={cn('flex cursor-pointer items-center gap-3 px-[18px] py-3.5 text-sm text-ink-800', i < produtos.length - 1 && 'border-b border-ink-100')}>
                <span className="flex h-5 w-5 items-center justify-center rounded bg-forest-accent text-[13px] leading-none text-white">✓</span>
                {p}
              </label>
            ))}
          </div>
          <div className="flex justify-end"><Button onClick={next}>Avançar → imprimir folha</Button></div>
        </>
      )}

      {step === 'folha' && (
        <>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-forest-accent">Passo 2 de 4 · Folha de contagem</p>
          <div className="mb-[18px] rounded-xl border border-dashed border-ink-200 p-7 text-center">
            <Printer className="mx-auto h-8 w-8 text-ink-500" />
            <p className="my-2.5 text-sm text-ink-700">Imprima a folha para a contagem manual em campo (3 produtos · {loc}).</p>
            <Button variant="secondary"><Printer className="h-[18px] w-[18px]" />Imprimir folha</Button>
          </div>
          <div className="flex justify-end"><Button onClick={next}>Avançar → registrar contagem</Button></div>
        </>
      )}

      {step === 'contagem' && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-forest-accent">Passo 3 de 4 · Registrar contagem</p>
            <Button variant="secondary" size="sm"><Upload className="h-[17px] w-[17px]" />Importar CSV</Button>
          </div>
          <div className="mb-[18px] overflow-hidden rounded-[10px] border border-ink-100">
            {[['Inseticida Permetrina 500ml', '8'], ['Raticida Brodifacoum Blocos', '43'], ['Cupinicida Fipronil 250ml', '141']].map(([p, v], i) => (
              <div key={p} className={cn('flex items-center justify-between px-[18px] py-3', i < 2 && 'border-b border-ink-100')}>
                <span className="text-sm text-ink-800">{p}</span>
                <input defaultValue={v} className="w-[90px] rounded-lg border border-ink-200 px-2.5 py-2 text-center text-sm text-ink-800 outline-none" />
              </div>
            ))}
          </div>
          <div className="flex justify-end"><Button onClick={next}>Comparar sistema × contagem</Button></div>
        </>
      )}

      {step === 'done' && (
        <>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-forest-accent">Passo 4 de 4 · Comparativo — {loc}</p>
          <table className="mb-4 w-full border-collapse">
            <thead>
              <tr className="bg-ink-50">
                <th className={cn(th, 'text-left')}>Produto</th>
                <th className={cn(th, 'text-center')}>Sistema</th>
                <th className={cn(th, 'text-center')}>Contagem</th>
                <th className={cn(th, 'text-center')}>Diferença</th>
              </tr>
            </thead>
            <tbody>
              {compara.map((c) => (
                <tr key={c.prod} className="border-t border-ink-100">
                  <td className="px-4 py-3 text-sm text-ink-800">{c.prod}</td>
                  <td className="px-4 py-3 text-center text-sm text-ink-700">{c.sis}</td>
                  <td className="px-4 py-3 text-center text-sm text-ink-700">{c.cont}</td>
                  <td className={cn('px-4 py-3 text-center text-sm font-semibold', c.tone)}>{c.dif}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-[#f6e0b0] bg-tag-softWarnBg px-4 py-3 text-[13px] text-tag-softWarnFg">
            <Info className="h-[18px] w-[18px]" />
            Aprovar gera ajustes automáticos restritos a {loc}.
          </div>
          <div className="flex justify-end"><Button onClick={onApprove}>Aprovar fechamento</Button></div>
        </>
      )}
    </div>
  );
}
