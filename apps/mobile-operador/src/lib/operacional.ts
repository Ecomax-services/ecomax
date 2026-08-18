import { supabase } from '@/lib/supabase';
import { caminhoOs, enviarBase64, enviarArquivoLocal } from '@/lib/uploads';

// ============================================================
// Status
// ============================================================
export type OsStatus = 'em_aberto' | 'em_andamento' | 'executada' | 'concluida' | 'cancelada';

/** Etiqueta + cores (fiéis ao catálogo status_os do back office). */
export const osTag: Record<OsStatus, { label: string; bg: string; fg: string }> = {
  em_aberto: { label: 'Em aberto', bg: '#e8eefc', fg: '#3056b5' },
  em_andamento: { label: 'Em andamento', bg: '#fdebd0', fg: '#b45309' },
  executada: { label: 'Executada', bg: '#d3f7d3', fg: '#155015' },
  concluida: { label: 'Concluída', bg: '#a3eba3', fg: '#0f3f0f' },
  cancelada: { label: 'Cancelada', bg: '#ffddd5', fg: '#a81400' },
};
export const isReadOnly = (s: OsStatus) => s === 'concluida' || s === 'cancelada';

// ============================================================
// Helpers
// ============================================================
async function actorId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
async function hist(osId: string, campo: string, anterior: string | null, novo: string | null): Promise<void> {
  await supabase.from('os_historico').insert({ os_id: osId, campo, valor_anterior: anterior, valor_novo: novo, actor_id: await actorId() });
}
export const brDate = (iso: string | null) => (iso ? iso.split('T')[0].split('-').reverse().join('/') : '—');
export const brTime = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—');
function composeEndereco(c: any): string {
  const linha = [c?.logradouro, c?.numero, c?.complemento, c?.bairro].filter(Boolean).join(', ');
  const cidade = [c?.cidade, c?.uf].filter(Boolean).join('/');
  return [linha, cidade].filter(Boolean).join(' - ') || '—';
}
const nomeOf = (c: any) => (Array.isArray(c) ? c[0]?.nome : c?.nome) ?? '—';

