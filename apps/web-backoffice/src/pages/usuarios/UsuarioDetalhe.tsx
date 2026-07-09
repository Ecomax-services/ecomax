import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText, Edit3, History, Clock, Upload, FileCheck2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TextField, SelectField, TextareaField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { docTone, actionInfoMap, type UserActionKey } from '@/data/usuarios';
import {
  getFuncionario,
  updateFuncionario,
  docState,
  logAuditoria,
  listAuditoria,
  listPerfisAcesso,
  listGestores,
  distinctValues,
  resetSenha,
  setBloqueioLogin,
  alterarPerfilAcesso,
  uploadFuncionarioFile,
  signedDocUrl,
  type FuncionarioRow,
  type AuditoriaRow,
} from '@/lib/funcionarios';

interface DocUrls {
  avatar: string | null;
  aso: string | null;
  cnh: string | null;
}

type Tab = 'dados' | 'cronograma' | 'os' | 'indicadores' | 'acessos';
const tabs: { key: Tab; label: string }[] = [
  { key: 'dados', label: 'Dados básicos' },
  { key: 'cronograma', label: 'Cronograma' },
  { key: 'os', label: 'OS vinculadas' },
  { key: 'indicadores', label: 'Indicadores' },
  { key: 'acessos', label: 'Acessos & permissões' },
];

