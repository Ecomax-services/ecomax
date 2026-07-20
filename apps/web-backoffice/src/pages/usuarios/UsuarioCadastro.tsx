import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { RefreshCw, AlertOctagon, Camera, Upload, User, FileCheck2 } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { Button } from '@/components/ui/Button';
import { TextField, SelectField, FieldLabel } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { cpfExists, criarFuncionario, listGestores, listPerfisAcesso, uploadFuncionarioFile } from '@/lib/funcionarios';
import { listCatalogoAtivos } from '@/lib/configuracoes';
import { maskCPF, maskRG, maskDate, maskPhone, maskCEP } from '@/lib/masks';

const steps = [
  { n: 1, label: 'Dados pessoais' },
  { n: 2, label: 'Dados profissionais' },
  { n: 3, label: 'Acesso à plataforma' },
  { n: 4, label: 'Operacional' },
];

const CPF_RE = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

/** dd/mm/aaaa -> yyyy-mm-dd (null se vazio/inválido). */
function brToISO(s: string): string | null {
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

const roleFromPerfil: Record<string, string> = {
  administrador: 'admin',
  gestor: 'gestor',
  operacional: 'operacional',
  almoxarifado: 'almoxarifado',
  cliente: 'cliente',
};

const empty = {
  nome: '', cpf: '', rg: '', nascimento: '', telefone: '', cep: '',
  cargo: '', setor: '', gestorId: '', admissao: '',
  asoVenc: '', cnhNA: false, cnhNumero: '', cnhCat: 'B', cnhVenc: '',
  comAcesso: true, email: '', perfilId: '', senha: 'Ec0max!7Yz2',
  cargaHoraria: '44h', turno: 'Comercial (08h–17h)',
};

function genSenha() {
  return 'Ec0max!' + Math.random().toString(36).slice(2, 6) + Math.floor(Math.random() * 90 + 10);
}

export function UsuarioCadastro() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { can } = useAuth();
  const [step, setStep] = useState(1);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(empty);
  const [cpfErr, setCpfErr] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [asoFile, setAsoFile] = useState<File | null>(null);
  const [cnhFile, setCnhFile] = useState<File | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const asoRef = useRef<HTMLInputElement>(null);
  const cnhRef = useRef<HTMLInputElement>(null);

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    const r = new FileReader();
    r.onload = () => setPhotoPreview(String(r.result));
    r.readAsDataURL(f);
  };

  const [cargos, setCargos] = useState<string[]>(['Técnico de Campo', 'Supervisora', 'Analista Admin.', 'Almoxarife']);
  const [setores, setSetores] = useState<string[]>(['Operações', 'Comercial', 'Administrativo', 'Almoxarifado']);
  const [gestores, setGestores] = useState<{ id: string; nome: string }[]>([]);
  const [perfis, setPerfis] = useState<{ id: string; nome: string }[]>([]);

  const up = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const dirty = JSON.stringify(form) !== JSON.stringify(empty);

  useEffect(() => {
    listCatalogoAtivos('cargos').then((v) => v.length && setCargos(v)).catch(() => {});
    listCatalogoAtivos('setores').then((v) => v.length && setSetores(v)).catch(() => {});
    listGestores().then(setGestores);
    listPerfisAcesso().then((p) => {
      setPerfis(p);
      setForm((f) => ({ ...f, perfilId: f.perfilId || (p[0]?.id ?? '') }));
    });
  }, []);

  if (!can('gestao_usuarios', 'criar')) return <Navigate to="/usuarios" replace />;

  const tryCancel = () => (dirty ? setCancelOpen(true) : navigate('/usuarios'));

  const validateCpf = async () => {
    if (!form.cpf) return setCpfErr('');
    if (!CPF_RE.test(form.cpf)) return setCpfErr('Formato inválido (000.000.000-00).');
    setCpfErr((await cpfExists(form.cpf)) ? 'CPF já cadastrado para outro funcionário.' : '');
  };

  const submit = async () => {
    if (!form.nome.trim()) return showToast('Informe o nome completo.');
    if (!CPF_RE.test(form.cpf)) return showToast('CPF inválido.');
    if (await cpfExists(form.cpf)) return showToast('CPF já cadastrado.');
    if (!form.cargo || !form.setor) return showToast('Informe cargo e setor.');
    if (form.comAcesso && (!form.email.trim() || !form.perfilId)) return showToast('Informe e-mail e perfil de acesso.');

    setSaving(true);
    try {
      const perfilNome = perfis.find((p) => p.id === form.perfilId)?.nome ?? '';
      const folder = `tmp-${crypto.randomUUID()}`;
      const [avatarUrl, asoUrl, cnhUrl] = await Promise.all([
        photoFile ? uploadFuncionarioFile(photoFile, folder, 'foto') : Promise.resolve(null),
        asoFile ? uploadFuncionarioFile(asoFile, folder, 'aso') : Promise.resolve(null),
        !form.cnhNA && cnhFile ? uploadFuncionarioFile(cnhFile, folder, 'cnh') : Promise.resolve(null),
      ]);
      await criarFuncionario({
        funcionario: {
          avatar_url: avatarUrl,
          aso_arquivo_url: asoUrl,
          cnh_arquivo_url: cnhUrl,
          nome_completo: form.nome.trim(),
          cpf: form.cpf,
          rg: form.rg || null,
          data_nascimento: brToISO(form.nascimento),
          telefone: form.telefone || null,
          cep: form.cep || null,
          cargo: form.cargo,
          setor: form.setor,
          gestor_id: form.gestorId || null,
          data_admissao: brToISO(form.admissao),
          aso_validade: brToISO(form.asoVenc),
          cnh_numero: form.cnhNA ? null : form.cnhNumero || null,
          cnh_categoria: form.cnhNA ? null : form.cnhCat,
          cnh_validade: form.cnhNA ? null : brToISO(form.cnhVenc),
          carga_horaria: form.cargaHoraria || null,
          turno: form.turno || null,
          email: form.comAcesso ? form.email.trim() : null,
        },
        acesso: form.comAcesso
          ? {
              email: form.email.trim(),
              perfil_acesso_id: form.perfilId,
              role: roleFromPerfil[perfilNome.toLowerCase()] ?? 'operacional',
              senha_provisoria: form.senha,
            }
          : undefined,
      });
      showToast(form.comAcesso ? 'Usuário cadastrado · credenciais enviadas' : 'Funcionário cadastrado');
      navigate('/usuarios');
    } catch (e) {
      showToast((e as Error).message || 'Falha ao cadastrar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Topbar title="Cadastrar novo usuário" breadcrumb="Início  /  Gestão de Usuários  /  Novo" />

      <div className="max-w-[900px] flex-1 px-8 py-7">
        <div className="mb-7 flex items-center">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center">
              <div className="flex shrink-0 items-center gap-2.5">
                <div className={cn('flex h-[34px] w-[34px] items-center justify-center rounded-full text-sm font-bold', s.n <= step ? 'bg-forest-600 text-white' : 'bg-ink-100 text-ink-400')}>
                  {s.n}
                </div>
                <span className={cn('text-sm', s.n === step ? 'font-semibold text-ink-900' : 'font-medium text-ink-400')}>{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className={cn('mx-3.5 h-0.5 min-w-6 flex-1', s.n < step ? 'bg-forest-600' : 'bg-ink-100')} />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white px-8 py-7">
          {step === 1 && (
            <>
              <h2 className="mb-5 text-[17px] font-bold text-ink-900">Dados pessoais</h2>
              <div className="mb-[22px] flex items-center gap-[18px] border-b border-ink-100 pb-[22px]">
                {photoPreview ? (
                  <img src={photoPreview} alt="Foto" className="h-[76px] w-[76px] shrink-0 rounded-full border border-ink-100 object-cover" />
                ) : (
                  <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full bg-primary50">
                    <User className="h-9 w-9 text-forest-700" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2.5">
                    <button type="button" onClick={() => photoRef.current?.click()} className="inline-flex items-center gap-2 rounded-[9px] border border-ink-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-ink-700">
                      <Camera className="h-[18px] w-[18px]" />
                      {photoPreview ? 'Trocar foto' : 'Adicionar foto'}
                    </button>
                    <input ref={photoRef} type="file" accept="image/*" onChange={onPhoto} className="hidden" />
                    {photoPreview && (
                      <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="text-[13px] font-semibold text-danger-bright">Remover</button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-ink-400">Foto de perfil (opcional) · PNG ou JPG.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-[18px]">
                <TextField label="Nome completo" required placeholder="Nome do funcionário" value={form.nome} onChange={(e) => up('nome', e.target.value)} />
                <TextField label="CPF" required placeholder="000.000.000-00" inputMode="numeric" value={form.cpf} onChange={(e) => up('cpf', maskCPF(e.target.value))} onBlur={validateCpf} error={cpfErr || undefined} />
                <TextField label="RG" placeholder="00.000.000-0" inputMode="numeric" value={form.rg} onChange={(e) => up('rg', maskRG(e.target.value))} />
                <TextField label="Data de nascimento" placeholder="dd/mm/aaaa" inputMode="numeric" value={form.nascimento} onChange={(e) => up('nascimento', maskDate(e.target.value))} />
                <TextField label="Telefone" placeholder="(00) 00000-0000" inputMode="numeric" value={form.telefone} onChange={(e) => up('telefone', maskPhone(e.target.value))} />
                <TextField label="CEP" placeholder="00000-000" inputMode="numeric" value={form.cep} onChange={(e) => up('cep', maskCEP(e.target.value))} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="mb-5 text-[17px] font-bold text-ink-900">Dados profissionais</h2>
              <div className="grid grid-cols-2 gap-[18px]">
                <SelectField label="Cargo" required value={form.cargo} onChange={(e) => up('cargo', e.target.value)}
                  options={[{ value: '', label: 'Selecione…' }, ...cargos.map((c) => ({ value: c, label: c }))]} />
                <SelectField label="Setor" required value={form.setor} onChange={(e) => up('setor', e.target.value)}
                  options={[{ value: '', label: 'Selecione…' }, ...setores.map((c) => ({ value: c, label: c }))]} />
                <SelectField label="Gestor" value={form.gestorId} onChange={(e) => up('gestorId', e.target.value)}
                  options={[{ value: '', label: 'Sem gestor' }, ...gestores.map((g) => ({ value: g.id, label: g.nome }))]} />
                <TextField label="Data de admissão" placeholder="dd/mm/aaaa" inputMode="numeric" value={form.admissao} onChange={(e) => up('admissao', maskDate(e.target.value))} />
              </div>
              <div className="mt-[18px] grid grid-cols-2 gap-[18px]">
                <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50 p-[18px]">
                  <div className="mb-2.5 text-sm font-semibold text-ink-800">ASO</div>
                  <button type="button" onClick={() => asoRef.current?.click()} className="mb-3 inline-flex items-center gap-2 rounded-[9px] border border-ink-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-ink-700">
                    {asoFile ? <FileCheck2 className="h-[18px] w-[18px] text-forest-600" /> : <Upload className="h-[18px] w-[18px]" />}
                    {asoFile ? asoFile.name.slice(0, 22) : 'Anexar ASO (PDF)'}
                  </button>
                  <input ref={asoRef} type="file" accept="application/pdf,image/*" onChange={(e) => setAsoFile(e.target.files?.[0] ?? null)} className="hidden" />
                  <FieldLabel>Vencimento</FieldLabel>
                  <TextField placeholder="dd/mm/aaaa" value={form.asoVenc} onChange={(e) => up('asoVenc', e.target.value)} />
                </div>
                <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50 p-[18px]">
                  <div className="mb-2.5 flex items-center justify-between">
                    <div className="text-sm font-semibold text-ink-800">CNH</div>
                    <CheckLabel checked={form.cnhNA} onChange={() => up('cnhNA', !form.cnhNA)}>Não se aplica</CheckLabel>
                  </div>
                  <div className="mb-3 flex gap-2.5">
                    <TextField className="flex-1" placeholder="Número" disabled={form.cnhNA} value={form.cnhNumero} onChange={(e) => up('cnhNumero', e.target.value)} />
                    <SelectField className="w-24" disabled={form.cnhNA} value={form.cnhCat} onChange={(e) => up('cnhCat', e.target.value)}
                      options={['A', 'B', 'C', 'D', 'E', 'AB'].map((x) => ({ value: x, label: x }))} />
                  </div>
                  <button type="button" disabled={form.cnhNA} onClick={() => cnhRef.current?.click()} className="mb-3 inline-flex items-center gap-2 rounded-[9px] border border-ink-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-ink-700 disabled:opacity-50">
                    {cnhFile ? <FileCheck2 className="h-[18px] w-[18px] text-forest-600" /> : <Upload className="h-[18px] w-[18px]" />}
                    {cnhFile ? cnhFile.name.slice(0, 22) : 'Anexar CNH (PDF)'}
                  </button>
                  <input ref={cnhRef} type="file" accept="application/pdf,image/*" onChange={(e) => setCnhFile(e.target.files?.[0] ?? null)} className="hidden" />
                  <FieldLabel>Vencimento</FieldLabel>
                  <TextField placeholder="dd/mm/aaaa" disabled={form.cnhNA} value={form.cnhVenc} onChange={(e) => up('cnhVenc', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="mb-1 text-[17px] font-bold text-ink-900">Acesso à plataforma</h2>
              <CheckLabel checked={form.comAcesso} onChange={() => up('comAcesso', !form.comAcesso)}>
                Criar credenciais de acesso para este funcionário
              </CheckLabel>
              <div className={cn('mt-5 grid grid-cols-2 gap-[18px]', !form.comAcesso && 'pointer-events-none opacity-50')}>
                <TextField label="E-mail de login" required placeholder="nome@ecomax.com.br" value={form.email} onChange={(e) => up('email', e.target.value)} />
                <SelectField label="Perfil de acesso" required value={form.perfilId} onChange={(e) => up('perfilId', e.target.value)}
                  options={perfis.map((p) => ({ value: p.id, label: p.nome }))} />
                <div className="col-span-2">
                  <FieldLabel>Senha provisória</FieldLabel>
                  <div className="flex gap-2.5">
                    <TextField className="flex-1 bg-ink-50" value={form.senha} onChange={(e) => up('senha', e.target.value)} />
                    <button type="button" onClick={() => up('senha', genSenha())} className="inline-flex items-center gap-2 rounded-[10px] bg-ink-100 px-4 text-sm font-semibold text-ink-700">
                      <RefreshCw className="h-[18px] w-[18px]" />
                      Gerar nova
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-ink-400">Um e-mail para o funcionário definir a própria senha também será enviado.</p>
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="mb-5 text-[17px] font-bold text-ink-900">Operacional</h2>
              <div className="grid grid-cols-2 gap-[18px]">
                <TextField label="Carga horária semanal" value={form.cargaHoraria} onChange={(e) => up('cargaHoraria', e.target.value)} />
                <SelectField label="Turno" value={form.turno} onChange={(e) => up('turno', e.target.value)}
                  options={['Comercial (08h–17h)', 'Manhã', 'Tarde'].map((x) => ({ value: x, label: x }))} />
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button variant="secondary" onClick={tryCancel} className="text-danger-bright">Cancelar</Button>
          <div className="flex gap-3">
            {step > 1 && <Button variant="secondary" onClick={() => setStep((s) => Math.max(1, s - 1))}>Voltar</Button>}
            {step < 4 ? (
              <Button onClick={() => setStep((s) => Math.min(4, s + 1))}>Avançar</Button>
            ) : (
              <Button onClick={submit} disabled={saving}>
                {saving ? 'Salvando…' : form.comAcesso ? 'Salvar e enviar credenciais' : 'Salvar funcionário'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => { setCancelOpen(false); navigate('/usuarios'); }}
        title="Descartar cadastro?"
        description="Há dados preenchidos neste cadastro. Se sair agora, as informações serão perdidas."
        cancelLabel="Continuar editando"
        confirmLabel="Descartar"
        destructive
        icon={
          <div className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#fff2ee]">
            <AlertOctagon className="h-7 w-7 text-danger-bright" />
          </div>
        }
      />
    </>
  );
}

function CheckLabel({ children, checked, onChange }: { children: React.ReactNode; checked?: boolean; onChange?: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink-800" onClick={onChange}>
      <span className={cn('flex h-5 w-5 items-center justify-center rounded', checked ? 'bg-forest-accent' : 'border border-ink-200')}>
        {checked && <span className="text-[13px] leading-none text-white">✓</span>}
      </span>
      {children}
    </label>
  );
}
