import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Paperclip, MoreVertical, Check, X, Copy, Pencil, Trash2, Filter } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { SearchInput, SelectField } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import {
  listFollowUps, filtrarPorAba, excluirFollowUp, duplicarFollowUp, atualizarFollowUp,
  fupTone, FUP_STATUS, type FollowUpRow, type FupAba,
} from '@/lib/comercial';
import { FollowUpDrawer } from './FollowUpDrawer';
import { FiltrosSalvosDrawer } from './FiltrosSalvos';

const ABAS: { key: FupAba; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'atraso', label: 'Em atraso' },
  { key: 'proximos7', label: 'Próximos 7 dias' },
  { key: 'todos', label: 'Todos' },
];

const TH = 'px-4 py-2.5 text-left text-xs font-bold uppercase text-ink-400';

/** Tela 5.1 - Follow-ups. */
export function FollowUps() {
  const { showToast } = useToast();
  const { can } = useAuth();
  const canCreate = can('comercial', 'criar');
  const canEdit = can('comercial', 'editar');
  const canDelete = can('comercial', 'excluir');

  const [rows, setRows] = useState<FollowUpRow[]>([]);
  const [aba, setAba] = useState<FupAba>('hoje');
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState<{ open: boolean; edit?: FollowUpRow }>({ open: false });
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [del, setDel] = useState<FollowUpRow | null>(null);
  const [motivo, setMotivo] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    listFollowUps().then(setRows).catch((e) => showToast((e as Error).message)).finally(() => setLoading(false));
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const visiveis = useMemo(() => {
    let r = filtrarPorAba(rows, aba);
    if (status !== 'todos') r = r.filter((x) => x.status === status);
    const q = busca.trim().toLowerCase();
    if (q) r = r.filter((x) => `${x.cliente} ${x.orcamento} ${x.descricao}`.toLowerCase().includes(q));
    return r;
  }, [rows, aba, status, busca]);

  const acao = async (fn: () => Promise<unknown>, ok: string) => {
    setMenu(null);
    try { await fn(); showToast(ok); load(); } catch (e) { showToast((e as Error).message); }
  };

  const confirmarExclusao = async () => {
    if (!del) return;
    try {
      await excluirFollowUp(del.id, motivo);
      setDel(null); setMotivo(''); showToast('Follow-up excluído'); load();
    } catch (e) { showToast((e as Error).message); }
  };

  return (
    <>
      <Topbar title="Follow-ups" breadcrumb="Início  /  Comercial  /  Follow-ups" />
      <div className="flex-1 px-8 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs tabs={ABAS} value={aba} onChange={setAba} />
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Cliente, orçamento ou descrição" />
            <SelectField
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[{ value: 'todos', label: 'Todos os status' }, ...FUP_STATUS.map((s) => ({ value: s, label: s }))]}
            />
            <Button variant="secondary" onClick={() => setFiltrosOpen(true)}><Filter className="h-4 w-4" />Filtros salvos</Button>
            {canCreate && <Button onClick={() => setDrawer({ open: true })}><Plus className="h-4 w-4" />Novo follow-up</Button>}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-ink-50">
                <th className={cn(TH, 'pl-6')}>Cliente</th>
                <th className={TH}>Orçamento</th>
                <th className={TH}>Data registro</th>
                <th className={TH}>Data ação</th>
                <th className={TH}>Status</th>
                <th className={TH}>Descrição</th>
                <th className={cn(TH, 'pr-6 text-right')}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-400">Carregando…</td></tr>}
              {!loading && visiveis.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-400">
                  {rows.length === 0 ? 'Nenhum follow-up cadastrado.' : 'Nenhum follow-up para este recorte.'}
                </td></tr>
              )}
              {visiveis.map((f) => (
                <tr
                  key={f.id}
                  onClick={() => canEdit && setDrawer({ open: true, edit: f })}
                  className={cn(
                    'border-t border-ink-100',
                    canEdit && 'cursor-pointer hover:bg-ink-50/60',
                    // Sinalizações do Discovery: o que vence hoje ganha fundo
                    // laranja, e o que já passou ganha a barra vermelha.
                    f.doDia && !f.emAtraso && 'bg-[#fff8ef]',
                    f.emAtraso && 'bg-[#fff4f0]',
                  )}
                >
                  <td className="relative px-4 py-3 pl-6 text-sm font-medium text-ink-800">
                    {f.emAtraso && <span className="absolute left-0 top-0 h-full w-[3px] bg-danger-bright" />}
                    <span className="flex items-center gap-1.5">
                      {f.cliente}
                      {f.anexos > 0 && <Paperclip className="h-3.5 w-3.5 text-ink-400" aria-label={`${f.anexos} anexo(s)`} />}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-600">{f.orcamento}</td>
                  <td className="px-4 py-3 text-sm text-ink-500">{f.dataRegistroBr}</td>
                  <td className={cn('px-4 py-3 text-sm', f.emAtraso ? 'font-semibold text-danger-bright' : 'text-ink-600')}>
                    {f.dataAcaoBr}
                  </td>
                  <td className="px-4 py-3"><Badge tone={fupTone[f.status] ?? 'muted'}>{f.status}</Badge></td>
                  <td className="max-w-[280px] truncate px-4 py-3 text-sm text-ink-600">{f.descricao || '—'}</td>
                  <td className="relative px-4 py-3 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setMenu(menu === f.id ? null : f.id)}
                      aria-label={`Ações de ${f.cliente}`}
                      className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-ink-500 hover:text-ink-900"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menu === f.id && (
                      <div className="absolute right-6 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-lg">
                        {canEdit && <Item icon={Pencil} onClick={() => { setMenu(null); setDrawer({ open: true, edit: f }); }}>Editar</Item>}
                        {canEdit && f.status !== 'Concluído' && (
                          <Item icon={Check} onClick={() => acao(() => atualizarFollowUp(f.id, { status: 'Concluído' }), 'Follow-up concluído')}>
                            Concluir
                          </Item>
                        )}
                        {canEdit && f.status === 'Em espera' && (
                          <Item icon={X} onClick={() => acao(() => atualizarFollowUp(f.id, { status: 'Cancelado' }), 'Follow-up cancelado')}>
                            Cancelar
                          </Item>
                        )}
                        {canCreate && <Item icon={Copy} onClick={() => acao(() => duplicarFollowUp(f.id), 'Follow-up duplicado')}>Duplicar</Item>}
                        {canDelete && (
                          <Item icon={Trash2} danger onClick={() => { setMenu(null); setDel(f); }}>Excluir</Item>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[13px] text-ink-400">
          Linhas em laranja vencem hoje; em vermelho, estão em atraso.{' '}
          <Link to="/comercial" className="font-semibold text-forest-700 hover:underline">Voltar ao Comercial</Link>
        </p>
      </div>

      {drawer.open && (
        <FollowUpDrawer
          followUp={drawer.edit}
          onClose={() => setDrawer({ open: false })}
          onSaved={() => { setDrawer({ open: false }); load(); }}
        />
      )}

      {filtrosOpen && <FiltrosSalvosDrawer modulo="comercial" onClose={() => setFiltrosOpen(false)} />}

      {del && (
        <ConfirmDialog
          open
          title="Excluir follow-up"
          description={`Excluir o follow-up de ${del.cliente}? Informe o motivo — ele fica registrado na auditoria.`}
          confirmLabel="Excluir"
          destructive
          onClose={() => { setDel(null); setMotivo(''); }}
          onConfirm={confirmarExclusao}
        >
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo da exclusão"
            aria-label="Motivo da exclusão"
            className="mt-3 w-full rounded-[10px] border border-ink-200 bg-white px-3.5 py-3 text-sm text-ink-800 outline-none placeholder:text-ink-400"
            rows={3}
          />
        </ConfirmDialog>
      )}
    </>
  );
}

function Item({
  icon: Icon, children, onClick, danger,
}: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] hover:bg-ink-50',
        danger ? 'text-danger-bright' : 'text-ink-700',
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}
