import { supabase } from '@/lib/supabase';
import type { Json } from '@/lib/database.types';
import type { ModuleKey } from '@/lib/supabase';
import { msgErro } from '@/lib/erros';

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
  /**
   * Os dois catálogos com painel próprio, no topo da coluna. Não são listas de
   * itens soltos: um é uma matriz tipo de serviço × legendas de execução, o
   * outro é tipo de serviço × produtos do almoxarifado.
   */
  especial?: 'planilha' | 'produtos_tipo';
  /**
   * Guarda um slug em `valor` além do rótulo em `nome`. `status_os` é o caso:
   * a OS grava 'em_aberto' e a tela mostra 'Em aberto'. Um item criado pela
   * tela precisa nascer com slug, senão a validação do banco o recusa.
   */
  slug?: boolean;
}

/**
 * Os 18 catálogos auxiliares. `key` bate com a coluna `catalogo` do banco.
 *
 * A ORDEM É A DO PROTÓTIPO APROVADO, não uma escolha nossa. O protótipo mostra
 * uma lista plana; uma versão anterior daqui agrupava em cinco cabeçalhos
 * ("Operacional", "Comercial", …) porque 18 itens soltos pareciam demais. Era
 * julgamento meu contra um desenho que o cliente já tinha aprovado — e quem
 * abre a tela depois de ver o protótipo percebe na hora.
 *
 * O protótipo tem 13 catálogos; nós temos 18. Os cinco a mais entram logo
 * depois do parente mais próximo na sequência do desenho (Etapas da OS depois
 * de Status de OS, Frequências depois de Tipos de controle, e assim por
 * diante), de modo que a espinha do desenho fica intacta.
 */
export const CATALOGOS: CatalogoMeta[] = [
  // Os dois especiais abrem a coluna, como no protótipo.
  { key: 'planilhas', label: 'Planilha por tipo de serviço', colored: true, especial: 'planilha' },
  { key: 'produtos_tipo', label: 'Produtos por tipo de serviço', colored: false, especial: 'produtos_tipo' },

  { key: 'status_os', label: 'Status de OS', colored: true, slug: true },
  { key: 'etapas_os', label: 'Etapas da OS', colored: false, slug: true },
  { key: 'status_garantia', label: 'Status de garantia', colored: true },
  { key: 'status_follow_up', label: 'Status de follow-up', colored: true },
  { key: 'tipos_documento', label: 'Tipos de documento da OS', colored: false },
  { key: 'categorias_documento_cliente', label: 'Categorias de documento do cliente', colored: false },
  { key: 'documentos_colaborador', label: 'Documentos do colaborador', colored: false },
  { key: 'tipos_produto', label: 'Tipos de produto', colored: false },
  { key: 'categorias_produto', label: 'Categorias de produto', colored: false },
  { key: 'categorias_relatorio', label: 'Categorias de relatório', colored: false },
  { key: 'unidades', label: 'Unidades de medida', colored: false },
  { key: 'tipos_servico', label: 'Tipos de serviço', colored: false, servico: true },
  { key: 'tipos_controle', label: 'Tipos de controle', colored: false },
  { key: 'frequencias', label: 'Frequências', colored: false },
  { key: 'setores', label: 'Setores', colored: false },
  { key: 'cargos', label: 'Cargos', colored: false },
  { key: 'perfis_portal', label: 'Perfis do portal do cliente', colored: false },
  { key: 'motivos_ajuste', label: 'Motivos de ajuste de estoque', colored: false },
  { key: 'pragas', label: 'Pragas-alvo', colored: false },
  { key: 'epis', label: 'EPIs', colored: false },
];

/** Só os que têm lista de itens — os dois especiais não vivem em catalogo_itens. */
export const CATALOGOS_GENERICOS = CATALOGOS.filter((c) => !c.especial);

/**
 * Slug a partir do rótulo: 'Não executada' → 'nao_executada'.
 *
 * É o valor que a OS grava. Precisa ser estável e sem acento porque vai para
 * URL de filtro e para comparação em policy.
 */
