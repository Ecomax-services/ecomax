import { useState } from 'react';
import { Plus, GitBranch, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SelectField, SearchInput, TextField, TextareaField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { REQ_ROWS, reqStatusTone, type ReqRow, type ReqStatus } from '@/data/estoque';

export function Requisicoes() {
  const { showToast } = useToast();
  const { can } = useAuth();
  const canCreate = can('estoque', 'criar');
  const canEdit = can('estoque', 'editar');
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('todos');
  const [solic, setSolic] = useState('todos');
  const [overrides, setOverrides] = useState<Record<string, ReqStatus>>({});
  const [drawer, setDrawer] = useState(false);
  const [receber, setReceber] = useState<ReqRow | null>(null);
  const [reject, setReject] = useState<ReqRow | null>(null);
  const [cancel, setCancel] = useState<ReqRow | null>(null);

  const setStatus = (cod: string, s: ReqStatus) => setOverrides((o) => ({ ...o, [cod]: s }));

  const rows = REQ_ROWS.map((r) => ({ ...r, status: overrides[r.cod] ?? r.status })).filter((r) => {
    if (!`${r.cod} ${r.prod} ${r.forn}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusF !== 'todos' && r.status !== statusF) return false;
    if (solic !== 'todos' && r.solic !== solic) return false;
    return true;
  });

  const th = 'px-4 py-3 text-left text-xs font-bold uppercase text-ink-400';

  return (
    <>
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] font-bold text-ink-900">{rows.length}</span>
          <span className="text-[15px] text-ink-500">requisições</span>
        </div>
        {canCreate && <Button onClick={() => setDrawer(true)}><Plus className="h-5 w-5" />Nova requisição</Button>}
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-[#f6e0b0] bg-tag-softWarnBg px-[18px] py-3 text-[13px] text-tag-softWarnFg">
        <GitBranch className="h-[18px] w-[18px]" />
        Fluxo de aprovação em 2 níveis (solicitante → aprovador). "Receber" exige NF e atualiza o estoque.
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput containerClassName="w-[280px]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar código, produto ou fornecedor" />
        <SelectField value={statusF} onChange={(e) => setStatusF(e.target.value)} options={[{ value: 'todos', label: 'Todos os status' }, { value: 'Aguardando aprovação', label: 'Aguardando aprovação' }, { value: 'Aprovada', label: 'Aprovada' }, { value: 'Enviada', label: 'Enviada' }, { value: 'Recebida', label: 'Recebida' }, { value: 'Recusada', label: 'Recusada' }, { value: 'Cancelada', label: 'Cancelada' }]} />
        <SelectField value={solic} onChange={(e) => setSolic(e.target.value)} options={[{ value: 'todos', label: 'Todos os solicitantes' }, { value: 'Patrícia Gomes', label: 'Patrícia Gomes' }, { value: 'Eliana Martins', label: 'Eliana Martins' }]} />
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
              {rows.map((r) => (
                <tr key={r.cod} className="border-t border-ink-100">
                  <td className="px-4 py-3.5 pl-6 text-sm font-semibold text-forest-900">{r.cod}</td>
                  <td className="px-4 py-3.5 text-sm text-ink-800">
                    {r.prod}
                    <div className="text-xs text-ink-400">{r.qtd} · {r.solic}</div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-ink-700">{r.forn}</td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-ink-900">{r.valor}</td>
                  <td className="px-4 py-3.5"><Badge tone={reqStatusTone[r.status]}>{r.status}</Badge></td>
                  <td className="px-4 py-3.5 pr-6 text-right">
                    {!canEdit && <span className="text-[13px] text-ink-400">—</span>}
                    <div className={cn('inline-flex flex-wrap justify-end gap-2', !canEdit && 'hidden')}>
                      {r.status === 'Aguardando aprovação' && (
                        <>
                          <ActionBtn tone="green" onClick={() => { setStatus(r.cod, 'Aprovada'); showToast(`${r.cod} aprovada (nível 1 → 2) · auditada`); }}>Aprovar</ActionBtn>
                          <ActionBtn tone="red" onClick={() => setReject(r)}>Recusar</ActionBtn>
                        </>
                      )}
                      {r.status === 'Aprovada' && (
                        <ActionBtn tone="blue" onClick={() => { setStatus(r.cod, 'Enviada'); showToast(`${r.cod} marcada como enviada ao fornecedor`); }}>Marcar enviada</ActionBtn>
                      )}
                      {r.status === 'Enviada' && (
                        <ActionBtn tone="primary" onClick={() => setReceber(r)}>Receber</ActionBtn>
                      )}
                      {!['Recebida', 'Cancelada', 'Recusada'].includes(r.status) && (
                        <ActionBtn tone="ghost" onClick={() => setCancel(r)}>Cancelar</ActionBtn>
                      )}
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
        subtitle="Manual ou a partir de cotação"
        footer={
          <>
            <Button variant="secondary" fullWidth onClick={() => setDrawer(false)} className="h-[52px]">Cancelar</Button>
            <Button fullWidth onClick={() => { setDrawer(false); showToast('Requisição criada · aguardando aprovação'); }} className="h-[52px]">Criar requisição</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[2fr_1fr] gap-3.5">
            <SelectField label="Produto" required><option>Inseticida Permetrina 500ml</option><option>Raticida Brodifacoum Blocos</option></SelectField>
            <TextField label="Qtd" placeholder="0" />
          </div>
          <SelectField label="Fornecedor"><option>Química Brasil</option><option>PestControl Ltda</option></SelectField>
          <SelectField label="Aprovador (nível 2)"><option>Eliana Martins</option><option>Marina Lopes</option></SelectField>
          <TextareaField label="Justificativa" placeholder="Motivo da compra" />
        </div>
      </Drawer>

      {/* Modal: receber */}
      {receber && (
        <Modal open onClose={() => setReceber(null)}>
          <div className="flex items-center justify-between border-b border-ink-100 px-7 py-[22px]">
            <div>
              <h2 className="text-[19px] font-bold text-ink-900">Receber requisição</h2>
              <p className="mt-0.5 text-[13px] text-ink-400">{receber.cod} · {receber.prod}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3.5 px-7 py-6">
            <div className="grid grid-cols-2 gap-3.5">
              <TextField label="Quantidade recebida" defaultValue={receber.qtd} />
              <TextField label="Lote" placeholder="Lote recebido" />
            </div>
            <TextField label="Validade" placeholder="mm/aaaa" />
            <button className="flex w-full items-center gap-2 rounded-[9px] border border-dashed border-ink-200 bg-ink-50 px-3.5 py-3 text-[13px] font-semibold text-ink-700">
              <Upload className="h-[18px] w-[18px]" />
              Anexar NF (obrigatória)
            </button>
          </div>
          <div className="flex gap-3 px-7 pb-6">
            <Button variant="secondary" fullWidth onClick={() => setReceber(null)} className="h-[52px]">Cancelar</Button>
            <Button fullWidth onClick={() => { setStatus(receber.cod, 'Recebida'); setReceber(null); showToast('Recebimento confirmado · estoque atualizado'); }} className="h-[52px]">Confirmar recebimento</Button>
          </div>
        </Modal>
      )}

      {/* Recusar */}
      <ConfirmDialog
        open={!!reject}
        onClose={() => setReject(null)}
        onConfirm={() => { if (reject) { setStatus(reject.cod, 'Recusada'); showToast(`${reject.cod} recusada · solicitante notificado`); } setReject(null); }}
        title={reject ? `Recusar ${reject.cod}` : ''}
        description="A recusa notifica o solicitante e é registrada na auditoria."
        confirmLabel="Recusar requisição"
        cancelLabel="Voltar"
        destructive
      >
        <TextareaField label="Justificativa" required placeholder="Motivo da recusa" />
      </ConfirmDialog>

      {/* Cancelar */}
      <ConfirmDialog
        open={!!cancel}
        onClose={() => setCancel(null)}
        onConfirm={() => { if (cancel) { setStatus(cancel.cod, 'Cancelada'); showToast(`${cancel.cod} cancelada · registrado na auditoria`); } setCancel(null); }}
        title={cancel ? `Cancelar ${cancel.cod}` : ''}
        description="O cancelamento é registrado na auditoria com o motivo informado."
        confirmLabel="Cancelar requisição"
        cancelLabel="Voltar"
        destructive
      >
        <TextareaField label="Justificativa" required placeholder="Motivo do cancelamento" />
      </ConfirmDialog>
    </>
  );
}

function ActionBtn({ tone, children, onClick }: { tone: 'green' | 'red' | 'blue' | 'primary' | 'ghost'; children: React.ReactNode; onClick: () => void }) {
  const map: Record<string, string> = {
    green: 'bg-greenSoft text-forest-900',
    red: 'bg-[#fff2ee] text-danger-bright',
    blue: 'bg-tag-infoBg text-[#26408a]',
    primary: 'bg-forest-600 text-white',
    ghost: 'border border-ink-200 bg-white text-ink-500',
  };
  return (
    <button onClick={onClick} className={cn('rounded-lg px-3.5 py-2 text-[13px] font-semibold', map[tone])}>
      {children}
    </button>
  );
}
