import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, ChevronLeft, ChevronRight, Link2, FileBadge, Map, FileCheck2, Users, CheckCircle2, Building2, User } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { KpiCard } from '@/components/ui/KpiCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SelectField, SearchInput } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { listClientes, setClienteAtivo, getKpisClientes, type ClienteRow, type KpisClientes } from '@/lib/clientes';
import { ClienteFormDrawer } from '@/pages/clientes/ClienteFormDrawer';
import { VisualizadorDocumento } from '@/components/VisualizadorDocumento';
import { copiar } from '@/lib/clipboard';
import { useFiltroUrl, usePaginaUrl } from '@/lib/useFiltroUrl';

/** Cor da pill de classificação ABC — a mesma de Garantias. */
const abcClasse: Record<string, string> = {
  A: 'bg-forest-100 text-forest-900',
  B: 'bg-tag-softWarnBg text-tag-warnFg',
  C: 'bg-ink-100 text-ink-500',
};

function BotaoDoc({
  caminho, rotulo, cliente, onAbrir, children,
}: {
  caminho: string | null; rotulo: string; cliente: string;
  onAbrir: (d: { caminho: string; titulo: string; sub: string }) => void;
  children: React.ReactNode;
}) {
  const { showToast } = useToast();
  const tem = !!caminho;
  // Clicável mesmo sem documento, como no protótipo: um botão morto não
  // explica nada, e a frase que o usuário precisa ler é justamente "não há
  // documento publicado para este cliente".
  const clicar = () => {
    if (!caminho) return showToast(`Nenhum ${rotulo.toLowerCase()} publicado para ${cliente}.`);
    onAbrir({ caminho, titulo: `${rotulo}: ${cliente}`, sub: caminho.split('/').pop() ?? '' });
  };
  return (
    <button
      onClick={clicar}
      title={tem ? `${rotulo} publicado para ${cliente} — clique para abrir` : `Sem ${rotulo.toLowerCase()} publicado para este cliente`}
      aria-label={tem ? `Abrir ${rotulo.toLowerCase()} de ${cliente}` : `Sem ${rotulo.toLowerCase()} publicado para ${cliente}`}
      className={cn(
        'rounded-lg border p-1.5 transition-colors',
        tem
          ? 'border-forest-accent bg-forest-50 text-forest-700 hover:bg-forest-100'
          : 'border-ink-100 bg-white text-ink-200 hover:border-ink-200 hover:text-ink-400',
      )}
    >
      {children}
    </button>
  );
}

