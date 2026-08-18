import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, ChevronLeft, ChevronRight, FileText, ArrowRightLeft } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SelectField, SearchInput, TextField, TextareaField } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import {
  listOperacional, cancelarOs, listClienteOptions, listFuncionarioOptions, listTiposServico,
  OS_STATUSES, osStatusLabel, type OperacionalRow, type ListOpts,
} from '@/lib/operacional';

export function OperacionalList() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = useAuth();
  const canCreate = can('operacional', 'criar');
  const canEdit = can('operacional', 'editar');
  const canDelete = can('operacional', 'excluir');

  const [rows, setRows] = useState<OperacionalRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalOs, setTotalOs] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState<string | null>(null);
  const [cancel, setCancel] = useState<OperacionalRow | null>(null);
  const [motivo, setMotivo] = useState('');
  const [convert, setConvert] = useState<OperacionalRow | null>(null);

  // Filtros
  const [fKind, setFKind] = useState<ListOpts['kind']>('todos');
  const [fStatus, setFStatus] = useState('todos');
  const [fCliente, setFCliente] = useState('');
  const [fFuncionario, setFFuncionario] = useState('');
  const [fTipo, setFTipo] = useState('');
  const [fDe, setFDe] = useState('');
  const [fAte, setFAte] = useState('');
  const [sort, setSort] = useState<NonNullable<ListOpts['sort']>>('data');

  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [funcionarios, setFuncionarios] = useState<{ id: string; nome: string }[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);

  useEffect(() => {
    listClienteOptions().then(setClientes).catch(() => {});
    listFuncionarioOptions().then((f) => setFuncionarios(f.map((x) => ({ id: x.id, nome: x.nome })))).catch(() => {});
    listTiposServico().then(setTipos).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listOperacional({
        search: debounced, kind: fKind, status: fStatus, clienteId: fCliente || undefined,
        funcionarioId: fFuncionario || undefined, tipoServico: fTipo || undefined,
        de: fDe || undefined, ate: fAte || undefined, sort, page, pageSize,
      });
      setRows(r.rows); setTotal(r.total); setTotalOs(r.totalOs);
    } catch (e) { showToast((e as Error).message); } finally { setLoading(false); }
  }, [debounced, fKind, fStatus, fCliente, fFuncionario, fTipo, fDe, fAte, sort, page, pageSize, showToast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [fKind, fStatus, fCliente, fFuncionario, fTipo, fDe, fAte]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  const openRow = (r: OperacionalRow) => {
    if (r.kind === 'os') navigate(`/operacional/${r.id}`);
    else setConvert(r);
  };
  const doConvert = () => {
    if (!convert) return;
    navigate(`/operacional/nova?orcamento=${convert.id}&cliente=${convert.clienteId}`);
    setConvert(null);
  };
  const doCancel = async () => {
    if (!cancel) return;
    try { await cancelarOs(cancel.id, motivo); showToast(`OS ${cancel.numero} cancelada`); setCancel(null); setMotivo(''); load(); }
    catch (e) { showToast((e as Error).message); }
  };

  const th = 'px-4 py-3 text-left text-xs font-bold uppercase text-ink-400';
  const selCls = 'min-w-[150px]';

  return (
    <>
      <Topbar
        title="Operacional"
        breadcrumb="Início  /  Operacional  /  Ordens de serviço"
        action={
          canCreate ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => showToast('Novo orçamento: módulo Comercial (em breve)')}>Novo orçamento</Button>
              <Button onClick={() => navigate('/operacional/nova')}><Plus className="h-5 w-5" />Nova ordem de serviço</Button>
            </div>
          ) : undefined
        }
      />
      <div className="flex-1 px-8 py-6">
        {/* Busca + contador */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SearchInput containerClassName="w-[340px]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por cliente, nº do orçamento ou nº da OS" />
          <div className="flex items-baseline gap-2 text-[13px] text-ink-500">
            <span className="text-[17px] font-bold text-ink-900">{total}</span> itens · <span className="font-semibold text-ink-700">{totalOs}</span> OS
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-4 flex flex-wrap items-end gap-2.5">
          <SelectField className={selCls} label="Tipo" value={fKind} onChange={(e) => setFKind(e.target.value as ListOpts['kind'])}
            options={[{ value: 'todos', label: 'OS e orçamentos' }, { value: 'os', label: 'Somente OS' }, { value: 'orcamento', label: 'Somente orçamentos' }]} />
          <SelectField className={selCls} label="Status" value={fStatus} onChange={(e) => setFStatus(e.target.value)}
            options={[{ value: 'todos', label: 'Todos os status' }, ...OS_STATUSES.map((s) => ({ value: s, label: osStatusLabel[s] }))]} />
          <SelectField className={selCls} label="Cliente" value={fCliente} onChange={(e) => setFCliente(e.target.value)}
            options={[{ value: '', label: 'Todos os clientes' }, ...clientes.map((c) => ({ value: c.id, label: c.nome }))]} />
          <SelectField className={selCls} label="Funcionário" value={fFuncionario} onChange={(e) => setFFuncionario(e.target.value)}
            options={[{ value: '', label: 'Todos' }, ...funcionarios.map((f) => ({ value: f.id, label: f.nome }))]} />
          <SelectField className={selCls} label="Tipo de serviço" value={fTipo} onChange={(e) => setFTipo(e.target.value)}
            options={[{ value: '', label: 'Todos' }, ...tipos.map((t) => ({ value: t, label: t }))]} />
          <TextField type="date" label="De" className="w-[150px]" value={fDe} onChange={(e) => setFDe(e.target.value)} />
          <TextField type="date" label="Até" className="w-[150px]" value={fAte} onChange={(e) => setFAte(e.target.value)} />
          <SelectField className={selCls} label="Ordenar por" value={sort} onChange={(e) => setSort(e.target.value as NonNullable<ListOpts['sort']>)}
            options={[{ value: 'data', label: 'Data' }, { value: 'cliente', label: 'Cliente' }, { value: 'status', label: 'Status' }, { value: 'valor', label: 'Valor' }]} />
        </div>

        {/* Tabela */}
        <div className="rounded-2xl border border-ink-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse">
              <thead>
                <tr className="bg-ink-50">
                  <th className={cn(th, 'pl-6')}>Nº</th>
                  <th className={th}>Cliente</th>
                  <th className={th}>Tipo de serviço</th>
                  <th className={th}>Data</th>
                  <th className={th}>Funcionários</th>
                  <th className={th}>Origem</th>
                  <th className={th}>Status</th>
                  <th className={th}>Valor</th>
                  <th className={cn(th, 'pr-6 text-right')}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-ink-400">Carregando…</td></tr>}
                {!loading && rows.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-ink-400">Nenhum item encontrado.</td></tr>}
                {!loading && rows.map((r) => (
                  <tr key={`${r.kind}-${r.id}`} onClick={() => openRow(r)} className="cursor-pointer border-t border-ink-100 hover:bg-forest-50/60">
                    <td className="px-4 py-3.5 pl-6 text-sm font-semibold text-forest-900">
                      {r.numero}{r.rascunho && <span className="ml-1.5 rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-500">Rascunho</span>}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-ink-700">{r.cliente}</td>
                    <td className="px-4 py-3.5 text-sm text-ink-600">{r.tipo}</td>
                    <td className="px-4 py-3.5 text-sm text-ink-600">{r.data}</td>
                    <td className="px-4 py-3.5 text-sm text-ink-600">{r.funcionarios}</td>
                    <td className="px-4 py-3.5">
                      <Badge tone={r.kind === 'orcamento' ? 'softWarn' : r.origem === 'avulsa' ? 'muted' : 'info'}>{r.origemLabel}</Badge>
                    </td>
                    <td className="px-4 py-3.5"><Badge tone={r.statusTone}>{r.statusLabel}</Badge></td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-ink-900">{r.valor}</td>
                    <td className="px-4 py-3.5 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <button onClick={() => setMenu(menu === r.id ? null : r.id)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100"><MoreVertical className="h-[18px] w-[18px]" /></button>
                        {menu === r.id && (
                          <div className="absolute right-0 z-10 mt-1 w-52 rounded-xl border border-ink-100 bg-white py-1.5 shadow-modal">
                            {r.kind === 'orcamento' ? (
                              <MenuItem icon={ArrowRightLeft} onClick={() => { setMenu(null); setConvert(r); }}>Converter em OS</MenuItem>
                            ) : (
                              <>
                                <MenuItem onClick={() => { setMenu(null); navigate(`/operacional/${r.id}`); }}>Visualizar</MenuItem>
                                {canEdit && <MenuItem onClick={() => { setMenu(null); navigate(`/operacional/${r.id}?editar=1`); }}>Editar</MenuItem>}
                                {canCreate && <MenuItem onClick={() => { setMenu(null); navigate(`/operacional/${r.id}?duplicar=1`); }}>Duplicar</MenuItem>}
                                <MenuItem icon={FileText} onClick={() => { setMenu(null); showToast('Exportar PDF (em breve)'); }}>Exportar PDF</MenuItem>
                                {canDelete && r.status !== 'cancelada' && r.status !== 'concluida' && (
                                  <MenuItem border danger onClick={() => { setMenu(null); setCancel(r); }}>Cancelar OS</MenuItem>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-6 py-3.5">
            <div className="flex items-center gap-2 text-[13px] text-ink-500">
              Itens por página:
              <SelectField className="w-[80px]" value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} options={[10, 20, 50].map((n) => ({ value: String(n), label: String(n) }))} />
            </div>
            <div className="flex items-center gap-3 text-[13px] text-ink-600">
              Página {page} de {pages}
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-ink-200 p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-ink-200 p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Converter orçamento → OS */}
      <ConfirmDialog
        open={!!convert} onClose={() => setConvert(null)} onConfirm={doConvert}
        title={convert ? `Converter ${convert.numero} em OS` : ''}
        description={`O assistente de criação abrirá com os dados de ${convert?.cliente ?? ''} pré-preenchidos, sem redigitar.`}
        confirmLabel="Converter em OS"
      />

      {/* Cancelar OS (motivo obrigatório) */}
      <ConfirmDialog
        open={!!cancel} onClose={() => { setCancel(null); setMotivo(''); }} onConfirm={doCancel}
        title={cancel ? `Cancelar ${cancel.numero}` : ''}
        description="Informe o motivo. A OS ficará somente leitura após o cancelamento."
        confirmLabel="Confirmar cancelamento" destructive
      >
        <TextareaField label="Motivo do cancelamento" required value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Descreva o motivo…" />
      </ConfirmDialog>
    </>
  );
}

function MenuItem({ children, onClick, icon: Icon, border, danger }: { children: React.ReactNode; onClick: () => void; icon?: React.ComponentType<{ className?: string }>; border?: boolean; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cn('flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-ink-50', border && 'mt-1 border-t border-ink-100 pt-2.5', danger ? 'text-danger-bright' : 'text-ink-700')}>
      {Icon && <Icon className="h-[16px] w-[16px]" />}{children}
    </button>
  );
}
