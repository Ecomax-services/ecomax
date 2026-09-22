import { supabase } from '@/lib/supabase';
import { docState, avaliarDocumentos, hojeISO, SEM_DATA, type DocState, type MotivoBloqueio } from '@/lib/documentos';
import type { Json } from '@/lib/database.types';
import type { BadgeTone } from '@/components/ui/Badge';
import { msgErro } from '@/lib/erros';

// ============================================================
// Helpers
// ============================================================
async function actorId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
async function audit(acao: string, detalhes?: Json): Promise<void> {
  await supabase.from('auditoria').insert({
    actor_id: await actorId(), funcionario_id: null, modulo: 'gestao_clientes', acao, detalhes: detalhes ?? null,
  });
}
export { docTone, type DocState, type MotivoBloqueio } from '@/lib/documentos';
export { docState, avaliarDocumentos };
const brDate = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—');

// ============================================================
// Clientes (lista + CRUD + soft delete)
// ============================================================
export interface ClienteRow {
  id: string;
  nome: string;
  razao: string;
  regiao: string;
  /** Curva ABC, mantida em Gestão de Clientes. Somente leitura nos outros módulos. */
  abc: string | null;
  /** Nome do gestor responsável, ou null quando ninguém foi atribuído. */
  gestor: string | null;
  cnpj: string | null;
  cpf: string | null;
  doc: string;              // CNPJ ou CPF, para a busca e exportações
  endereco: string;
  ativo: boolean;
  /**
   * Caminho no storage do documento mais recente, ou null.
   *
   * Guardar o caminho e não um booleano é o que separa "existe registro" de
   * "existe arquivo para abrir": dois dos relatórios publicados hoje estão com
   * `arquivo_url` nulo, e um ícone "disponível" que não abre nada é pior do
   * que um ícone apagado.
   */
  mapeamentoPath: string | null;
  relatorioPath: string | null;
}
export interface ClienteDetail extends ClienteRow {
  razao_social: string | null;
  tipo_pessoa: 'pf' | 'pj';
  /**
   * O id, e não só o nome que vem em `ClienteRow.gestor`.
   *
   * O formulário de edição precisa dele para pré-selecionar o gestor atual.
   * Sem isso o campo abria vazio e o save gravava null — editar o telefone de
   * um cliente apagava o gestor dele, sem aviso nenhum.
   */
  gestor_id: string | null;
  cep: string | null; logradouro: string | null; numero: string | null; complemento: string | null;
  bairro: string | null; cidade: string | null; uf: string | null;
  email: string | null;
  telefone: string | null;
  observacoes: string | null;
}

function composeEndereco(c: any): string {
  const linha = [c.logradouro, c.numero, c.complemento, c.bairro].filter(Boolean).join(', ');
  const cidade = [c.cidade, c.uf].filter(Boolean).join('/');
  return [linha, cidade].filter(Boolean).join(' - ') || '—';
}

export interface KpisClientes { total: number; ativos: number; pj: number; pf: number }

/**
 * Os quatro números do topo da lista de clientes.
 *
 * Quatro `head: true` em vez de puxar a base inteira para contar no navegador:
 * o servidor devolve só a contagem, e a tela não precisa carregar mil linhas
 * para exibir quatro números.
 */
export async function getKpisClientes(): Promise<KpisClientes> {
  const contar = async (aplicar: (q: any) => any) => {
    const { count, error } = await aplicar(
      supabase.from('clientes').select('id', { count: 'exact', head: true }),
    );
    if (error) throw new Error(msgErro(error));
    return count ?? 0;
  };
  const [total, ativos, pj, pf] = await Promise.all([
    contar((q: any) => q),
    contar((q: any) => q.eq('ativo', true)),
    contar((q: any) => q.eq('tipo_pessoa', 'pj')),
    contar((q: any) => q.eq('tipo_pessoa', 'pf')),
  ]);
  return { total, ativos, pj, pf };
}