const gestorNomeOf = (g: FuncionarioRow['gestor']) => (Array.isArray(g) ? g[0]?.nome_completo : g?.nome_completo) ?? '—';
const isoToBR = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '');
const fmtDoc = (iso: string | null) => (iso ? isoToBR(iso) : 'Não se aplica');
const brToISO = (s: string) => {
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

export function UsuarioDetalhe() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = useAuth();
  const canEdit = can('gestao_usuarios', 'editar');

  const [row, setRow] = useState<FuncionarioRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('dados');
  const [editing, setEditing] = useState(params.get('edit') === '1' && canEdit);
  const [action, setAction] = useState<UserActionKey | null>(null);
  const [audit, setAudit] = useState<AuditoriaRow[]>([]);
  const [perfis, setPerfis] = useState<{ id: string; nome: string }[]>([]);
  const [novoPerfil, setNovoPerfil] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [docUrls, setDocUrls] = useState<DocUrls>({ avatar: null, aso: null, cnh: null });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setRow(await getFuncionario(id));
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { listPerfisAcesso().then(setPerfis); }, []);

  // URLs assinadas (temporárias) para exibir foto/documentos privados.
  useEffect(() => {
    if (!row) return;
    let alive = true;
    Promise.all([
      signedDocUrl(row.avatar_url),
      signedDocUrl(row.aso_arquivo_url),
      signedDocUrl(row.cnh_arquivo_url),
    ]).then(([avatar, aso, cnh]) => {
      if (alive) setDocUrls({ avatar, aso, cnh });
    });
    return () => { alive = false; };
  }, [row]);

  const info = action ? actionInfoMap[action] : null;

  const openHist = async () => {
    if (id) setAudit(await listAuditoria(id));
    setAction('hist');
  };

  const runAction = async () => {
    if (!row || !action) return;
    try {
      if (action === 'inativar') {
        await updateFuncionario(row.id, { ativo: false });
        await logAuditoria(row.id, 'funcionario_inativado', { nome: row.nome_completo }, justificativa);
      } else if (action === 'reset') {
        if (!row.email) throw new Error('Funcionário sem e-mail de acesso.');
        await resetSenha(row.id, row.email);
      } else if (action === 'bloquear') {
        if (!row.profile_id) throw new Error('Funcionário sem login para bloquear.');
        await setBloqueioLogin(row.id, row.profile_id, true, justificativa);
      } else if (action === 'perfil') {
        if (!row.profile_id || !novoPerfil) throw new Error('Selecione o perfil.');
        await alterarPerfilAcesso(row.profile_id, novoPerfil);
        await logAuditoria(row.id, 'perfil_alterado', { perfil_acesso_id: novoPerfil });
      }
      showToast(`${info?.title} · registrado na auditoria`);
      setAction(null);
      setJustificativa('');
      await load();
    } catch (e) {
      showToast((e as Error).message);
    }
  };

  if (loading) return <div className="flex-1 px-8 py-16 text-center text-sm text-ink-400">Carregando…</div>;
  if (!row) {
    return (
      <div className="flex-1 px-8 py-16 text-center">
        <p className="text-sm text-ink-500">Funcionário não encontrado.</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate('/usuarios')}>Voltar</Button>
      </div>
    );
  }

  const asoState = docState(row.aso_validade);
  const cnhState = docState(row.cnh_validade);
  const initials = row.nome_completo.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      <header className="bg-white px-8 py-[22px] shadow-topbar">
        <p className="mb-3.5 text-sm text-ink-400">
          Início <span className="mx-1.5">/</span> Gestão de Usuários <span className="mx-1.5">/</span> {row.nome_completo}
        </p>
        <div className="flex items-center gap-[18px]">
          {docUrls.avatar ? (
            <img src={docUrls.avatar} alt={row.nome_completo} className="h-16 w-16 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-forest-700 text-[22px] font-bold text-white">{initials}</div>
          )}
          <div className="flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-3">
              <h1 className="text-[22px] font-bold text-ink-900">{row.nome_completo}</h1>
              <Badge tone={row.ativo ? 'success' : 'muted'}>{row.ativo ? 'Ativo' : 'Inativo'}</Badge>
              {asoState === 'expired' && <Badge tone="danger">ASO vencido</Badge>}
              {cnhState === 'expired' && <Badge tone="danger">CNH vencida</Badge>}
              {asoState === 'soon' && <Badge tone="warn">ASO a vencer</Badge>}
              {cnhState === 'soon' && <Badge tone="warn">CNH a vencer</Badge>}
              {!row.profile_id && <Badge tone="softWarn">Sem credenciais</Badge>}
            </div>
            <p className="text-sm text-ink-500">{row.cargo} · {row.setor} · Gestor: {gestorNomeOf(row.gestor)}</p>
          </div>
          <div className="flex shrink-0 gap-2.5">
            <Button variant="secondary" size="sm" onClick={() => navigate('/usuarios')}>
              <ArrowLeft className="h-[18px] w-[18px]" />
              Voltar
            </Button>
            <Button variant="secondary" size="sm" onClick={openHist}>Histórico</Button>
            {canEdit && row.ativo && (
              <Button variant="secondary" size="sm" className="border-[#ffb8a8] text-danger-bright" onClick={() => setAction('inativar')}>Inativar</Button>
            )}
            {canEdit && !row.ativo && (
              <Button variant="secondary" size="sm" onClick={async () => { await updateFuncionario(row.id, { ativo: true }); await logAuditoria(row.id, 'funcionario_ativado', {}); showToast('Funcionário ativado'); load(); }}>Ativar</Button>
            )}
            {canEdit && <Button size="sm" onClick={() => { setTab('dados'); setEditing(true); }}>Editar dados</Button>}
          </div>
        </div>
        <div className="-mx-8 -mb-[22px] mt-[18px] border-t border-ink-100 px-8">
          <Tabs tabs={tabs} value={tab} onChange={setTab} />
        </div>
      </header>

      <div className="flex-1 px-8 py-7">
        {tab === 'dados' &&
          (editing ? (
            <DadosEdit row={row} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />
          ) : (
            <DadosView row={row} asoState={asoState} cnhState={cnhState} docUrls={docUrls} />
          ))}
        {tab === 'cronograma' && <EmBreve titulo="Cronograma" />}
        {tab === 'os' && <EmBreve titulo="OS vinculadas" />}
        {tab === 'indicadores' && <EmBreve titulo="Indicadores de produtividade" />}
        {tab === 'acessos' && <Acessos row={row} canEdit={canEdit} onAction={(a) => setAction(a)} />}
      </div>

      {/* Histórico */}
      {info?.isHist && (
        <Modal open onClose={() => setAction(null)}>
          <div className="flex items-center justify-between border-b border-ink-100 px-7 py-[22px]">
            <h2 className="text-[19px] font-bold text-ink-900">{info.title}</h2>
          </div>
          <div className="max-h-[420px] overflow-y-auto px-7 pb-2 pt-5">
            {audit.length === 0 && <p className="py-6 text-center text-sm text-ink-400">Sem registros de auditoria.</p>}
            {audit.map((a) => (
              <div key={a.id} className="flex gap-3 border-b border-ink-100 py-3.5 last:border-0">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-primary50">
                  <Edit3 className="h-[18px] w-[18px] text-forest-700" />
                </span>
                <div>
                  <div className="text-sm text-ink-800">{a.acao}{a.justificativa ? ` — ${a.justificativa}` : ''}</div>
                  <div className="mt-0.5 text-xs text-ink-400">{new Date(a.created_at).toLocaleString('pt-BR')}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-7 pb-6 pt-4">
            <Button fullWidth onClick={() => setAction(null)} className="h-[52px]">Fechar</Button>
          </div>
        </Modal>
      )}

      {/* Ações auditadas */}
      {info && !info.isHist && (
        <ConfirmDialog
          open
          onClose={() => { setAction(null); setJustificativa(''); }}
          onConfirm={runAction}
          title={info.title}
          description={info.desc}
          confirmLabel={info.confirm}
          destructive={info.danger}
        >
          {info.isPerfil && (
            <SelectField
              label="Novo perfil de acesso"
              value={novoPerfil}
              onChange={(e) => setNovoPerfil(e.target.value)}
              options={[{ value: '', label: 'Selecione…' }, ...perfis.map((p) => ({ value: p.id, label: p.nome }))]}
            />
          )}
          {info.justify && (
            <TextareaField label="Justificativa" placeholder="Descreva o motivo desta ação" className="mt-3" value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
          )}
          <p className="mt-3.5 flex items-center gap-1.5 text-[13px] text-ink-400">
            <History className="h-[17px] w-[17px]" />
            Esta ação será registrada na auditoria (usuário + data/hora + motivo).
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}

function DadosView({ row, asoState, cnhState, docUrls }: { row: FuncionarioRow; asoState: ReturnType<typeof docState>; cnhState: ReturnType<typeof docState>; docUrls: DocUrls }) {
  const cell = 'border-b border-ink-100 py-3';
  const endereco = [row.logradouro, row.numero, row.bairro, row.cidade, row.uf].filter(Boolean).join(', ') || '—';
  return (
    <div className="grid grid-cols-2 items-start gap-5">
      <div className="rounded-2xl border border-ink-100 bg-white px-7 py-6">
        <p className="mb-3.5 text-xs font-bold uppercase tracking-wider text-ink-400">Dados pessoais</p>
        <div className="grid grid-cols-2 gap-x-7">
          <Info className={cell} label="Nome completo" value={row.nome_completo} />
          <Info className={cell} label="CPF" value={row.cpf} />
          <Info className={cell} label="RG" value={row.rg || '—'} />
          <Info className={cell} label="Nascimento" value={isoToBR(row.data_nascimento) || '—'} />
          <Info className={cell} label="Telefone" value={row.telefone || '—'} />
          <Info className={cell} label="CEP" value={row.cep || '—'} />
          <Info className="col-span-2 py-3" label="Endereço" value={endereco} />
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div className="rounded-2xl border border-ink-100 bg-white px-7 py-6">
          <p className="mb-3.5 text-xs font-bold uppercase tracking-wider text-ink-400">Dados profissionais</p>
          <div className="grid grid-cols-2 gap-x-7">
            <Info className={cell} label="Cargo" value={row.cargo} />
            <Info className={cell} label="Setor" value={row.setor} />
            <Info className={cell} label="Gestor" value={gestorNomeOf(row.gestor)} />
            <Info className={cell} label="Admissão" value={isoToBR(row.data_admissao) || '—'} />
          </div>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white px-7 py-6">
          <p className="mb-3.5 text-xs font-bold uppercase tracking-wider text-ink-400">Documentos obrigatórios</p>
          <DocRow label="ASO" sub="Atestado de Saúde Ocupacional" date={fmtDoc(row.aso_validade)} state={asoState} url={docUrls.aso} />
          <DocRow label="CNH" sub={row.cnh_categoria ? `Categoria ${row.cnh_categoria}` : '—'} date={fmtDoc(row.cnh_validade)} state={cnhState} url={docUrls.cnh} last />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[13px] text-ink-400">{label}</div>
      <div className="mt-0.5 text-[15px] text-ink-800">{value}</div>
    </div>
  );
}

function DocRow({ label, sub, date, state, url, last }: { label: string; sub: string; date: string; state: keyof typeof docTone; url?: string | null; last?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between py-3', !last && 'border-b border-ink-100')}>
      <div className="flex items-center gap-2.5">
        <FileText className="h-[22px] w-[22px] text-ink-400" />
        <div>
          <div className="text-sm font-semibold text-ink-800">{label}</div>
          <div className="text-xs text-ink-400">{sub}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold text-forest-accent hover:underline">
            <ExternalLink className="h-[15px] w-[15px]" />
            Ver
          </a>
        )}
        <Badge tone={docTone[state]}>{date === 'Não se aplica' ? date : `Vecto ${date}`}</Badge>
      </div>
    </div>
  );
}

function DadosEdit({ row, onCancel, onSaved }: { row: FuncionarioRow; onCancel: () => void; onSaved: () => void }) {
  const { showToast } = useToast();
  const [f, setF] = useState({
    nome_completo: row.nome_completo,
    rg: row.rg ?? '',
    nascimento: isoToBR(row.data_nascimento),
    telefone: row.telefone ?? '',
    cep: row.cep ?? '',
    cargo: row.cargo,
    setor: row.setor,
    gestor_id: row.gestor_id ?? '',
    admissao: isoToBR(row.data_admissao),
    aso: isoToBR(row.aso_validade),
    cnh: isoToBR(row.cnh_validade),
  });
  const [saving, setSaving] = useState(false);
  const [gestores, setGestores] = useState<{ id: string; nome: string }[]>([]);
  const [cargos, setCargos] = useState<string[]>([]);
  const [setores, setSetores] = useState<string[]>([]);
  const [files, setFiles] = useState<{ foto: File | null; aso: File | null; cnh: File | null }>({ foto: null, aso: null, cnh: null });
  const fotoRef = useRef<HTMLInputElement>(null);
  const asoRef = useRef<HTMLInputElement>(null);
  const cnhRef = useRef<HTMLInputElement>(null);
  const up = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    listGestores().then((g) => setGestores(g.filter((x) => x.id !== row.id)));
    distinctValues('cargo').then(setCargos);
    distinctValues('setor').then(setSetores);
  }, [row.id]);

  const save = async () => {
    setSaving(true);
    try {
      const [fotoUrl, asoUrl, cnhUrl] = await Promise.all([
        files.foto ? uploadFuncionarioFile(files.foto, row.id, 'foto') : Promise.resolve(null),
        files.aso ? uploadFuncionarioFile(files.aso, row.id, 'aso') : Promise.resolve(null),
        files.cnh ? uploadFuncionarioFile(files.cnh, row.id, 'cnh') : Promise.resolve(null),
      ]);
      await updateFuncionario(row.id, {
        nome_completo: f.nome_completo.trim(),
        rg: f.rg || null,
        data_nascimento: brToISO(f.nascimento),
        telefone: f.telefone || null,
        cep: f.cep || null,
        cargo: f.cargo,
        setor: f.setor,
        gestor_id: f.gestor_id || null,
        data_admissao: brToISO(f.admissao),
        aso_validade: brToISO(f.aso),
        cnh_validade: brToISO(f.cnh),
        ...(fotoUrl ? { avatar_url: fotoUrl } : {}),
        ...(asoUrl ? { aso_arquivo_url: asoUrl } : {}),
        ...(cnhUrl ? { cnh_arquivo_url: cnhUrl } : {}),
      });
      await logAuditoria(row.id, 'dados_atualizados', {});
      showToast('Dados atualizados · registrado na auditoria');
      onSaved();
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#cfeccf] bg-[#eef7ee] px-[18px] py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-forest-900">
          <Edit3 className="h-[19px] w-[19px]" />
          Editando dados básicos
        </span>
        <div className="flex gap-2.5">
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar alterações'}</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 items-start gap-5">
        <div className="rounded-2xl border border-ink-100 bg-white px-7 py-6">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-400">Dados pessoais</p>
          <div className="grid grid-cols-2 gap-4">
            <TextField className="col-span-2" label="Nome completo" value={f.nome_completo} onChange={(e) => up('nome_completo', e.target.value)} />
            <TextField label="CPF" value={row.cpf} disabled hint="Não editável após cadastro." />
            <TextField label="RG" value={f.rg} onChange={(e) => up('rg', e.target.value)} />
            <TextField label="Nascimento" placeholder="dd/mm/aaaa" value={f.nascimento} onChange={(e) => up('nascimento', e.target.value)} />
            <TextField label="Telefone" value={f.telefone} onChange={(e) => up('telefone', e.target.value)} />
            <TextField label="CEP" value={f.cep} onChange={(e) => up('cep', e.target.value)} />
          </div>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white px-7 py-6">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-400">Dados profissionais</p>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Cargo" value={f.cargo} onChange={(e) => up('cargo', e.target.value)} options={cargos.map((c) => ({ value: c, label: c }))} />
            <SelectField label="Setor" value={f.setor} onChange={(e) => up('setor', e.target.value)} options={setores.map((c) => ({ value: c, label: c }))} />
            <SelectField label="Gestor" value={f.gestor_id} onChange={(e) => up('gestor_id', e.target.value)} options={[{ value: '', label: 'Sem gestor' }, ...gestores.map((g) => ({ value: g.id, label: g.nome }))]} />
            <TextField label="Admissão" placeholder="dd/mm/aaaa" value={f.admissao} onChange={(e) => up('admissao', e.target.value)} />
            <TextField label="Vecto ASO" placeholder="dd/mm/aaaa" value={f.aso} onChange={(e) => up('aso', e.target.value)} />
            <TextField label="Vecto CNH" placeholder="dd/mm/aaaa" value={f.cnh} onChange={(e) => up('cnh', e.target.value)} />
          </div>
        </div>
        <div className="col-span-2 rounded-2xl border border-ink-100 bg-white px-7 py-6">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-400">Foto & documentos</p>
          <div className="flex flex-wrap gap-3">
            <AttachBtn file={files.foto} inputRef={fotoRef} accept="image/*" label="Trocar foto" onPick={(fl) => setFiles((s) => ({ ...s, foto: fl }))} />
            <AttachBtn file={files.aso} inputRef={asoRef} accept="application/pdf,image/*" label="Anexar ASO" onPick={(fl) => setFiles((s) => ({ ...s, aso: fl }))} />
            <AttachBtn file={files.cnh} inputRef={cnhRef} accept="application/pdf,image/*" label="Anexar CNH" onPick={(fl) => setFiles((s) => ({ ...s, cnh: fl }))} />
          </div>
          <p className="mt-2 text-xs text-ink-400">Os arquivos são enviados ao clicar em “Salvar alterações”.</p>
        </div>
      </div>
    </>
  );
}

function AttachBtn({ file, inputRef, accept, label, onPick }: { file: File | null; inputRef: React.RefObject<HTMLInputElement>; accept: string; label: string; onPick: (f: File | null) => void }) {
  return (
    <>
      <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-[9px] border border-ink-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-ink-700">
        {file ? <FileCheck2 className="h-[18px] w-[18px] text-forest-600" /> : <Upload className="h-[18px] w-[18px]" />}
        {file ? file.name.slice(0, 22) : label}
      </button>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
    </>
  );
}

function Acessos({ row, canEdit, onAction }: { row: FuncionarioRow; canEdit: boolean; onAction: (a: UserActionKey) => void }) {
  const temLogin = !!row.profile_id;
  return (
    <div className="grid grid-cols-2 items-start gap-5">
      <div className="rounded-2xl border border-ink-100 bg-white px-7 py-6">
        <p className="mb-3.5 text-xs font-bold uppercase tracking-wider text-ink-400">Credenciais</p>
        <Info className="border-b border-ink-100 py-3" label="E-mail de login" value={row.email || '—'} />
        <Info className="border-b border-ink-100 py-3" label="Último login" value="—" />
        <div className="py-3">
          <div className="text-[13px] text-ink-400">Status do acesso</div>
          <div className="mt-1.5"><Badge tone={temLogin ? 'success' : 'softWarn'}>{temLogin ? 'Com acesso' : 'Sem credenciais'}</Badge></div>
        </div>
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white px-7 py-6">
        <p className="mb-3.5 text-xs font-bold uppercase tracking-wider text-ink-400">Ações (com auditoria)</p>
        {!canEdit ? (
          <p className="text-[13px] text-ink-400">Somente leitura · ações restritas ao seu perfil.</p>
        ) : !temLogin ? (
          <p className="text-[13px] text-ink-400">Funcionário sem credenciais. Crie o acesso pelo cadastro para habilitar reset de senha, bloqueio e perfil.</p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            <button onClick={() => onAction('reset')} className="rounded-[10px] bg-greenSoft px-4 py-2.5 text-sm font-semibold text-forest-900">Resetar senha</button>
            <button onClick={() => onAction('bloquear')} className="rounded-[10px] bg-[#fff2ee] px-4 py-2.5 text-sm font-semibold text-danger-bright">Bloquear acesso</button>
            <button onClick={() => onAction('perfil')} className="rounded-[10px] bg-ink-100 px-4 py-2.5 text-sm font-semibold text-ink-700">Alterar perfil</button>
          </div>
        )}
      </div>
    </div>
  );
}

function EmBreve({ titulo }: { titulo: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-200 bg-white py-20 text-center">
      <Clock className="h-8 w-8 text-ink-300" />
      <p className="text-sm font-semibold text-ink-700">{titulo}</p>
      <p className="max-w-[420px] text-[13px] text-ink-400">
        Disponível quando o módulo Operacional/Agenda for construído (Release #2/#3). Depende de dados de OS
        que ainda não existem.
      </p>
    </div>
  );
}
