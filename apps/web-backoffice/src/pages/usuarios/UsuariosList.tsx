import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge as BadgeIcon,
  UserX,
  CalendarX,
  UserRoundX,
  UserPlus,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  Check,
  MoreVertical,
  Pencil,
  Eye,
  ToggleRight,
  CheckCircle2,
  Ban,
} from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/KpiCard';
import { Segmented } from '@/components/ui/Segmented';
import { SelectField, SearchInput } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { docTone, type Usuario, type DocState } from '@/data/usuarios';
import {
  listFuncionarios,
  getKpis,
  setAtivo as apiSetAtivo,
  bulkSetAtivo,
  distinctValues,
  listGestores,
  type ListFilter,
  type Kpis,
} from '@/lib/funcionarios';

const PAGE_SIZE = 5;

const filters: { key: ListFilter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'ativos', label: 'Ativos' },
  { key: 'inativos', label: 'Inativos' },
  { key: 'vencimentos', label: 'Vencimentos ≤30d' },
];

function VectoBadge({ date, state }: { date: string; state: DocState }) {
  return <Badge tone={docTone[state]}>{date}</Badge>;
}

export function UsuariosList() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = useAuth();
  const canCreate = can('gestao_usuarios', 'criar');
  const canEdit = can('gestao_usuarios', 'editar');

  const [filter, setFilter] = useState<ListFilter>('todos');
  const [search, setSearch] = useState('');
  const [cargo, setCargo] = useState('todos');
  const [setor, setSetor] = useState('todos');
  const [gestor, setGestor] = useState('todos');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [rowMenu, setRowMenu] = useState<string | null>(null);

  const [rows, setRows] = useState<Usuario[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<Kpis>({ ativos: 0, inativos: 0, vencidos: 0, semAcesso: 0 });

  const [cargoOpts, setCargoOpts] = useState<{ value: string; label: string }[]>([]);
  const [setorOpts, setSetorOpts] = useState<{ value: string; label: string }[]>([]);
  const [gestorOpts, setGestorOpts] = useState<{ value: string; label: string }[]>([]);

  // Opções dos selects (uma vez).
  useEffect(() => {
    distinctValues('cargo').then((v) =>
      setCargoOpts([{ value: 'todos', label: 'Todos os cargos' }, ...v.map((x) => ({ value: x, label: x }))]),
    );
    distinctValues('setor').then((v) =>
      setSetorOpts([{ value: 'todos', label: 'Todos os setores' }, ...v.map((x) => ({ value: x, label: x }))]),
    );
    listGestores().then((g) =>
      setGestorOpts([{ value: 'todos', label: 'Todos os gestores' }, ...g.map((x) => ({ value: x.id, label: x.nome }))]),
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, k] = await Promise.all([
        listFuncionarios({ filtro: filter, cargo, setor, gestor, search, page, pageSize: PAGE_SIZE }),
        getKpis(),
      ]);
      setRows(list.rows);
      setTotal(list.total);
      setKpis(k);
    } catch (e) {
      showToast((e as Error).message || 'Erro ao carregar funcionários');
    } finally {
      setLoading(false);
    }
  }, [filter, cargo, setor, gestor, search, page, showToast]);

  // Debounce das mudanças (evita 1 query por tecla na busca).
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const kpiCards = [
    { icon: BadgeIcon, tone: 'green' as const, label: 'Funcionários ativos', value: kpis.ativos },
    { icon: UserX, tone: 'muted' as const, label: 'Inativos', value: kpis.inativos },
    { icon: CalendarX, tone: 'red' as const, label: 'ASO / CNH vencidos', value: kpis.vencidos },
    { icon: UserRoundX, tone: 'amber' as const, label: 'Sem acesso à plataforma', value: kpis.semAcesso },
  ];

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const curPage = Math.min(page, pages);
  const start = (curPage - 1) * PAGE_SIZE;

  const resetPage = () => {
    setPage(1);
    setSelected([]);
  };

  const toggleSelect = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allPageSelected = rows.length > 0 && rows.every((u) => selected.includes(u.id));
  const toggleSelectAll = () => {
    const ids = rows.map((u) => u.id);
    setSelected((s) => (ids.every((i) => s.includes(i)) ? s.filter((i) => !ids.includes(i)) : [...new Set([...s, ...ids])]));
  };

  const doSetStatus = async (u: Usuario) => {
    const ativar = u.status !== 'Ativo';
    setRowMenu(null);
    try {
      await apiSetAtivo(u.id, ativar, u.name);
      showToast(`${u.name.split(' ')[0]}${ativar ? ' ativado' : ' inativado'} · registrado na auditoria`);
      await load();
    } catch (e) {
      showToast((e as Error).message);
    }
  };

  const bulk = async (ativar: boolean) => {
    try {
      await bulkSetAtivo(selected, ativar);
      setSelected([]);
      showToast('Ação em lote aplicada · registrada na auditoria');
      await load();
    } catch (e) {
      showToast((e as Error).message);
    }
  };

  const exportCsv = async (onlySelected: boolean) => {
    const all = await listFuncionarios({ filtro: filter, cargo, setor, gestor, search, page: 1, pageSize: 1000 });
    const list = onlySelected ? all.rows.filter((u) => selected.includes(u.id)) : all.rows;
    const head = ['Nome', 'CPF', 'Cargo', 'Setor', 'Gestor', 'Status', 'Vecto ASO', 'Vecto CNH'];
    const lines = [head.join(';')].concat(
      list.map((u) =>
        [u.name, u.cpf, u.cargo, u.setor, u.gestor, u.status, u.aso, u.cnh]
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(';'),
      ),
    );
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'funcionarios.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`CSV exportado (${list.length} registros)`);
  };

  const exportPdf = async () => {
    const all = await listFuncionarios({ filtro: filter, cargo, setor, gestor, search, page: 1, pageSize: 1000 });
    const list = all.rows;
    const cells = list
      .map(
        (u) =>
          `<tr><td>${u.name}</td><td>${u.cpf}</td><td>${u.cargo}</td><td>${u.setor}</td><td>${u.gestor}</td><td>${u.status}</td><td>${u.aso}</td><td>${u.cnh}</td></tr>`,
      )
      .join('');
    const html = `<html><head><title>Funcionários</title><style>body{font-family:Arial;padding:24px;color:#151619}h1{font-size:18px}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}th,td{border:1px solid #d8dadf;padding:8px 10px;text-align:left}th{background:#f7f7f8}</style></head><body><h1>Gestão de Usuários — Funcionários (${list.length})</h1><table><thead><tr><th>Nome</th><th>CPF</th><th>Cargo</th><th>Setor</th><th>Gestor</th><th>Status</th><th>ASO</th><th>CNH</th></tr></thead><tbody>${cells}</tbody></table></body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 400);
    }
    showToast(`PDF gerado (${list.length} registros)`);
  };

  const th = 'px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ink-400';

  return (
    <>
      <Topbar
        title="Gestão de Usuários"
        breadcrumb="Início  /  Gestão de Usuários"
        action={
          canCreate ? (
            <Button onClick={() => navigate('/usuarios/novo')}>
              <UserPlus className="h-5 w-5" />
              Cadastrar novo usuário
            </Button>
          ) : undefined
        }
      />

      <div className="flex-1 px-8 py-7">
        <div className="mb-6 grid grid-cols-4 gap-4">
          {kpiCards.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-5">
          <Segmented options={filters} value={filter} onChange={(f) => { setFilter(f); resetPage(); }} />
          <div className="flex items-center gap-3">
            <div className="relative w-[300px]">
              <SearchInput
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Buscar por nome ou CPF"
              />
            </div>
            <Button variant="secondary" size="sm" onClick={() => exportCsv(false)}>
              <Download className="h-[18px] w-[18px]" />
              CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={exportPdf}>
              <FileText className="h-[18px] w-[18px]" />
              PDF
            </Button>
          </div>
        </div>

        <div className="mb-[18px] flex flex-wrap items-center gap-3">
          <SelectField className="min-w-[180px]" value={cargo} onChange={(e) => { setCargo(e.target.value); resetPage(); }} options={cargoOpts} />
          <SelectField className="min-w-[180px]" value={setor} onChange={(e) => { setSetor(e.target.value); resetPage(); }} options={setorOpts} />
          <SelectField className="min-w-[180px]" value={gestor} onChange={(e) => { setGestor(e.target.value); resetPage(); }} options={gestorOpts} />
        </div>

        {selected.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#cfeccf] bg-[#eef7ee] px-[18px] py-3">
            <span className="text-sm font-semibold text-forest-900">{selected.length} selecionado(s)</span>
            <div className="flex flex-wrap gap-2.5">
              {canEdit && (
                <>
                  <button onClick={() => bulk(true)} className="flex items-center gap-1.5 rounded-[9px] bg-greenSoft px-4 py-2 text-[13px] font-semibold text-forest-900">
                    <CheckCircle2 className="h-[18px] w-[18px]" />
                    Ativar em lote
                  </button>
                  <button onClick={() => bulk(false)} className="flex items-center gap-1.5 rounded-[9px] bg-[#fff2ee] px-4 py-2 text-[13px] font-semibold text-danger-bright">
                    <Ban className="h-[18px] w-[18px]" />
                    Inativar em lote
                  </button>
                </>
              )}
              <button onClick={() => exportCsv(true)} className="flex items-center gap-1.5 rounded-[9px] border border-ink-200 bg-white px-4 py-2 text-[13px] font-semibold text-ink-700">
                <Download className="h-[18px] w-[18px]" />
                Exportar CSV
              </button>
              <button onClick={() => setSelected([])} className="px-2 py-2 text-[13px] font-semibold text-ink-500">
                Limpar
              </button>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-ink-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1160px] border-collapse">
              <thead>
                <tr className="bg-ink-50">
                  <th className="w-5 px-5 py-3">
                    <Checkbox checked={allPageSelected} onClick={toggleSelectAll} />
                  </th>
                  <th className={th}>Funcionário</th>
                  <th className={th}>Cargo</th>
                  <th className={th}>Setor</th>
                  <th className={th}>Gestor</th>
                  <th className={th}>Status</th>
                  <th className={th}>Vecto ASO</th>
                  <th className={th}>Vecto CNH</th>
                  <th className={cn(th, 'text-right')}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-ink-400">
                      {loading ? 'Carregando…' : 'Nenhum funcionário encontrado.'}
                    </td>
                  </tr>
                )}
                {rows.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => navigate(`/usuarios/${u.id}`)}
                    className={cn('cursor-pointer border-t border-ink-100 hover:bg-forest-50/60', selected.includes(u.id) && 'bg-[#f2f9f2]')}
                  >
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.includes(u.id)} onClick={() => toggleSelect(u.id)} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-forest-700 text-[13px] font-bold text-white">
                          {u.initials}
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-ink-800">{u.name}</div>
                          <div className="text-xs text-ink-400">{u.cpf}</div>
                          {!u.access && (
                            <span className="mt-1 inline-block rounded-md bg-tag-softWarnBg px-2 py-0.5 text-[11px] font-semibold text-tag-warnFg">
                              Sem credenciais
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-ink-700">{u.cargo}</td>
                    <td className="px-4 py-3.5 text-sm text-ink-700">{u.setor}</td>
                    <td className="px-4 py-3.5 text-sm text-ink-700">{u.gestor}</td>
                    <td className="px-4 py-3.5">
                      <Badge tone={u.status === 'Ativo' ? 'success' : 'muted'}>{u.status}</Badge>
                    </td>
                    <td className="px-4 py-3.5"><VectoBadge date={u.aso} state={u.asoState} /></td>
                    <td className="px-4 py-3.5"><VectoBadge date={u.cnh} state={u.cnhState} /></td>
                    <td className="relative px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setRowMenu((m) => (m === u.id ? null : u.id))}
                        className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border border-ink-100 bg-white text-ink-500 hover:bg-ink-100"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                      {rowMenu === u.id && (
                        <div className="absolute right-6 top-[52px] z-50 w-[190px] overflow-hidden rounded-xl border border-ink-100 bg-white text-left shadow-modal">
                          {canEdit && (
                            <MenuItem icon={Pencil} onClick={() => navigate(`/usuarios/${u.id}?edit=1`)}>Editar</MenuItem>
                          )}
                          <MenuItem icon={Eye} onClick={() => navigate(`/usuarios/${u.id}`)}>Ver detalhes</MenuItem>
                          {canEdit && (
                            <MenuItem icon={ToggleRight} border onClick={() => doSetStatus(u)}>
                              {u.status === 'Ativo' ? 'Inativar' : 'Ativar'}
                            </MenuItem>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink-100 px-6 py-4">
            <span className="text-[13px] text-ink-500">
              {total === 0
                ? 'Nenhum registro'
                : `Mostrando ${start + 1}–${Math.min(start + PAGE_SIZE, total)} de ${total}`}
              <span className="mx-1.5 text-ink-300">·</span>paginação server-side
            </span>
            <div className="flex items-center gap-1.5">
              <PagerBtn onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="h-5 w-5" /></PagerBtn>
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={cn(
                    'h-[34px] min-w-[34px] rounded-lg text-sm font-semibold',
                    n === curPage ? 'bg-forest-600 text-white' : 'border border-ink-200 bg-white text-ink-700',
                  )}
                >
                  {n}
                </button>
              ))}
              <PagerBtn onClick={() => setPage((p) => Math.min(pages, p + 1))}><ChevronRight className="h-5 w-5" /></PagerBtn>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Checkbox({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <span
      onClick={onClick}
      className={cn(
        'flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md',
        checked ? 'bg-forest-600' : 'border border-ink-200 bg-white',
      )}
    >
      {checked && <Check className="h-4 w-4 text-white" />}
    </span>
  );
}

function MenuItem({
  icon: Icon,
  children,
  onClick,
  border,
}: {
  icon: typeof Pencil;
  children: React.ReactNode;
  onClick: () => void;
  border?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn('flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink-800 hover:bg-forest-50', border && 'border-t border-ink-100')}
    >
      <Icon className="h-[19px] w-[19px] text-ink-500" />
      {children}
    </button>
  );
}

function PagerBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex h-[34px] min-w-[34px] items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-700">
      {children}
    </button>
  );
}