export async function listClientes(opts: { search?: string; page?: number; pageSize?: number } = {}): Promise<{ rows: ClienteRow[]; total: number }> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 10;
  const from = (page - 1) * pageSize;
  let q = supabase
    .from('clientes')
    .select('*, gestor:gestor_id(nome_completo)', { count: 'exact' })
    .order('nome')
    .range(from, from + pageSize - 1);
  const s = opts.search?.trim();
  if (s) q = q.or(`nome.ilike.%${s}%,razao_social.ilike.%${s}%`);
  const { data, error, count } = await q;
  if (error) throw new Error(msgErro(error));

  const ids = (data as any[]).map((c) => c.id);
  const docs = await documentosPorCliente(ids);

  const rows = (data as any[]).map((c) => {
    const g = Array.isArray(c.gestor) ? c.gestor[0] : c.gestor;
    return {
      id: c.id, nome: c.nome, razao: c.razao_social ?? '—', regiao: c.regiao ?? '—',
      abc: c.classificacao_abc ?? null,
      gestor: g?.nome_completo ?? null,
      cnpj: c.cnpj ?? null, cpf: c.cpf ?? null,
      doc: c.cnpj || c.cpf || '—', endereco: composeEndereco(c), ativo: c.ativo,
      mapeamentoPath: docs[c.id]?.mapeamento ?? null,
      relatorioPath: docs[c.id]?.relatorio ?? null,
    };
  });
  return { rows, total: count ?? 0 };
}

/**
 * Quais clientes da página têm mapeamento e relatório técnico publicados.
 *
 * Duas consultas para a página inteira, e não duas por linha: com 25 clientes
 * por página o caminho ingênuo custaria 50 idas ao servidor só para desenhar
 * dois ícones.
 */
async function documentosPorCliente(
  ids: string[],
): Promise<Record<string, { mapeamento: string | null; relatorio: string | null }>> {
  const out: Record<string, { mapeamento: string | null; relatorio: string | null }> = {};
  if (ids.length === 0) return out;

  const [mapas, relatorios] = await Promise.all([
    supabase.from('ordens_servico').select('cliente_id, mapa_pontos_url, updated_at')
      .in('cliente_id', ids).not('mapa_pontos_url', 'is', null)
      .order('updated_at', { ascending: false }),
    // `arquivo_url` não nulo, e não só `publicado`: relatório publicado sem
    // arquivo existe no banco de hoje, e o ícone não pode prometer o que não
    // tem como abrir.
    supabase.from('os_relatorios').select('arquivo_url, created_at, os:os_id(cliente_id)')
      .eq('publicado', true).not('arquivo_url', 'is', null)
      .order('created_at', { ascending: false }),
  ]);

  ids.forEach((id) => { out[id] = { mapeamento: null, relatorio: null }; });
  (mapas.data as any[] | null)?.forEach((r) => {
    if (out[r.cliente_id] && !out[r.cliente_id].mapeamento) out[r.cliente_id].mapeamento = r.mapa_pontos_url;
  });
  (relatorios.data as any[] | null)?.forEach((r) => {
    const o = Array.isArray(r.os) ? r.os[0] : r.os;
    if (o?.cliente_id && out[o.cliente_id] && !out[o.cliente_id].relatorio) {
      out[o.cliente_id].relatorio = r.arquivo_url;
    }
  });
  return out;
}

/** Funcionários que podem ser gestor responsável de um cliente. */
export async function listGestoresOptions(): Promise<{ id: string; nome: string }[]> {
  const { data, error } = await supabase
    .from('funcionarios').select('id, nome_completo').eq('ativo', true).order('nome_completo');
  if (error) throw new Error(msgErro(error));
  return (data as any[]).map((f) => ({ id: f.id, nome: f.nome_completo }));
}

export async function definirGestor(clienteId: string, gestorId: string | null): Promise<void> {
  const { error } = await supabase.from('clientes').update({ gestor_id: gestorId }).eq('id', clienteId);
  if (error) throw new Error(msgErro(error));
}