export function slugDe(nome: string): string {
  return nome
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Quantos itens cada catálogo tem — o protótipo mostra esse número numa pílula
 * ao lado de TODOS os catálogos, não só do selecionado. Uma consulta só, porque
 * dezoito seriam dezoito viagens ao servidor para exibir dezoito números.
 */
export async function contarItensPorCatalogo(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('catalogo_itens').select('catalogo');
  if (error) throw new Error(msgErro(error));
  const out: Record<string, number> = {};
  (data as { catalogo: string }[]).forEach((r) => { out[r.catalogo] = (out[r.catalogo] ?? 0) + 1; });
  return out;
}

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
async function audit(acao: string, detalhes?: Json): Promise<void> {
  await supabase.from('auditoria').insert({
    actor_id: await actorId(),
    funcionario_id: null,
    modulo: 'configuracoes',
    acao,
    detalhes: detalhes ?? null,
  });
}

/**
 * Contagem de uso por item, vinda do banco (`catalogo_uso`).
 *
 * Antes isto era feito aqui: cinco dos doze catálogos tinham contador, e cada
 * um puxava a tabela consumidora inteira para o navegador para contar. Os
 * outros sete apareciam sempre como "—" — e, sem uso, a tela oferecia Excluir.
 *
 * O Status de OS errava mesmo tendo contador: o catálogo guarda o rótulo
 * ("Em aberto") e a OS guarda o slug ("em_aberto"). Quem resolve isso é a
 * coluna `catalogo_itens.valor`, lida pela função — não um dicionário aqui.
 */
async function catalogoUso(catalogo: string): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('catalogo_uso', { _catalogo: catalogo });
  if (error) throw new Error(msgErro(error));
  const map: Record<string, number> = {};
  (data ?? []).forEach((r) => { map[r.nome] = Number(r.uso); });
  return map;
}

export async function listCatalogoItens(catalogo: string): Promise<CatalogoItem[]> {
  const [{ data, error }, uso] = await Promise.all([
    supabase.from('catalogo_itens').select('*').eq('catalogo', catalogo).order('ordem').order('nome'),
    catalogoUso(catalogo),
  ]);
  if (error) throw new Error(msgErro(error));
  // `uso` é calculado, não é coluna — por isso o cast direto para CatalogoItem
  // não vale. Monta-se o objeto, e aí a linha do banco confere campo a campo.
  return (data ?? []).map((it) => ({ ...it, uso: uso[it.nome] ?? 0 }));
}

/**
 * Situações de OS ativas, na ordem do catálogo.
 *
 * O filtro da lista de Operacional lia uma constante com os nove status
 * canônicos. Depois que a tela passou a criar status, um status novo não
 * aparecia no filtro — e, pior, um endereço com `?status=<novo>` era descartado
 * por não estar na lista de válidos, filtrando por outra coisa sem avisar.
 */
export async function listStatusOs(): Promise<{ valor: string; nome: string }[]> {
  const { data, error } = await supabase
    .from('catalogo_itens').select('valor, nome')
    .eq('catalogo', 'status_os').eq('ativo', true)
    .order('ordem').order('nome');
  if (error) throw new Error(msgErro(error));
  return (data as { valor: string | null; nome: string }[])
    .filter((r) => !!r.valor)
    .map((r) => ({ valor: r.valor as string, nome: r.nome }));
}

/** Nomes ativos de um catálogo — para popular selects nos demais módulos. */
export async function listCatalogoAtivos(catalogo: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('catalogo_itens').select('nome').eq('catalogo', catalogo).eq('ativo', true).order('ordem').order('nome');
  if (error) throw new Error(msgErro(error));
  return (data as { nome: string }[]).map((r) => r.nome);
}

export interface CatalogoItemInput {
  catalogo: string;
  nome: string;
  valor?: string | null;
  cor_bg?: string | null;
  cor_fg?: string | null;
  observacao?: string | null;
  template_mensagem?: string | null;
  prazo_padrao?: number | null;
  ativo?: boolean;
}

export async function createCatalogoItem(input: CatalogoItemInput): Promise<void> {
  // Sem `ordem` explícita o item nasce em 0 e vai para o topo da lista, na
  // frente de estágios que vêm antes dele no fluxo. O lugar natural de um item
  // novo é o fim.
  const { data: ultimo } = await supabase
    .from('catalogo_itens').select('ordem').eq('catalogo', input.catalogo)
    .order('ordem', { ascending: false }).limit(1).maybeSingle();
  const ordem = (ultimo?.ordem ?? 0) + 1;
  // Catálogo com slug (status_os, etapas_os): o item precisa nascer com `valor`,
  // que é o que a OS grava. Sem isso o trigger do banco recusa a OS depois — o
  // item existiria na tela e seria inútil na prática.
  const meta = CATALOGOS.find((c) => c.key === input.catalogo);
  const valor = input.valor ?? (meta?.slug ? slugDe(input.nome) : null);
  const { error } = await supabase.from('catalogo_itens').insert({ ...input, valor, ordem, created_by: await actorId() });
  if (error) throw new Error(error.code === '23505' ? 'Já existe um item com esse nome neste catálogo.' : msgErro(error));
  await audit('catalogo_item_criado', { catalogo: input.catalogo, nome: input.nome, valor });
}

