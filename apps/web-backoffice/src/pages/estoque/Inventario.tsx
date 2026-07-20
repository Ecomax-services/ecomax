import { useCallback, useEffect, useMemo, useState } from 'react';
import { Warehouse, Boxes, Clock, RefreshCw, Info, Truck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/KpiCard';
import { Segmented } from '@/components/ui/Segmented';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SelectField, TextField, TextareaField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { alertMeta } from '@/data/estoque';
import {
  listBases, listLotes, criarTransferencia, listTransferencias,
  confirmarRecebimentoTransferencia, cancelarTransferencia,
  type StockRow, type TransferenciaRow,
} from '@/lib/estoque';
import { maskInt } from '@/lib/masks';

type Mode = 'base' | 'operador';

export function Inventario() {
  const { showToast } = useToast();
  const { can } = useAuth();
  const canEdit = can('estoque', 'editar');

  const [mode, setMode] = useState<Mode>('base');
  const [bases, setBases] = useState<{ id: string; nome: string }[]>([]);
  const [lotes, setLotes] = useState<StockRow[]>([]);
  const [transitos, setTransitos] = useState<TransferenciaRow[]>([]);
  const [baseF, setBaseF] = useState('todos');
  const [transfer, setTransfer] = useState(false);
  const [receber, setReceber] = useState<TransferenciaRow | null>(null);
  const [cancelar, setCancelar] = useState<TransferenciaRow | null>(null);

  useEffect(() => { listBases().then((b) => setBases(b.map((x) => ({ id: x.id, nome: x.nome })))).catch(() => {}); }, []);

  const load = useCallback(async () => {
    try {
      const [l, t] = await Promise.all([listLotes(), listTransferencias('em_transito')]);
      setLotes(l); setTransitos(t);
    } catch (e) { showToast((e as Error).message); }
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const baseRows = useMemo(() => lotes.filter((r) => baseF === 'todos' || r.base_id === baseF), [lotes, baseF]);

  const kpis = [
    { icon: Warehouse, tone: 'green' as const, label: 'Bases com estoque', value: new Set(lotes.map((l) => l.base_id)).size },
    { icon: Boxes, tone: 'blue' as const, label: 'Produtos em base', value: new Set(lotes.map((l) => l.produto_id)).size },
    { icon: Clock, tone: 'amber' as const, label: 'Lotes vencendo', value: lotes.filter((l) => l.alert === 'exp').length },
    { icon: Truck, tone: 'amber' as const, label: 'Transferências em trânsito', value: transitos.length },
  ];

  const th = 'px-4 py-3 text-left text-xs font-bold uppercase text-ink-400';

  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-ink-500">Visualizar:</span>
          <Segmented options={[{ key: 'base', label: 'Por base' }, { key: 'operador', label: 'Por operador' }]} value={mode} onChange={setMode} />
        </div>
        {canEdit && mode === 'base' && (
          <Button onClick={() => setTransfer(true)}><RefreshCw className="h-5 w-5" />Transferir entre bases</Button>
        )}
      </div>

      {mode === 'base' ? (
        <>
          <div className="mb-5 grid grid-cols-4 gap-3.5">{kpis.map((k) => <KpiCard key={k.label} {...k} />)}</div>

          {/* Transferências em trânsito */}
          {transitos.length > 0 && (
            <div className="mb-5 overflow-hidden rounded-2xl border border-[#c9d6f5] bg-tag-infoBg/40">
              <div className="flex items-center gap-2 border-b border-[#c9d6f5] px-6 py-3 text-[13px] font-semibold text-[#26408a]">
                <Truck className="h-[18px] w-[18px]" />Transferências em trânsito — aguardando confirmação de recebimento
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-white/50">
                    <th className={cn(th, 'pl-6')}>Código</th>
                    <th className={th}>Produto</th>
                    <th className={th}>Origem → Destino</th>
                    <th className={th}>Lote</th>
                    <th className={cn(th, 'text-center')}>Enviada</th>
                    <th className={cn(th, 'pr-6 text-right')}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {transitos.map((t) => (
                    <tr key={t.id} className="border-t border-[#c9d6f5]/60">
                      <td className="px-4 py-3 pl-6 text-sm font-semibold text-forest-900">{t.codigo}</td>
                      <td className="px-4 py-3 text-sm text-ink-800">{t.prod}</td>
                      <td className="px-4 py-3 text-sm text-ink-700">{t.origem} → {t.destino}</td>
                      <td className="px-4 py-3 text-sm text-ink-600">{t.lote}</td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-ink-900">{t.enviada}</td>
                      <td className="px-4 py-3 pr-6 text-right">
                        {canEdit ? (
                          <div className="inline-flex gap-2">
                            <button onClick={() => setReceber(t)} className="rounded-lg bg-forest-600 px-3 py-1.5 text-[13px] font-semibold text-white">Confirmar recebimento</button>
                            <button onClick={() => setCancelar(t)} className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-ink-500">Cancelar</button>
                          </div>
                        ) : <span className="text-[13px] text-ink-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mb-[18px] flex flex-wrap gap-3">
            <SelectField className="min-w-[190px]" value={baseF} onChange={(e) => setBaseF(e.target.value)} options={[{ value: 'todos', label: 'Todas as bases' }, ...bases.map((b) => ({ value: b.id, label: b.nome }))]} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse">
                <thead>
                  <tr className="bg-ink-50">
                    <th className={cn(th, 'pl-6')}>Base</th>
                    <th className={th}>Produto</th>
                    <th className={th}>Lote</th>
                    <th className={cn(th, 'text-center')}>Qtd</th>
                    <th className={th}>Validade</th>
                    <th className={cn(th, 'pr-6')}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {baseRows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-400">Nenhum item em base.</td></tr>}
                  {baseRows.map((r) => (
                    <tr key={r.id} className="border-t border-ink-100">
                      <td className="px-4 py-3.5 pl-6 text-sm font-medium text-ink-800">{r.loc}</td>
                      <td className="px-4 py-3.5 text-sm text-ink-700">{r.prod}</td>
                      <td className="px-4 py-3.5 text-sm text-ink-600">{r.lote}</td>
                      <td className="px-4 py-3.5 text-center text-[15px] font-bold text-ink-900">{r.qtd}</td>
                      <td className="px-4 py-3.5 text-sm text-ink-600">{r.val}</td>
                      <td className="px-4 py-3.5 pr-6"><Badge tone={alertMeta[r.alert].tone}>{alertMeta[r.alert].label}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center">
          <p className="text-[15px] font-semibold text-ink-800">Inventário por operador</p>
          <p className="mt-1 text-[13px] text-ink-400">O controle de produtos em campo por operador depende do módulo Operacional (Ordens de Serviço) e estará disponível em breve.</p>
        </div>
      )}

      {transfer && <TransferModal bases={bases} onClose={() => setTransfer(false)} onDone={async () => { setTransfer(false); await load(); }} showToast={showToast} />}
      {receber && <ReceberTransferenciaModal transf={receber} onClose={() => setReceber(null)} onDone={async () => { setReceber(null); await load(); }} showToast={showToast} />}

      <ConfirmDialog
        open={!!cancelar}
        onClose={() => setCancelar(null)}
        onConfirm={async () => {
          if (!cancelar) return;
          try { await cancelarTransferencia(cancelar.id); showToast('Transferência cancelada · saldo devolvido à origem'); setCancelar(null); await load(); }
          catch (e) { showToast((e as Error).message); }
        }}
        title={cancelar ? `Cancelar ${cancelar.codigo}` : ''}
        description="O saldo em trânsito volta para a base de origem. Esta ação é registrada."
        confirmLabel="Cancelar transferência"
        cancelLabel="Voltar"
        destructive
      />
    </>
  );
}

function TransferModal({
  bases, onClose, onDone, showToast,
}: {
  bases: { id: string; nome: string }[]; onClose: () => void; onDone: () => void | Promise<void>; showToast: (m: string) => void;
}) {
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [origemLotes, setOrigemLotes] = useState<StockRow[]>([]);
  const [loteKey, setLoteKey] = useState('');
  const [qtd, setQtd] = useState('');
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (bases.length && !origem) setOrigem(bases[0].id); }, [bases, origem]);
  useEffect(() => {
    if (!origem) return;
    listLotes(origem).then((l) => setOrigemLotes(l.filter((x) => x.qtd > 0))).catch(() => setOrigemLotes([]));
    setLoteKey('');
  }, [origem]);

  const sel = origemLotes.find((l) => l.id === loteKey) ?? null;

  const confirm = async () => {
    if (!origem || !destino) return showToast('Selecione origem e destino.');
    if (origem === destino) return showToast('Origem e destino devem ser diferentes.');
    if (!sel) return showToast('Selecione o lote a transferir.');
    const q = Number(qtd);
    if (!q || q <= 0) return showToast('Informe a quantidade.');
    if (q > sel.qtd) return showToast(`Saldo insuficiente (disponível: ${sel.qtd}).`);
    setSaving(true);
    try {
      const codigo = await criarTransferencia({ produto_id: sel.produto_id, base_origem_id: origem, base_destino_id: destino, lote: sel.lote, quantidade: q, motivo: motivo.trim() || undefined });
      showToast(`${codigo} criada · em trânsito (origem abatida)`);
      await onDone();
    } catch (e) { showToast((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose}>
      <div className="flex items-center justify-between border-b border-ink-100 px-7 py-[22px]">
        <h2 className="text-[19px] font-bold text-ink-900">Transferir entre bases</h2>
      </div>
      <div className="flex flex-col gap-3.5 px-7 py-6">
        <div className="grid grid-cols-2 gap-3.5">
          <SelectField label="Origem" value={origem} onChange={(e) => setOrigem(e.target.value)} options={bases.map((b) => ({ value: b.id, label: b.nome }))} />
          <SelectField label="Destino" value={destino} onChange={(e) => setDestino(e.target.value)} options={[{ value: '', label: 'Selecione…' }, ...bases.filter((b) => b.id !== origem).map((b) => ({ value: b.id, label: b.nome }))]} />
        </div>
        <SelectField
          label="Produto + lote"
          value={loteKey}
          onChange={(e) => setLoteKey(e.target.value)}
          options={[{ value: '', label: origemLotes.length ? 'Selecione…' : 'Sem estoque na origem' }, ...origemLotes.map((l) => ({ value: l.id, label: `${l.prod} · ${l.lote} (${l.qtd})` }))]}
        />
        <TextField label="Quantidade" inputMode="numeric" value={qtd} onChange={(e) => setQtd(maskInt(e.target.value))} placeholder="0" />
        <TextareaField label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Descreva o motivo da transferência" />
        <p className="flex items-center gap-1.5 text-[13px] text-ink-400">
          <Info className="h-[17px] w-[17px]" />
          A origem é abatida agora. O destino só é creditado após confirmar o recebimento.
        </p>
      </div>
      <div className="flex gap-3 px-7 pb-6">
        <Button variant="secondary" fullWidth onClick={onClose} className="h-[52px]">Cancelar</Button>
        <Button fullWidth onClick={confirm} disabled={saving} className="h-[52px]">{saving ? 'Enviando…' : 'Enviar (em trânsito)'}</Button>
      </div>
    </Modal>
  );
}

function ReceberTransferenciaModal({
  transf, onClose, onDone, showToast,
}: {
  transf: TransferenciaRow; onClose: () => void; onDone: () => void | Promise<void>; showToast: (m: string) => void;
}) {
  const [qtd, setQtd] = useState(String(transf.enviada));
  const [justificativa, setJustificativa] = useState('');
  const [saving, setSaving] = useState(false);
  const recebida = Number(qtd);
  const divergente = !Number.isNaN(recebida) && recebida !== transf.enviada;

  const confirm = async () => {
    if (!recebida || recebida <= 0) return showToast('Informe a quantidade recebida.');
    if (divergente && !justificativa.trim()) return showToast('Quantidade diverge da enviada: justificativa obrigatória.');
    setSaving(true);
    try {
      await confirmarRecebimentoTransferencia({ id: transf.id, quantidade_recebida: recebida, justificativa: justificativa.trim() || undefined });
      showToast('Recebimento confirmado · estoque do destino atualizado');
      await onDone();
    } catch (e) { showToast((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose}>
      <div className="border-b border-ink-100 px-7 py-[22px]">
        <h2 className="text-[19px] font-bold text-ink-900">Confirmar recebimento</h2>
        <p className="mt-0.5 text-[13px] text-ink-400">{transf.codigo} · {transf.prod} · {transf.origem} → {transf.destino}</p>
      </div>
      <div className="flex flex-col gap-3.5 px-7 py-6">
        <div className="grid grid-cols-2 gap-3.5">
          <TextField label="Quantidade enviada" value={String(transf.enviada)} disabled />
          <TextField label="Quantidade recebida" inputMode="numeric" value={qtd} onChange={(e) => setQtd(maskInt(e.target.value))} placeholder="0" />
        </div>
        {divergente && (
          <>
            <div className="flex items-start gap-2 rounded-[10px] border border-[#f6e0b0] bg-tag-softWarnBg px-3.5 py-3 text-[13px] text-tag-softWarnFg">
              <Info className="h-[17px] w-[17px] shrink-0" />
              A quantidade recebida diverge da enviada. Justifique — fica registrado para auditoria.
            </div>
            <TextareaField label="Justificativa da divergência" required value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Motivo da diferença" />
          </>
        )}
      </div>
      <div className="flex gap-3 px-7 pb-6">
        <Button variant="secondary" fullWidth onClick={onClose} className="h-[52px]">Cancelar</Button>
        <Button fullWidth onClick={confirm} disabled={saving} className="h-[52px]">{saving ? 'Confirmando…' : 'Confirmar recebimento'}</Button>
      </div>
    </Modal>
  );
}
