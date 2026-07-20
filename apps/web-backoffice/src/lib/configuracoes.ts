import { supabase } from '@/lib/supabase';
import type { ModuleKey } from '@/lib/supabase';

// ============================================================
// Cadastros Auxiliares (catálogos)
// ============================================================

export interface CatalogoMeta {
  key: string;
  label: string;
  /** Catálogo "com cor": itens têm etiqueta colorida (badge nos demais módulos). */
  colored: boolean;
  /** Tipos de serviço: guarda template de mensagem + prazo padrão do link público. */
  servico?: boolean;
}

/** Os 12 catálogos auxiliares. `key` bate com a coluna `catalogo` do banco. */
export const CATALOGOS: CatalogoMeta[] = [
  { key: 'status_os', label: 'Status de OS', colored: true },
  { key: 'status_garantia', label: 'Status de garantia', colored: true },
  { key: 'tipos_documento', label: 'Tipos de documento', colored: false },
  { key: 'tipos_produto', label: 'Tipos de produto', colored: false },
  { key: 'categorias_produto', label: 'Categorias de produto', colored: false },
  { key: 'unidades', label: 'Unidades de medida', colored: false },
  { key: 'tipos_servico', label: 'Tipos de serviço', colored: false, servico: true },
  { key: 'setores', label: 'Setores', colored: false },
  { key: 'cargos', label: 'Cargos', colored: false },
  { key: 'motivos_ajuste', label: 'Motivos de ajuste de estoque', colored: false },
  { key: 'pragas', label: 'Pragas-alvo', colored: false },
  { key: 'epis', label: 'EPIs', colored: false },
];

export interface CatalogoItem {
  id: string;
  catalogo: string;
  nome: string;
  cor_bg: string | null;
  cor_fg: string | null;
  observacao: string | null;
  ativo: boolean;
  ordem: number;
  template_mensagem: string | null;
  prazo_padrao: number | null;
  /** Nº de registros em outros módulos usando este item (base da regra de não-excluir). */
  uso: number;
}

async function actorId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Registra auditoria do módulo Configurações. */
async function audit(acao: string, detalhes?: unknown): Promise<void> {
  await supabase.from('auditoria').insert({
    actor_id: await actorId(),
    funcionario_id: null,
    modulo: 'configuracoes',
    acao,
    detalhes: detalhes ?? null,
  });
}

/**
 * Contagem de uso por item de um catálogo, a partir dos consumidores reais.
 * Catálogos sem consumidor implementado retornam mapa vazio (uso 0).
 */
async function catalogoUso(catalogo: string): Promise<Record<string, number>> {
  const countBy = async (table: string, col: string) => {
    const { data } = await supabase.from(table).select(col);
    const map: Record<string, number> = {};
    (data as Record<string, string | null>[] | null)?.forEach((r) => {
      const v = r[col];
      if (v) map[v] = (map[v] ?? 0) + 1;
    });
    return map;
  };
  switch (catalogo) {
    case 'categorias_produto': return countBy('produtos', 'categoria');
    case 'unidades': return countBy('produtos', 'unidade');
    case 'setores': return countBy('funcionarios', 'setor');
    case 'cargos': return countBy('funcionarios', 'cargo');
    case 'motivos_ajuste': {
      // Motivo fica embutido na descrição da movimentação de ajuste.
      const { data } = await supabase.from('movimentacoes').select('descricao').eq('tipo', 'ajuste');
      const map: Record<string, number> = {};
      (data as { descricao: string | null }[] | null)?.forEach((r) => {
        const d = r.descricao ?? '';
        for (const it of ['Correção de contagem', 'Perda / avaria', 'Vencimento', 'Devolução']) {
          if (d.includes(it)) map[it] = (map[it] ?? 0) + 1;
        }
      });
      return map;
    }
    default: return {};
  }
}

export async function listCatalogoItens(catalogo: string): Promise<CatalogoItem[]> {
  const [{ data, error }, uso] = await Promise.all([
    supabase.from('catalogo_itens').select('*').eq('catalogo', catalogo).order('ordem').order('nome'),
    catalogoUso(catalogo),
  ]);
  if (error) throw new Error(error.message);
  return (data as CatalogoItem[]).map((it) => ({ ...it, uso: uso[it.nome] ?? 0 }));
}

/** Nomes ativos de um catálogo — para popular selects nos demais módulos. */
export async function listCatalogoAtivos(catalogo: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('catalogo_itens').select('nome').eq('catalogo', catalogo).eq('ativo', true).order('ordem').order('nome');
  if (error) throw new Error(error.message);
  return (data as { nome: string }[]).map((r) => r.nome);
}

