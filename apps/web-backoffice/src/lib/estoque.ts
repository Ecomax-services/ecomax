import { supabase } from '@/lib/supabase';
import type { BadgeTone } from '@/components/ui/Badge';
import { type AlertLevel } from '@/data/estoque';

/** Status de requisição (chaves do enum req_status do banco). */
export type ReqStatus = 'aguardando_aprovacao' | 'aprovada' | 'enviada' | 'recebida' | 'recusada' | 'cancelada';
export const reqStatusTone: Record<ReqStatus, BadgeTone> = {
  aguardando_aprovacao: 'softWarn', aprovada: 'info', enviada: 'info', recebida: 'success', recusada: 'danger', cancelada: 'muted',
};

// ---------- Tipos (shape usado pela UI + id) ----------
export interface Produto {
  id: string;
  name: string;
  cod: string;
  cat: string;
  un: string;
  stock: number;
  min: number;
  max: number;
  forn: string;
  fornecedor_id: string | null;
  status: 'Ativo' | 'Inativo';
  alert: AlertLevel;
  noForn?: boolean;
}
export interface FornRow {
  id: string;
  razao: string;
  cnpj: string;
  contato: string;
  telefone: string;
  cat: string;
  compras: string;
  status: 'Ativo' | 'Inativo';
  aval: number;
}
export interface BaseRow {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
  resp: string;
  responsavel_id: string | null;
  central: boolean;
  prods: number;
  itens: number;
  status: string;
  tone: BadgeTone;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  endereco: string;
}
export interface StockRow {
  id: string;
  produto_id: string;
  base_id: string;
  prod: string;
  cat: string;
  lote: string;
  val: string;
  validadeISO: string | null;
  qtd: number;
  min: number;
  max: number;
  loc: string;
  alert: AlertLevel;
}
export interface MovRow {
  id: string;
  dt: string;
  tipo: string;
  prod: string;
  descricao: string;
  tone: BadgeTone;
}
export interface CotacaoRow {
  id: string;
  cod: string;
  prod: string;
  qtd: string;
  date: string;
  status: string;
  statusKey: string;
  tone: BadgeTone;
}
export interface CotacaoResposta {
  id: string;
  fornecedor_id: string | null;
  forn: string;
  valor: number | null;
  prazo: string;
  cond: string;
  best: boolean;
}
export interface ReqRow {
  id: string;
  cod: string;
  produto_id: string | null;
  prod: string;
  qtd: string;
  forn: string;
  valor: string;
  solic: string;
  aprovador: string;
  aprovadoEm: string | null;
  status: ReqStatus;
  notaUrl: string | null;
}

// ---------- Helpers ----------
const DAY = 86400000;
export function produtoAlert(stock: number, min: number, max: number | null): AlertLevel {
  if (stock < min) return 'low';
  if (max != null && stock > max) return 'high';
  return 'ok';
}
export function loteAlert(qtd: number, min: number, max: number | null, validade: string | null): AlertLevel {
  if (qtd < min) return 'low';
  if (validade && new Date(validade + 'T00:00:00').getTime() <= Date.now() + 60 * DAY) return 'exp';
  if (max != null && qtd > max) return 'high';
  return 'ok';
}
const mmYYYY = (iso: string | null) => (iso ? iso.split('-').slice(0, 2).reverse().join('/') : '—');
const brl = (n: number | null) => (n == null ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null));

const movTone: Record<string, BadgeTone> = { entrada: 'success', saida: 'danger', transferencia: 'info', ajuste: 'warn' };
const movLabel: Record<string, string> = { entrada: 'Entrada', saida: 'Saída', transferencia: 'Transferência', ajuste: 'Ajuste manual' };
const cotToneMap: Record<string, BadgeTone> = { aguardando: 'softWarn', respondida: 'info', aprovada: 'success', cancelada: 'muted' };
const cotLabelMap: Record<string, string> = { aguardando: 'Aguardando respostas', respondida: 'Respondida', aprovada: 'Aprovada', cancelada: 'Cancelada' };
const reqStatusLabel: Record<ReqStatus, string> = {
  aguardando_aprovacao: 'Aguardando aprovação', aprovada: 'Aprovada', enviada: 'Enviada',
  recebida: 'Recebida', recusada: 'Recusada', cancelada: 'Cancelada',
};

async function actorId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ---------- Produtos ----------
export async function listProdutos(): Promise<Produto[]> {
  const { data, error } = await supabase.from('vw_produtos').select('*').order('nome');
  if (error) throw new Error(error.message);
  return (data as any[]).map((p) => ({
    id: p.id, name: p.nome, cod: p.codigo, cat: p.categoria, un: p.unidade,
    stock: Number(p.estoque_total), min: Number(p.estoque_min), max: p.estoque_max == null ? 0 : Number(p.estoque_max),
    forn: p.fornecedor_razao ?? '—', fornecedor_id: p.fornecedor_id,
    status: p.ativo ? 'Ativo' : 'Inativo',
    alert: produtoAlert(Number(p.estoque_total), Number(p.estoque_min), p.estoque_max == null ? null : Number(p.estoque_max)),
    noForn: !p.fornecedor_id,
  }));
}