export function ClientesList() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = useAuth();
  const canCreate = can('gestao_clientes', 'criar');
  const canEdit = can('gestao_clientes', 'editar');

  const [rows, setRows] = useState<ClienteRow[]>([]);
  const [total, setTotal] = useState(0);
  // Busca e página na URL: abrir um cliente e voltar deixava de manter a busca.
  const [page, setPage] = usePaginaUrl();
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useFiltroUrl('q', '');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState<string | null>(null);
  const [kpis, setKpis] = useState<KpisClientes | null>(null);
  const [doc, setDoc] = useState<{ caminho: string; titulo: string; sub: string } | null>(null);

  /**
   * Copia o endereço do Portal do Cliente.
   *
   * Não é um link por cliente: o portal exige login, e quem decide o que a
   * pessoa vê é o vínculo criado no convite. Um endereço "do cliente" daria a
   * impressão de acesso direto, que não existe — e não deveria existir.
   */
  const copiarLinkPortal = async () => {
    const url = import.meta.env.VITE_PORTAL_URL ?? 'https://cliente.ecomax.com.br';
    showToast(await copiar(url)
      ? 'Endereço do portal copiado. O acesso é liberado pelo convite, na aba Usuários do portal.'
      : `Copie manualmente: ${url}`);
  };
  const [drawer, setDrawer] = useState<{ id: string | null } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Os KPIs vêm junto: inativar um cliente pela própria tela muda "Ativos",
      // e um número que só atualiza no F5 é pior do que número nenhum.
      const [r, k] = await Promise.all([listClientes({ search: debounced, page, pageSize }), getKpisClientes()]);
      setRows(r.rows); setTotal(r.total); setKpis(k);
    }
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
        <div className="mb-5 grid grid-cols-4 gap-3.5">
          <KpiCard icon={Users} tone="green" value={kpis?.total ?? '—'} label="Total na base" />
          <KpiCard icon={CheckCircle2} tone="blue" value={kpis?.ativos ?? '—'} label="Ativos" />
          <KpiCard icon={Building2} tone="muted" value={kpis?.pj ?? '—'} label="Pessoa Jurídica" />
          <KpiCard icon={User} tone="amber" value={kpis?.pf ?? '—'} label="Pessoa Física" />
        </div>
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
                  <th className={th}>ABC</th>
                  <th className={th}>Razão social</th>
                  <th className={th}>Documentos</th>
                  <th className={th}>Gestor responsável</th>
                  <th className={th}>Região da cidade</th>
                  <th className={th}>CNPJ</th>
                  <th className={th}>CPF</th>
                  <th className={th}>Endereço</th>
                  <th className={cn(th, 'pr-6 text-right')}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-ink-400">Carregando…</td></tr>}
                {!loading && rows.length === 0 && <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-ink-400">Nenhum cliente encontrado.</td></tr>}
                {!loading && rows.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/clientes/${c.id}`)} className={cn('cursor-pointer border-t border-ink-100 hover:bg-forest-50/60',
                    // A opacidade fica só no texto dos dados. Antes ela cobria a
                    // linha inteira, e o menu de ações desbotava junto — quem
                    // queria reativar o cliente mal enxergava o botão para isso.
                    !c.ativo && '[&>td:not(:last-child)]:opacity-60')}>
                    <td className="px-4 py-3.5 pl-6 text-sm">
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-forest-900">{c.nome}</span>
                        {!c.ativo && <Badge tone="muted">Inativo</Badge>}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {c.abc
                        ? <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', abcClasse[c.abc] ?? 'bg-ink-100 text-ink-500')}>{c.abc}</span>
                        : <span className="text-[13px] text-ink-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-ink-700">{c.razao}</td>
                    {/* Os dois documentos que o cliente vê no portal. O botão
                        desabilitado diz no title por que está desabilitado —
                        "sem mapeamento" é informação, e some se o ícone
                        simplesmente não aparecer. */}
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <span className="flex items-center gap-1.5">
                        <BotaoDoc
                          caminho={c.mapeamentoPath}
                          rotulo="Mapeamento"
                          cliente={c.nome}
                          onAbrir={setDoc}
                        >
                          <Map className="h-4 w-4" />
                        </BotaoDoc>
                        <BotaoDoc
                          caminho={c.relatorioPath}
                          rotulo="Relatório técnico"
                          cliente={c.nome}
                          onAbrir={setDoc}
                        >
                          <FileCheck2 className="h-4 w-4" />
                        </BotaoDoc>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-ink-700">
                      {c.gestor ?? <span className="text-ink-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-ink-700">{c.regiao}</td>
                    <td className="px-4 py-3.5 text-sm text-ink-700">{c.cnpj ?? <span className="text-ink-300">—</span>}</td>
                    <td className="px-4 py-3.5 text-sm text-ink-700">{c.cpf ?? <span className="text-ink-300">—</span>}</td>
                    <td className="px-4 py-3.5 text-sm text-ink-600">{c.endereco}</td>
                    <td className="px-4 py-3.5 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                      {(canEdit || canCreate) ? (
                        <div className="relative inline-block">
                          <button onClick={() => setMenu(menu === c.id ? null : c.id)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100"><MoreVertical className="h-[18px] w-[18px]" /></button>
                          {menu === c.id && (
                            <div className="absolute right-0 z-10 mt-1 w-52 rounded-xl border border-ink-100 bg-white py-1.5 shadow-modal">
                              {canEdit && <MenuItem onClick={() => { setMenu(null); setDrawer({ id: c.id }); }}>Editar cliente</MenuItem>}
                              {/* MEC EPF nasce da integração com o Omie, que é escopo da Release 4
    (Financeiro). Fica desabilitado e dizendo por quê, em vez de um botão
    que parece funcionar e devolve um aviso. */}
{canCreate && (
  <MenuItem
    icon={FileBadge}
    disabled
    title="Depende da integração Omie, prevista para a Release 4 (Financeiro)"
  >
    Criar MEC EPF · Release 4
  </MenuItem>
)}
                              {canCreate && (
  <MenuItem icon={Link2} onClick={() => { setMenu(null); copiarLinkPortal(); }}>
    Copiar link do portal
  </MenuItem>
)}
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
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-ink-200 p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-ink-200 p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
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
      {doc && <VisualizadorDocumento doc={doc} onClose={() => setDoc(null)} />}
    </>
  );
}

function MenuItem({ children, onClick, icon: Icon, border, danger, disabled, title }: { children: React.ReactNode; onClick?: () => void; icon?: React.ComponentType<{ className?: string }>; border?: boolean; danger?: boolean; disabled?: boolean; title?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn('flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-ink-50', border && 'mt-1 border-t border-ink-100 pt-2.5', danger ? 'text-danger-bright' : 'text-ink-700', disabled && 'cursor-not-allowed text-ink-400 hover:bg-transparent')}
    >
      {Icon && <Icon className="h-[16px] w-[16px]" />}{children}
    </button>
  );
}
