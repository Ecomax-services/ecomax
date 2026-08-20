import { supabase } from '@/lib/supabase';
import type { Json } from '@/lib/database.types';
import type { BadgeTone } from '@/components/ui/Badge';

// ============================================================
// Helpers
// ============================================================
async function actorId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function audit(acao: string, detalhes?: Json): Promise<void> {
  await supabase.from('auditoria').insert({
    actor_id: await actorId(), funcionario_id: null, modulo: 'comercial', acao, detalhes: detalhes ?? null,
  });
}

export const hojeIso = () => new Date().toISOString().slice(0, 10);
export const brDate = (iso: string | null) => (iso ? iso.split('T')[0].split('-').reverse().join('/') : '—');
export const brDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const nomeDe = (c: unknown): string => {
  const o = Array.isArray(c) ? c[0] : c;
  return (o as { nome?: string })?.nome ?? '—';
};

/** Dias entre hoje e a data, negativo quando já passou. */
export function diasAte(iso: string | null): number | null {
  if (!iso) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const d = new Date(`${iso.split('T')[0]}T00:00:00`);
  return Math.round((d.getTime() - hoje.getTime()) / 86_400_000);
}

// ============================================================
// Status (catálogos)
// ============================================================
export const FUP_STATUS = ['Em espera', 'Concluído', 'Cancelado'] as const;
export type FupStatus = (typeof FUP_STATUS)[number];

export const fupTone: Record<string, BadgeTone> = {
  'Em espera': 'warn',
  'Concluído': 'success',
  'Cancelado': 'danger',
};

/** Os 8 estágios do sistema atual, preservados. A ordem é a do Discovery. */
export const GARANTIA_STATUS = [
  'Em vigor', 'A renovar', 'Renovado', 'Renovação Recusada',
  'Aguardando Retorno', 'Novo Orçamento', 'Enviado E-mail', 'Não Aplicável',
] as const;
export type GarantiaStatus = (typeof GARANTIA_STATUS)[number];

export const garantiaTone: Record<string, BadgeTone> = {
  'Em vigor': 'success',
  'A renovar': 'warn',
  'Renovado': 'successStrong',
  'Renovação Recusada': 'danger',
  'Aguardando Retorno': 'info',
  'Novo Orçamento': 'info',
  'Enviado E-mail': 'muted',
  'Não Aplicável': 'muted',
};

/** Garantia nestes estágios é somente leitura (regra do Discovery). */
export const GARANTIA_READONLY: string[] = ['Renovado', 'Não Aplicável'];
export const isGarantiaReadOnly = (s: string) => GARANTIA_READONLY.includes(s);

/** Mudar para estes exige comentário. */
export const GARANTIA_EXIGE_COMENTARIO: string[] = ['Renovação Recusada', 'Não Aplicável'];

/** "Gerar Link só é permitido quando a Garantia está 'A renovar' ou 'Aguardando Retorno'." */
export const podeGerarLink = (s: string) => s === 'A renovar' || s === 'Aguardando Retorno';

// ============================================================
// 5.1 Follow-ups
// ============================================================
export interface FollowUpRow {
  id: string;
  clienteId: string;
  cliente: string;
  orcamentoId: string | null;
  orcamento: string;
  dataRegistro: string;
  dataAcao: string;
  dataAcaoBr: string;
  dataRegistroBr: string;
  status: string;
  descricao: string;
  responsavelId: string | null;
  responsavel: string;
  anexos: number;
  /** Data de ação já passou e ainda está em espera. */
  emAtraso: boolean;
  /** Vence hoje ou antes — a lista destaca a linha. */
  doDia: boolean;
}

export type FupAba = 'hoje' | 'atraso' | 'proximos7' | 'todos';

