import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, FileText, Printer, CheckCircle2, Copy, AlertTriangle,
  MapPin, PenLine, Camera, Lock, Upload, Share2,
} from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Tabs } from '@/components/ui/Tabs';
import { SelectField, SearchInput, TextField, TextareaField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import type { Produto } from '@/lib/estoque';
import {
  getOrdemServico, updateDadosGerais, setOsStatus, cancelarOs, duplicarOs,
  listOsFuncionarios, addOsFuncionario, removeOsFuncionario,
  listOsProdutos, addOsProduto, ajustarQtdUtilizada, removeOsProduto,
  listOsEquipamentos, addOsEquipamento, removeOsEquipamento,
  listOsRelatorios, emitirRelatorio, publicarRelatorio, removerRelatorio,
  listOsAnexos, addAnexo, removerAnexo, anexoTipoLabel,
  listOsHistorico, listHistoricoAutores,
  listFuncionarioOptions, listProdutoOptions, listEquipamentoOptions, listTiposServico, listPragas,
  osStatusTone, osStatusLabel, recorrenciaLabel, isReadOnly, fmtDateTime, urlAssinadaOperacional,
  type OrdemServicoDetail, type OsStatus, type Recorrencia,
  type OsFuncionarioRow, type OsProdutoRow, type OsEquipamentoRow, type OsRelatorioRow, type OsAnexoRow,
  type HistoricoRow, type AnexoTipo, type FuncionarioOption,
} from '@/lib/operacional';

type TabKey = 'dados' | 'execucao' | 'produtos' | 'relatorios' | 'anexos' | 'historico';

export function OrdemServicoDetalhe() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = useAuth();
  const canEdit = can('operacional', 'editar');
  const canCreate = can('operacional', 'criar');
  const canDelete = can('operacional', 'excluir');

  const [os, setOs] = useState<OrdemServicoDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<TabKey>('dados');
  const [editing, setEditing] = useState(params.get('editar') === '1');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [execConfirm, setExecConfirm] = useState(false);

  const load = useCallback(async () => {
    try { setOs(await getOrdemServico(id)); } catch { setNotFound(true); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  // Duplicar via query param (?duplicar=1)
  useEffect(() => {
    if (params.get('duplicar') === '1') {
      duplicarOs(id).then((novoId) => { showToast('OS duplicada'); navigate(`/operacional/${novoId}?editar=1`); })
        .catch((e) => showToast((e as Error).message));
    }
  }, [id, params, navigate, showToast]);

  const readOnly = os ? isReadOnly(os.status) : true;
  const editable = canEdit && !readOnly;

  const changeStatus = async (status: OsStatus, ok: string) => {
    try { await setOsStatus(id, status); showToast(ok); load(); } catch (e) { showToast((e as Error).message); }
  };
  const doCancel = async () => {
    try { await cancelarOs(id, motivo); showToast('OS cancelada'); setCancelOpen(false); setMotivo(''); load(); }
    catch (e) { showToast((e as Error).message); }
  };

  if (notFound) {
    return (
      <>
        <Topbar title="Ordem de serviço" breadcrumb="Início  /  Operacional" />
        <div className="flex-1 px-8 py-6">
          <p className="text-sm text-ink-500">OS não encontrada.</p>
          <Button variant="secondary" className="mt-3" onClick={() => navigate('/operacional')}>Voltar para a lista</Button>
        </div>
      </>
    );
  }
  if (!os) return (<><Topbar title="Ordem de serviço" breadcrumb="Início  /  Operacional" /><div className="flex-1 px-8 py-6 text-sm text-ink-400">Carregando…</div></>);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'dados', label: 'Dados gerais' },
    { key: 'execucao', label: 'Execução' },
    { key: 'produtos', label: 'Produtos e equipamentos' },
    { key: 'relatorios', label: 'Relatórios' },
    { key: 'anexos', label: 'Anexos' },
    { key: 'historico', label: 'Histórico' },
  ];

  return (
    <>
      <Topbar title={os.codigo} breadcrumb={`Início  /  Operacional  /  ${os.codigo}`} />
      <div className="flex-1 px-8 py-6">
        <button onClick={() => navigate('/operacional')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900">
          <ArrowLeft className="h-4 w-4" />Voltar
        </button>

        {/* Cabeçalho */}
        <div className="mb-5 rounded-2xl border border-ink-100 bg-white px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-[19px] font-bold text-ink-900">{os.codigo}</h2>
                <Badge tone={osStatusTone[os.status]}>{osStatusLabel[os.status]}</Badge>
                <Badge tone={os.origem === 'avulsa' ? 'muted' : 'info'}>{os.origem === 'avulsa' ? 'Avulsa' : `De ${os.orcamentoCodigo ?? 'orçamento'}`}</Badge>
                {os.rascunho && <Badge tone="softWarn">Rascunho</Badge>}
              </div>
              <p className="mt-1 text-[13px] text-ink-500">
                Cliente: <Link to={`/clientes/${os.clienteId}`} className="font-semibold text-forest-700 hover:underline">{os.cliente}</Link>
                {os.tipos_servico.length > 0 && <> · {os.tipos_servico.join(', ')}</>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => showToast('Exportar PDF (em breve)')}><FileText className="h-4 w-4" />Exportar PDF</Button>
              <Button variant="secondary" size="sm" onClick={() => showToast('Imprimir (em breve)')}><Printer className="h-4 w-4" />Imprimir</Button>
              {canCreate && <Button variant="secondary" size="sm" onClick={() => duplicarOs(id).then((n) => navigate(`/operacional/${n}?editar=1`)).catch((e) => showToast((e as Error).message))}><Copy className="h-4 w-4" />Duplicar</Button>}
              {editable && os.status === 'em_aberto' && <Button variant="secondary" size="sm" onClick={() => changeStatus('em_andamento', 'Execução iniciada')}>Iniciar execução</Button>}
              {editable && (os.status === 'em_aberto' || os.status === 'em_andamento') && <Button size="sm" onClick={() => setExecConfirm(true)}><CheckCircle2 className="h-4 w-4" />Marcar como executada</Button>}
              {editable && os.status === 'executada' && <Button size="sm" onClick={() => changeStatus('concluida', 'OS concluída')}><CheckCircle2 className="h-4 w-4" />Concluir OS</Button>}
              {canDelete && !readOnly && <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>Cancelar OS</Button>}
            </div>
          </div>
          {readOnly && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-ink-50 px-3.5 py-2 text-[13px] text-ink-500">
              <Lock className="h-4 w-4" />OS {osStatusLabel[os.status].toLowerCase()} — somente leitura.
              {os.cancelamento_motivo && <span className="text-ink-400">Motivo: {os.cancelamento_motivo}</span>}
            </div>
          )}
        </div>

        {/* Abas */}
        <Tabs tabs={tabs} value={tab} onChange={(t) => setTab(t)} />
        <div className="mt-4">
          {tab === 'dados' && <DadosGeraisTab os={os} editable={editable} editing={editing} setEditing={setEditing} onSaved={load} />}
          {tab === 'execucao' && <ExecucaoTab os={os} editable={editable} />}
          {tab === 'produtos' && <ProdutosTab os={os} editable={editable} />}
          {tab === 'relatorios' && <RelatoriosTab os={os} editable={editable} />}
          {tab === 'anexos' && <AnexosTab osId={id} editable={editable} />}
          {tab === 'historico' && <HistoricoTab osId={id} />}
        </div>
      </div>

      <ConfirmDialog
        open={execConfirm} onClose={() => setExecConfirm(false)}
        onConfirm={() => { setExecConfirm(false); changeStatus('executada', 'OS marcada como executada'); }}
        title="Marcar como executada"
        description="A assinatura do cliente é obrigatória. A OS ficará disponível para publicação de relatórios no portal."
        confirmLabel="Marcar como executada"
      />
      <ConfirmDialog
        open={cancelOpen} onClose={() => { setCancelOpen(false); setMotivo(''); }} onConfirm={doCancel}
        title="Cancelar OS" description="Informe o motivo. A OS ficará somente leitura." confirmLabel="Confirmar cancelamento" destructive
      >
        <TextareaField label="Motivo do cancelamento" required value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Descreva o motivo…" />
      </ConfirmDialog>
    </>
  );
}

// ============================================================
// Aba a — Dados gerais
// ============================================================
function DadosGeraisTab({ os, editable, editing, setEditing, onSaved }: { os: OrdemServicoDetail; editable: boolean; editing: boolean; setEditing: (v: boolean) => void; onSaved: () => void }) {
  const { showToast } = useToast();
  const [tiposCat, setTiposCat] = useState<string[]>([]);
  const [pragasCat, setPragasCat] = useState<string[]>([]);
  const [funcs, setFuncs] = useState<FuncionarioOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tipos_servico: os.tipos_servico, descricao: os.descricao ?? '', data_programada: os.data_programada ?? '',
    hora_prevista: os.hora_prevista ?? '', duracao_estimada: os.duracao_estimada ?? '', recorrencia: os.recorrencia,
    endereco_execucao: os.endereco_execucao ?? '', responsavel_admin_id: os.responsavel_admin_id ?? '',
    funcionario_integrado_id: os.funcionario_integrado_id ?? '', observacoes: os.observacoes ?? '',
    pragas: os.pragas, necessita_relatorio: os.necessita_relatorio, outros_documentos: os.outros_documentos ?? '',
  });

  useEffect(() => {
    listTiposServico().then(setTiposCat).catch(() => {});
    listPragas().then(setPragasCat).catch(() => {});
    listFuncionarioOptions().then(setFuncs).catch(() => {});
  }, []);
  useEffect(() => {
    setForm({
      tipos_servico: os.tipos_servico, descricao: os.descricao ?? '', data_programada: os.data_programada ?? '',
      hora_prevista: os.hora_prevista ?? '', duracao_estimada: os.duracao_estimada ?? '', recorrencia: os.recorrencia,
      endereco_execucao: os.endereco_execucao ?? '', responsavel_admin_id: os.responsavel_admin_id ?? '',
      funcionario_integrado_id: os.funcionario_integrado_id ?? '', observacoes: os.observacoes ?? '',
      pragas: os.pragas, necessita_relatorio: os.necessita_relatorio, outros_documentos: os.outros_documentos ?? '',
    });
  }, [os]);

  const save = async () => {
    setSaving(true);
    try {
      await updateDadosGerais(os.id, {
        tipos_servico: form.tipos_servico, descricao: form.descricao.trim() || null,
        data_programada: form.data_programada || null, hora_prevista: form.hora_prevista || null,
        duracao_estimada: form.duracao_estimada || null, recorrencia: form.recorrencia,
        endereco_execucao: form.endereco_execucao.trim() || null,
        responsavel_admin_id: form.responsavel_admin_id || null,
        funcionario_integrado_id: form.funcionario_integrado_id || null,
        observacoes: form.observacoes.trim() || null, pragas: form.pragas,
        necessita_relatorio: form.necessita_relatorio, outros_documentos: form.outros_documentos.trim() || null,
      });
      showToast('Alterações salvas'); setEditing(false); onSaved();
    } catch (e) { showToast((e as Error).message); } finally { setSaving(false); }
  };

  const funcOpts = [{ value: '', label: '—' }, ...funcs.map((f) => ({ value: f.id, label: f.bloqueado ? `${f.nome} (doc. vencido)` : f.nome }))];

  return (
    <Card
      title="Dados gerais"
      action={editable && (editing
        ? <div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancelar</Button><Button size="sm" onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar alterações'}</Button></div>
        : <Button size="sm" onClick={() => setEditing(true)}>Editar</Button>)}
    >
      {!editing ? (
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-3">
          <Info label="Cliente vinculado"><Link to={`/clientes/${os.clienteId}`} className="font-semibold text-forest-700 hover:underline">{os.cliente}</Link></Info>
          <Info label="Tipos de serviço">{os.tipos_servico.join(', ') || '—'}</Info>
          <Info label="Recorrência">{recorrenciaLabel[os.recorrencia]}</Info>
          <Info label="Data programada">{os.data_programada ? os.data_programada.split('-').reverse().join('/') : '—'}</Info>
          <Info label="Hora prevista">{os.hora_prevista || '—'}</Info>
          <Info label="Duração estimada">{os.duracao_estimada || '—'}</Info>
          <Info label="Responsável administrativo">{os.responsavel || '—'}</Info>
          <Info label="Funcionário integrado / parceiro">{os.integrado || '—'}</Info>
          <Info label="Pragas-alvo">{os.pragas.join(', ') || '—'}</Info>
          <Info label="Endereço de execução" span>{os.endereco_execucao || '—'}</Info>
          <Info label="Necessita relatório técnico">{os.necessita_relatorio ? 'Sim' : 'Não'}</Info>
          <Info label="Outros documentos exigidos">{os.outros_documentos || '—'}</Info>
          <Info label="Descrição / observações" span>{os.descricao || os.observacoes || '—'}</Info>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <MultiCheck label="Tipos de serviço" options={tiposCat} value={form.tipos_servico} onChange={(v) => setForm((s) => ({ ...s, tipos_servico: v }))} />
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3">
            <TextField type="date" label="Data programada" value={form.data_programada} onChange={(e) => setForm((s) => ({ ...s, data_programada: e.target.value }))} />
            <TextField type="time" label="Hora prevista" value={form.hora_prevista} onChange={(e) => setForm((s) => ({ ...s, hora_prevista: e.target.value }))} />
            <TextField label="Duração estimada" value={form.duracao_estimada} onChange={(e) => setForm((s) => ({ ...s, duracao_estimada: e.target.value }))} placeholder="Ex.: 2h" />
            <SelectField label="Recorrência" value={form.recorrencia} onChange={(e) => setForm((s) => ({ ...s, recorrencia: e.target.value as Recorrencia }))}
              options={(['nenhuma', 'semanal', 'mensal', 'trimestral'] as Recorrencia[]).map((r) => ({ value: r, label: recorrenciaLabel[r] }))} />
            <SelectField label="Responsável administrativo" value={form.responsavel_admin_id} onChange={(e) => setForm((s) => ({ ...s, responsavel_admin_id: e.target.value }))} options={funcOpts} />
            <SelectField label="Funcionário integrado / parceiro" value={form.funcionario_integrado_id} onChange={(e) => setForm((s) => ({ ...s, funcionario_integrado_id: e.target.value }))} options={funcOpts} />
          </div>
          <TextField label="Endereço de execução" value={form.endereco_execucao} onChange={(e) => setForm((s) => ({ ...s, endereco_execucao: e.target.value }))} placeholder="Puxa do cliente, editável" />
          <MultiCheck label="Pragas-alvo" options={pragasCat} value={form.pragas} onChange={(v) => setForm((s) => ({ ...s, pragas: v }))} />
          <div className="grid grid-cols-2 gap-3.5">
            <label className="flex items-center gap-2 text-sm text-ink-800"><input type="checkbox" className="h-4 w-4 accent-forest-600" checked={form.necessita_relatorio} onChange={(e) => setForm((s) => ({ ...s, necessita_relatorio: e.target.checked }))} />Necessita relatório técnico</label>
            <TextField label="Outros documentos exigidos" value={form.outros_documentos} onChange={(e) => setForm((s) => ({ ...s, outros_documentos: e.target.value }))} />
          </div>
          <TextareaField label="Descrição / observações" value={form.descricao} onChange={(e) => setForm((s) => ({ ...s, descricao: e.target.value }))} />
        </div>
      )}
    </Card>
  );
}