export async function updateCatalogoItem(id: string, patch: Partial<CatalogoItemInput>): Promise<void> {
  const { error } = await supabase.from('catalogo_itens').update(patch).eq('id', id);
  if (error) throw new Error(error.code === '23505' ? 'Já existe um item com esse nome neste catálogo.' : msgErro(error));
  await audit('catalogo_item_editado', { id, ...patch });
}

export async function setCatalogoItemAtivo(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from('catalogo_itens').update({ ativo }).eq('id', id);
  if (error) throw new Error(msgErro(error));
  await audit(ativo ? 'catalogo_item_ativado' : 'catalogo_item_inativado', { id });
}

/** Exclui um item. Um trigger no banco recusa se o item estiver em uso — a tela
 *  esconde o botão, mas quem chamar a API direto esbarra na mesma regra. */
export async function deleteCatalogoItem(id: string): Promise<void> {
  const { error } = await supabase.from('catalogo_itens').delete().eq('id', id);
  if (error) throw new Error(msgErro(error));
  await audit('catalogo_item_excluido', { id });
}

// ============================================================
// Planilha de execução por tipo de serviço
// ============================================================
// Cada tipo de serviço tem as próprias legendas de preenchimento de ponto.
// "Consumo parcial" faz sentido em desratização e nenhum em sanitização — é por
// isso que a planilha é por tipo, e não uma lista só.

export interface PlanilhaItem {
  id: string;
  tipo_servico: string;
  nome: string;
  cor_bg: string | null;
  cor_fg: string | null;
  observacao: string | null;
  ordem: number;
  ativo: boolean;
  /** Pontos de execução já registrados com esta legenda. */
  uso: number;
}

export async function listPlanilhaItens(tipoServico: string): Promise<PlanilhaItem[]> {
  const [{ data, error }, { data: pontos }] = await Promise.all([
    supabase.from('planilha_itens').select('*').eq('tipo_servico', tipoServico).order('ordem').order('nome'),
    supabase.from('os_plano_pontos').select('situacao'),
  ]);
  if (error) throw new Error(msgErro(error));
  const uso: Record<string, number> = {};
  (pontos ?? []).forEach((p: { situacao: string | null }) => {
    if (p.situacao) uso[p.situacao] = (uso[p.situacao] ?? 0) + 1;
  });
  return (data ?? []).map((it) => ({ ...it, uso: uso[it.nome] ?? 0 }));
}

/** Quantas legendas cada tipo de serviço tem — alimenta o contador das abas. */
export async function contarPlanilhaPorTipo(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('planilha_itens').select('tipo_servico');
  if (error) throw new Error(msgErro(error));
  const out: Record<string, number> = {};
  (data as { tipo_servico: string }[]).forEach((r) => { out[r.tipo_servico] = (out[r.tipo_servico] ?? 0) + 1; });
  return out;
}

export interface PlanilhaItemInput {
  tipo_servico: string;
  nome: string;
  cor_bg?: string | null;
  cor_fg?: string | null;
  observacao?: string | null;
  ativo?: boolean;
}