function toFup(r: any): FollowUpRow {
  const dias = diasAte(r.data_acao);
  const emEspera = r.status === 'Em espera';
  return {
    id: r.id,
    clienteId: r.cliente_id,
    cliente: nomeDe(r.cliente),
    orcamentoId: r.orcamento_id,
    orcamento: (Array.isArray(r.orcamento) ? r.orcamento[0]?.codigo : r.orcamento?.codigo) ?? '—',
    dataRegistro: r.data_registro,
    dataAcao: r.data_acao,
    dataRegistroBr: brDate(r.data_registro),
    dataAcaoBr: brDate(r.data_acao),
    status: r.status,
    descricao: r.descricao ?? '',
    responsavelId: r.responsavel_id,
    responsavel: (Array.isArray(r.responsavel) ? r.responsavel[0]?.nome_completo : r.responsavel?.nome_completo) ?? '—',
    anexos: r.anexos?.[0]?.count ?? 0,
    emAtraso: emEspera && dias !== null && dias < 0,
    doDia: emEspera && dias !== null && dias <= 0,
  };
}

const FUP_SELECT =
  'id, cliente_id, orcamento_id, data_registro, data_acao, status, descricao, responsavel_id, ' +
  'cliente:cliente_id(nome), orcamento:orcamento_id(codigo), responsavel:responsavel_id(nome_completo), ' +
  'anexos:comercial_fup_anexos(count)';

export async function listFollowUps(): Promise<FollowUpRow[]> {
  const { data, error } = await supabase
    .from('comercial_follow_ups')
    .select(FUP_SELECT)
    .order('data_acao', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as any[]).map(toFup);
}

/** Recorte da aba. Feito em memória: a lista de FUP é operacional do dia, não histórico. */
export function filtrarPorAba(rows: FollowUpRow[], aba: FupAba): FollowUpRow[] {
  if (aba === 'todos') return rows;
  const hoje = hojeIso();
  if (aba === 'hoje') return rows.filter((r) => r.dataAcao === hoje);
  if (aba === 'atraso') return rows.filter((r) => r.emAtraso);
  const limite = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  return rows.filter((r) => r.dataAcao >= hoje && r.dataAcao <= limite);
}

export interface FollowUpInput {
  cliente_id: string;
  orcamento_id: string | null;
  data_registro: string;
  data_acao: string;
  status: string;
  descricao: string;
  responsavel_id: string | null;
}

/**
 * Traduz as violações de constraint para linguagem humana.
 *
 * O Discovery é explícito quanto a isto: "Mensagens de erro sempre em linguagem
 * humana, indicando o campo e o problema. Proibido exibir códigos crípticos".
 */
function traduzErroFup(msg: string): string {
  if (msg.includes('fup_concluido_exige_descricao')) {
    return 'Descreva o que foi feito antes de concluir o follow-up.';
  }
  if (msg.includes('fup_acao_depois_do_registro')) {
    return 'A data de ação não pode ser anterior à data de registro.';
  }
  return msg;
}

export async function criarFollowUp(input: FollowUpInput): Promise<string> {
  // "Não permitir Data Ação no passado ao criar FUP novo." Só na criação — a
  // edição de um FUP existente pode legitimamente ter data passada.
  if (input.data_acao < hojeIso()) {
    throw new Error('A data de ação não pode ser anterior a hoje em um follow-up novo.');
  }
  const { data, error } = await supabase
    .from('comercial_follow_ups')
    .insert({ ...input, created_by: await actorId() })
    .select('id')
    .single();
  if (error) throw new Error(traduzErroFup(error.message));
  await audit('follow_up_criado', { id: data.id, cliente_id: input.cliente_id });
  return data.id;
}

export async function atualizarFollowUp(id: string, input: Partial<FollowUpInput>): Promise<void> {
  const { error } = await supabase.from('comercial_follow_ups').update(input).eq('id', id);
  if (error) throw new Error(traduzErroFup(error.message));
  await audit('follow_up_editado', { id });
}

