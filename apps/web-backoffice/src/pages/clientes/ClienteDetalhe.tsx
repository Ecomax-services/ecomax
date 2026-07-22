import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, UsersRound, PackageCheck, AlertTriangle } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Tabs } from '@/components/ui/Tabs';
import { SelectField, SearchInput, TextField, TextareaField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { maskPhone, maskDecimal, maskDate } from '@/lib/masks';
import { ClienteFormDrawer } from '@/pages/clientes/ClienteFormDrawer';
import {
  getCliente, listContatos, addContato, setContatoAtivo, deleteContato,
  listOrcamentos, createOrcamento, setOrcamentoStatus, orcStatusTone, orcStatusLabel,
  listClienteFuncionarios, listFuncionariosDisponiveis, vincularFuncionario, desvincularFuncionario,
  listPortalUsuarios, convidarPortalUsuario, setPortalUsuarioStatus, portalStatusTone, portalStatusLabel,
  listHomologados, listProdutosParaHomologar, addHomologado, removeHomologado,
  docTone,
  type ClienteDetail, type ContatoRow, type OrcamentoRow, type OrcStatus,
  type FuncIntegradoRow, type PortalUsuarioRow, type HomologadoRow,
} from '@/lib/clientes';

type Tab = 'orcamentos' | 'funcionarios';

export function ClienteDetalhe() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const canCreate = can('gestao_clientes', 'criar');
  const canEdit = can('gestao_clientes', 'editar');

  const [cli, setCli] = useState<ClienteDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>('orcamentos');
  const [editDrawer, setEditDrawer] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [homologOpen, setHomologOpen] = useState(false);

  const load = useCallback(async () => {
    try { setCli(await getCliente(id)); } catch { setNotFound(true); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (notFound) {
    return (
      <>
        <Topbar title="Cliente" breadcrumb="Início  /  Gestão de Clientes" />
        <div className="flex-1 px-8 py-6">
          <p className="text-sm text-ink-500">Cliente não encontrado.</p>
          <Button variant="secondary" className="mt-3" onClick={() => navigate('/clientes')}>Voltar para a lista</Button>
        </div>
      </>
    );
  }
  if (!cli) {
    return (<><Topbar title="Cliente" breadcrumb="Início  /  Gestão de Clientes" /><div className="flex-1 px-8 py-6 text-sm text-ink-400">Carregando…</div></>);
  }

  return (
    <>
      <Topbar title={cli.nome} breadcrumb={`Início  /  Gestão de Clientes  /  ${cli.nome}`} />
      <div className="flex-1 px-8 py-6">
        <button onClick={() => navigate('/clientes')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900">
          <ArrowLeft className="h-4 w-4" />Voltar
        </button>

        {/* Cabeçalho */}
        <div className="mb-5 rounded-2xl border border-ink-100 bg-white px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-[19px] font-bold text-ink-900">{cli.nome}</h2>
                <Badge tone={cli.ativo ? 'success' : 'muted'}>{cli.ativo ? 'Ativo' : 'Inativo'}</Badge>
              </div>
              <p className="mt-0.5 text-[13px] text-ink-500">{cli.razao_social || (cli.tipo_pessoa === 'pf' ? 'Pessoa física' : '—')} · {cli.doc}</p>
              <p className="mt-0.5 text-[13px] text-ink-500">{cli.endereco}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPortalOpen(true)}><UsersRound className="h-4 w-4" />Usuários do portal</Button>
              <Button variant="secondary" size="sm" onClick={() => setHomologOpen(true)}><PackageCheck className="h-4 w-4" />Produtos homologados</Button>
              {canEdit && <Button size="sm" onClick={() => setEditDrawer(true)}>Editar dados</Button>}
            </div>
          </div>
        </div>

        {/* Contatos & Telefones (inline) */}
        <ContatosSection clienteId={id} canEdit={canEdit} />

        {/* Abas */}
        <div className="mt-6">
          <Tabs
            tabs={[{ key: 'orcamentos', label: 'Orçamentos' }, { key: 'funcionarios', label: 'Funcionários integrados' }]}
            value={tab}
            onChange={setTab}
          />
          <div className="mt-4">
            {tab === 'orcamentos' && <OrcamentosTab clienteId={id} canCreate={canCreate} canEdit={canEdit} />}
            {tab === 'funcionarios' && <FuncionariosTab clienteId={id} canCreate={canCreate} canEdit={canEdit} onNovo={() => navigate('/usuarios/novo')} />}
          </div>
        </div>
      </div>

      <ClienteFormDrawer open={editDrawer} clienteId={id} onClose={() => setEditDrawer(false)} onSaved={() => { setEditDrawer(false); load(); }} />
      {portalOpen && <PortalModal clienteId={id} canEdit={canEdit} onClose={() => setPortalOpen(false)} />}
      {homologOpen && <HomologadosDrawer clienteId={id} canEdit={canEdit} onClose={() => setHomologOpen(false)} />}
    </>
  );
}

// ---------------- Contatos & Telefones ----------------
function ContatosSection({ clienteId, canEdit }: { clienteId: string; canEdit: boolean }) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<ContatoRow[]>([]);
  const [search, setSearch] = useState('');
  const [origem, setOrigem] = useState('todos');
  const [modal, setModal] = useState<'telefone' | 'contato' | null>(null);
  const [del, setDel] = useState<ContatoRow | null>(null);

  const load = useCallback(() => { listContatos(clienteId).then(setRows).catch((e) => showToast((e as Error).message)); }, [clienteId, showToast]);
  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => {
    if (origem !== 'todos' && r.tipo !== origem) return false;
    const q = search.toLowerCase();
    return !q || `${r.nome} ${r.email} ${r.telefone}`.toLowerCase().includes(q);
  });

  const toggle = async (r: ContatoRow) => { try { await setContatoAtivo(r.id, !r.ativo); load(); } catch (e) { showToast((e as Error).message); } };
  const remove = async () => { if (!del) return; try { await deleteContato(del.id); setDel(null); showToast('Registro excluído'); load(); } catch (e) { showToast((e as Error).message); } };

  const th = 'px-4 py-2.5 text-left text-xs font-bold uppercase text-ink-400';
  return (
    <div className="rounded-2xl border border-ink-100 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-6 py-4">
        <h3 className="text-[15px] font-bold text-ink-900">Contatos & Telefones</h3>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setModal('telefone')}><Plus className="h-4 w-4" />Telefone</Button>
            <Button variant="secondary" size="sm" onClick={() => setModal('contato')}><Plus className="h-4 w-4" />Contato</Button>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-3 px-6 py-3">
        <SearchInput containerClassName="w-[260px]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome, e-mail ou telefone" />
        <SelectField value={origem} onChange={(e) => setOrigem(e.target.value)} options={[{ value: 'todos', label: 'Todas as origens' }, { value: 'telefone', label: 'Telefone' }, { value: 'contato', label: 'Contato' }]} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr className="bg-ink-50">
              <th className={cn(th, 'pl-6')}>Nome</th>
              <th className={th}>Origem</th>
              <th className={th}>Telefone</th>
              <th className={th}>E-mail</th>
              <th className={cn(th, 'text-center')}>Recebe e-mail</th>
              <th className={cn(th, 'text-center')}>Padrão</th>
              <th className={cn(th, 'text-center')}>Status</th>
              <th className={cn(th, 'pr-6 text-right')}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-ink-400">Nenhum contato.</td></tr>}
            {filtered.map((r) => (
              <tr key={r.id} className={cn('border-t border-ink-100', !r.ativo && 'opacity-60')}>
                <td className="px-4 py-3 pl-6 text-sm text-ink-800">{r.nome}</td>
                <td className="px-4 py-3"><Badge tone={r.tipo === 'telefone' ? 'info' : 'success'}>{r.origem}</Badge></td>
                <td className="px-4 py-3 text-sm text-ink-700">{r.telefone || '—'}</td>
                <td className="px-4 py-3 text-sm text-ink-700">{r.email || '—'}</td>
                <td className="px-4 py-3 text-center text-sm">{r.recebe_email ? '✓' : '—'}</td>
                <td className="px-4 py-3 text-center text-sm">{r.padrao ? '✓' : '—'}</td>
                <td className="px-4 py-3 text-center"><Badge tone={r.ativo ? 'success' : 'muted'}>{r.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
                <td className="px-4 py-3 pr-6 text-right">
                  {canEdit ? (
                    <div className="inline-flex gap-2">
                      <button onClick={() => toggle(r)} className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-ink-600">{r.ativo ? 'Inativar' : 'Ativar'}</button>
                      <button onClick={() => setDel(r)} className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-ink-400 hover:text-danger-bright"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && <ContatoModal clienteId={clienteId} tipo={modal} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} showToast={showToast} />}
      <ConfirmDialog
        open={!!del} onClose={() => setDel(null)} onConfirm={remove}
        title={del ? `Excluir ${del.origem.toLowerCase()}` : ''}
        description="O registro será removido permanentemente."
        confirmLabel="Excluir" cancelLabel="Cancelar" destructive
      />
    </div>
  );
}

function ContatoModal({ clienteId, tipo, onClose, onDone, showToast }: { clienteId: string; tipo: 'telefone' | 'contato'; onClose: () => void; onDone: () => void; showToast: (m: string) => void }) {
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', recebe_email: false, rel_tecnica: false, padrao: false });
  const [saving, setSaving] = useState(false);
  const up = (k: keyof typeof form, v: string | boolean) => setForm((s) => ({ ...s, [k]: v }));
  const save = async () => {
    if (tipo === 'telefone' && !form.telefone.trim()) return showToast('Informe o telefone.');
    if (tipo === 'contato' && !form.nome.trim()) return showToast('Informe o nome do contato.');
    setSaving(true);
    try {
      await addContato(clienteId, {
        tipo, nome: form.nome.trim() || null, telefone: form.telefone.trim() || null, email: form.email.trim() || null,
        recebe_email: form.recebe_email, rel_tecnica: form.rel_tecnica, padrao: form.padrao,
      });
      showToast(tipo === 'telefone' ? 'Telefone adicionado' : 'Contato adicionado');
      onDone();
    } catch (e) { showToast((e as Error).message); } finally { setSaving(false); }
  };
  return (
    <Modal open onClose={onClose}>
      <div className="border-b border-ink-100 px-7 py-[22px]"><h2 className="text-[19px] font-bold text-ink-900">{tipo === 'telefone' ? 'Novo telefone' : 'Novo contato'}</h2></div>
      <div className="flex flex-col gap-3.5 px-7 py-6">
        {tipo === 'contato' && <TextField label="Nome" required value={form.nome} onChange={(e) => up('nome', e.target.value)} placeholder="Nome do contato" />}
        <TextField label="Telefone" inputMode="numeric" value={form.telefone} onChange={(e) => up('telefone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" required={tipo === 'telefone'} />
        {tipo === 'contato' && (
          <>
            <TextField label="E-mail" value={form.email} onChange={(e) => up('email', e.target.value)} placeholder="contato@cliente.com" />
            <div className="flex flex-wrap gap-4">
              <Check label="Recebe e-mail" checked={form.recebe_email} onChange={(v) => up('recebe_email', v)} />
              <Check label="Rel. técnica" checked={form.rel_tecnica} onChange={(v) => up('rel_tecnica', v)} />
              <Check label="Contato padrão" checked={form.padrao} onChange={(v) => up('padrao', v)} />
            </div>
          </>
        )}
      </div>
      <div className="flex gap-3 px-7 pb-6">
        <Button variant="secondary" fullWidth onClick={onClose} className="h-[52px]">Cancelar</Button>
        <Button fullWidth onClick={save} disabled={saving} className="h-[52px]">{saving ? 'Salvando…' : 'Adicionar'}</Button>
      </div>
    </Modal>
  );
}

// ---------------- Orçamentos ----------------
function OrcamentosTab({ clienteId, canCreate, canEdit }: { clienteId: string; canCreate: boolean; canEdit: boolean }) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<OrcamentoRow[]>([]);
  const [statusF, setStatusF] = useState('todos');
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({ observacao: '', valor: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => { listOrcamentos(clienteId).then(setRows).catch((e) => showToast((e as Error).message)); }, [clienteId, showToast]);
  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((o) => statusF === 'todos' || o.status === statusF);
  const changeStatus = async (o: OrcamentoRow, status: OrcStatus) => {
    try { await setOrcamentoStatus(o.id, status); showToast(`Orçamento ${o.codigo}: ${orcStatusLabel[status]}`); load(); }
    catch (e) { showToast((e as Error).message); }
  };
  const save = async () => {
    setSaving(true);
    try {
      await createOrcamento(clienteId, { observacao: form.observacao.trim() || null, valor_total: Number(form.valor.replace(',', '.')) || 0 });
      setNovo(false); setForm({ observacao: '', valor: '' }); showToast('Orçamento criado'); load();
    } catch (e) { showToast((e as Error).message); } finally { setSaving(false); }
  };

  const th = 'px-4 py-2.5 text-left text-xs font-bold uppercase text-ink-400';
  return (
    <div className="rounded-2xl border border-ink-100 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
        <SelectField value={statusF} onChange={(e) => setStatusF(e.target.value)} options={[{ value: 'todos', label: 'Todos os status' }, { value: 'em_elaboracao', label: 'Em elaboração' }, { value: 'aprovado', label: 'Aprovado' }, { value: 'cancelado', label: 'Cancelado' }]} />
        {canCreate && <Button size="sm" onClick={() => setNovo(true)}><Plus className="h-4 w-4" />Novo orçamento</Button>}
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-ink-50">
            <th className={cn(th, 'pl-6')}>Código</th>
            <th className={th}>Data</th>
            <th className={th}>Observação</th>
            <th className={th}>Valor</th>
            <th className={cn(th, 'text-center')}>OS</th>
            <th className={th}>Status</th>
            <th className={cn(th, 'pr-6 text-right')}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-400">Nenhum orçamento.</td></tr>}
          {filtered.map((o) => (
            <tr key={o.id} className="border-t border-ink-100">
              <td className="px-4 py-3 pl-6 text-sm font-semibold text-forest-900">{o.codigo}</td>
              <td className="px-4 py-3 text-sm text-ink-600">{o.data}</td>
              <td className="px-4 py-3 text-sm text-ink-700">{o.observacao || '—'}</td>
              <td className="px-4 py-3 text-sm font-semibold text-ink-900">{o.valor}</td>
              <td className="px-4 py-3 text-center text-sm text-ink-500">{o.osCount}</td>
              <td className="px-4 py-3"><Badge tone={orcStatusTone[o.status]}>{orcStatusLabel[o.status]}</Badge></td>
              <td className="px-4 py-3 pr-6 text-right">
                {canEdit && o.status === 'em_elaboracao' ? (
                  <div className="inline-flex gap-2">
                    <button onClick={() => changeStatus(o, 'aprovado')} className="rounded-lg bg-greenSoft px-2.5 py-1.5 text-[12px] font-semibold text-forest-900">Aprovar</button>
                    <button onClick={() => changeStatus(o, 'cancelado')} className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-ink-500">Cancelar</button>
                  </div>
                ) : <span className="text-[13px] text-ink-300">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {novo && (
        <Modal open onClose={() => setNovo(false)}>
          <div className="border-b border-ink-100 px-7 py-[22px]"><h2 className="text-[19px] font-bold text-ink-900">Novo orçamento</h2><p className="mt-0.5 text-[13px] text-ink-400">Entra como "Em elaboração".</p></div>
          <div className="flex flex-col gap-3.5 px-7 py-6">
            <TextField label="Valor total (R$)" inputMode="decimal" value={form.valor} onChange={(e) => setForm((s) => ({ ...s, valor: maskDecimal(e.target.value) }))} placeholder="0,00" />
            <TextareaField label="Observação" value={form.observacao} onChange={(e) => setForm((s) => ({ ...s, observacao: e.target.value }))} placeholder="Descrição do orçamento" />
          </div>
          <div className="flex gap-3 px-7 pb-6">
            <Button variant="secondary" fullWidth onClick={() => setNovo(false)} className="h-[52px]">Cancelar</Button>
            <Button fullWidth onClick={save} disabled={saving} className="h-[52px]">{saving ? 'Criando…' : 'Criar orçamento'}</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------- Funcionários integrados ----------------
function FuncionariosTab({ clienteId, canCreate, canEdit, onNovo }: { clienteId: string; canCreate: boolean; canEdit: boolean; onNovo: () => void }) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<FuncIntegradoRow[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [opts, setOpts] = useState<{ id: string; nome: string }[]>([]);
  const [sel, setSel] = useState('');
  const [del, setDel] = useState<FuncIntegradoRow | null>(null);

  const load = useCallback(() => { listClienteFuncionarios(clienteId).then(setRows).catch((e) => showToast((e as Error).message)); }, [clienteId, showToast]);
  useEffect(() => { load(); }, [load]);

  const openAdd = async () => { setSel(''); setOpts(await listFuncionariosDisponiveis(clienteId)); setAddOpen(true); };
  const add = async () => {
    if (!sel) return showToast('Selecione um funcionário.');
    try { await vincularFuncionario(clienteId, sel); setAddOpen(false); showToast('Funcionário vinculado'); load(); }
    catch (e) { showToast((e as Error).message); }
  };
  const remove = async () => { if (!del) return; try { await desvincularFuncionario(del.vinculoId); setDel(null); showToast('Vínculo removido'); load(); } catch (e) { showToast((e as Error).message); } };

  const th = 'px-4 py-2.5 text-left text-xs font-bold uppercase text-ink-400';
  return (
    <div className="rounded-2xl border border-ink-100 bg-white">
      <div className="flex flex-wrap items-center justify-end gap-2 px-6 py-3">
        {canCreate && <Button variant="secondary" size="sm" onClick={onNovo}>Cadastrar novo</Button>}
        {canEdit && <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" />Adicionar existente</Button>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr className="bg-ink-50">
              <th className={cn(th, 'pl-6')}>Funcionário</th>
              <th className={th}>Cargo · Setor</th>
              <th className={cn(th, 'text-center')}>ASO</th>
              <th className={cn(th, 'text-center')}>CNH</th>
              <th className={cn(th, 'text-center')}>Status</th>
              <th className={cn(th, 'pr-6 text-right')}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-400">Nenhum funcionário integrado.</td></tr>}
            {rows.map((f) => (
              <tr key={f.vinculoId} className="border-t border-ink-100">
                <td className="px-4 py-3 pl-6 text-sm font-medium text-ink-800">
                  <span className="flex items-center gap-1.5">
                    {f.nome}
                    {f.bloqueado && <span title="Documento vencido — bloqueia vínculo a novas OS"><AlertTriangle className="h-4 w-4 text-danger-bright" /></span>}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-ink-600">{f.cargo} · {f.setor}</td>
                <td className="px-4 py-3 text-center"><Badge tone={docTone[f.asoState]}>{f.aso}</Badge></td>
                <td className="px-4 py-3 text-center"><Badge tone={docTone[f.cnhState]}>{f.cnh}</Badge></td>
                <td className="px-4 py-3 text-center"><Badge tone={f.ativo ? 'success' : 'muted'}>{f.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
                <td className="px-4 py-3 pr-6 text-right">
                  {canEdit ? <button onClick={() => setDel(f)} className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-ink-400 hover:text-danger-bright"><Trash2 className="h-4 w-4" /></button> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-ink-100 px-6 py-3 text-[13px] text-ink-400">Funcionários com ASO ou CNH vencidos ficam bloqueados para vínculo em novas OS.</p>

      {addOpen && (
        <Modal open onClose={() => setAddOpen(false)}>
          <div className="border-b border-ink-100 px-7 py-[22px]"><h2 className="text-[19px] font-bold text-ink-900">Adicionar funcionário</h2></div>
          <div className="px-7 py-6">
            <SelectField label="Funcionário" value={sel} onChange={(e) => setSel(e.target.value)} options={[{ value: '', label: opts.length ? 'Selecione…' : 'Todos já vinculados' }, ...opts.map((o) => ({ value: o.id, label: o.nome }))]} />
          </div>
          <div className="flex gap-3 px-7 pb-6">
            <Button variant="secondary" fullWidth onClick={() => setAddOpen(false)} className="h-[52px]">Cancelar</Button>
            <Button fullWidth onClick={add} disabled={!sel} className="h-[52px]">Vincular</Button>
          </div>
        </Modal>
      )}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={remove} title={del ? `Remover ${del.nome}` : ''} description="O vínculo com este cliente será removido (o funcionário permanece cadastrado)." confirmLabel="Remover vínculo" cancelLabel="Cancelar" destructive />
    </div>
  );
}

// ---------------- Modal usuários do portal ----------------
function PortalModal({ clienteId, canEdit, onClose }: { clienteId: string; canEdit: boolean; onClose: () => void }) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<PortalUsuarioRow[]>([]);
  const [form, setForm] = useState({ nome: '', email: '', perfil: '' });
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => { listPortalUsuarios(clienteId).then(setRows).catch((e) => showToast((e as Error).message)); }, [clienteId, showToast]);
  useEffect(() => { load(); }, [load]);

  const convidar = async () => {
    if (!form.nome.trim() || !form.email.trim()) return showToast('Informe nome e e-mail.');
    try { await convidarPortalUsuario(clienteId, form.nome.trim(), form.email.trim(), form.perfil.trim() || 'Usuário'); setForm({ nome: '', email: '', perfil: '' }); setAdding(false); showToast('Convite registrado (envio de e-mail em breve)'); load(); }
    catch (e) { showToast((e as Error).message); }
  };
  const setStatus = async (u: PortalUsuarioRow, status: 'ativo' | 'inativo' | 'convidado') => {
    try { await setPortalUsuarioStatus(u.id, status); showToast('Status atualizado'); load(); } catch (e) { showToast((e as Error).message); }
  };

  return (
    <Modal open onClose={onClose}>
      <div className="flex items-center justify-between border-b border-ink-100 px-7 py-[22px]">
        <h2 className="text-[19px] font-bold text-ink-900">Usuários do portal</h2>
        {canEdit && !adding && <Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Convidar</Button>}
      </div>
      <div className="max-h-[60vh] overflow-y-auto px-7 py-5">
        {adding && (
          <div className="mb-4 flex flex-col gap-3 rounded-[10px] border border-forest-accent bg-forest-50/40 p-3.5">
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Nome" value={form.nome} onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))} placeholder="Nome do usuário" />
              <TextField label="Perfil" value={form.perfil} onChange={(e) => setForm((s) => ({ ...s, perfil: e.target.value }))} placeholder="Ex.: Gestor do cliente" />
            </div>
            <TextField label="E-mail" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} placeholder="usuario@cliente.com" />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setAdding(false)}>Cancelar</Button>
              <Button size="sm" onClick={convidar}>Enviar convite</Button>
            </div>
          </div>
        )}
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-ink-50">
              {['Nome', 'E-mail', 'Perfil', 'Último acesso', 'Status'].map((h) => <th key={h} className="px-3 py-2 text-left text-xs font-bold uppercase text-ink-400">{h}</th>)}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-ink-400">Nenhum usuário.</td></tr>}
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-ink-100">
                <td className="px-3 py-2.5 text-sm text-ink-800">{u.nome}</td>
                <td className="px-3 py-2.5 text-sm text-ink-600">{u.email}</td>
                <td className="px-3 py-2.5 text-sm text-ink-600">{u.perfil}</td>
                <td className="px-3 py-2.5 text-sm text-ink-500">{u.ultimoAcesso}</td>
                <td className="px-3 py-2.5"><Badge tone={portalStatusTone[u.status]}>{portalStatusLabel[u.status]}</Badge></td>
                <td className="px-3 py-2.5 text-right">
                  {canEdit && (
                    u.status === 'inativo'
                      ? <button onClick={() => setStatus(u, 'ativo')} className="text-[12px] font-semibold text-forest-700">Reativar</button>
                      : <button onClick={() => setStatus(u, 'inativo')} className="text-[12px] font-semibold text-danger-bright">Inativar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-3 border-t border-ink-100 px-7 py-4">
        <Button variant="secondary" onClick={onClose} className="h-[46px]">Fechar</Button>
      </div>
    </Modal>
  );
}

// ---------------- Drawer produtos homologados ----------------
function HomologadosDrawer({ clienteId, canEdit, onClose }: { clienteId: string; canEdit: boolean; onClose: () => void }) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<HomologadoRow[]>([]);
  const [opts, setOpts] = useState<{ id: string; nome: string }[]>([]);
  const [sel, setSel] = useState('');
  const [validade, setValidade] = useState('');
  const [del, setDel] = useState<HomologadoRow | null>(null);

  const load = useCallback(() => {
    listHomologados(clienteId).then(setRows).catch((e) => showToast((e as Error).message));
    listProdutosParaHomologar(clienteId).then(setOpts).catch(() => {});
  }, [clienteId, showToast]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!sel) return showToast('Selecione um produto.');
    const m = validade.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const iso = m ? `${m[3]}-${m[2]}-${m[1]}` : null;
    if (validade && !iso) return showToast('Validade inválida (dd/mm/aaaa).');
    try { await addHomologado(clienteId, sel, iso); setSel(''); setValidade(''); showToast('Produto homologado'); load(); }
    catch (e) { showToast((e as Error).message); }
  };
  const remove = async () => { if (!del) return; try { await removeHomologado(del.id); setDel(null); showToast('Homologação removida'); load(); } catch (e) { showToast((e as Error).message); } };

  const th = 'px-3 py-2 text-left text-xs font-bold uppercase text-ink-400';
  return (
    <Drawer open onClose={onClose} width={640} title="Produtos homologados" subtitle="Produtos liberados para uso neste cliente">
      {canEdit && (
        <div className="mb-4 flex items-end gap-2 rounded-[10px] border border-ink-100 p-3">
          <SelectField label="Produto" className="flex-1" value={sel} onChange={(e) => setSel(e.target.value)} options={[{ value: '', label: opts.length ? 'Selecione…' : 'Todos já homologados' }, ...opts.map((o) => ({ value: o.id, label: o.nome }))]} />
          <TextField label="Validade" inputMode="numeric" value={validade} onChange={(e) => setValidade(maskDate(e.target.value))} placeholder="dd/mm/aaaa" className="w-[130px]" />
          <Button onClick={add} disabled={!sel} className="h-11">Adicionar</Button>
        </div>
      )}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-ink-50">
            <th className={th}>Código</th><th className={th}>Produto</th><th className={th}>Categoria</th>
            <th className={th}>Homologação</th><th className={th}>Validade</th><th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-ink-400">Nenhum produto homologado.</td></tr>}
          {rows.map((h) => (
            <tr key={h.id} className="border-t border-ink-100">
              <td className="px-3 py-2.5 text-sm text-ink-600">{h.codigo}</td>
              <td className="px-3 py-2.5 text-sm text-ink-800">{h.produto}</td>
              <td className="px-3 py-2.5 text-sm text-ink-600">{h.categoria}</td>
              <td className="px-3 py-2.5 text-sm text-ink-600">{h.dataHomologacao}</td>
              <td className="px-3 py-2.5 text-sm">
                <span className={cn(h.expiraEmBreve ? 'font-semibold text-danger-bright' : 'text-ink-600')}>{h.validade}</span>
              </td>
              <td className="px-3 py-2.5 text-right">
                {canEdit && <button onClick={() => setDel(h)} className="text-ink-400 hover:text-danger-bright"><Trash2 className="h-4 w-4" /></button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={remove} title={del ? `Remover ${del.produto}` : ''} description="A homologação deste produto para o cliente será removida." confirmLabel="Remover" cancelLabel="Cancelar" destructive />
    </Drawer>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-800">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-forest-600" />{label}
    </label>
  );
}