// ============================================================
// Lista de OS do operador (RLS já filtra para as minhas)
// ============================================================
export interface OsListItem {
  id: string; codigo: string; cliente: string; tipos: string; status: OsStatus;
  data: string; dataSort: string; hora: string;
}
export async function listMinhasOs(): Promise<OsListItem[]> {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select('id, codigo, status, data_programada, hora_prevista, tipos_servico, cliente:cliente_id(nome)')
    .order('data_programada', { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data as any[]).map((o) => ({
    id: o.id, codigo: o.codigo, cliente: nomeOf(o.cliente),
    tipos: (o.tipos_servico as string[] | null ?? []).join(', ') || '—',
    status: o.status, data: brDate(o.data_programada), dataSort: o.data_programada ?? '9999',
    hora: o.hora_prevista ?? '',
  }));
}

// ============================================================
// Detalhe da OS
// ============================================================
export interface OsProdutoItem {
  id: string; produto: string; codigo: string; unidade: string;
  recomendada: number; utilizada: number | null;
}
export interface CronogramaItem { id: string; data: string; status: string; }
export interface OsDetail {
  id: string; codigo: string; status: OsStatus; cliente: string; endereco: string;
  tipos: string; pragas: string; descricao: string; data: string; hora: string; duracao: string;
  necessitaRelatorio: boolean; assinaturaUrl: string | null;
  checkInAt: string | null; checkOutAt: string | null;
}
export async function getOs(id: string): Promise<OsDetail> {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select('*, cliente:cliente_id(nome, logradouro, numero, complemento, bairro, cidade, uf)')
    .eq('id', id).single();
  if (error) throw new Error(error.message);
  const o = data as any;
  const c = Array.isArray(o.cliente) ? o.cliente[0] : o.cliente;
  return {
    id: o.id, codigo: o.codigo, status: o.status, cliente: c?.nome ?? '—',
    endereco: o.endereco_execucao || composeEndereco(c),
    tipos: (o.tipos_servico ?? []).join(', ') || '—', pragas: (o.pragas ?? []).join(', ') || '—',
    descricao: o.descricao || o.observacoes || '—', data: brDate(o.data_programada),
    hora: o.hora_prevista ?? '—', duracao: o.duracao_estimada ?? '—',
    necessitaRelatorio: !!o.necessita_relatorio, assinaturaUrl: o.assinatura_url,
    checkInAt: o.check_in_at, checkOutAt: o.check_out_at,
  };
}
export async function listProdutos(osId: string): Promise<OsProdutoItem[]> {
  const { data, error } = await supabase
    .from('os_produtos').select('*, produto:produto_id(nome, codigo, unidade)').eq('os_id', osId).order('created_at');
  if (error) throw new Error(error.message);
  return (data as any[]).map((r) => {
    const p = Array.isArray(r.produto) ? r.produto[0] : r.produto;
    return {
      id: r.id, produto: p?.nome ?? '—', codigo: p?.codigo ?? '—', unidade: r.unidade ?? p?.unidade ?? '—',
      recomendada: Number(r.qtd_recomendada), utilizada: r.qtd_utilizada == null ? null : Number(r.qtd_utilizada),
    };
  });
}
export async function listCronograma(osId: string): Promise<CronogramaItem[]> {
  const { data, error } = await supabase.from('os_cronograma').select('*').eq('os_id', osId).order('ordem');
  if (error) throw new Error(error.message);
  return (data as any[]).map((r) => ({ id: r.id, data: brDate(r.data_prevista), status: r.status }));
}

// ============================================================
// Captura em campo
// ============================================================
export async function registrarCheckIn(osId: string, statusAtual: OsStatus): Promise<void> {
  const patch: Record<string, unknown> = { check_in_at: new Date().toISOString() };
  if (statusAtual === 'em_aberto') patch.status = 'em_andamento';
  const { error } = await supabase.from('ordens_servico').update(patch).eq('id', osId);
  if (error) throw new Error(error.message);
  await hist(osId, 'Check-in (app)', null, brTime(patch.check_in_at as string));
  if (patch.status) await hist(osId, 'Status', osTag.em_aberto.label, osTag.em_andamento.label);
}
export async function registrarCheckOut(osId: string): Promise<void> {
  const ts = new Date().toISOString();
  const { error } = await supabase.from('ordens_servico').update({ check_out_at: ts }).eq('id', osId);
  if (error) throw new Error(error.message);
  await hist(osId, 'Check-out (app)', null, brTime(ts));
}
export async function salvarConsumo(osId: string, itemId: string, qtd: number | null): Promise<void> {
  const { data: before } = await supabase.from('os_produtos').select('qtd_utilizada').eq('id', itemId).single();
  const { error } = await supabase.from('os_produtos').update({ qtd_utilizada: qtd }).eq('id', itemId);
  if (error) throw new Error(error.message);
  await hist(osId, 'Consumo (app)', (before as any)?.qtd_utilizada?.toString() ?? null, qtd?.toString() ?? null);
}
/**
 * Grava a assinatura do cliente.
 *
 * Recebe a imagem em base64 vinda do quadro de assinatura. O arquivo sobe
 * primeiro e só depois a OS é atualizada: se o upload falhar, `assinatura_url`
 * continua nula e `marcarExecutada` continua barrando a finalização — que é
 * exatamente o comportamento desejado.
 *
 * Até aqui esta função inventava um caminho (`app/assinatura-<ts>.png`) sem
 * enviar arquivo nenhum. A regra "assinatura obrigatória para executar" existia
 * na aparência e era satisfeita por uma string.
 */
export async function confirmarAssinatura(osId: string, base64: string): Promise<void> {
  const caminho = await enviarBase64(caminhoOs(osId, 'assinatura', 'assinatura.png'), base64, 'image/png');
  const { error } = await supabase.from('ordens_servico').update({ assinatura_url: caminho }).eq('id', osId);
  if (error) throw new Error(error.message);
  await hist(osId, 'Assinatura do cliente coletada (app)', null, 'Coletada');
}

/**
 * Anexa uma foto da execução.
 *
 * Mesma ordem: o arquivo sobe antes da linha em os_anexos. Antes daqui a linha
 * era inserida com `arquivo_url` nulo, então a foto aparecia na lista e não
 * existia em lugar nenhum.
 */
export async function registrarFoto(osId: string, uri: string, nome: string): Promise<void> {
  const contentType = nome.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  const caminho = await enviarArquivoLocal(caminhoOs(osId, 'foto', nome), uri, contentType);
  const { error } = await supabase
    .from('os_anexos')
    .insert({ os_id: osId, nome, tipo: 'foto', arquivo_url: caminho, created_by: await actorId() });
  if (error) throw new Error(error.message);
  await hist(osId, 'Foto anexada (app)', null, nome);
}
/** Regra: assinatura do cliente é obrigatória para marcar como executada. */
export async function marcarExecutada(osId: string): Promise<void> {
  const { data } = await supabase.from('ordens_servico').select('assinatura_url, status').eq('id', osId).single();
  const row = data as any;
  if (isReadOnly(row?.status)) throw new Error('OS já finalizada.');
  if (!row?.assinatura_url) throw new Error('Colete a assinatura do cliente antes de finalizar.');
  const { error } = await supabase.from('ordens_servico').update({ status: 'executada' }).eq('id', osId);
  if (error) throw new Error(error.message);
  await hist(osId, 'Status', osTag[row.status as OsStatus]?.label ?? row.status, osTag.executada.label);
}

// ============================================================
// Agenda (próximas datas das minhas OS + cronograma)
// ============================================================
export interface AgendaItem { key: string; osId: string; codigo: string; cliente: string; data: string; dataSort: string; tipo: string; recorrente: boolean; }
export async function listAgenda(): Promise<AgendaItem[]> {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select('id, codigo, data_programada, tipos_servico, status, cliente:cliente_id(nome), crono:os_cronograma(id, data_prevista, status)')
    .neq('status', 'cancelada');
  if (error) throw new Error(error.message);
  const out: AgendaItem[] = [];
  for (const o of data as any[]) {
    const cliente = nomeOf(o.cliente);
    const tipo = (o.tipos_servico as string[] | null ?? []).join(', ') || '—';
    if (o.data_programada) out.push({ key: `${o.id}-base`, osId: o.id, codigo: o.codigo, cliente, data: brDate(o.data_programada), dataSort: o.data_programada, tipo, recorrente: false });
    for (const c of (o.crono as any[] | null ?? [])) {
      if (c.status !== 'cancelada') out.push({ key: `${o.id}-${c.id}`, osId: o.id, codigo: o.codigo, cliente, data: brDate(c.data_prevista), dataSort: c.data_prevista, tipo, recorrente: true });
    }
  }
  return out.sort((a, b) => a.dataSort.localeCompare(b.dataSort));
}
