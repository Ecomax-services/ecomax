import { supabase } from '@/lib/supabase';
import type { BadgeTone } from '@/components/ui/Badge';

// ============================================================
// Helpers
// ============================================================
const DAY = 86400000;
async function actorId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
async function audit(acao: string, detalhes?: unknown): Promise<void> {
  await supabase.from('auditoria').insert({
    actor_id: await actorId(), funcionario_id: null, modulo: 'gestao_clientes', acao, detalhes: detalhes ?? null,
  });
}
export type DocState = 'ok' | 'soon' | 'expired' | 'na';
export function docState(iso: string | null): DocState {
  if (!iso) return 'na';
  const t = new Date(iso + 'T00:00:00').getTime();
  if (t < Date.now()) return 'expired';
  if (t <= Date.now() + 30 * DAY) return 'soon';
  return 'ok';
}
export const docTone: Record<DocState, BadgeTone> = { ok: 'success', soon: 'warn', expired: 'danger', na: 'muted' };
const brDate = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—');

// ============================================================
// Clientes (lista + CRUD + soft delete)
// ============================================================
export interface ClienteRow {
  id: string;
  nome: string;
  razao: string;
  regiao: string;
  doc: string;              // CNPJ ou CPF
  endereco: string;
  ativo: boolean;
}
export interface ClienteDetail extends ClienteRow {
  razao_social: string | null;
  tipo_pessoa: 'pf' | 'pj';
  cnpj: string | null;
  cpf: string | null;
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

export async function listClientes(opts: { search?: string; page?: number; pageSize?: number } = {}): Promise<{ rows: ClienteRow[]; total: number }> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 10;
  const from = (page - 1) * pageSize;
  let q = supabase.from('clientes').select('*', { count: 'exact' }).order('nome').range(from, from + pageSize - 1);
  const s = opts.search?.trim();
  if (s) q = q.or(`nome.ilike.%${s}%,razao_social.ilike.%${s}%`);
  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  const rows = (data as any[]).map((c) => ({
    id: c.id, nome: c.nome, razao: c.razao_social ?? '—', regiao: c.regiao ?? '—',
    doc: c.cnpj || c.cpf || '—', endereco: composeEndereco(c), ativo: c.ativo,
  }));
  return { rows, total: count ?? 0 };
}