export interface ProdutoInput {
  codigo: string; nome: string; categoria: string; unidade: string;
  estoque_min: number; estoque_max: number | null; fornecedor_id: string | null;
}
export async function createProduto(p: ProdutoInput) {
  const { error } = await supabase.from('produtos').insert(p);
  if (error) throw new Error(error.message);
}
export async function updateProduto(id: string, p: Partial<ProdutoInput>) {
  const { error } = await supabase.from('produtos').update(p).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function setProdutoAtivo(id: string, ativo: boolean) {
  const { error } = await supabase.from('produtos').update({ ativo }).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function codigoExists(codigo: string): Promise<boolean> {
  const { count } = await supabase.from('produtos').select('id', { count: 'exact', head: true }).eq('codigo', codigo);
  return (count ?? 0) > 0;
}

// ---------- Fornecedores ----------
export async function listFornecedores(): Promise<FornRow[]> {
  const { data, error } = await supabase.from('vw_fornecedores').select('*').order('razao_social');
  if (error) throw new Error(error.message);
  return (data as any[]).map((f) => ({
    id: f.id, razao: f.razao_social, cnpj: f.cnpj ?? '—', contato: f.email ?? '—', telefone: f.telefone ?? '',
    cat: f.categoria ?? '—', compras: brl(Number(f.compras_total)), status: f.ativo ? 'Ativo' : 'Inativo',
    aval: Number(f.avaliacao_calc ?? f.avaliacao ?? 0),
  }));
}
export interface FornecedorInput {
  razao_social: string; cnpj: string | null; email: string | null; telefone: string | null; categoria: string | null;
}
export async function createFornecedor(f: FornecedorInput) {
  const { error } = await supabase.from('fornecedores').insert(f);
  if (error) throw new Error(error.message);
}
export async function updateFornecedor(id: string, f: Partial<FornecedorInput>) {
  const { error } = await supabase.from('fornecedores').update(f).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function setFornecedorAtivo(id: string, ativo: boolean) {
  const { error } = await supabase.from('fornecedores').update({ ativo }).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function listFornecedorOptions(): Promise<{ id: string; nome: string }[]> {
  const { data, error } = await supabase.from('fornecedores').select('id, razao_social').eq('ativo', true).order('razao_social');
  if (error) throw new Error(error.message);
  return (data as any[]).map((f) => ({ id: f.id, nome: f.razao_social }));
}

// ---------- Fornecedor: contatos ----------
export interface FornContato {
  id: string; nome: string; cargo: string | null; email: string | null; telefone: string | null; principal: boolean;
}
export async function listContatos(fornecedorId: string): Promise<FornContato[]> {
  const { data, error } = await supabase
    .from('fornecedor_contatos').select('id, nome, cargo, email, telefone, principal')
    .eq('fornecedor_id', fornecedorId).order('principal', { ascending: false }).order('nome');
  if (error) throw new Error(error.message);
  return data as FornContato[];
}
export async function addContato(fornecedorId: string, c: Omit<FornContato, 'id'>) {
  const { error } = await supabase.from('fornecedor_contatos').insert({ fornecedor_id: fornecedorId, ...c });
  if (error) throw new Error(error.message);
}
export async function deleteContato(id: string) {
  const { error } = await supabase.from('fornecedor_contatos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------- Fornecedor: produtos fornecidos ----------
export interface FornProduto { id: string; produto_id: string; nome: string; codigo: string }
export async function listFornProdutos(fornecedorId: string): Promise<FornProduto[]> {
  const { data, error } = await supabase
    .from('fornecedor_produtos').select('id, produto_id, produto:produto_id(nome, codigo)')
    .eq('fornecedor_id', fornecedorId);
  if (error) throw new Error(error.message);
  return (data as any[]).map((r) => ({ id: r.id, produto_id: r.produto_id, nome: one<any>(r.produto)?.nome ?? '—', codigo: one<any>(r.produto)?.codigo ?? '' }));
}
export async function vincularProduto(fornecedorId: string, produtoId: string) {
  const { error } = await supabase.from('fornecedor_produtos').insert({ fornecedor_id: fornecedorId, produto_id: produtoId });
  if (error) throw new Error(error.code === '23505' ? 'Produto já vinculado.' : error.message);
}
export async function desvincularProduto(id: string) {
  const { error } = await supabase.from('fornecedor_produtos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
/** Produtos ativos ainda não vinculados a este fornecedor (para o seletor). */
export async function listProdutosParaVincular(fornecedorId: string): Promise<{ id: string; nome: string }[]> {
  const [{ data: prods, error }, { data: vinc }] = await Promise.all([
    supabase.from('produtos').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('fornecedor_produtos').select('produto_id').eq('fornecedor_id', fornecedorId),
  ]);
  if (error) throw new Error(error.message);
  const usados = new Set((vinc as any[] | null)?.map((v) => v.produto_id));
  return (prods as any[]).filter((p) => !usados.has(p.id)).map((p) => ({ id: p.id, nome: p.nome }));
}

// ---------- Bases ----------
export async function listBases(): Promise<BaseRow[]> {
  const { data, error } = await supabase.from('vw_bases').select('*').order('central', { ascending: false }).order('nome');
  if (error) throw new Error(error.message);
  return (data as any[]).map((b) => {
    const endereco = [b.logradouro, b.numero, b.complemento, b.bairro].filter(Boolean).join(', ');
    return {
      id: b.id, nome: b.nome, cidade: b.cidade ?? '—', uf: b.uf ?? '', resp: b.responsavel_nome ?? '—',
      responsavel_id: b.responsavel_id, central: b.central, prods: Number(b.num_produtos), itens: Number(b.itens_total),
      status: b.ativo ? 'Ativa' : 'Inativa', tone: (b.ativo ? 'success' : 'muted') as BadgeTone,
      cep: b.cep ?? null, logradouro: b.logradouro ?? null, numero: b.numero ?? null, complemento: b.complemento ?? null, bairro: b.bairro ?? null,
      endereco: endereco || '—',
    };
  });
}
export interface BaseInput {
  nome: string; cidade: string | null; uf: string | null; responsavel_id: string | null;
  cep?: string | null; logradouro?: string | null; numero?: string | null; complemento?: string | null; bairro?: string | null;
}
export async function createBase(b: BaseInput) {
  const { error } = await supabase.from('bases').insert(b);
  if (error) throw new Error(error.message);
}
export async function updateBase(id: string, b: Partial<BaseInput>) {
  const { error } = await supabase.from('bases').update(b).eq('id', id);
  if (error) throw new Error(error.message);
}
/** Inativa a base; bloqueia se ainda houver itens em estoque nela. */
export async function inativarBase(id: string): Promise<void> {
  const { data, error } = await supabase.from('estoque_lotes').select('quantidade').eq('base_id', id);
  if (error) throw new Error(error.message);
  const total = (data as any[]).reduce((s, l) => s + Number(l.quantidade), 0);
  if (total > 0) throw new Error('Base possui estoque. Zere ou transfira os itens antes de inativar.');
  const { error: e2 } = await supabase.from('bases').update({ ativo: false }).eq('id', id);
  if (e2) throw new Error(e2.message);
}
export async function listBaseOptions(): Promise<{ id: string; nome: string }[]> {
  const { data, error } = await supabase.from('bases').select('id, nome').eq('ativo', true).order('central', { ascending: false }).order('nome');
  if (error) throw new Error(error.message);
  return (data as any[]).map((b) => ({ id: b.id, nome: b.nome }));
}

// ---------- Estoque / Lotes ----------
export async function listLotes(baseId?: string): Promise<StockRow[]> {
  let q = supabase
    .from('estoque_lotes')
    .select('id, produto_id, base_id, lote, validade, quantidade, produto:produto_id(nome, categoria, estoque_min, estoque_max), base:base_id(nome)');
  if (baseId) q = q.eq('base_id', baseId);
  // Níveis por localização (sobrepõem o padrão do produto quando existirem).
  let nq = supabase.from('estoque_niveis').select('produto_id, base_id, estoque_min, estoque_max');
  if (baseId) nq = nq.eq('base_id', baseId);
  const [{ data, error }, { data: niveis }] = await Promise.all([q, nq]);
  if (error) throw new Error(error.message);
  const nivelMap = new Map<string, { min: number; max: number | null }>();
  (niveis as any[] | null)?.forEach((n) => nivelMap.set(`${n.produto_id}|${n.base_id}`, {
    min: Number(n.estoque_min), max: n.estoque_max == null ? null : Number(n.estoque_max),
  }));
  return (data as any[]).map((l) => {
    const prod = one<any>(l.produto);
    const base = one<any>(l.base);
    const nivel = nivelMap.get(`${l.produto_id}|${l.base_id}`);
    const min = nivel ? nivel.min : Number(prod?.estoque_min ?? 0);
    const max = nivel ? nivel.max : (prod?.estoque_max == null ? null : Number(prod.estoque_max));
    return {
      id: l.id, produto_id: l.produto_id, base_id: l.base_id, prod: prod?.nome ?? '—', cat: prod?.categoria ?? '—',
      lote: l.lote, val: mmYYYY(l.validade), validadeISO: l.validade, qtd: Number(l.quantidade),
      min, max: max ?? 0, loc: base?.nome ?? '—', alert: loteAlert(Number(l.quantidade), min, max, l.validade),
    };
  });
}

// ---------- Níveis por localização (mín/máx por produto × base) ----------
export interface NivelRow {
  produto_id: string;
  nome: string;
  min: number;         // efetivo (nível da base ou padrão do produto)
  max: number | null;
  custom: boolean;     // true = há nível específico para esta base
}
/** Produtos ativos com o nível efetivo (base ou padrão do produto) para uma base. */
export async function getNiveis(baseId: string): Promise<NivelRow[]> {
  const [{ data: prods, error }, { data: niveis }] = await Promise.all([
    supabase.from('produtos').select('id, nome, estoque_min, estoque_max').eq('ativo', true).order('nome'),
    supabase.from('estoque_niveis').select('produto_id, estoque_min, estoque_max').eq('base_id', baseId),
  ]);
  if (error) throw new Error(error.message);
  const nm = new Map<string, { min: number; max: number | null }>();
  (niveis as any[] | null)?.forEach((n) => nm.set(n.produto_id, { min: Number(n.estoque_min), max: n.estoque_max == null ? null : Number(n.estoque_max) }));
  return (prods as any[]).map((p) => {
    const custom = nm.get(p.id);
    return {
      produto_id: p.id, nome: p.nome,
      min: custom ? custom.min : Number(p.estoque_min ?? 0),
      max: custom ? custom.max : (p.estoque_max == null ? null : Number(p.estoque_max)),
      custom: !!custom,
    };
  });
}
export async function setNivel(produto_id: string, base_id: string, estoque_min: number, estoque_max: number | null) {
  const { error } = await supabase.from('estoque_niveis').upsert(
    { produto_id, base_id, estoque_min, estoque_max }, { onConflict: 'produto_id,base_id' },
  );
  if (error) throw new Error(error.message);
}
/** Remove o nível específico da base (volta a usar o padrão do produto). */
export async function limparNivel(produto_id: string, base_id: string) {
  const { error } = await supabase.from('estoque_niveis').delete().eq('produto_id', produto_id).eq('base_id', base_id);
  if (error) throw new Error(error.message);
}
/** Replica um nível (produto) para várias bases de destino. */
export async function replicarNivel(produto_id: string, estoque_min: number, estoque_max: number | null, base_ids: string[]) {
  if (!base_ids.length) return;
  const rows = base_ids.map((base_id) => ({ produto_id, base_id, estoque_min, estoque_max }));
  const { error } = await supabase.from('estoque_niveis').upsert(rows, { onConflict: 'produto_id,base_id' });
  if (error) throw new Error(error.message);
}

export async function listMovimentacoes(): Promise<MovRow[]> {
  const { data, error } = await supabase
    .from('movimentacoes')
    .select('id, tipo, quantidade, lote, descricao, created_at, produto:produto_id(nome)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data as any[]).map((m) => ({
    id: m.id,
    dt: new Date(m.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    tipo: movLabel[m.tipo] ?? m.tipo,
    prod: `${one<any>(m.produto)?.nome ?? '—'} · ${Number(m.quantidade)}`,
    descricao: m.descricao ?? '',
    tone: movTone[m.tipo] ?? 'muted',
  }));
}

/** Ajuste manual de saldo: cria movimentação e credita/debita o lote (usa/gera lote 'AJUSTE'). */
export async function ajusteEstoque(input: {
  produto_id: string; base_id: string; delta: number; motivo: string; observacao?: string; lote?: string;
}) {
  const lote = input.lote || 'AJUSTE';
  const { data: existing } = await supabase
    .from('estoque_lotes').select('id, quantidade').eq('produto_id', input.produto_id).eq('base_id', input.base_id).eq('lote', lote).maybeSingle();
  if (existing) {
    await supabase.from('estoque_lotes').update({ quantidade: Number((existing as any).quantidade) + input.delta }).eq('id', (existing as any).id);
  } else {
    await supabase.from('estoque_lotes').insert({ produto_id: input.produto_id, base_id: input.base_id, lote, quantidade: Math.max(0, input.delta) });
  }
  const { error } = await supabase.from('movimentacoes').insert({
    tipo: 'ajuste', produto_id: input.produto_id, quantidade: input.delta,
    base_origem_id: input.base_id, base_destino_id: input.base_id, lote,
    descricao: `Ajuste manual · ${input.motivo}${input.observacao ? ' · ' + input.observacao : ''}`,
    ator_id: await actorId(),
  });
  if (error) throw new Error(error.message);
}

export type TransferenciaStatus = 'em_transito' | 'recebida' | 'cancelada';
export const transfStatusTone: Record<TransferenciaStatus, BadgeTone> = {
  em_transito: 'info', recebida: 'success', cancelada: 'muted',
};
export const transfStatusLabel: Record<TransferenciaStatus, string> = {
  em_transito: 'Em trânsito', recebida: 'Recebida', cancelada: 'Cancelada',
};
export interface TransferenciaRow {
  id: string;
  codigo: string;
  produto_id: string;
  prod: string;
  origem: string;
  destino: string;
  base_destino_id: string;
  lote: string;
  validadeISO: string | null;
  enviada: number;
  recebida: number | null;
  status: TransferenciaStatus;
  divergencia: string | null;
  dt: string;
}

/**
 * Cria uma transferência Ecomax/Base → Base: abate o estoque da origem imediatamente
 * e registra como "em trânsito". O destino só é creditado na confirmação de recebimento.
 */
export async function criarTransferencia(input: {
  produto_id: string; base_origem_id: string; base_destino_id: string; lote: string; quantidade: number; motivo?: string;
}): Promise<string> {
  if (input.base_origem_id === input.base_destino_id) throw new Error('Origem e destino devem ser diferentes.');
  const { data: origem } = await supabase
    .from('estoque_lotes').select('id, quantidade, validade').eq('produto_id', input.produto_id).eq('base_id', input.base_origem_id).eq('lote', input.lote).maybeSingle();
  const disp = origem ? Number((origem as any).quantidade) : 0;
  if (disp < input.quantidade) throw new Error(`Saldo insuficiente na origem (disponível: ${disp}).`);
  await supabase.from('estoque_lotes').update({ quantidade: disp - input.quantidade }).eq('id', (origem as any).id);
  const validade = (origem as any).validade ?? null;
  const actor = await actorId();
  const { data, error } = await supabase.from('transferencias').insert({
    produto_id: input.produto_id, base_origem_id: input.base_origem_id, base_destino_id: input.base_destino_id,
    lote: input.lote, validade, quantidade_enviada: input.quantidade, motivo: input.motivo ?? null, ator_envio_id: actor,
  }).select('codigo').single();
  if (error) throw new Error(error.message);
  await supabase.from('movimentacoes').insert({
    tipo: 'transferencia', produto_id: input.produto_id, quantidade: input.quantidade,
    base_origem_id: input.base_origem_id, base_destino_id: input.base_destino_id, lote: input.lote,
    descricao: `Transferência ${(data as any).codigo} enviada (em trânsito)${input.motivo ? ' · ' + input.motivo : ''}`, ator_id: actor,
  });
  return (data as any).codigo as string;
}

export async function listTransferencias(status?: TransferenciaStatus): Promise<TransferenciaRow[]> {
  let q = supabase
    .from('transferencias')
    .select('id, codigo, produto_id, lote, validade, quantidade_enviada, quantidade_recebida, status, justificativa_divergencia, created_at, base_destino_id, produto:produto_id(nome), origem:base_origem_id(nome), destino:base_destino_id(nome)')
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data as any[]).map((t) => ({
    id: t.id, codigo: t.codigo, produto_id: t.produto_id, prod: one<any>(t.produto)?.nome ?? '—',
    origem: one<any>(t.origem)?.nome ?? '—', destino: one<any>(t.destino)?.nome ?? '—', base_destino_id: t.base_destino_id,
    lote: t.lote, validadeISO: t.validade, enviada: Number(t.quantidade_enviada),
    recebida: t.quantidade_recebida == null ? null : Number(t.quantidade_recebida),
    status: t.status, divergencia: t.justificativa_divergencia,
    dt: new Date(t.created_at).toLocaleDateString('pt-BR'),
  }));
}

/** Confirma o recebimento: credita o destino e fecha a transferência. Divergência exige justificativa. */
export async function confirmarRecebimentoTransferencia(input: {
  id: string; quantidade_recebida: number; justificativa?: string;
}) {
  const { data: t, error: e0 } = await supabase
    .from('transferencias').select('produto_id, base_destino_id, lote, validade, quantidade_enviada, status').eq('id', input.id).single();
  if (e0) throw new Error(e0.message);
  const tr = t as any;
  if (tr.status !== 'em_transito') throw new Error('Transferência não está em trânsito.');
  if (input.quantidade_recebida <= 0) throw new Error('Informe a quantidade recebida.');
  const divergente = input.quantidade_recebida !== Number(tr.quantidade_enviada);
  if (divergente && !input.justificativa?.trim()) throw new Error('Quantidade diverge da enviada: justificativa obrigatória.');

  const { data: destino } = await supabase
    .from('estoque_lotes').select('id, quantidade').eq('produto_id', tr.produto_id).eq('base_id', tr.base_destino_id).eq('lote', tr.lote).maybeSingle();
  if (destino) {
    await supabase.from('estoque_lotes').update({ quantidade: Number((destino as any).quantidade) + input.quantidade_recebida, validade: tr.validade }).eq('id', (destino as any).id);
  } else {
    await supabase.from('estoque_lotes').insert({ produto_id: tr.produto_id, base_id: tr.base_destino_id, lote: tr.lote, validade: tr.validade, quantidade: input.quantidade_recebida });
  }
  const actor = await actorId();
  const { error } = await supabase.from('transferencias').update({
    status: 'recebida', quantidade_recebida: input.quantidade_recebida,
    justificativa_divergencia: divergente ? input.justificativa!.trim() : null,
    ator_recebimento_id: actor, recebida_at: new Date().toISOString(),
  }).eq('id', input.id);
  if (error) throw new Error(error.message);
  await supabase.from('movimentacoes').insert({
    tipo: 'entrada', produto_id: tr.produto_id, quantidade: input.quantidade_recebida, base_destino_id: tr.base_destino_id,
    lote: tr.lote, descricao: `Recebimento de transferência${divergente ? ` · divergência (${input.quantidade_recebida}/${tr.quantidade_enviada})` : ''}`, ator_id: actor,
  });
}

/** Cancela uma transferência em trânsito, devolvendo o saldo à origem. */
export async function cancelarTransferencia(id: string) {
  const { data: t, error } = await supabase
    .from('transferencias').select('produto_id, base_origem_id, lote, quantidade_enviada, status').eq('id', id).single();
  if (error) throw new Error(error.message);
  const tr = t as any;
  if (tr.status !== 'em_transito') throw new Error('Só transferências em trânsito podem ser canceladas.');
  const { data: origem } = await supabase
    .from('estoque_lotes').select('id, quantidade').eq('produto_id', tr.produto_id).eq('base_id', tr.base_origem_id).eq('lote', tr.lote).maybeSingle();
  if (origem) {
    await supabase.from('estoque_lotes').update({ quantidade: Number((origem as any).quantidade) + Number(tr.quantidade_enviada) }).eq('id', (origem as any).id);
  } else {
    await supabase.from('estoque_lotes').insert({ produto_id: tr.produto_id, base_id: tr.base_origem_id, lote: tr.lote, quantidade: Number(tr.quantidade_enviada) });
  }
  const { error: e2 } = await supabase.from('transferencias').update({ status: 'cancelada' }).eq('id', id);
  if (e2) throw new Error(e2.message);
}

// ---------- Cotações ----------
export async function listCotacoes(): Promise<CotacaoRow[]> {
  const { data, error } = await supabase
    .from('cotacoes').select('id, codigo, quantidade, status, created_at, produto:produto_id(nome)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as any[]).map((c) => ({
    id: c.id, cod: c.codigo, prod: one<any>(c.produto)?.nome ?? '—', qtd: c.quantidade ?? '—',
    date: new Date(c.created_at).toLocaleDateString('pt-BR'),
    status: cotLabelMap[c.status] ?? c.status, statusKey: c.status, tone: cotToneMap[c.status] ?? 'muted',
  }));
}
export async function getCotacaoRespostas(cotacaoId: string): Promise<CotacaoResposta[]> {
  const { data, error } = await supabase
    .from('cotacao_respostas').select('id, fornecedor_id, valor, prazo, condicao, melhor, fornecedor:fornecedor_id(razao_social)')
    .eq('cotacao_id', cotacaoId).order('valor');
  if (error) throw new Error(error.message);
  return (data as any[]).map((r) => ({
    id: r.id, fornecedor_id: r.fornecedor_id, forn: one<any>(r.fornecedor)?.razao_social ?? '—',
    valor: r.valor == null ? null : Number(r.valor), prazo: r.prazo ?? '—', cond: r.condicao ?? '—', best: r.melhor,
  }));
}
export async function createCotacao(input: { produto_id: string; quantidade: string; fornecedor_ids: string[] }) {
  const { data, error } = await supabase.from('cotacoes').insert({ produto_id: input.produto_id, quantidade: input.quantidade }).select('id').single();
  if (error) throw new Error(error.message);
  if (input.fornecedor_ids.length) {
    await supabase.from('cotacao_respostas').insert(input.fornecedor_ids.map((fid) => ({ cotacao_id: (data as any).id, fornecedor_id: fid })));
  }
  return (data as any).id as string;
}
export async function registrarResposta(cotacaoId: string, r: { fornecedor_id: string; valor: number; prazo: string; condicao: string }) {
  // Atualiza a linha do fornecedor (criada ao abrir a cotação) se existir; senão insere.
  const { data: existing } = await supabase
    .from('cotacao_respostas').select('id').eq('cotacao_id', cotacaoId).eq('fornecedor_id', r.fornecedor_id).maybeSingle();
  if (existing) {
    const { error } = await supabase.from('cotacao_respostas').update(r).eq('id', (existing as any).id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('cotacao_respostas').insert({ cotacao_id: cotacaoId, ...r });
    if (error) throw new Error(error.message);
  }
  // Marca a melhor oferta (menor valor entre as respondidas) e atualiza o status da cotação.
  const respostas = await getCotacaoRespostas(cotacaoId);
  const answered = respostas.filter((x) => x.valor != null);
  if (answered.length) {
    const bestId = answered.reduce((a, b) => ((b.valor as number) < (a.valor as number) ? b : a)).id;
    await Promise.all(respostas.map((x) => supabase.from('cotacao_respostas').update({ melhor: x.id === bestId }).eq('id', x.id)));
    await supabase.from('cotacoes').update({ status: 'respondida' }).eq('id', cotacaoId).eq('status', 'aguardando');
  }
}
/** Aprova a cotação e gera uma requisição (nível 1) a partir da melhor resposta. */
export async function aprovarCotacao(cotacaoId: string): Promise<string> {
  const { data: cot } = await supabase.from('cotacoes').select('produto_id, quantidade').eq('id', cotacaoId).single();
  const respostas = await getCotacaoRespostas(cotacaoId);
  const best = respostas.find((r) => r.best) ?? respostas[0];
  await supabase.from('cotacoes').update({ status: 'aprovada' }).eq('id', cotacaoId);
  const { data, error } = await supabase.from('requisicoes').insert({
    produto_id: (cot as any)?.produto_id, fornecedor_id: best?.fornecedor_id ?? null,
    quantidade: (cot as any)?.quantidade, valor: best?.valor ?? null, solicitante_id: await actorId(),
  }).select('codigo').single();
  if (error) throw new Error(error.message);
  return (data as any).codigo as string;
}

// ---------- Requisições ----------
export async function listRequisicoes(): Promise<ReqRow[]> {
  const { data, error } = await supabase
    .from('requisicoes')
    .select('id, codigo, produto_id, quantidade, valor, status, nota_fiscal_url, aprovado_em, produto:produto_id(nome), fornecedor:fornecedor_id(razao_social), aprovador:aprovador_id(nome_completo)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as any[]).map((r) => ({
    id: r.id, cod: r.codigo, produto_id: r.produto_id, prod: one<any>(r.produto)?.nome ?? '—', qtd: r.quantidade ?? '—',
    forn: one<any>(r.fornecedor)?.razao_social ?? '—', valor: brl(r.valor == null ? null : Number(r.valor)),
    solic: '—', aprovador: one<any>(r.aprovador)?.nome_completo ?? '—',
    aprovadoEm: r.aprovado_em ? new Date(r.aprovado_em).toLocaleDateString('pt-BR') : null,
    status: r.status as ReqStatus, notaUrl: r.nota_fiscal_url,
  }));
}
export async function createRequisicao(input: { produto_id: string; fornecedor_id: string | null; quantidade: string; valor: number | null; aprovador_id: string | null }) {
  const { error } = await supabase.from('requisicoes').insert({ ...input, solicitante_id: await actorId() });
  if (error) throw new Error(error.message);
}
export async function setRequisicaoStatus(id: string, status: ReqStatus) {
  const { error } = await supabase.from('requisicoes').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}
/** Aprovação (nível 2): registra quem aprovou e quando, além de mudar o status. */
export async function aprovarRequisicao(id: string) {
  const { error } = await supabase.from('requisicoes')
    .update({ status: 'aprovada', aprovado_por: await actorId(), aprovado_em: new Date().toISOString() })
    .eq('id', id).eq('status', 'aguardando_aprovacao');
  if (error) throw new Error(error.message);
}
/** Recebe a requisição: dá entrada no estoque (Central) e marca como recebida. */
export async function receberRequisicao(input: {
  id: string; produto_id: string | null; base_id: string; lote: string; validade: string | null; quantidade: number; notaUrl?: string | null;
}) {
  if (input.produto_id) {
    const { data: existing } = await supabase
      .from('estoque_lotes').select('id, quantidade').eq('produto_id', input.produto_id).eq('base_id', input.base_id).eq('lote', input.lote).maybeSingle();
    if (existing) {
      await supabase.from('estoque_lotes').update({ quantidade: Number((existing as any).quantidade) + input.quantidade, validade: input.validade }).eq('id', (existing as any).id);
    } else {
      await supabase.from('estoque_lotes').insert({ produto_id: input.produto_id, base_id: input.base_id, lote: input.lote, validade: input.validade, quantidade: input.quantidade });
    }
    await supabase.from('movimentacoes').insert({
      tipo: 'entrada', produto_id: input.produto_id, quantidade: input.quantidade, base_destino_id: input.base_id,
      lote: input.lote, descricao: 'Entrada por recebimento de requisição', ator_id: await actorId(),
    });
  }
  const { error } = await supabase.from('requisicoes').update({ status: 'recebida', nota_fiscal_url: input.notaUrl ?? null }).eq('id', input.id);
  if (error) throw new Error(error.message);
}

export async function uploadNota(file: File, reqId: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
  const path = `${reqId}/nf-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('estoque-docs').upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw new Error(error.message);
  return path;
}

// ---------- Inventário físico ----------
export interface InventarioItem {
  id: string; produto_id: string; prod: string; lote: string; qtd_sistema: number; qtd_contada: number | null;
}
export interface Inventario {
  id: string; codigo: string; base_id: string; status: 'aberto' | 'fechado' | 'cancelado'; itens: InventarioItem[];
}

/** Inventário aberto de uma base (para retomar), com itens; null se não houver. */
export async function getInventarioAberto(baseId: string): Promise<Inventario | null> {
  const { data: inv } = await supabase
    .from('inventarios').select('id, codigo, base_id, status').eq('base_id', baseId).eq('status', 'aberto').maybeSingle();
  if (!inv) return null;
  const itens = await getInventarioItens((inv as any).id);
  return { ...(inv as any), itens };
}
async function getInventarioItens(inventarioId: string): Promise<InventarioItem[]> {
  const { data, error } = await supabase
    .from('inventario_itens').select('id, produto_id, lote, qtd_sistema, qtd_contada, produto:produto_id(nome)')
    .eq('inventario_id', inventarioId);
  if (error) throw new Error(error.message);
  return (data as any[]).map((i) => ({
    id: i.id, produto_id: i.produto_id, prod: one<any>(i.produto)?.nome ?? '—', lote: i.lote,
    qtd_sistema: Number(i.qtd_sistema), qtd_contada: i.qtd_contada == null ? null : Number(i.qtd_contada),
  })).sort((a, b) => a.prod.localeCompare(b.prod));
}

/** Inicia uma contagem: snapshot do estoque atual da base (opcionalmente só de produtos escolhidos). */
export async function iniciarInventario(baseId: string, produtoIds?: string[]): Promise<Inventario> {
  const existing = await getInventarioAberto(baseId);
  if (existing) return existing;
  let lotes = await listLotes(baseId);
  if (produtoIds && produtoIds.length) lotes = lotes.filter((l) => produtoIds.includes(l.produto_id));
  const { data: inv, error } = await supabase.from('inventarios').insert({ base_id: baseId, created_by: await actorId() }).select('id, codigo, base_id, status').single();
  if (error) throw new Error(error.message);
  const invId = (inv as any).id;
  if (lotes.length) {
    const rows = lotes.map((l) => ({ inventario_id: invId, produto_id: l.produto_id, lote: l.lote, lote_id: l.id, qtd_sistema: l.qtd }));
    const { error: e2 } = await supabase.from('inventario_itens').insert(rows);
    if (e2) throw new Error(e2.message);
  }
  return { ...(inv as any), itens: await getInventarioItens(invId) };
}

export async function registrarContagens(itens: { id: string; qtd_contada: number | null }[]) {
  for (const it of itens) {
    await supabase.from('inventario_itens').update({ qtd_contada: it.qtd_contada }).eq('id', it.id);
  }
}

/** Fecha o inventário: aplica ajustes (restritos à base) para itens com divergência. */
export async function fecharInventario(inventarioId: string): Promise<{ ajustes: number }> {
  const { data: inv, error: e0 } = await supabase.from('inventarios').select('id, base_id, status').eq('id', inventarioId).single();
  if (e0) throw new Error(e0.message);
  if ((inv as any).status !== 'aberto') throw new Error('Inventário não está aberto.');
  const baseId = (inv as any).base_id;
  const itens = await getInventarioItens(inventarioId);
  const actor = await actorId();
  let ajustes = 0;
  for (const it of itens) {
    if (it.qtd_contada == null || it.qtd_contada === it.qtd_sistema) continue;
    const delta = it.qtd_contada - it.qtd_sistema;
    // Ajusta o lote específico para a quantidade contada
    const { data: lote } = await supabase
      .from('estoque_lotes').select('id').eq('produto_id', it.produto_id).eq('base_id', baseId).eq('lote', it.lote).maybeSingle();
    if (lote) await supabase.from('estoque_lotes').update({ quantidade: it.qtd_contada }).eq('id', (lote as any).id);
    else await supabase.from('estoque_lotes').insert({ produto_id: it.produto_id, base_id: baseId, lote: it.lote, quantidade: it.qtd_contada });
    await supabase.from('movimentacoes').insert({
      tipo: 'ajuste', produto_id: it.produto_id, quantidade: delta, base_origem_id: baseId, base_destino_id: baseId, lote: it.lote,
      descricao: `Ajuste por inventário físico (${it.qtd_sistema}→${it.qtd_contada})`, ator_id: actor,
    });
    ajustes++;
  }
  const { error } = await supabase.from('inventarios').update({ status: 'fechado', closed_at: new Date().toISOString() }).eq('id', inventarioId);
  if (error) throw new Error(error.message);
  return { ajustes };
}

export async function cancelarInventario(inventarioId: string) {
  const { error } = await supabase.from('inventarios').update({ status: 'cancelado' }).eq('id', inventarioId).eq('status', 'aberto');
  if (error) throw new Error(error.message);
}

// ---------- KPIs ----------
export interface ProdutoKpis { ativos: number; abaixoMin: number; semForn: number; cotacoesAbertas: number; reqAprovar: number }
export async function getProdutoKpis(): Promise<ProdutoKpis> {
  const prods = await listProdutos();
  const [{ count: cotOpen }, { count: reqOpen }] = await Promise.all([
    supabase.from('cotacoes').select('id', { count: 'exact', head: true }).in('status', ['aguardando', 'respondida']),
    supabase.from('requisicoes').select('id', { count: 'exact', head: true }).eq('status', 'aguardando_aprovacao'),
  ]);
  return {
    ativos: prods.filter((p) => p.status === 'Ativo').length,
    abaixoMin: prods.filter((p) => p.alert === 'low').length,
    semForn: prods.filter((p) => p.noForn).length,
    cotacoesAbertas: cotOpen ?? 0,
    reqAprovar: reqOpen ?? 0,
  };
}

export const reqStatusText = (s: ReqStatus) => reqStatusLabel[s] ?? s;