export async function getCliente(id: string): Promise<ClienteDetail> {
  const { data, error } = await supabase
    .from('clientes').select('*, gestor:gestor_id(nome_completo)').eq('id', id).single();
  if (error) throw new Error(msgErro(error));
  const c = data as any;
  const g = Array.isArray(c.gestor) ? c.gestor[0] : c.gestor;
  const docs = await documentosPorCliente([c.id]);
  return {
    id: c.id, nome: c.nome, razao: c.razao_social ?? '—', regiao: c.regiao ?? '—',
    abc: c.classificacao_abc ?? null, gestor: g?.nome_completo ?? null, gestor_id: c.gestor_id ?? null,
    mapeamentoPath: docs[c.id]?.mapeamento ?? null, relatorioPath: docs[c.id]?.relatorio ?? null,
    doc: c.cnpj || c.cpf || '—', endereco: composeEndereco(c), ativo: c.ativo,
    razao_social: c.razao_social, tipo_pessoa: c.tipo_pessoa, cnpj: c.cnpj, cpf: c.cpf,
    cep: c.cep, logradouro: c.logradouro, numero: c.numero, complemento: c.complemento,
    bairro: c.bairro, cidade: c.cidade, uf: c.uf, email: c.email, telefone: c.telefone, observacoes: c.observacoes,
  };
}

export interface ClienteInput {
  nome: string; razao_social: string | null; tipo_pessoa: 'pf' | 'pj';
  cnpj: string | null; cpf: string | null; regiao: string | null;
  cep: string | null; logradouro: string | null; numero: string | null; complemento: string | null;
  bairro: string | null; cidade: string | null; uf: string | null;
  email: string | null; telefone: string | null; observacoes: string | null;
  /** Gestor responsável e curva ABC: a lista mostra, então o cadastro precisa
   *  deixar definir — senão a coluna nasce imutável. */
  gestor_id?: string | null;
  classificacao_abc?: string | null;
}
export async function createCliente(input: ClienteInput): Promise<string> {
  const { data, error } = await supabase.from('clientes').insert({ ...input, created_by: await actorId() }).select('id').single();
  if (error) throw new Error(msgErro(error));
  await audit('cliente_criado', { cliente_id: (data as any).id, nome: input.nome });
  return (data as any).id;
}
export async function updateCliente(id: string, input: Partial<ClienteInput>): Promise<void> {
  const { error } = await supabase.from('clientes').update(input).eq('id', id);
  if (error) throw new Error(msgErro(error));
  await audit('cliente_editado', { cliente_id: id });
}
/** Soft delete: inativa (ou reativa) o cliente — nunca remove do banco. */
export async function setClienteAtivo(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from('clientes').update({ ativo }).eq('id', id);
  if (error) throw new Error(msgErro(error));
  await audit(ativo ? 'cliente_reativado' : 'cliente_inativado', { cliente_id: id });
}

// ============================================================
// Contatos & Telefones (inline)
// ============================================================
export interface ContatoRow {
  id: string; tipo: 'telefone' | 'contato'; origem: string; nome: string; telefone: string; email: string;
  recebe_email: boolean; rel_tecnica: boolean; padrao: boolean; ativo: boolean;
}
export async function listContatos(clienteId: string): Promise<ContatoRow[]> {
  const { data, error } = await supabase.from('cliente_contatos').select('*').eq('cliente_id', clienteId).order('created_at');
  if (error) throw new Error(msgErro(error));
  return (data as any[]).map((r) => ({
    id: r.id, tipo: r.tipo, origem: r.tipo === 'telefone' ? 'Telefone' : 'Contato',
    nome: r.nome ?? '—', telefone: r.telefone ?? '', email: r.email ?? '',
    recebe_email: r.recebe_email, rel_tecnica: r.rel_tecnica, padrao: r.padrao, ativo: r.ativo,
  }));
}
export interface ContatoInput {
  tipo: 'telefone' | 'contato'; nome: string | null; telefone: string | null; email: string | null;
  recebe_email: boolean; rel_tecnica: boolean; padrao: boolean;
}
export async function addContato(clienteId: string, c: ContatoInput): Promise<void> {
  const { error } = await supabase.from('cliente_contatos').insert({ cliente_id: clienteId, ...c });
  if (error) throw new Error(msgErro(error));
  await audit('contato_criado', { cliente_id: clienteId, tipo: c.tipo });
}
export async function updateContato(id: string, c: Partial<ContatoInput>): Promise<void> {
  const { error } = await supabase.from('cliente_contatos').update(c).eq('id', id);
  if (error) throw new Error(msgErro(error));
}
export async function setContatoAtivo(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from('cliente_contatos').update({ ativo }).eq('id', id);
  if (error) throw new Error(msgErro(error));
}
export async function deleteContato(id: string): Promise<void> {
  const { error } = await supabase.from('cliente_contatos').delete().eq('id', id);
  if (error) throw new Error(msgErro(error));
}