export async function getCliente(id: string): Promise<ClienteDetail> {
  const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  const c = data as any;
  return {
    id: c.id, nome: c.nome, razao: c.razao_social ?? '—', regiao: c.regiao ?? '—',
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
}
export async function createCliente(input: ClienteInput): Promise<string> {
  const { data, error } = await supabase.from('clientes').insert({ ...input, created_by: await actorId() }).select('id').single();
  if (error) throw new Error(error.message);
  await audit('cliente_criado', { cliente_id: (data as any).id, nome: input.nome });
  return (data as any).id;
}
export async function updateCliente(id: string, input: Partial<ClienteInput>): Promise<void> {
  const { error } = await supabase.from('clientes').update(input).eq('id', id);
  if (error) throw new Error(error.message);
  await audit('cliente_editado', { cliente_id: id });
}
/** Soft delete: inativa (ou reativa) o cliente — nunca remove do banco. */
export async function setClienteAtivo(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from('clientes').update({ ativo }).eq('id', id);
  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);
  await audit('contato_criado', { cliente_id: clienteId, tipo: c.tipo });
}
export async function updateContato(id: string, c: Partial<ContatoInput>): Promise<void> {
  const { error } = await supabase.from('cliente_contatos').update(c).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function setContatoAtivo(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from('cliente_contatos').update({ ativo }).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function deleteContato(id: string): Promise<void> {
  const { error } = await supabase.from('cliente_contatos').delete().eq('id', id);
  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);
  return (data as any[]).map((u) => ({
    id: u.id, nome: u.nome, email: u.email, perfil: u.perfil ?? '—', status: u.status,
    ultimoAcesso: u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleDateString('pt-BR') : '—',
  }));
}
/** "Convidar" cria o usuário como 'convidado'. O envio de e-mail é feito por infra externa (adiado). */
export async function convidarPortalUsuario(clienteId: string, nome: string, email: string, perfil: string): Promise<void> {
  const { error } = await supabase.from('cliente_portal_usuarios').insert({ cliente_id: clienteId, nome, email, perfil, status: 'convidado' });
  if (error) throw new Error(error.message);
  await audit('portal_usuario_convidado', { cliente_id: clienteId, email });
}
export async function setPortalUsuarioStatus(id: string, status: PortalStatus): Promise<void> {
  const { error } = await supabase.from('cliente_portal_usuarios').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function updatePortalUsuarioPerfil(id: string, perfil: string): Promise<void> {
  const { error } = await supabase.from('cliente_portal_usuarios').update({ perfil }).eq('id', id);
  if (error) throw new Error(error.message);
}

// ============================================================
// Funcionários integrados (vínculo funcionário ↔ cliente)
// ============================================================
export interface FuncIntegradoRow {
  vinculoId: string; funcionario_id: string; nome: string; cargo: string; setor: string;
  aso: string; asoState: DocState; cnh: string; cnhState: DocState; ativo: boolean;
  bloqueado: boolean;   // ASO ou CNH vencidos → bloqueia vínculo a novas OS
}
export async function listClienteFuncionarios(clienteId: string): Promise<FuncIntegradoRow[]> {
  const { data, error } = await supabase
    .from('cliente_funcionarios')
    .select('id, funcionario_id, funcionario:funcionario_id(nome_completo, cargo, setor, ativo, aso_validade, cnh_validade)')
    .eq('cliente_id', clienteId);
  if (error) throw new Error(error.message);
  return (data as any[]).map((v) => {
    const f = Array.isArray(v.funcionario) ? v.funcionario[0] : v.funcionario;
    const asoState = docState(f?.aso_validade ?? null);
    const cnhState = docState(f?.cnh_validade ?? null);
    return {
      vinculoId: v.id, funcionario_id: v.funcionario_id, nome: f?.nome_completo ?? '—',
      cargo: f?.cargo ?? '—', setor: f?.setor ?? '—',
      aso: brDate(f?.aso_validade ?? null), asoState, cnh: brDate(f?.cnh_validade ?? null), cnhState,
      ativo: f?.ativo ?? true, bloqueado: asoState === 'expired' || cnhState === 'expired',
    };
  });
}
export async function listFuncionariosDisponiveis(clienteId: string): Promise<{ id: string; nome: string }[]> {
  const [{ data: funcs, error }, { data: vinc }] = await Promise.all([
    supabase.from('funcionarios').select('id, nome_completo').eq('ativo', true).order('nome_completo'),
    supabase.from('cliente_funcionarios').select('funcionario_id').eq('cliente_id', clienteId),
  ]);
  if (error) throw new Error(error.message);
  const usados = new Set((vinc as any[] | null)?.map((v) => v.funcionario_id));
  return (funcs as any[]).filter((f) => !usados.has(f.id)).map((f) => ({ id: f.id, nome: f.nome_completo }));
}
export async function vincularFuncionario(clienteId: string, funcionarioId: string): Promise<void> {
  const { error } = await supabase.from('cliente_funcionarios').insert({ cliente_id: clienteId, funcionario_id: funcionarioId });
  if (error) throw new Error(error.code === '23505' ? 'Funcionário já vinculado a este cliente.' : error.message);
  await audit('funcionario_vinculado', { cliente_id: clienteId, funcionario_id: funcionarioId });
}
export async function desvincularFuncionario(vinculoId: string): Promise<void> {
  const { error } = await supabase.from('cliente_funcionarios').delete().eq('id', vinculoId);
  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);
  return (data as any[]).map((o) => ({
    id: o.id, codigo: o.codigo, data: brDate(o.data), status: o.status as OrcStatus,
    observacao: o.observacao ?? '', valor: brl(Number(o.valor_total)), osCount: 0,
  }));
}
export async function createOrcamento(clienteId: string, input: { observacao: string | null; valor_total: number }): Promise<void> {
  const { error } = await supabase.from('orcamentos').insert({ cliente_id: clienteId, observacao: input.observacao, valor_total: input.valor_total, created_by: await actorId() });
  if (error) throw new Error(error.message);
  await audit('orcamento_criado', { cliente_id: clienteId });
}
export async function updateOrcamento(id: string, input: { observacao?: string | null; valor_total?: number }): Promise<void> {
  const { error } = await supabase.from('orcamentos').update(input).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function setOrcamentoStatus(id: string, status: OrcStatus): Promise<void> {
  const { error } = await supabase.from('orcamentos').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);
  const usados = new Set((homolog as any[] | null)?.map((h) => h.produto_id));
  return (prods as any[]).filter((p) => !usados.has(p.id)).map((p) => ({ id: p.id, nome: p.nome }));
}
export async function addHomologado(clienteId: string, produtoId: string, validade: string | null): Promise<void> {
  const { error } = await supabase.from('cliente_produtos_homologados').insert({ cliente_id: clienteId, produto_id: produtoId, validade });
  if (error) throw new Error(error.code === '23505' ? 'Produto já homologado para este cliente.' : error.message);
  await audit('produto_homologado', { cliente_id: clienteId, produto_id: produtoId });
}
export async function updateHomologadoValidade(id: string, validade: string | null): Promise<void> {
  const { error } = await supabase.from('cliente_produtos_homologados').update({ validade }).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function removeHomologado(id: string): Promise<void> {
  const { error } = await supabase.from('cliente_produtos_homologados').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
