import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, ChevronLeft, ChevronRight, Link2, FileBadge } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SelectField, SearchInput } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { listClientes, setClienteAtivo, type ClienteRow } from '@/lib/clientes';
import { ClienteFormDrawer } from '@/pages/clientes/ClienteFormDrawer';

export function ClientesList() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = useAuth();
  const canCreate = can('gestao_clientes', 'criar');
  const canEdit = can('gestao_clientes', 'editar');

  const [rows, setRows] = useState<ClienteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ id: string | null } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await listClientes({ search: debounced, page, pageSize }); setRows(r.rows); setTotal(r.total); }
    catch (e) { showToast((e as Error).message); } finally { setLoading(false); }
  }, [debounced, page, pageSize, showToast]);
  useEffect(() => { load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  const toggleAtivo = async (c: ClienteRow) => {
    setMenu(null);
    try { await setClienteAtivo(c.id, !c.ativo); showToast(c.ativo ? 'Cliente inativado' : 'Cliente reativado'); await load(); }
    catch (e) { showToast((e as Error).message); }
  };

  const th = 'px-4 py-3 text-left text-xs font-bold uppercase text-ink-400';

  return (
    <>
      <Topbar
        title="Gestão de Clientes"
        breadcrumb="Início  /  Gestão de Clientes"
        action={canCreate ? <Button onClick={() => setDrawer({ id: null })}><Plus className="h-5 w-5" />Novo cliente</Button> : undefined}
      />
      <div className="flex-1 px-8 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SearchInput containerClassName="w-[320px]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou razão social" />
          <div className="flex items-baseline gap-2 text-[13px] text-ink-500">
            <span className="text-[17px] font-bold text-ink-900">{total}</span> clientes encontrados
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="bg-ink-50">
                  <th className={cn(th, 'pl-6')}>Nome</th>
                  <th className={th}>Razão social</th>
                  <th className={th}>Região</th>
                  <th className={th}>CNPJ / CPF</th>
                  <th className={th}>Endereço</th>
                  <th className={th}>Status</th>
                  <th className={cn(th, 'pr-6 text-right')}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-400">Carregando…</td></tr>}
                {!loading && rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-400">Nenhum cliente encontrado.</td></tr>}
                {!loading && rows.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/clientes/${c.id}`)} className={cn('cursor-pointer border-t border-ink-100 hover:bg-forest-50/60', !c.ativo && 'opacity-60')}>
                    <td className="px-4 py-3.5 pl-6 text-sm font-semibold text-forest-900">{c.nome}</td>
                    <td className="px-4 py-3.5 text-sm text-ink-700">{c.razao}</td>
                    <td className="px-4 py-3.5 text-sm text-ink-700">{c.regiao}</td>
                    <td className="px-4 py-3.5 text-sm text-ink-700">{c.doc}</td>
                    <td className="px-4 py-3.5 text-sm text-ink-600">{c.endereco}</td>
                    <td className="px-4 py-3.5"><Badge tone={c.ativo ? 'success' : 'muted'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
                    <td className="px-4 py-3.5 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                      {(canEdit || canCreate) ? (
                        <div className="relative inline-block">
                          <button onClick={() => setMenu(menu === c.id ? null : c.id)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100"><MoreVertical className="h-[18px] w-[18px]" /></button>
                          {menu === c.id && (
                            <div className="absolute right-0 z-10 mt-1 w-52 rounded-xl border border-ink-100 bg-white py-1.5 shadow-modal">
                              {canEdit && <MenuItem onClick={() => { setMenu(null); setDrawer({ id: c.id }); }}>Editar cliente</MenuItem>}
                              {canCreate && <MenuItem icon={FileBadge} onClick={() => { setMenu(null); showToast('MEC EPF: integração Omie (em breve)'); }}>Criar MEC EPF</MenuItem>}
                              {canCreate && <MenuItem icon={Link2} onClick={() => { setMenu(null); showToast('Link do portal gerado (envio de e-mail em breve)'); }}>Gerar link do portal</MenuItem>}
                              {canEdit && <MenuItem border danger onClick={() => toggleAtivo(c)}>{c.ativo ? 'Inativar cliente' : 'Reativar cliente'}</MenuItem>}
                            </div>
                          )}
                        </div>
                      ) : <span className="text-[13px] text-ink-400">—</span>}
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

      <ClienteFormDrawer
        open={!!drawer}
        clienteId={drawer?.id ?? null}
        onClose={() => setDrawer(null)}
        onSaved={() => { setDrawer(null); load(); }}
      />
    </>
  );
}

function MenuItem({ children, onClick, icon: Icon, border, danger }: { children: React.ReactNode; onClick: () => void; icon?: React.ComponentType<{ className?: string }>; border?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn('flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-ink-50', border && 'mt-1 border-t border-ink-100 pt-2.5', danger ? 'text-danger-bright' : 'text-ink-700')}
    >
      {Icon && <Icon className="h-[16px] w-[16px]" />}{children}
    </button>
  );
}