// ============================================================
// Usuários do portal
// ============================================================
export type PortalStatus = 'convidado' | 'ativo' | 'inativo';
export const portalStatusTone: Record<PortalStatus, BadgeTone> = { convidado: 'softWarn', ativo: 'success', inativo: 'muted' };
export const portalStatusLabel: Record<PortalStatus, string> = { convidado: 'Convite enviado', ativo: 'Ativo', inativo: 'Inativo' };
export interface PortalUsuarioRow {
  id: string; nome: string; email: string; perfil: string; status: PortalStatus; ultimoAcesso: string;
}
export async function listPortalUsuarios(clienteId: string): Promise<PortalUsuarioRow[]> {
  const { data, error } = await supabase.from('cliente_portal_usuarios').select('*').eq('cliente_id', clienteId).order('created_at');
  if (error) throw new Error(msgErro(error));
  return (data as any[]).map((u) => ({
    id: u.id, nome: u.nome, email: u.email, perfil: u.perfil ?? '—', status: u.status,
    ultimoAcesso: u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleDateString('pt-BR') : '—',
  }));
}
/** "Convidar" cria o usuário como 'convidado'. O envio de e-mail é feito por infra externa (adiado). */
export interface ConvitePortalResultado {
  profile_id: string;
  email_enviado: boolean;
  email_erro?: string;
}

/**
 * Convida alguém para o Portal do Cliente.
 *
 * Passa pela Edge Function porque criar o login exige service_role. Antes daqui
 * esta função só inseria a linha em cliente_portal_usuarios: ninguém recebia
 * e-mail e, sobretudo, nenhuma conta era criada — a pessoa convidada não tinha
 * como entrar. A auditoria também é gravada lá, junto do resto da operação.
 */
export async function convidarPortalUsuario(
  clienteId: string,
  nome: string,
  email: string,
  perfil: string,
): Promise<ConvitePortalResultado> {
  const { data, error } = await supabase.functions.invoke('funcionarios-admin', {
    body: { action: 'invite_portal', cliente_id: clienteId, nome, email, perfil },
  });
  const msg = (data as { error?: string } | null)?.error;
  if (error || msg) throw new Error(msg || error!.message);
  return data as ConvitePortalResultado;
}
export async function setPortalUsuarioStatus(id: string, status: PortalStatus): Promise<void> {
  const { error } = await supabase.from('cliente_portal_usuarios').update({ status }).eq('id', id);
  if (error) throw new Error(msgErro(error));
}
export async function updatePortalUsuarioPerfil(id: string, perfil: string): Promise<void> {
  const { error } = await supabase.from('cliente_portal_usuarios').update({ perfil }).eq('id', id);
  if (error) throw new Error(msgErro(error));
}