export interface CatalogoItemInput {
  catalogo: string;
  nome: string;
  cor_bg?: string | null;
  cor_fg?: string | null;
  observacao?: string | null;
  template_mensagem?: string | null;
  prazo_padrao?: number | null;
  ativo?: boolean;
}

export async function createCatalogoItem(input: CatalogoItemInput): Promise<void> {
  const { error } = await supabase.from('catalogo_itens').insert({ ...input, created_by: await actorId() });
  if (error) throw new Error(error.code === '23505' ? 'Já existe um item com esse nome neste catálogo.' : error.message);
  await audit('catalogo_item_criado', { catalogo: input.catalogo, nome: input.nome });
}

export async function updateCatalogoItem(id: string, patch: Partial<CatalogoItemInput>): Promise<void> {
  const { error } = await supabase.from('catalogo_itens').update(patch).eq('id', id);
  if (error) throw new Error(error.code === '23505' ? 'Já existe um item com esse nome neste catálogo.' : error.message);
  await audit('catalogo_item_editado', { id, ...patch });
}

export async function setCatalogoItemAtivo(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from('catalogo_itens').update({ ativo }).eq('id', id);
  if (error) throw new Error(error.message);
  await audit(ativo ? 'catalogo_item_ativado' : 'catalogo_item_inativado', { id });
}

/** Exclui um item. Só permitido quando não está em uso (validado na tela). */
export async function deleteCatalogoItem(id: string): Promise<void> {
  const { error } = await supabase.from('catalogo_itens').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await audit('catalogo_item_excluido', { id });
}

// ============================================================
// Permissões e Acessos (perfis + matriz por módulo)
// ============================================================

export type PermLevel = 'nenhum' | 'leitura' | 'escrita' | 'total';

export const PERM_MODULES: { key: ModuleKey; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'gestao_clientes', label: 'Gestão de Clientes' },
  { key: 'operacional', label: 'Operacional' },
  { key: 'comercial', label: 'Comercial' },
  { key: 'estoque', label: 'Estoque e Produtos' },
  { key: 'relatorios', label: 'Relatórios' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'gestao_usuarios', label: 'Gestão de Usuários' },
  { key: 'configuracoes', label: 'Configurações' },
  { key: 'notificacoes', label: 'Notificações' },
];

interface Perms { pode_ler: boolean; pode_criar: boolean; pode_editar: boolean; pode_excluir: boolean }

export function levelToPerms(level: PermLevel): Perms {
  switch (level) {
    case 'total': return { pode_ler: true, pode_criar: true, pode_editar: true, pode_excluir: true };
    case 'escrita': return { pode_ler: true, pode_criar: true, pode_editar: true, pode_excluir: false };
    case 'leitura': return { pode_ler: true, pode_criar: false, pode_editar: false, pode_excluir: false };
    default: return { pode_ler: false, pode_criar: false, pode_editar: false, pode_excluir: false };
  }
}

export function permsToLevel(p: Perms): PermLevel {
  if (p.pode_excluir) return 'total';
  if (p.pode_criar || p.pode_editar) return 'escrita';
  if (p.pode_ler) return 'leitura';
  return 'nenhum';
}

export interface PerfilRow {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  usuarios: number;
}

export async function listPerfis(): Promise<PerfilRow[]> {
  const [{ data: perfis, error }, { data: profs }] = await Promise.all([
    supabase.from('perfis_acesso').select('id, nome, descricao, ativo').order('nome'),
    supabase.from('profiles').select('perfil_acesso_id'),
  ]);
  if (error) throw new Error(error.message);
  const counts: Record<string, number> = {};
  (profs as { perfil_acesso_id: string | null }[] | null)?.forEach((p) => {
    if (p.perfil_acesso_id) counts[p.perfil_acesso_id] = (counts[p.perfil_acesso_id] ?? 0) + 1;
  });
  return (perfis as Omit<PerfilRow, 'usuarios'>[]).map((p) => ({ ...p, descricao: p.descricao ?? '', usuarios: counts[p.id] ?? 0 }));
}

/** Matriz nível-por-módulo de um perfil (default 'nenhum' onde não há linha). */
export async function getPerfilMatrix(perfilId: string): Promise<Record<ModuleKey, PermLevel>> {
  const { data, error } = await supabase
    .from('permissoes_modulo')
    .select('modulo, pode_ler, pode_criar, pode_editar, pode_excluir')
    .eq('perfil_acesso_id', perfilId);
  if (error) throw new Error(error.message);
  const matrix = {} as Record<ModuleKey, PermLevel>;
  PERM_MODULES.forEach((m) => { matrix[m.key] = 'nenhum'; });
  (data as ({ modulo: ModuleKey } & Perms)[]).forEach((row) => {
    matrix[row.modulo] = permsToLevel(row);
  });
  return matrix;
}