export async function createPlanilhaItem(input: PlanilhaItemInput): Promise<void> {
  const { data: ultimo } = await supabase
    .from('planilha_itens').select('ordem').eq('tipo_servico', input.tipo_servico)
    .order('ordem', { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from('planilha_itens')
    .insert({ ...input, ordem: (ultimo?.ordem ?? 0) + 1, created_by: await actorId() });
  if (error) throw new Error(error.code === '23505' ? 'Esta planilha já tem um status com esse nome.' : msgErro(error));
  await audit('planilha_item_criado', { tipo_servico: input.tipo_servico, nome: input.nome });
}

export async function updatePlanilhaItem(id: string, patch: Partial<PlanilhaItemInput>): Promise<void> {
  const { error } = await supabase.from('planilha_itens').update(patch).eq('id', id);
  if (error) throw new Error(error.code === '23505' ? 'Esta planilha já tem um status com esse nome.' : msgErro(error));
  await audit('planilha_item_editado', { id, ...patch });
}

export async function deletePlanilhaItem(id: string): Promise<void> {
  const { error } = await supabase.from('planilha_itens').delete().eq('id', id);
  if (error) throw new Error(msgErro(error));
  await audit('planilha_item_excluido', { id });
}

// ============================================================
// Produtos padrão por tipo de serviço
// ============================================================

export interface TipoServicoProduto {
  id: string;
  tipo_servico: string;
  produto_id: string;
  qtd_padrao: number;
  produto: string;
  categoria: string;
  unidade: string;
}

export async function listProdutosDoTipo(tipoServico: string): Promise<TipoServicoProduto[]> {
  const { data, error } = await supabase
    .from('tipo_servico_produtos')
    .select('id, tipo_servico, produto_id, qtd_padrao, produto:produto_id(nome, categoria, unidade)')
    .eq('tipo_servico', tipoServico);
  if (error) throw new Error(msgErro(error));
  return (data as any[])
    .map((r) => {
      const p = Array.isArray(r.produto) ? r.produto[0] : r.produto;
      return {
        id: r.id, tipo_servico: r.tipo_servico, produto_id: r.produto_id,
        qtd_padrao: Number(r.qtd_padrao),
        produto: p?.nome ?? '—', categoria: p?.categoria ?? '—', unidade: p?.unidade ?? 'un',
      };
    })
    .sort((a, b) => a.produto.localeCompare(b.produto, 'pt-BR'));
}

export async function contarProdutosPorTipo(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('tipo_servico_produtos').select('tipo_servico');
  if (error) throw new Error(msgErro(error));
  const out: Record<string, number> = {};
  (data as { tipo_servico: string }[]).forEach((r) => { out[r.tipo_servico] = (out[r.tipo_servico] ?? 0) + 1; });
  return out;
}

/** Produtos do almoxarifado ainda não vinculados a este tipo de serviço. */
export async function listProdutosParaVincularNoTipo(tipoServico: string): Promise<{ id: string; nome: string; categoria: string; unidade: string }[]> {
  const [{ data: todos, error }, jaLigados] = await Promise.all([
    supabase.from('produtos').select('id, nome, categoria, unidade').order('nome'),
    listProdutosDoTipo(tipoServico),
  ]);
  if (error) throw new Error(msgErro(error));
  const ligados = new Set(jaLigados.map((r) => r.produto_id));
  return (todos as any[])
    .filter((p) => !ligados.has(p.id))
    .map((p) => ({ id: p.id, nome: p.nome, categoria: p.categoria ?? '—', unidade: p.unidade ?? 'un' }));
}

export async function vincularProdutosAoTipo(tipoServico: string, produtoIds: string[]): Promise<void> {
  if (produtoIds.length === 0) return;
  const ator = await actorId();
  const { error } = await supabase.from('tipo_servico_produtos').insert(
    produtoIds.map((produto_id) => ({ tipo_servico: tipoServico, produto_id, qtd_padrao: 1, created_by: ator })),
  );
  if (error) throw new Error(msgErro(error));
  await audit('tipo_servico_produtos_vinculados', { tipo_servico: tipoServico, quantidade: produtoIds.length });
}

export async function setQtdPadraoDoTipo(id: string, qtd: number): Promise<void> {
  if (!(qtd > 0)) throw new Error('A quantidade padrão precisa ser maior que zero.');
  const { error } = await supabase.from('tipo_servico_produtos').update({ qtd_padrao: qtd }).eq('id', id);
  if (error) throw new Error(msgErro(error));
  await audit('tipo_servico_produto_qtd', { id, qtd_padrao: qtd });
}

export async function desvincularProdutoDoTipo(id: string): Promise<void> {
  const { error } = await supabase.from('tipo_servico_produtos').delete().eq('id', id);
  if (error) throw new Error(msgErro(error));
  await audit('tipo_servico_produto_desvinculado', { id });
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
  if (error) throw new Error(msgErro(error));
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
  if (error) throw new Error(msgErro(error));
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
    if (error) throw new Error(msgErro(error));
  } else {
    const { data, error } = await supabase.from('perfis_acesso').insert({ nome: input.nome, descricao: input.descricao }).select('id').single();
    if (error) throw new Error(error.code === '23505' ? 'Já existe um perfil com esse nome.' : msgErro(error));
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
  if (error) throw new Error(msgErro(error));
}

export async function uploadFotoPerfil(file: File): Promise<string> {
  const uid = await actorId();
  if (!uid) throw new Error('Sessão expirada.');
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `avatars/${uid}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('funcionario-docs').upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw new Error(msgErro(error));
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