// ============================================================
// Aba b — Execução
// ============================================================
function ExecucaoTab({ os, editable }: { os: OrdemServicoDetail; editable: boolean }) {
  // null enquanto carrega, para não piscar "Nenhuma" antes de saber.
  const [fotos, setFotos] = useState<number | null>(null);
  const { showToast } = useToast();
  const [rows, setRows] = useState<OsFuncionarioRow[]>([]);
  const [prodDiverg, setProdDiverg] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [opts, setOpts] = useState<FuncionarioOption[]>([]);
  const [sel, setSel] = useState('');
  const [del, setDel] = useState<OsFuncionarioRow | null>(null);

  const load = useCallback(() => {
    listOsFuncionarios(os.id).then(setRows).catch((e) => showToast((e as Error).message));
    listOsProdutos(os.id).then((p) => setProdDiverg(p.some((x) => x.divergente))).catch(() => {});
    listOsAnexos(os.id).then((a) => setFotos(a.filter((x) => x.tipo === 'foto').length)).catch(() => setFotos(0));
  }, [os.id, showToast]);
  useEffect(() => { load(); }, [load]);

  const openAdd = async () => { setSel(''); setOpts(await listFuncionarioOptions()); setAddOpen(true); };
  const add = async () => {
    if (!sel) return showToast('Selecione um funcionário.');
    if (opts.find((o) => o.id === sel)?.bloqueado) return showToast('Funcionário com ASO/CNH vencido não pode ser vinculado.');
    try { await addOsFuncionario(os.id, sel); setAddOpen(false); showToast('Funcionário vinculado — notificação enviada ao app'); load(); }
    catch (e) { showToast((e as Error).message); }
  };
  const remove = async () => { if (!del) return; try { await removeOsFuncionario(os.id, del.vinculoId, del.nome); setDel(null); showToast('Funcionário removido'); load(); } catch (e) { showToast((e as Error).message); } };

  const th = 'px-4 py-2.5 text-left text-xs font-bold uppercase text-ink-400';
  return (
    <div className="flex flex-col gap-5">
      {prodDiverg && (
        <div className="flex items-center gap-2 rounded-xl border border-[#f2c9bd] bg-[#fff4f0] px-4 py-3 text-[13px] font-medium text-danger">
          <AlertTriangle className="h-4 w-4" />O consumo registrado difere do previsto em um ou mais produtos.
        </div>
      )}
      <Card title="Funcionários vinculados" flush action={editable && <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" />Adicionar</Button>}>
        <table className="w-full border-collapse">
          <thead><tr className="bg-ink-50"><th className={cn(th, 'pl-6')}>Funcionário</th><th className={th}>Cargo</th><th className={cn(th, 'pr-6 text-right')}>Ações</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-ink-400">Nenhum funcionário vinculado.</td></tr>}
            {rows.map((f) => (
              <tr key={f.vinculoId} className="border-t border-ink-100">
                <td className="px-4 py-3 pl-6 text-sm font-medium text-ink-800">{f.nome}</td>
                <td className="px-4 py-3 text-sm text-ink-600">{f.cargo}</td>
                <td className="px-4 py-3 pr-6 text-right">{editable ? <button onClick={() => setDel(f)} className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-ink-400 hover:text-danger-bright"><Trash2 className="h-4 w-4" /></button> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {os.integrado && <p className="border-t border-ink-100 px-6 py-3 text-[13px] text-ink-500">Funcionário integrado/parceiro: <span className="font-semibold text-ink-700">{os.integrado}</span></p>}
      </Card>

      <Card title="Captura em campo (app do operador)" subtitle="Somente leitura — preenchido pelo app mobile">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Capture icon={MapPin} label="Check-in" value={fmtDateTime(os.check_in_at)} />
          <Capture icon={MapPin} label="Check-out" value={fmtDateTime(os.check_out_at)} />
          <CaptureAssinatura caminho={os.assinatura_url} />
          {/* Contava fotos olhando `assinatura_url` — campo errado: sem assinatura
              dizia "—" mesmo com fotos anexadas, e com assinatura mandava para a
              aba de anexos mesmo sem foto nenhuma. */}
          <Capture icon={Camera} label="Fotos anexadas" value={fotos === null ? '…' : fotos === 0 ? 'Nenhuma' : `${fotos} · ver em Anexos`} ok={!!fotos} />
        </div>
        {!os.assinatura_url && <p className="mt-3 text-[13px] text-ink-400">A assinatura do cliente é obrigatória para marcar a OS como executada.</p>}
      </Card>

      {addOpen && (
        <Modal open onClose={() => setAddOpen(false)}>
          <div className="border-b border-ink-100 px-7 py-[22px]"><h2 className="text-[19px] font-bold text-ink-900">Adicionar funcionário</h2></div>
          <div className="px-7 py-6">
            <SelectField label="Funcionário" value={sel} onChange={(e) => setSel(e.target.value)}
              options={[{ value: '', label: 'Selecione…' }, ...opts.map((o) => ({ value: o.id, label: o.bloqueado ? `${o.nome} — ${o.cargo} (doc. vencido)` : `${o.nome} — ${o.cargo}` }))]} />
          </div>
          <div className="flex gap-3 px-7 pb-6"><Button variant="secondary" fullWidth onClick={() => setAddOpen(false)} className="h-[52px]">Cancelar</Button><Button fullWidth onClick={add} disabled={!sel} className="h-[52px]">Vincular</Button></div>
        </Modal>
      )}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={remove} title={del ? `Remover ${del.nome}` : ''} description="O funcionário será desvinculado desta OS (nova notificação será enviada)." confirmLabel="Remover" destructive />
    </div>
  );
}

// ============================================================
// Aba c — Produtos e equipamentos
// ============================================================
function ProdutosTab({ os, editable }: { os: OrdemServicoDetail; editable: boolean }) {
  const { showToast } = useToast();
  const [prods, setProds] = useState<OsProdutoRow[]>([]);
  const [equips, setEquips] = useState<OsEquipamentoRow[]>([]);
  const [addProd, setAddProd] = useState(false);
  const [addEquip, setAddEquip] = useState(false);
  const [ajuste, setAjuste] = useState<OsProdutoRow | null>(null);
  const [ajusteVal, setAjusteVal] = useState('');
  const [delProd, setDelProd] = useState<OsProdutoRow | null>(null);
  const [delEquip, setDelEquip] = useState<OsEquipamentoRow | null>(null);

  const load = useCallback(() => {
    listOsProdutos(os.id).then(setProds).catch((e) => showToast((e as Error).message));
    listOsEquipamentos(os.id).then(setEquips).catch(() => {});
  }, [os.id, showToast]);
  useEffect(() => { load(); }, [load]);

  const saveAjuste = async () => {
    if (!ajuste) return;
    const v = ajusteVal.trim() === '' ? null : Number(ajusteVal.replace(',', '.'));
    if (v != null && Number.isNaN(v)) return showToast('Quantidade inválida.');
    try { await ajustarQtdUtilizada(os.id, ajuste.id, v); setAjuste(null); setAjusteVal(''); showToast('Consumo ajustado'); load(); }
    catch (e) { showToast((e as Error).message); }
  };
  const removeProd = async () => { if (!delProd) return; try { await removeOsProduto(os.id, delProd.id); setDelProd(null); showToast('Produto removido'); load(); } catch (e) { showToast((e as Error).message); } };
  const removeEquip = async () => { if (!delEquip) return; try { await removeOsEquipamento(os.id, delEquip.id); setDelEquip(null); showToast('Equipamento removido'); load(); } catch (e) { showToast((e as Error).message); } };

  const th = 'px-4 py-2.5 text-left text-xs font-bold uppercase text-ink-400';
  return (
    <div className="flex flex-col gap-5">
      <Card title="Produtos previstos" flush subtitle="Quantidade utilizada é preenchida pelo app do operador" action={editable && <Button size="sm" onClick={() => setAddProd(true)}><Plus className="h-4 w-4" />Adicionar produto</Button>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead><tr className="bg-ink-50">
              <th className={cn(th, 'pl-6')}>Produto</th><th className={th}>Qtd. recomendada</th><th className={th}>Qtd. utilizada</th>
              <th className={th}>Unidade</th><th className={th}>Lote</th><th className={th}>Prazo alvo</th><th className={cn(th, 'pr-6 text-right')}>Ações</th>
            </tr></thead>
            <tbody>
              {prods.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-400">Nenhum produto previsto.</td></tr>}
              {prods.map((p) => (
                <tr key={p.id} className="border-t border-ink-100">
                  <td className="px-4 py-3 pl-6 text-sm font-medium text-ink-800">{p.produto} <span className="text-ink-400">· {p.codigo}</span></td>
                  <td className="px-4 py-3 text-sm text-ink-700">{p.qtd_recomendada}</td>
                  <td className="px-4 py-3 text-sm">
                    {p.qtd_utilizada == null ? <span className="text-ink-400">—</span> : <span className={cn('font-semibold', p.divergente ? 'text-danger-bright' : 'text-ink-800')}>{p.qtd_utilizada}</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-600">{p.unidade}</td>
                  <td className="px-4 py-3 text-sm text-ink-600">{p.lote}</td>
                  <td className="px-4 py-3 text-sm text-ink-600">{p.prazoAlvo}</td>
                  <td className="px-4 py-3 pr-6 text-right">
                    {editable ? (
                      <div className="inline-flex gap-2">
                        <button onClick={() => { setAjuste(p); setAjusteVal(p.qtd_utilizada?.toString() ?? ''); }} className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-ink-600">Ajustar consumo</button>
                        <button onClick={() => setDelProd(p)} className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-ink-400 hover:text-danger-bright"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-ink-100 px-6 py-3 text-[13px] text-ink-400">A baixa de estoque ocorre apenas com o consumo real registrado no app — não ao criar a OS.</p>
      </Card>

      <Card title="Equipamentos" flush action={editable && <Button size="sm" onClick={() => setAddEquip(true)}><Plus className="h-4 w-4" />Adicionar equipamento</Button>}>
        <table className="w-full border-collapse">
          <thead><tr className="bg-ink-50"><th className={cn(th, 'pl-6')}>Equipamento</th><th className={th}>Nº de série</th><th className={th}>Responsável atual</th><th className={cn(th, 'pr-6 text-right')}>Ações</th></tr></thead>
          <tbody>
            {equips.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-ink-400">Nenhum equipamento.</td></tr>}
            {equips.map((e) => (
              <tr key={e.id} className="border-t border-ink-100">
                <td className="px-4 py-3 pl-6 text-sm font-medium text-ink-800">{e.equipamento}</td>
                <td className="px-4 py-3 text-sm text-ink-600">{e.numeroSerie}</td>
                <td className="px-4 py-3 text-sm text-ink-600">{e.responsavel}</td>
                <td className="px-4 py-3 pr-6 text-right">{editable ? <button onClick={() => setDelEquip(e)} className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-ink-400 hover:text-danger-bright"><Trash2 className="h-4 w-4" /></button> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {addProd && <ProdutoPicker title="Adicionar produto do almoxarifado" loader={listProdutoOptions} onClose={() => setAddProd(false)} onPick={async (p, extra) => { try { await addOsProduto(os.id, { produto_id: p.id, qtd_recomendada: extra.qtd, unidade: p.un, lote: extra.lote || null, prazo_alvo: extra.prazo || null }); setAddProd(false); showToast('Produto adicionado'); load(); } catch (e) { showToast((e as Error).message); } }} withQtd />}
      {addEquip && <ProdutoPicker title="Adicionar equipamento do inventário" loader={listEquipamentoOptions} onClose={() => setAddEquip(false)} onPick={async (p, extra) => { try { await addOsEquipamento(os.id, { produto_id: p.id, numero_serie: extra.serie || null }); setAddEquip(false); showToast('Equipamento adicionado'); load(); } catch (e) { showToast((e as Error).message); } }} withSerie />}

      {ajuste && (
        <Modal open onClose={() => setAjuste(null)}>
          <div className="border-b border-ink-100 px-7 py-[22px]"><h2 className="text-[19px] font-bold text-ink-900">Ajustar consumo</h2><p className="mt-0.5 text-[13px] text-ink-400">{ajuste.produto} · previsto {ajuste.qtd_recomendada} {ajuste.unidade}</p></div>
          <div className="px-7 py-6"><TextField label="Quantidade utilizada" inputMode="decimal" value={ajusteVal} onChange={(e) => setAjusteVal(e.target.value)} placeholder="Deixe vazio para 'não informado'" /></div>
          <div className="flex gap-3 px-7 pb-6"><Button variant="secondary" fullWidth onClick={() => setAjuste(null)} className="h-[52px]">Cancelar</Button><Button fullWidth onClick={saveAjuste} className="h-[52px]">Salvar ajuste</Button></div>
        </Modal>
      )}
      <ConfirmDialog open={!!delProd} onClose={() => setDelProd(null)} onConfirm={removeProd} title={delProd ? `Remover ${delProd.produto}` : ''} description="O produto previsto será removido da OS." confirmLabel="Remover" destructive />
      <ConfirmDialog open={!!delEquip} onClose={() => setDelEquip(null)} onConfirm={removeEquip} title={delEquip ? `Remover ${delEquip.equipamento}` : ''} description="O equipamento será removido da OS." confirmLabel="Remover" destructive />
    </div>
  );
}

// ============================================================
// Aba d — Relatórios
// ============================================================
function RelatoriosTab({ os, editable }: { os: OrdemServicoDetail; editable: boolean }) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<OsRelatorioRow[]>([]);
  const [novo, setNovo] = useState(false);
  const [titulo, setTitulo] = useState('');

  const load = useCallback(() => { listOsRelatorios(os.id).then(setRows).catch((e) => showToast((e as Error).message)); }, [os.id, showToast]);
  useEffect(() => { load(); }, [load]);

  const emitir = async () => {
    if (!titulo.trim()) return showToast('Informe o título do relatório.');
    try { await emitirRelatorio(os.id, titulo.trim(), null); setNovo(false); setTitulo(''); showToast('Relatório emitido'); load(); }
    catch (e) { showToast((e as Error).message); }
  };
  const publicar = async (r: OsRelatorioRow) => {
    try { await publicarRelatorio(os.id, r.id, os.status); showToast('Relatório disponibilizado no portal do cliente'); load(); }
    catch (e) { showToast((e as Error).message); }
  };
  const remover = async (r: OsRelatorioRow) => { try { await removerRelatorio(os.id, r.id); showToast('Relatório removido'); load(); } catch (e) { showToast((e as Error).message); } };

  const podePublicar = os.status === 'executada' || os.status === 'concluida';
  const th = 'px-4 py-2.5 text-left text-xs font-bold uppercase text-ink-400';
  return (
    <Card title="Relatórios técnicos" flush action={editable && <Button size="sm" onClick={() => setNovo(true)}><Plus className="h-4 w-4" />Emitir novo relatório</Button>}>
      <table className="w-full border-collapse">
        <thead><tr className="bg-ink-50"><th className={cn(th, 'pl-6')}>Título</th><th className={th}>Emitido em</th><th className={th}>Publicado no portal</th><th className={cn(th, 'pr-6 text-right')}>Ações</th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-ink-400">Nenhum relatório emitido.</td></tr>}
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-ink-100">
              <td className="px-4 py-3 pl-6 text-sm font-medium text-ink-800">{r.titulo}</td>
              <td className="px-4 py-3 text-sm text-ink-600">{r.criadoEm}</td>
              <td className="px-4 py-3">{r.publicado ? <Badge tone="success">Publicado · {r.publicadoEm}</Badge> : <Badge tone="muted">Não publicado</Badge>}</td>
              <td className="px-4 py-3 pr-6 text-right">
                <div className="inline-flex items-center gap-2">
                  <button onClick={() => showToast('Baixar PDF (em breve)')} className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-ink-500 hover:bg-ink-50"><FileText className="h-4 w-4" /></button>
                  {editable && !r.publicado && (
                    <button onClick={() => publicar(r)} disabled={!podePublicar} title={podePublicar ? '' : 'Só quando a OS estiver executada/concluída'} className="inline-flex items-center gap-1.5 rounded-lg bg-greenSoft px-2.5 py-1.5 text-[12px] font-semibold text-forest-900 disabled:opacity-40"><Share2 className="h-3.5 w-3.5" />Disponibilizar</button>
                  )}
                  {editable && <button onClick={() => remover(r)} className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-ink-400 hover:text-danger-bright"><Trash2 className="h-4 w-4" /></button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!podePublicar && <p className="border-t border-ink-100 px-6 py-3 text-[13px] text-ink-400">Publicação no portal fica disponível quando a OS estiver executada ou concluída.</p>}
      {novo && (
        <Modal open onClose={() => setNovo(false)}>
          <div className="border-b border-ink-100 px-7 py-[22px]"><h2 className="text-[19px] font-bold text-ink-900">Emitir relatório técnico</h2></div>
          <div className="px-7 py-6"><TextField label="Título" required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Relatório de execução — visita 1" /><p className="mt-2 text-[13px] text-ink-400">O upload do PDF gerado pelo app é anexado posteriormente.</p></div>
          <div className="flex gap-3 px-7 pb-6"><Button variant="secondary" fullWidth onClick={() => setNovo(false)} className="h-[52px]">Cancelar</Button><Button fullWidth onClick={emitir} className="h-[52px]">Emitir</Button></div>
        </Modal>
      )}
    </Card>
  );
}

// ============================================================
// Aba e — Anexos
// ============================================================
function AnexosTab({ osId, editable }: { osId: string; editable: boolean }) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<OsAnexoRow[]>([]);
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState<{ nome: string; tipo: AnexoTipo }>({ nome: '', tipo: 'foto' });
  const [del, setDel] = useState<OsAnexoRow | null>(null);

  const load = useCallback(() => { listOsAnexos(osId).then(setRows).catch((e) => showToast((e as Error).message)); }, [osId, showToast]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!form.nome.trim()) return showToast('Informe o nome do arquivo.');
    try { await addAnexo(osId, form.nome.trim(), form.tipo, null); setNovo(false); setForm({ nome: '', tipo: 'foto' }); showToast('Anexo adicionado'); load(); }
    catch (e) { showToast((e as Error).message); }
  };
  const remove = async () => { if (!del) return; try { await removerAnexo(osId, del.id, del.nome); setDel(null); showToast('Anexo excluído'); load(); } catch (e) { showToast((e as Error).message); } };

  const th = 'px-4 py-2.5 text-left text-xs font-bold uppercase text-ink-400';
  return (
    <Card title="Anexos" flush action={editable && <Button size="sm" onClick={() => setNovo(true)}><Plus className="h-4 w-4" />Adicionar anexo</Button>}>
      <table className="w-full border-collapse">
        <thead><tr className="bg-ink-50"><th className={cn(th, 'pl-6')}>Arquivo</th><th className={th}>Tipo</th><th className={th}>Enviado em</th><th className={cn(th, 'pr-6 text-right')}>Ações</th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-ink-400">Nenhum anexo.</td></tr>}
          {rows.map((a) => (
            <tr key={a.id} className="border-t border-ink-100">
              <td className="px-4 py-3 pl-6 text-sm font-medium text-ink-800">{a.nome}</td>
              <td className="px-4 py-3"><Badge tone="info">{a.tipoLabel}</Badge></td>
              <td className="px-4 py-3 text-sm text-ink-600">{a.criadoEm}</td>
              <td className="px-4 py-3 pr-6 text-right">{editable ? <button onClick={() => setDel(a)} className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-ink-400 hover:text-danger-bright"><Trash2 className="h-4 w-4" /></button> : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {novo && (
        <Modal open onClose={() => setNovo(false)}>
          <div className="border-b border-ink-100 px-7 py-[22px]"><h2 className="text-[19px] font-bold text-ink-900">Adicionar anexo</h2></div>
          <div className="flex flex-col gap-3.5 px-7 py-6">
            <TextField label="Nome do arquivo" required value={form.nome} onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))} placeholder="Ex.: comprovante-visita.pdf" />
            <SelectField label="Tipo" value={form.tipo} onChange={(e) => setForm((s) => ({ ...s, tipo: e.target.value as AnexoTipo }))}
              options={(['foto', 'comprovante', 'autorizacao', 'extra', 'outro'] as AnexoTipo[]).map((t) => ({ value: t, label: anexoTipoLabel[t] }))} />
            <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-3.5 py-2.5 text-[13px] text-ink-500"><Upload className="h-4 w-4" />O upload do arquivo para o storage é feito na integração (em breve).</div>
          </div>
          <div className="flex gap-3 px-7 pb-6"><Button variant="secondary" fullWidth onClick={() => setNovo(false)} className="h-[52px]">Cancelar</Button><Button fullWidth onClick={add} className="h-[52px]">Adicionar</Button></div>
        </Modal>
      )}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={remove} title={del ? `Excluir ${del.nome}` : ''} description="O anexo será removido permanentemente." confirmLabel="Excluir" destructive />
    </Card>
  );
}

// ============================================================
// Aba f — Histórico
// ============================================================
function HistoricoTab({ osId }: { osId: string }) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<HistoricoRow[]>([]);
  const [autores, setAutores] = useState<{ id: string; nome: string }[]>([]);
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [autor, setAutor] = useState('');

  const load = useCallback(() => {
    listOsHistorico(osId, { de: de || undefined, ate: ate || undefined, actorId: autor || undefined }).then(setRows).catch((e) => showToast((e as Error).message));
  }, [osId, de, ate, autor, showToast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { listHistoricoAutores(osId).then(setAutores).catch(() => {}); }, [osId]);

  const th = 'px-4 py-2.5 text-left text-xs font-bold uppercase text-ink-400';
  return (
    <Card title="Histórico de alterações" flush subtitle="Somente leitura — todas as alterações da OS">
      <div className="flex flex-wrap items-end gap-2.5 px-6 py-3">
        <TextField type="date" label="De" className="w-[150px]" value={de} onChange={(e) => setDe(e.target.value)} />
        <TextField type="date" label="Até" className="w-[150px]" value={ate} onChange={(e) => setAte(e.target.value)} />
        <SelectField label="Usuário" className="min-w-[180px]" value={autor} onChange={(e) => setAutor(e.target.value)}
          options={[{ value: '', label: 'Todos os usuários' }, ...autores.map((a) => ({ value: a.id, label: a.nome }))]} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse">
          <thead><tr className="bg-ink-50"><th className={cn(th, 'pl-6')}>Data e hora</th><th className={th}>Usuário</th><th className={th}>Campo alterado</th><th className={th}>Valor anterior</th><th className={cn(th, 'pr-6')}>Valor novo</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-400">Nenhum registro no período.</td></tr>}
            {rows.map((h) => (
              <tr key={h.id} className="border-t border-ink-100">
                <td className="px-4 py-3 pl-6 text-sm text-ink-600">{h.quando}</td>
                <td className="px-4 py-3 text-sm text-ink-700">{h.usuario}</td>
                <td className="px-4 py-3 text-sm font-medium text-ink-800">{h.campo}</td>
                <td className="px-4 py-3 text-sm text-ink-500">{h.anterior}</td>
                <td className="px-4 py-3 pr-6 text-sm text-ink-800">{h.novo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ============================================================
// Sub-componentes compartilhados
// ============================================================
function Card({ title, subtitle, action, flush, children }: { title: string; subtitle?: string; action?: React.ReactNode; flush?: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-6 py-4">
        <div><h3 className="text-[15px] font-bold text-ink-900">{title}</h3>{subtitle && <p className="mt-0.5 text-[13px] text-ink-400">{subtitle}</p>}</div>
        {action}
      </div>
      {flush ? children : <div className="px-6 py-5">{children}</div>}
    </div>
  );
}
function Info({ label, children, span }: { label: string; children: React.ReactNode; span?: boolean }) {
  return (<div className={cn(span && 'col-span-2 md:col-span-3')}><p className="text-[11px] font-bold uppercase text-ink-400">{label}</p><p className="mt-0.5 text-sm text-ink-800">{children}</p></div>);
}
/**
 * Mostra a assinatura coletada em campo, e não só a palavra "Coletada".
 *
 * A imagem vive num bucket privado, então precisa de URL assinada — pedida sob
 * demanda, ao abrir, em vez de para toda OS da lista.
 */
function CaptureAssinatura({ caminho }: { caminho: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!caminho) return;
    urlAssinadaOperacional(caminho).then((u) => (u ? setUrl(u) : setErro(true)));
  }, [caminho]);

  return (
    <div className="rounded-xl border border-ink-100 px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-ink-400"><PenLine className="h-3.5 w-3.5" />Assinatura do cliente</p>
      {!caminho && <p className="mt-1 text-sm font-semibold text-ink-700">Pendente</p>}
      {caminho && !url && !erro && <p className="mt-1 text-sm font-semibold text-ink-400">Carregando…</p>}
      {caminho && erro && <p className="mt-1 text-sm font-semibold text-ink-700">Coletada (arquivo indisponível)</p>}
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="mt-1.5 block">
          <img src={url} alt="Assinatura do cliente" className="h-14 w-full rounded-md border border-ink-100 bg-white object-contain" />
        </a>
      )}
    </div>
  );
}
function Capture({ icon: Icon, label, value, ok }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; ok?: boolean }) {
  return (
    <div className="rounded-xl border border-ink-100 px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-ink-400"><Icon className="h-3.5 w-3.5" />{label}</p>
      <p className={cn('mt-1 text-sm font-semibold', ok ? 'text-forest-700' : 'text-ink-700')}>{value}</p>
    </div>
  );
}
function MultiCheck({ label, options, value, onChange }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div>
      <p className="mb-1.5 block text-[13px] font-semibold text-ink-800">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.length === 0 && <span className="text-[13px] text-ink-400">Nenhum item no catálogo.</span>}
        {options.map((o) => (
          <button key={o} type="button" onClick={() => toggle(o)}
            className={cn('rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors', value.includes(o) ? 'border-forest-accent bg-forest-50 text-forest-700' : 'border-ink-200 bg-white text-ink-500 hover:bg-ink-50')}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

// Seletor de produto/equipamento (modal com busca + indicador de estoque).
function ProdutoPicker({ title, loader, onClose, onPick, withQtd, withSerie }: {
  title: string; loader: () => Promise<Produto[]>; onClose: () => void;
  onPick: (p: Produto, extra: { qtd: number; lote: string; prazo: string; serie: string }) => void;
  withQtd?: boolean; withSerie?: boolean;
}) {
  const [all, setAll] = useState<Produto[]>([]);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Produto | null>(null);
  const [qtd, setQtd] = useState('1');
  const [lote, setLote] = useState('');
  const [prazo, setPrazo] = useState('');
  const [serie, setSerie] = useState('');

  useEffect(() => { loader().then(setAll).catch(() => {}); }, [loader]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter((p) => !s || `${p.name} ${p.cod} ${p.cat}`.toLowerCase().includes(s));
  }, [all, q]);

  return (
    <Modal open onClose={onClose}>
      <div className="border-b border-ink-100 px-7 py-[22px]"><h2 className="text-[19px] font-bold text-ink-900">{title}</h2></div>
      <div className="flex max-h-[70vh] flex-col px-7 py-5">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, código ou categoria" />
        <div className="mt-3 max-h-[240px] overflow-y-auto rounded-xl border border-ink-100">
          {filtered.length === 0 && <p className="px-4 py-6 text-center text-sm text-ink-400">Nenhum item.</p>}
          {filtered.map((p) => (
            <button key={p.id} onClick={() => setSel(p)} className={cn('flex w-full items-center justify-between gap-3 border-b border-ink-50 px-4 py-2.5 text-left last:border-0 hover:bg-ink-50', sel?.id === p.id && 'bg-forest-50')}>
              <span className="text-sm text-ink-800">{p.name} <span className="text-ink-400">· {p.cod} · {p.cat}</span></span>
              <span className="whitespace-nowrap text-[12px] text-ink-500">estoque: {p.stock} {p.un}</span>
            </button>
          ))}
        </div>
        {sel && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            {withQtd && <TextField label="Qtd. recomendada" inputMode="decimal" className="w-[130px]" value={qtd} onChange={(e) => setQtd(e.target.value)} />}
            {withQtd && <TextField label="Lote (opcional)" className="w-[130px]" value={lote} onChange={(e) => setLote(e.target.value)} />}
            {withQtd && <TextField type="date" label="Prazo alvo" className="w-[150px]" value={prazo} onChange={(e) => setPrazo(e.target.value)} />}
            {withSerie && <TextField label="Nº de série" className="w-[180px]" value={serie} onChange={(e) => setSerie(e.target.value)} />}
          </div>
        )}
      </div>
      <div className="flex gap-3 border-t border-ink-100 px-7 py-4">
        <Button variant="secondary" fullWidth onClick={onClose} className="h-[50px]">Cancelar</Button>
        <Button fullWidth disabled={!sel} onClick={() => sel && onPick(sel, { qtd: Number(qtd.replace(',', '.')) || 0, lote, prazo, serie })} className="h-[50px]">Adicionar</Button>
      </div>
    </Modal>
  );
}
