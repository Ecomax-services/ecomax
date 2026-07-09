import { useState } from 'react';
import { HardHat, Boxes, Clock, Undo2, Warehouse, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { KpiCard } from '@/components/ui/KpiCard';
import { Segmented } from '@/components/ui/Segmented';
import { Modal } from '@/components/ui/Modal';
import { SelectField, TextField, TextareaField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { INV_OPERADOR_ROWS, INV_BASE_ROWS } from '@/data/estoque';

type Mode = 'operador' | 'base';
type MoveKey = 'enviar' | 'transferir' | 'confirmar' | 'devolver';

const moveInfo: Record<MoveKey, { title: string; origem?: boolean; operador?: boolean; base?: boolean; motivo?: boolean; receb?: boolean; confirm: string; done: string }> = {
  enviar: { title: 'Enviar produto ao operador', origem: true, operador: true, confirm: 'Enviar', done: 'Produto enviado ao operador · estoque da origem abatido' },
  transferir: { title: 'Transferir Ecomax → Base', base: true, motivo: true, confirm: 'Criar transferência', done: 'Transferência criada (em trânsito) · Ecomax abatido' },
  confirmar: { title: 'Confirmar recebimento em base', base: true, receb: true, confirm: 'Confirmar recebimento', done: 'Recebimento confirmado na base' },
  devolver: { title: 'Devolver produto', operador: true, base: true, motivo: true, confirm: 'Registrar devolução', done: 'Devolução registrada · estoque atualizado' },
};

export function Inventario() {
  const { showToast } = useToast();
  const { can } = useAuth();
  const canEdit = can('estoque', 'editar');
  const [mode, setMode] = useState<Mode>('operador');
  const [move, setMove] = useState<MoveKey | null>(null);
  const [op, setOp] = useState('todos');
  const [baseF, setBaseF] = useState('todos');
  const [tipo, setTipo] = useState('todos');

  const kpis =
    mode === 'operador'
      ? [
          { icon: HardHat, tone: 'green' as const, label: 'Operadores com inventário', value: 8 },
          { icon: Boxes, tone: 'blue' as const, label: 'Produtos em campo', value: 142 },
          { icon: Clock, tone: 'amber' as const, label: 'Lotes vencendo (campo)', value: 2 },
          { icon: Undo2, tone: 'amber' as const, label: 'Devoluções pendentes', value: 1 },
        ]
      : [
          { icon: Warehouse, tone: 'green' as const, label: 'Bases com inventário', value: 2 },
          { icon: Boxes, tone: 'blue' as const, label: 'Produtos em base', value: 35 },
          { icon: Clock, tone: 'amber' as const, label: 'Lotes vencendo (base)', value: 1 },
          { icon: RefreshCw, tone: 'amber' as const, label: 'Transf. aguardando receb.', value: 1 },
        ];

  const opRows = INV_OPERADOR_ROWS.filter((r) => op === 'todos' || r.op === op);
  const baseRows = INV_BASE_ROWS.filter((r) => baseF === 'todos' || r.base === baseF);

  const th = 'px-4 py-3 text-left text-xs font-bold uppercase text-ink-400';
  const info = move ? moveInfo[move] : null;

  const actions: { key: MoveKey; label: string; primary?: boolean }[] = [
    { key: 'enviar', label: 'Enviar ao operador', primary: true },
    { key: 'transferir', label: 'Transferir Ecomax → Base' },
    { key: 'confirmar', label: 'Confirmar recebimento' },
    { key: 'devolver', label: 'Devolver' },
  ];

  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-ink-500">Visualizar:</span>
          <Segmented
            options={[
              { key: 'operador', label: 'Por operador' },
              { key: 'base', label: 'Por base' },
            ]}
            value={mode}
            onChange={setMode}
          />
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <button
                key={a.key}
                onClick={() => setMove(a.key)}
                className={cn(
                  'rounded-[9px] px-3.5 py-2.5 text-[13px] font-semibold',
                  a.primary ? 'bg-forest-600 text-white' : 'border border-ink-200 bg-white text-ink-700',
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-5 grid grid-cols-4 gap-3.5">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="mb-[18px] flex flex-wrap gap-3">
        <SelectField className="min-w-[190px]" value={op} onChange={(e) => setOp(e.target.value)} options={[{ value: 'todos', label: 'Todos os operadores' }, ...INV_OPERADOR_ROWS.map((r) => ({ value: r.op, label: r.op }))]} />
        <SelectField className="min-w-[170px]" value={baseF} onChange={(e) => setBaseF(e.target.value)} options={[{ value: 'todos', label: 'Todas as bases' }, { value: 'Base São Paulo', label: 'Base São Paulo' }, { value: 'Base Rio de Janeiro', label: 'Base Rio de Janeiro' }]} />
        <SelectField value={tipo} onChange={(e) => setTipo(e.target.value)} options={[{ value: 'todos', label: 'Todos os tipos' }, { value: 'envio', label: 'Envio' }, { value: 'transferencia', label: 'Transferência' }, { value: 'devolucao', label: 'Devolução' }]} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
        {mode === 'operador' ? (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-ink-50">
                <th className={cn(th, 'pl-6')}>Operador</th>
                <th className={th}>Produto</th>
                <th className={th}>Lote</th>
                <th className={cn(th, 'text-center')}>Qtd</th>
                <th className={th}>Validade</th>
                <th className={cn(th, 'pr-6')}>Base de origem</th>
              </tr>
            </thead>
            <tbody>
              {opRows.map((r, i) => (
                <tr key={i} className="border-t border-ink-100">
                  <td className="px-4 py-3.5 pl-6 text-sm font-medium text-ink-800">{r.op}</td>
                  <td className="px-4 py-3.5 text-sm text-ink-700">{r.prod}</td>
                  <td className="px-4 py-3.5 text-sm text-ink-600">{r.lote}</td>
                  <td className="px-4 py-3.5 text-center text-[15px] font-bold text-ink-900">{r.qtd}</td>
                  <td className="px-4 py-3.5 text-sm text-ink-600">{r.val}</td>
                  <td className="px-4 py-3.5 pr-6 text-sm text-ink-700">{r.base}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-ink-50">
                <th className={cn(th, 'pl-6')}>Base</th>
                <th className={th}>Produto</th>
                <th className={th}>Lote</th>
                <th className={cn(th, 'text-center')}>Qtd</th>
                <th className={cn(th, 'pr-6')}>Validade</th>
              </tr>
            </thead>
            <tbody>
              {baseRows.map((r, i) => (
                <tr key={i} className="border-t border-ink-100">
                  <td className="px-4 py-3.5 pl-6 text-sm font-medium text-ink-800">{r.base}</td>
                  <td className="px-4 py-3.5 text-sm text-ink-700">{r.prod}</td>
                  <td className="px-4 py-3.5 text-sm text-ink-600">{r.lote}</td>
                  <td className="px-4 py-3.5 text-center text-[15px] font-bold text-ink-900">{r.qtd}</td>
                  <td className="px-4 py-3.5 pr-6 text-sm text-ink-600">{r.val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de movimentação */}
      {info && (
        <Modal open onClose={() => setMove(null)}>
          <div className="flex items-center justify-between border-b border-ink-100 px-7 py-[22px]">
            <h2 className="text-[19px] font-bold text-ink-900">{info.title}</h2>
          </div>
          <div className="flex flex-col gap-3.5 px-7 py-6">
            {info.origem && (
              <SelectField label="Origem"><option>Ecomax Central</option><option>Base São Paulo</option><option>Base Rio de Janeiro</option></SelectField>
            )}
            {info.operador && (
              <SelectField label="Operador"><option>Carlos Henrique Souza</option><option>Marina Lopes Ferreira</option><option>Rafael Oliveira Lima</option></SelectField>
            )}
            {info.base && (
              <SelectField label="Base"><option>Base São Paulo</option><option>Base Rio de Janeiro</option></SelectField>
            )}
            <div className="grid grid-cols-[2fr_1fr] gap-3">
              <SelectField label="Produto + lote"><option>Inseticida Permetrina · LP-2451</option><option>Raticida Brodifacoum · RB-1180</option></SelectField>
              <TextField label="Quantidade" placeholder="0" />
            </div>
            {info.receb && (
              <div className="flex items-start gap-2 rounded-[10px] border border-[#f6e0b0] bg-tag-softWarnBg px-3.5 py-3 text-[13px] text-tag-softWarnFg">
                <Info className="h-[17px] w-[17px] shrink-0" />
                Se a quantidade recebida divergir da enviada, a justificativa abaixo é obrigatória.
              </div>
            )}
            {info.motivo && <TextareaField label="Motivo" required placeholder="Descreva o motivo" />}
            {info.receb && <TextareaField label="Justificativa de divergência" placeholder="Preencher se houver divergência" />}
            <p className="flex items-center gap-1.5 text-[13px] text-ink-400">
              <Info className="h-[17px] w-[17px]" />
              Movimentação registrada na auditoria (usuário + data/hora).
            </p>
          </div>
          <div className="flex gap-3 px-7 pb-6">
            <Button variant="secondary" fullWidth onClick={() => setMove(null)} className="h-[52px]">Cancelar</Button>
            <Button fullWidth onClick={() => { setMove(null); showToast(info.done); }} className="h-[52px]">{info.confirm}</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