// ============================================================
// Funcionários integrados (vínculo funcionário ↔ cliente)
// ============================================================
export interface FuncIntegradoRow {
  vinculoId: string; funcionario_id: string; nome: string; cargo: string; setor: string;
  aso: string; asoState: DocState; cnh: string; cnhState: DocState; ativo: boolean;
  /**
   * Mesmo critério que o Operacional aplica no seletor de equipe
   * (`avaliarDocumentos`). Antes aqui era só "algum documento vencido", então um
   * técnico de campo sem ASO nem CNH aparecia liberado nesta tela e era recusado
   * na hora de entrar na OS.
   */
  bloqueado: boolean;
  motivo: MotivoBloqueio;
}
export async function listClienteFuncionarios(clienteId: string): Promise<FuncIntegradoRow[]> {
  const { data, error } = await supabase
    .from('cliente_funcionarios')
    .select('id, funcionario_id, funcionario:funcionario_id(nome_completo, cargo, setor, ativo, aso_validade, cnh_validade)')
    .eq('cliente_id', clienteId);
  if (error) throw new Error(msgErro(error));
  const hoje = hojeISO();
  return (data as any[]).map((v) => {
    const f = Array.isArray(v.funcionario) ? v.funcionario[0] : v.funcionario;
    const asoState = docState(f?.aso_validade ?? null);
    const cnhState = docState(f?.cnh_validade ?? null);
    const motivo = avaliarDocumentos(f?.cargo ?? null, f?.aso_validade ?? null, f?.cnh_validade ?? null, hoje);
    return {
      vinculoId: v.id, funcionario_id: v.funcionario_id, nome: f?.nome_completo ?? '—',
      cargo: f?.cargo ?? '—', setor: f?.setor ?? '—',
      // "Não enviado" e não "—": é a mesma palavra que Gestão de Usuários usa
      // para a mesma ausência.
      aso: f?.aso_validade ? brDate(f.aso_validade) : SEM_DATA, asoState,
      cnh: f?.cnh_validade ? brDate(f.cnh_validade) : SEM_DATA, cnhState,
      ativo: f?.ativo ?? true, bloqueado: motivo !== null, motivo,
    };
  });
}
export async function listFuncionariosDisponiveis(clienteId: string): Promise<{ id: string; nome: string }[]> {
  const [{ data: funcs, error }, { data: vinc }] = await Promise.all([
    supabase.from('funcionarios').select('id, nome_completo').eq('ativo', true).order('nome_completo'),
    supabase.from('cliente_funcionarios').select('funcionario_id').eq('cliente_id', clienteId),
  ]);
  if (error) throw new Error(msgErro(error));
  const usados = new Set((vinc as any[] | null)?.map((v) => v.funcionario_id));
  return (funcs as any[]).filter((f) => !usados.has(f.id)).map((f) => ({ id: f.id, nome: f.nome_completo }));
}
export async function vincularFuncionario(clienteId: string, funcionarioId: string): Promise<void> {
  const { error } = await supabase.from('cliente_funcionarios').insert({ cliente_id: clienteId, funcionario_id: funcionarioId });
  if (error) throw new Error(error.code === '23505' ? 'Funcionário já vinculado a este cliente.' : msgErro(error));
  await audit('funcionario_vinculado', { cliente_id: clienteId, funcionario_id: funcionarioId });
}
export async function desvincularFuncionario(vinculoId: string): Promise<void> {
  const { error } = await supabase.from('cliente_funcionarios').delete().eq('id', vinculoId);
  if (error) throw new Error(msgErro(error));
}

// ============================================================
// Orçamentos (fluxo de status)
// ============================================================
export type OrcStatus = 'em_elaboracao' | 'aprovado' | 'cancelado';
export const orcStatusTone: Record<OrcStatus, BadgeTone> = { em_elaboracao: 'softWarn', aprovado: 'success', cancelado: 'muted' };
export const orcStatusLabel: Record<OrcStatus, string> = { em_elaboracao: 'Em elaboração', aprovado: 'Aprovado', cancelado: 'Cancelado' };
export interface OrcamentoRow {
  id: string; codigo: string; data: string; status: OrcStatus; observacao: string; valor: string; osCount: number;
}
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export async function listOrcamentos(clienteId: string): Promise<OrcamentoRow[]> {
  const { data, error } = await supabase.from('orcamentos').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false });
  if (error) throw new Error(msgErro(error));
  return (data as any[]).map((o) => ({
    id: o.id, codigo: o.codigo, data: brDate(o.data), status: o.status as OrcStatus,
    observacao: o.observacao ?? '', valor: brl(Number(o.valor_total)), osCount: 0,
  }));
}
/**
 * O valor de um orçamento é a soma dos itens, mantida pelo trigger
 * `recalcular_total_orcamento`. Havia aqui um `createOrcamento`/`updateOrcamento`
 * que gravava um `valor_total` digitado à mão — um segundo dono do mesmo número,
 * que o trigger sobrescrevia no primeiro item adicionado. O modal que os chamava
 * já estava inalcançável; sumiram os três.
 */
export async function setOrcamentoStatus(id: string, status: OrcStatus): Promise<void> {
  const { error } = await supabase.from('orcamentos').update({ status }).eq('id', id);
  if (error) throw new Error(msgErro(error));
  await audit('orcamento_status', { orcamento_id: id, status });
}