export async function excluirFollowUp(id: string, motivo: string): Promise<void> {
  if (!motivo.trim()) throw new Error('Informe o motivo da exclusão.');
  // A auditoria vem antes: depois do delete a linha já não existe para ser
  // descrita, e o motivo é justamente o que se quer preservar.
  await audit('follow_up_excluido', { id, motivo });
  const { error } = await supabase.from('comercial_follow_ups').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Duplicar: mesma pessoa, mesmo assunto, nova data. */
export async function duplicarFollowUp(id: string): Promise<string> {
  const { data, error } = await supabase
    .from('comercial_follow_ups')
    .select('cliente_id, orcamento_id, descricao, responsavel_id')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  const hoje = hojeIso();
  return criarFollowUp({
    cliente_id: data.cliente_id,
    orcamento_id: data.orcamento_id,
    data_registro: hoje,
    data_acao: hoje,
    status: 'Em espera',
    descricao: data.descricao ?? '',
    responsavel_id: data.responsavel_id,
  });
}

// ---- Anexos do FUP ----
export interface AnexoRow {
  id: string; nome: string; tipo: string; tamanho: string; arquivoUrl: string | null;
  autor: string; criadoEm: string;
}

const tamanhoBr = (b: number | null) => {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

export async function listFupAnexos(followUpId: string): Promise<AnexoRow[]> {
  const { data, error } = await supabase
    .from('comercial_fup_anexos')
    .select('id, nome, tipo, tamanho_bytes, arquivo_url, created_at')
    .eq('follow_up_id', followUpId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as any[]).map((a) => ({
    id: a.id, nome: a.nome, tipo: a.tipo ?? 'outro', tamanho: tamanhoBr(a.tamanho_bytes),
    arquivoUrl: a.arquivo_url, autor: '—', criadoEm: brDateTime(a.created_at),
  }));
}

export async function listGarantiaAnexos(garantiaId: string): Promise<AnexoRow[]> {
  const { data, error } = await supabase
    .from('comercial_garantia_anexos')
    .select('id, nome, tipo, tamanho_bytes, arquivo_url, created_at')
    .eq('garantia_id', garantiaId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as any[]).map((a) => ({
    id: a.id, nome: a.nome, tipo: a.tipo ?? 'Outro', tamanho: tamanhoBr(a.tamanho_bytes),
    arquivoUrl: a.arquivo_url, autor: '—', criadoEm: brDateTime(a.created_at),
  }));
}

export async function renomearAnexo(tabela: 'fup' | 'garantia', id: string, nome: string): Promise<void> {
  const t = tabela === 'fup' ? 'comercial_fup_anexos' : 'comercial_garantia_anexos';
  const { error } = await supabase.from(t).update({ nome }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function excluirAnexo(tabela: 'fup' | 'garantia', id: string): Promise<void> {
  const t = tabela === 'fup' ? 'comercial_fup_anexos' : 'comercial_garantia_anexos';
  const { error } = await supabase.from(t).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ============================================================
// 5.2 Garantias
// ============================================================
export interface GarantiaRow {
  id: string;
  osId: string;
  osCodigo: string;
  clienteId: string;
  cliente: string;
  abc: string | null;
  dataExecucao: string;
  dataValidade: string;
  dataValidadeIso: string;
  status: string;
  diasRestantes: number | null;
  dataContato: string;
  temLink: boolean;
}

function toGarantia(r: any): GarantiaRow {
  return {
    id: r.id,
    osId: r.os_id,
    osCodigo: (Array.isArray(r.os) ? r.os[0]?.codigo : r.os?.codigo) ?? '—',
    clienteId: r.cliente_id,
    cliente: nomeDe(r.cliente),
    abc: (Array.isArray(r.cliente) ? r.cliente[0]?.classificacao_abc : r.cliente?.classificacao_abc) ?? null,
    dataExecucao: brDate(r.data_execucao),
    dataValidade: brDate(r.data_validade),
    dataValidadeIso: r.data_validade,
    status: r.status,
    diasRestantes: diasAte(r.data_validade),
    dataContato: brDate(r.data_contato_renovacao),
    temLink: (r.links?.[0]?.count ?? 0) > 0,
  };
}

const GARANTIA_SELECT =
  'id, os_id, cliente_id, data_execucao, data_validade, status, data_contato_renovacao, ' +
  'os:os_id(codigo), cliente:cliente_id(nome, classificacao_abc), links:comercial_garantia_links(count)';

export type GarantiaAba = 'todas' | 'vencendo' | 'aguardando';

export interface ListGarantiasOpts {
  aba?: GarantiaAba;
  busca?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Lista de garantias com paginação no servidor.
 *
 * Obrigatório pelo Discovery: são ~9 mil registros hoje, e trazer tudo para
 * filtrar no navegador seria alguns megabytes por abertura de tela.
 */
export async function listGarantias(
  opts: ListGarantiasOpts = {},
): Promise<{ rows: GarantiaRow[]; total: number }> {
  const { aba = 'todas', busca, status, page = 1, pageSize = 25 } = opts;
  let q = supabase.from('comercial_garantias').select(GARANTIA_SELECT, { count: 'exact' });

  if (aba === 'vencendo') {
    // "Alerta automático 60 dias antes do vencimento."
    const limite = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);
    q = q.lte('data_validade', limite).gte('data_validade', hojeIso());
  } else if (aba === 'aguardando') {
    q = q.eq('status', 'Aguardando Retorno');
  }
  if (status && status !== 'todos') q = q.eq('status', status);

  const from = (page - 1) * pageSize;
  const { data, count, error } = await q.order('data_validade').range(from, from + pageSize - 1);
  if (error) throw new Error(error.message);

  let rows = (data as any[]).map(toGarantia);
  // A busca é por nome do cliente e código da OS, que vivem em tabelas
  // relacionadas — o PostgREST não filtra por elas num `or` simples, então o
  // recorte acontece sobre a página já paginada.
  if (busca?.trim()) {
    const s = busca.trim().toLowerCase();
    rows = rows.filter((r) => `${r.osCodigo} ${r.cliente}`.toLowerCase().includes(s));
  }
  return { rows, total: count ?? 0 };
}

export async function getGarantia(id: string): Promise<GarantiaRow | null> {
  const { data, error } = await supabase.from('comercial_garantias').select(GARANTIA_SELECT).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toGarantia(data) : null;
}

/**
 * Muda o status da garantia e registra na linha do tempo.
 *
 * As duas coisas andam juntas de propósito: "toda alteração de status é
 * registrada", e um histórico que depende de o chamador lembrar de gravar
 * deixa de ser histórico.
 */
export async function mudarStatusGarantia(
  id: string,
  novo: string,
  comentario: string,
): Promise<void> {
  const { data: atual, error: e1 } = await supabase
    .from('comercial_garantias').select('status').eq('id', id).single();
  if (e1) throw new Error(e1.message);

  if (isGarantiaReadOnly(atual.status)) {
    throw new Error(`Garantia com status "${atual.status}" é somente leitura.`);
  }
  if (GARANTIA_EXIGE_COMENTARIO.includes(novo) && !comentario.trim()) {
    throw new Error(`Explique o motivo para mudar o status para "${novo}".`);
  }

  const { error } = await supabase.from('comercial_garantias').update({ status: novo }).eq('id', id);
  if (error) throw new Error(error.message);

  await supabase.from('comercial_garantia_historico').insert({
    garantia_id: id, campo: 'Status', valor_anterior: atual.status, valor_novo: novo,
    comentario: comentario.trim() || null, actor_id: await actorId(),
  });
  await audit('garantia_status_alterado', { id, de: atual.status, para: novo });
}

export interface HistoricoGarantia {
  id: string; campo: string; anterior: string; novo: string; comentario: string; quando: string;
}

export async function listHistoricoGarantia(id: string): Promise<HistoricoGarantia[]> {
  const { data, error } = await supabase
    .from('comercial_garantia_historico')
    .select('id, campo, valor_anterior, valor_novo, comentario, created_at')
    .eq('garantia_id', id)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as any[]).map((h) => ({
    id: h.id, campo: h.campo, anterior: h.valor_anterior ?? '—', novo: h.valor_novo ?? '—',
    comentario: h.comentario ?? '', quando: brDateTime(h.created_at),
  }));
}

export async function listServicosGarantia(id: string): Promise<{ id: string; tipo: string; observacao: string }[]> {
  const { data, error } = await supabase
    .from('comercial_garantia_servicos').select('id, tipo_servico, observacao').eq('garantia_id', id).order('tipo_servico');
  if (error) throw new Error(error.message);
  return (data as any[]).map((s) => ({ id: s.id, tipo: s.tipo_servico, observacao: s.observacao ?? '' }));
}

export async function addServicoGarantia(garantiaId: string, tipo: string): Promise<void> {
  const { error } = await supabase.from('comercial_garantia_servicos').insert({ garantia_id: garantiaId, tipo_servico: tipo });
  if (error) throw new Error(error.message.includes('duplicate') ? 'Este serviço já está na garantia.' : error.message);
}

export async function removeServicoGarantia(id: string): Promise<void> {
  const { error } = await supabase.from('comercial_garantia_servicos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---- Link público ----
export interface LinkGarantia {
  id: string; token: string; url: string; expiraEm: string; abertoEm: string;
  respondidoEm: string; resposta: string; revogado: boolean;
}

/**
 * Endereço do link que vai para o cliente.
 *
 * A tela pública vive no Portal, não no Backoffice. Sem VITE_PORTAL_URL o link
 * cairia na origem do próprio Backoffice, onde o cliente não tem acesso — daí
 * o aviso no console em vez de um fallback silencioso que parece funcionar.
 */
const urlPublica = (token: string) => {
  const base = import.meta.env.VITE_PORTAL_URL;
  if (!base) console.warn('VITE_PORTAL_URL não configurada; o link público apontará para o Backoffice.');
  return `${base ?? window.location.origin}/garantia/${token}`;
};

export async function listLinksGarantia(garantiaId: string): Promise<LinkGarantia[]> {
  const { data, error } = await supabase
    .from('comercial_garantia_links')
    .select('id, token, expira_em, aberto_em, respondido_em, resposta, revogado')
    .eq('garantia_id', garantiaId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as any[]).map((l) => ({
    id: l.id, token: l.token, url: urlPublica(l.token),
    expiraEm: brDateTime(l.expira_em), abertoEm: brDateTime(l.aberto_em),
    respondidoEm: brDateTime(l.respondido_em), resposta: l.resposta ?? '—', revogado: l.revogado,
  }));
}

/**
 * Gera o link público de renovação.
 *
 * O token é aleatório de 32 bytes, e não o id da garantia: o endereço vai por
 * e-mail para fora e não deve permitir adivinhar ou enumerar outras garantias.
 */
export async function gerarLinkGarantia(garantiaId: string, statusAtual: string, dias = 30): Promise<LinkGarantia> {
  if (!podeGerarLink(statusAtual)) {
    throw new Error('O link só pode ser gerado quando a garantia está "A renovar" ou "Aguardando Retorno".');
  }
  if (dias < 1 || dias > 90) throw new Error('A validade do link deve ficar entre 1 e 90 dias.');

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

  const { data, error } = await supabase
    .from('comercial_garantia_links')
    .insert({
      garantia_id: garantiaId,
      token,
      expira_em: new Date(Date.now() + dias * 86_400_000).toISOString(),
      created_by: await actorId(),
    })
    .select('id, token, expira_em, aberto_em, respondido_em, resposta, revogado')
    .single();
  if (error) throw new Error(error.message);
  await audit('garantia_link_gerado', { garantia_id: garantiaId, dias });
  return {
    id: data.id, token: data.token, url: urlPublica(data.token),
    expiraEm: brDateTime(data.expira_em), abertoEm: '—', respondidoEm: '—', resposta: '—', revogado: false,
  };
}

export async function revogarLink(id: string): Promise<void> {
  const { error } = await supabase.from('comercial_garantia_links').update({ revogado: true }).eq('id', id);
  if (error) throw new Error(error.message);
  await audit('garantia_link_revogado', { id });
}

// ============================================================
// 5.1.3 Filtros salvos
// ============================================================
export interface RegraFiltro { campo: string; operador: string; valor: string; juncao: 'E' | 'OU' }

export interface FiltroSalvo {
  id: string; nome: string; categoria: string; visibilidade: 'pessoal' | 'global';
  regras: RegraFiltro[]; favorito: boolean; meu: boolean;
}

export const OPERADORES = ['igual', 'contém', 'maior que', 'menor que', 'vazio', 'não vazio'] as const;

export async function listFiltros(modulo: string): Promise<FiltroSalvo[]> {
  const uid = await actorId();
  const { data, error } = await supabase
    .from('filtros_salvos')
    .select('id, nome, categoria, visibilidade, regras, favorito, created_by')
    .eq('modulo', modulo)
    .order('favorito', { ascending: false })
    .order('nome');
  if (error) throw new Error(error.message);
  return (data as any[]).map((f) => ({
    id: f.id, nome: f.nome, categoria: f.categoria ?? '—', visibilidade: f.visibilidade,
    regras: (f.regras as RegraFiltro[]) ?? [], favorito: f.favorito, meu: f.created_by === uid,
  }));
}

export async function salvarFiltro(
  modulo: string,
  f: { nome: string; categoria: string; visibilidade: 'pessoal' | 'global'; regras: RegraFiltro[] },
): Promise<void> {
  if (!f.nome.trim()) throw new Error('Dê um nome ao filtro.');
  if (f.regras.length === 0) throw new Error('Um filtro precisa de ao menos uma regra.');
  const { error } = await supabase.from('filtros_salvos').insert({
    modulo, nome: f.nome.trim(), categoria: f.categoria.trim() || null,
    visibilidade: f.visibilidade, regras: f.regras as unknown as Json, created_by: await actorId(),
  });
  if (error) throw new Error(error.message);
}

export async function alternarFavorito(id: string, favorito: boolean): Promise<void> {
  const { error } = await supabase.from('filtros_salvos').update({ favorito }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function excluirFiltro(id: string): Promise<void> {
  const { error } = await supabase.from('filtros_salvos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Aplica as regras do filtro sobre uma lista já carregada. */
export function aplicarRegras<T extends Record<string, unknown>>(rows: T[], regras: RegraFiltro[]): T[] {
  if (!regras.length) return rows;
  return rows.filter((r) =>
    regras.reduce<boolean | null>((acc, reg, i) => {
      const v = String(r[reg.campo as keyof T] ?? '').toLowerCase();
      const alvo = reg.valor.toLowerCase();
      let bate: boolean;
      switch (reg.operador) {
        case 'igual': bate = v === alvo; break;
        case 'contém': bate = v.includes(alvo); break;
        case 'maior que': bate = v > alvo; break;
        case 'menor que': bate = v < alvo; break;
        case 'vazio': bate = v === ''; break;
        case 'não vazio': bate = v !== ''; break;
        default: bate = true;
      }
      if (i === 0 || acc === null) return bate;
      // A junção pertence à regra que ela precede, como o builder monta.
      return reg.juncao === 'OU' ? acc || bate : acc && bate;
    }, null) ?? true,
  );
}

// ============================================================
// Hub — indicadores
// ============================================================
export interface ResumoComercial {
  fupsHoje: number;
  fupsAtraso: number;
  garantiasVencendo: number;
  garantiasAguardando: number;
}

export async function getResumoComercial(): Promise<ResumoComercial> {
  const hoje = hojeIso();
  const em60 = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);
  const conta = (q: any) => q.then((r: any) => r.count ?? 0);

  const [fupsHoje, fupsAtraso, vencendo, aguardando] = await Promise.all([
    conta(supabase.from('comercial_follow_ups').select('id', { count: 'exact', head: true })
      .eq('data_acao', hoje).eq('status', 'Em espera')),
    conta(supabase.from('comercial_follow_ups').select('id', { count: 'exact', head: true })
      .lt('data_acao', hoje).eq('status', 'Em espera')),
    // Só 'Em vigor': uma garantia já Renovada, Expirada ou Recusada não está
    // "vencendo" — o assunto foi resolvido. Contá-la manda o comercial cobrar
    // um cliente que já respondeu. É o mesmo recorte da rotina que marca
    // "A renovar" no banco (garantias_marcar_a_renovar), que sempre filtrou.
    conta(supabase.from('comercial_garantias').select('id', { count: 'exact', head: true })
      .eq('status', 'Em vigor')
      .gte('data_validade', hoje).lte('data_validade', em60)),
    conta(supabase.from('comercial_garantias').select('id', { count: 'exact', head: true })
      .eq('status', 'Aguardando Retorno')),
  ]);
  return { fupsHoje, fupsAtraso, garantiasVencendo: vencendo, garantiasAguardando: aguardando };
}
