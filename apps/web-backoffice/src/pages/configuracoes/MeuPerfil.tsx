import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Camera, Eye, EyeOff } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import {
  getMeuPerfil, alterarSenha, uploadFotoPerfil, signedAvatarUrl, validarSenha, forcaSenha,
  type MeuPerfil as MeuPerfilData,
} from '@/lib/configuracoes';

const roleLabels: Record<string, string> = {
  admin: 'Administrador', gestor: 'Gestor', operacional: 'Operacional', comercial: 'Comercial',
  financeiro: 'Financeiro', rh: 'RH', almoxarifado: 'Almoxarifado', operador: 'Operador', cliente: 'Cliente',
};

function initialsOf(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || 'U';
}

export function MeuPerfil() {
  const { showToast } = useToast();
  const { reload } = useAuth();
  const [data, setData] = useState<MeuPerfilData | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [senhaOpen, setSenhaOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadPerfil = async () => {
    try {
      const d = await getMeuPerfil();
      setData(d);
      setAvatarUrl(d.avatarPath ? await signedAvatarUrl(d.avatarPath) : null);
    } catch (e) { showToast((e as Error).message); }
  };
  useEffect(() => { loadPerfil(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onPickFoto = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return showToast('A imagem deve ter no máximo 3 MB.');
    setUploading(true);
    try {
      await uploadFotoPerfil(file);
      showToast('Foto atualizada');
      await loadPerfil();
      await reload();
    } catch (e) { showToast((e as Error).message); } finally { setUploading(false); }
  };

  if (!data) {
    return (
      <>
        <Topbar title="Meu Perfil" breadcrumb="Início  /  Configurações  /  Perfil" />
        <div className="flex-1 px-8 py-6 text-sm text-ink-400">Carregando…</div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Meu Perfil" breadcrumb="Início  /  Configurações  /  Perfil" />
      <div className="flex-1 px-8 py-6">
        <Link to="/configuracoes" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900">
          <ArrowLeft className="h-4 w-4" />Voltar
        </Link>

        <div className="grid max-w-2xl gap-4">
          {/* Cabeçalho com foto */}
          <div className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white px-6 py-5">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-forest-600 text-lg font-bold text-white">
                {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initialsOf(data.nome)}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickFoto(e.target.files?.[0])} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                title="Alterar foto"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-forest-600 text-white disabled:opacity-50"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-ink-900">{data.nome}</h2>
              <p className="text-[13px] text-ink-500">{data.cargo} · {roleLabels[data.tipoUsuario] ?? data.tipoUsuario}</p>
            </div>
          </div>

          {/* Dados básicos (só leitura) */}
          <div className="rounded-2xl border border-ink-100 bg-white px-6 py-5">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-ink-400">Dados básicos</p>
            <div className="grid grid-cols-2 gap-x-6">
              <Info label="Nome completo" value={data.nome} />
              <Info label="E-mail de login" value={data.email} />
              <Info label="Cargo" value={data.cargo} />
              <Info label="Setor" value={data.setor} />
              <Info label="Nível de acesso" value={data.nivelAcesso} />
              <Info label="Tipo de usuário" value={roleLabels[data.tipoUsuario] ?? data.tipoUsuario} />
            </div>
            <p className="mt-3 text-[13px] text-ink-400">Dados cadastrais são geridos pelo administrador. Você pode alterar apenas a foto e a senha.</p>
          </div>

          {/* Segurança */}
          <div className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white px-6 py-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Segurança</p>
              <p className="mt-1 text-sm text-ink-700">Senha de acesso · ••••••••</p>
            </div>
            <Button variant="secondary" onClick={() => setSenhaOpen(true)}>Redefinir senha</Button>
          </div>
        </div>
      </div>

      {senhaOpen && <SenhaModal onClose={() => setSenhaOpen(false)} showToast={showToast} />}
    </>
  );
}

function SenhaModal({ onClose, showToast }: { onClose: () => void; showToast: (m: string) => void }) {
  const [nova, setNova] = useState('');
  const [conf, setConf] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const forca = forcaSenha(nova);
  const forcaLabel = ['Fraca', 'Fraca', 'Média', 'Forte'][forca];
  const forcaColor = ['#cc1a00', '#cc1a00', '#b45309', '#155015'][forca];

  const salvar = async () => {
    const err = validarSenha(nova);
    if (err) return showToast(err);
    if (nova !== conf) return showToast('As senhas não coincidem.');
    setSaving(true);
    try { await alterarSenha(nova); showToast('Senha alterada com sucesso'); onClose(); }
    catch (e) { showToast((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} labelledBy="senha-title">
      <div className="flex items-center justify-between border-b border-ink-100 px-7 py-[22px]">
        <h2 id="senha-title" className="text-[19px] font-bold text-ink-900">Redefinir senha</h2>
      </div>
      <div className="flex flex-col gap-3.5 px-7 py-6">
        <div className="relative">
          <TextField label="Nova senha" type={show ? 'text' : 'password'} value={nova} onChange={(e) => setNova(e.target.value)} placeholder="8 a 16 caracteres" />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-[38px] text-ink-400">
            {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        </div>
        {nova && (
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < forca ? forcaColor : '#eeeff1' }} />
              ))}
            </div>
            <span className="text-[12px] font-semibold" style={{ color: forcaColor }}>{forcaLabel}</span>
          </div>
        )}
        <TextField label="Confirmar nova senha" type={show ? 'text' : 'password'} value={conf} onChange={(e) => setConf(e.target.value)} placeholder="Repita a senha" />
        <p className="text-[13px] text-ink-400">A senha deve ter 8 a 16 caracteres, com pelo menos uma letra, um número e um caractere especial.</p>
      </div>
      <div className="flex gap-3 px-7 pb-6">
        <Button variant="secondary" fullWidth onClick={onClose} className="h-[52px]">Cancelar</Button>
        <Button fullWidth onClick={salvar} disabled={saving} className="h-[52px]">{saving ? 'Salvando…' : 'Salvar senha'}</Button>
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn('border-b border-ink-100 py-3')}>
      <div className="text-[13px] text-ink-400">{label}</div>
      <div className="mt-0.5 text-[15px] text-ink-800">{value}</div>
    </div>
  );
}