// ============================================================
// Produtos homologados
// ============================================================
export interface HomologadoRow {
  id: string; produto_id: string; codigo: string; produto: string; categoria: string;
  dataHomologacao: string; validade: string; expiraEmBreve: boolean;
}
export async function listHomologados(clienteId: string): Promise<HomologadoRow[]> {
  const { data, error } = await supabase
    .from('cliente_produtos_homologados')
    .select('id, produto_id, data_homologacao, validade, produto:produto_id(codigo, nome, categoria)')
    .eq('cliente_id', clienteId).order('created_at');
  if (error) throw new Error(msgErro(error));
  return (data as any[]).map((h) => {
    const p = Array.isArray(h.produto) ? h.produto[0] : h.produto;
    const st = docState(h.validade);
    return {
      id: h.id, produto_id: h.produto_id, codigo: p?.codigo ?? '—', produto: p?.nome ?? '—', categoria: p?.categoria ?? '—',
      dataHomologacao: brDate(h.data_homologacao), validade: brDate(h.validade), expiraEmBreve: st === 'soon' || st === 'expired',
    };
  });
}
export async function listProdutosParaHomologar(clienteId: string): Promise<{ id: string; nome: string }[]> {
  const [{ data: prods, error }, { data: homolog }] = await Promise.all([
    supabase.from('produtos').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('cliente_produtos_homologados').select('produto_id').eq('cliente_id', clienteId),
  ]);
  if (error) throw new Error(msgErro(error));
  const usados = new Set((homolog as any[] | null)?.map((h) => h.produto_id));
  return (prods as any[]).filter((p) => !usados.has(p.id)).map((p) => ({ id: p.id, nome: p.nome }));
}
export async function addHomologado(clienteId: string, produtoId: string, validade: string | null): Promise<void> {
  const { error } = await supabase.from('cliente_produtos_homologados').insert({ cliente_id: clienteId, produto_id: produtoId, validade });
  if (error) throw new Error(error.code === '23505' ? 'Produto já homologado para este cliente.' : msgErro(error));
  await audit('produto_homologado', { cliente_id: clienteId, produto_id: produtoId });
}
export async function updateHomologadoValidade(id: string, validade: string | null): Promise<void> {
  const { error } = await supabase.from('cliente_produtos_homologados').update({ validade }).eq('id', id);
  if (error) throw new Error(msgErro(error));
}
export async function removeHomologado(id: string): Promise<void> {
  const { error } = await supabase.from('cliente_produtos_homologados').delete().eq('id', id);
  if (error) throw new Error(msgErro(error));
}

// ===========================================================================
// Documentos do cliente (o que o Portal mostra na aba Documentos)
// ===========================================================================
// `cliente_documentos` era lida pelo Portal e escrita por ninguém: as policies
// de insert, update e delete existiam desde o começo, mas nenhuma tela do
// Backoffice as usava. A aba Documentos do Portal não tinha como sair do vazio.

const BUCKET_PORTAL = 'portal-docs';

export interface DocumentoDoCliente {
  id: string;
  categoria: string;
  titulo: string;
  descricao: string | null;
  arquivoUrl: string | null;
  validade: string | null;
  validadeBr: string;
  ativo: boolean;
  /** Vale para todos os clientes, e não só para este. */
  institucional: boolean;
  criadoEm: string;
}

/**
 * Documentos deste cliente, mais os institucionais.
 *
 * Os institucionais (`cliente_id is null`) aparecem no Portal de todo cliente —
 * contrato-modelo, manual, política. Vêm junto aqui para quem administra ver a
 * mesma lista que o cliente vê, em vez de descobrir depois por que um documento
 * "apareceu sozinho".
 */
export async function listDocumentosDoCliente(clienteId: string): Promise<DocumentoDoCliente[]> {
  const { data, error } = await supabase
    .from('cliente_documentos')
    .select('id, cliente_id, categoria, titulo, descricao, arquivo_url, validade, ativo, created_at')
    .or(`cliente_id.eq.${clienteId},cliente_id.is.null`)
    .order('created_at', { ascending: false });
  if (error) throw new Error(msgErro(error));
  return (data as any[]).map((d) => ({
    id: d.id,
    categoria: d.categoria,
    titulo: d.titulo,
    descricao: d.descricao,
    arquivoUrl: d.arquivo_url,
    validade: d.validade,
    validadeBr: brDate(d.validade),
    ativo: d.ativo,
    institucional: d.cliente_id === null,
    criadoEm: brDate(d.created_at?.slice(0, 10) ?? null),
  }));
}

