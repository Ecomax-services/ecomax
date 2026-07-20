import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Info } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { TextField, TextareaField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import {
  listPerfis, getPerfilMatrix, salvarPerfil, PERM_MODULES,
  type PerfilRow, type PermLevel,
} from '@/lib/configuracoes';
import type { ModuleKey } from '@/lib/supabase';

const LEVELS: { key: PermLevel; label: string; color: string }[] = [
  { key: 'nenhum', label: 'Sem acesso', color: '#959ba7' },
  { key: 'leitura', label: 'Leitura', color: '#3056b5' },
  { key: 'escrita', label: 'Escrita', color: '#1a8a3a' },
  { key: 'total', label: 'Total', color: '#0f3f0f' },
];
const levelLabel = (l: PermLevel) => LEVELS.find((x) => x.key === l)?.label ?? l;

type DrawerState = { perfil?: PerfilRow; isNew: boolean };
const emptyMatrix = () => Object.fromEntries(PERM_MODULES.map((m) => [m.key, 'nenhum'])) as Record<ModuleKey, PermLevel>;

export function Permissoes() {
  const { showToast } = useToast();
  const { can, reload, profile } = useAuth();
  const canCreate = can('configuracoes', 'criar');
  const canEdit = can('configuracoes', 'editar');

  const [perfis, setPerfis] = useState<PerfilRow[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<Record<ModuleKey, PermLevel>>(emptyMatrix());
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [form, setForm] = useState({ nome: '', descricao: '' });
  const [formMatrix, setFormMatrix] = useState<Record<ModuleKey, PermLevel>>(emptyMatrix());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await listPerfis();
      setPerfis(list);
      setSelId((cur) => cur ?? list[0]?.id ?? null);
    } catch (e) { showToast((e as Error).message); }
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (selId) getPerfilMatrix(selId).then(setMatrix).catch((e) => showToast((e as Error).message));
  }, [selId, showToast]);

  const sel = perfis.find((p) => p.id === selId) ?? null;

  const openNew = () => { setForm({ nome: '', descricao: '' }); setFormMatrix(emptyMatrix()); setDrawer({ isNew: true }); };
  const openEdit = async (p: PerfilRow) => {
    setForm({ nome: p.nome, descricao: p.descricao });
    setFormMatrix(await getPerfilMatrix(p.id));
    setDrawer({ perfil: p, isNew: false });
  };

  const save = async () => {
    if (!form.nome.trim()) return showToast('Informe o nome do perfil.');
    setSaving(true);
    try {
      await salvarPerfil({ id: drawer?.perfil?.id, nome: form.nome.trim(), descricao: form.descricao.trim(), matrix: formMatrix });
      const editedOwn = drawer?.perfil?.id && drawer.perfil.id === profile?.perfil_acesso_id;
      setDrawer(null);
      showToast('Perfil salvo · alteração registrada na auditoria');
      await load();
      if (selId) setMatrix(await getPerfilMatrix(selId));
      if (editedOwn) await reload();
    } catch (e) { showToast((e as Error).message); } finally { setSaving(false); }
  };

  const th = 'px-4 py-3 text-left text-xs font-bold uppercase text-ink-400';

  return (
    <>
      <Topbar title="Permissões e Acessos" breadcrumb="Início  /  Configurações  /  Permissões e Acessos" />
      <div className="flex-1 px-8 py-6">
        <Link to="/configuracoes" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900">
          <ArrowLeft className="h-4 w-4" />Voltar
        </Link>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-ink-900">Perfis de acesso</h2>
          {canCreate && <Button onClick={openNew}><Plus className="h-5 w-5" />Novo perfil</Button>}
        </div>

        {/* Cards de perfis */}
        <div className="mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {perfis.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelId(p.id)}
              className={cn(
                'rounded-2xl border p-4 text-left transition-colors',
                p.id === selId ? 'border-forest-accent bg-forest-50' : 'border-ink-100 bg-white hover:border-ink-200',
              )}
            >
              <p className="text-[15px] font-bold text-ink-900">{p.nome}</p>
              <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-500">{p.descricao || '—'}</p>
              <p className="mt-2 text-[12px] font-semibold text-forest-700">{p.usuarios} usuário(s)</p>
            </button>
          ))}
        </div>

        <div className="mb-4 flex items-start gap-2 rounded-[10px] border border-[#c9d6f5] bg-tag-infoBg px-4 py-3 text-[13px] text-[#26408a]">
          <Info className="h-[18px] w-[18px] shrink-0" />
          Toda alteração de perfil ou permissão gera registro de auditoria. Perfis alimentam a aba Acessos & permissões da Gestão de Usuários.
        </div>

        {/* Matriz do perfil selecionado (leitura) */}
        {sel && (
          <div className="rounded-2xl border border-ink-100 bg-white">
            <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
              <div>
                <h3 className="text-[15px] font-bold text-ink-900">{sel.nome}</h3>
                <p className="text-[13px] text-ink-400">Permissões por módulo</p>
              </div>
              {canEdit && <Button variant="secondary" size="sm" onClick={() => openEdit(sel)}>Editar perfil</Button>}
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-ink-50">
                  <th className={cn(th, 'pl-6')}>Módulo</th>
                  <th className={cn(th, 'pr-6 text-right')}>Permissão</th>
                </tr>
              </thead>
              <tbody>
                {PERM_MODULES.map((m) => {
                  const lvl = matrix[m.key];
                  const color = LEVELS.find((x) => x.key === lvl)?.color ?? '#959ba7';
                  return (
                    <tr key={m.key} className="border-t border-ink-100">
                      <td className="px-4 py-3 pl-6 text-sm text-ink-800">{m.label}</td>
                      <td className="px-4 py-3 pr-6 text-right">
                        <span className="inline-block rounded-lg px-3 py-1 text-[13px] font-semibold text-white" style={{ background: color }}>{levelLabel(lvl)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer criar/editar perfil (10.3.a) */}
      <Drawer
        open={!!drawer}
        onClose={() => setDrawer(null)}
        width={560}
        title={drawer?.isNew ? 'Novo perfil de acesso' : 'Editar perfil de acesso'}
        subtitle="Nível de permissão por módulo"
        footer={
          <>
            <Button variant="secondary" fullWidth onClick={() => setDrawer(null)} className="h-[52px]">Cancelar</Button>
            <Button fullWidth onClick={save} disabled={saving} className="h-[52px]">{saving ? 'Salvando…' : 'Salvar perfil'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <TextField label="Nome do perfil" required value={form.nome} onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))} placeholder="Ex.: Supervisor de campo" />
          <TextareaField label="Descrição" value={form.descricao} onChange={(e) => setForm((s) => ({ ...s, descricao: e.target.value }))} placeholder="Resumo do que este perfil pode fazer" />

          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink-700">Permissões por módulo</p>
            <div className="flex flex-col gap-2">
              {PERM_MODULES.map((m) => (
                <div key={m.key} className="flex items-center justify-between gap-3 rounded-[10px] border border-ink-100 px-3.5 py-2.5">
                  <span className="text-sm text-ink-800">{m.label}</span>
                  <div className="flex gap-1">
                    {LEVELS.map((l) => {
                      const active = formMatrix[m.key] === l.key;
                      return (
                        <button
                          key={l.key}
                          type="button"
                          onClick={() => setFormMatrix((fm) => ({ ...fm, [m.key]: l.key }))}
                          className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold"
                          style={active ? { background: l.color, color: '#fff' } : { background: '#f2f3f4', color: '#959ba7' }}
                        >
                          {l.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
}