export async function salvarPerfil(input: {
  id?: string; nome: string; descricao: string; matrix: Record<ModuleKey, PermLevel>;
}): Promise<string> {
  let perfilId = input.id;
  if (perfilId) {
    const { error } = await supabase.from('perfis_acesso').update({ nome: input.nome, descricao: input.descricao }).eq('id', perfilId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.from('perfis_acesso').insert({ nome: input.nome, descricao: input.descricao }).select('id').single();
    if (error) throw new Error(error.code === '23505' ? 'Já existe um perfil com esse nome.' : error.message);
    perfilId = (data as { id: string }).id;
  }
  const rows = PERM_MODULES.map((m) => ({ perfil_acesso_id: perfilId, modulo: m.key, ...levelToPerms(input.matrix[m.key]) }));
  const { error: e2 } = await supabase.from('permissoes_modulo').upsert(rows, { onConflict: 'perfil_acesso_id,modulo' });
  if (e2) throw new Error(e2.message);
  await audit(input.id ? 'perfil_editado' : 'perfil_criado', { perfil_id: perfilId, nome: input.nome, matrix: input.matrix });
  return perfilId!;
}

// ============================================================
// Meu Perfil
// ============================================================

export interface MeuPerfil {
  nome: string;
  email: string;
  cargo: string;
  setor: string;
  nivelAcesso: string;
  tipoUsuario: string;
  avatarPath: string | null;
}

export async function getMeuPerfil(): Promise<MeuPerfil> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  const email = userData.user?.email ?? '—';
  const { data: prof } = await supabase
    .from('profiles').select('nome_completo, role, avatar_url, perfil_acesso_id').eq('id', uid!).maybeSingle();
  const p = prof as { nome_completo: string; role: string; avatar_url: string | null; perfil_acesso_id: string | null } | null;
  const [{ data: func }, { data: perfil }] = await Promise.all([
    supabase.from('funcionarios').select('cargo, setor').eq('profile_id', uid!).maybeSingle(),
    p?.perfil_acesso_id
      ? supabase.from('perfis_acesso').select('nome').eq('id', p.perfil_acesso_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const f = func as { cargo: string | null; setor: string | null } | null;
  return {
    nome: p?.nome_completo ?? '—',
    email,
    cargo: f?.cargo ?? '—',
    setor: f?.setor ?? '—',
    nivelAcesso: (perfil as { nome: string } | null)?.nome ?? '—',
    tipoUsuario: p?.role ?? '—',
    avatarPath: p?.avatar_url ?? null,
  };
}

/** Política de senha (idêntica à autenticação): 8–16, letra + número + especial. */
export function validarSenha(s: string): string | null {
  if (s.length < 8 || s.length > 16) return 'A senha deve ter entre 8 e 16 caracteres.';
  if (!/[a-zA-Z]/.test(s)) return 'Inclua ao menos uma letra.';
  if (!/[0-9]/.test(s)) return 'Inclua ao menos um número.';
  if (!/[^a-zA-Z0-9]/.test(s)) return 'Inclua ao menos um caractere especial.';
  return null;
}

/** Força da senha 0–3 (para a barra visual). */
export function forcaSenha(s: string): number {
  let f = 0;
  if (s.length >= 8) f++;
  if (/[a-zA-Z]/.test(s) && /[0-9]/.test(s)) f++;
  if (/[^a-zA-Z0-9]/.test(s)) f++;
  return f;
}

export async function alterarSenha(nova: string): Promise<void> {
  const err = validarSenha(nova);
  if (err) throw new Error(err);
  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) throw new Error(error.message);
}

export async function uploadFotoPerfil(file: File): Promise<string> {
  const uid = await actorId();
  if (!uid) throw new Error('Sessão expirada.');
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `avatars/${uid}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('funcionario-docs').upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw new Error(error.message);
  const { error: e2 } = await supabase.from('profiles').update({ avatar_url: path }).eq('id', uid);
  if (e2) throw new Error(e2.message);
  // Espelha no cadastro de funcionário, se houver vínculo.
  await supabase.from('funcionarios').update({ avatar_url: path }).eq('profile_id', uid);
  return path;
}

/** URL assinada para exibir a foto (bucket privado). */
export async function signedAvatarUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('funcionario-docs').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