export interface NovoDocumentoCliente {
  categoria: string;
  titulo: string;
  descricao?: string | null;
  validade?: string | null;
}

/**
 * Cria o documento e, se houver arquivo, envia e amarra os dois.
 *
 * A ordem não é escolha de estilo. A policy de leitura do bucket decodifica o
 * caminho — `portal_doc_escopo` e `portal_doc_id` exigem
 * `documento/<uuid-do-registro>/<arquivo>` —, e o uuid só existe depois do
 * insert. Enviar antes obrigaria a adivinhar o id, e um caminho fora do padrão
 * sobe sem erro e depois não abre para o cliente: a policy simplesmente não
 * casa, e o arquivo vira um 404 silencioso.
 *
 * Se o upload falhar, o registro é removido. Um documento sem arquivo aparece
 * no Portal como "Sem arquivo", e ninguém pediu isso — é melhor não existir do
 * que existir quebrado.
 */
export async function criarDocumentoCliente(
  clienteId: string,
  dados: NovoDocumentoCliente,
  arquivo: File | null,
): Promise<void> {
  const { data, error } = await supabase
    .from('cliente_documentos')
    .insert({
      cliente_id: clienteId,
      categoria: dados.categoria,
      titulo: dados.titulo.trim(),
      descricao: dados.descricao?.trim() || null,
      validade: dados.validade || null,
      created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    })
    .select('id')
    .single();
  if (error) throw new Error(msgErro(error));

  if (!arquivo) return;

  const id = (data as { id: string }).id;
  try {
    const caminho = `documento/${id}/${nomeSeguro(arquivo.name)}`;
    const up = await supabase.storage
      .from(BUCKET_PORTAL)
      .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type || undefined });
    if (up.error) throw new Error(msgErro(up.error));

    const { error: e2 } = await supabase
      .from('cliente_documentos')
      .update({ arquivo_url: caminho })
      .eq('id', id);
    if (e2) throw new Error(msgErro(e2));
  } catch (e) {
    await supabase.from('cliente_documentos').delete().eq('id', id);
    throw e;
  }
}

/**
 * Nome de arquivo sem acento, espaço ou barra.
 *
 * Barra no nome criaria um nível a mais no caminho, e aí
 * `documento/<id>/sub/arquivo.pdf` deixa de casar com a policy — que espera o
 * id no segundo segmento. Acento e espaço não quebram, mas produzem URL
 * ilegível no navegador.
 */
function nomeSeguro(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(-80);
}

/**
 * Tira o documento do ar sem apagar o histórico.
 *
 * A policy do Portal filtra por `ativo = true`, então inativar já basta para o
 * cliente parar de ver. Apagar levaria junto o registro de que o documento
 * existiu, e documento de cliente costuma ter valor probatório.
 */
export async function definirAtivoDocumentoCliente(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from('cliente_documentos').update({ ativo }).eq('id', id);
  if (error) throw new Error(msgErro(error));
}

/** URL temporária para conferir o arquivo antes de o cliente ver. */
export async function urlDocumentoCliente(caminho: string | null, segundos = 3600): Promise<string | null> {
  if (!caminho) return null;
  const { data } = await supabase.storage.from(BUCKET_PORTAL).createSignedUrl(caminho, segundos);
  return data?.signedUrl ?? null;
}

/** Categorias do catálogo — as mesmas abas que o Portal mostra. */
export async function listCategoriasDocumentoCliente(): Promise<string[]> {
  const { data, error } = await supabase
    .from('catalogo_itens')
    .select('nome')
    .eq('catalogo', 'categorias_documento_cliente')
    .eq('ativo', true)
    .order('ordem');
  if (error) throw new Error(msgErro(error));
  return (data as { nome: string }[]).map((c) => c.nome);
}
