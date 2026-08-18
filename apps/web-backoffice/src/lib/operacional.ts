import { supabase } from '@/lib/supabase';
import type { BadgeTone } from '@/components/ui/Badge';
import { listProdutos, listBases, type Produto } from '@/lib/estoque';
import { listCatalogoAtivos } from '@/lib/configuracoes';
import { criarNotificacao } from '@/lib/notificacoes';

// ============================================================
// Helpers
// ============================================================
async function actorId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Auditoria do módulo Operacional (trilha administrativa, reusa a tabela `auditoria`). */
async function audit(acao: string, detalhes?: unknown): Promise<void> {
  await supabase.from('auditoria').insert({
    actor_id: await actorId(), funcionario_id: null, modulo: 'operacional', acao, detalhes: detalhes ?? null,
  });
}

/**
 * Notificação (stub). A infra de push/e-mail/portal é adiada (mesma política do módulo Clientes):
 * registramos o evento na auditoria e devolvemos o texto para exibição via toast.
 */
export async function notify(evento: string, detalhe?: unknown): Promise<void> {
  await audit(`notificacao:${evento}`, detalhe);
}

/** Cria notificações "OS" para os funcionários vinculados que possuem login (app do operador). */
async function notificarFuncionarios(funcionarioIds: string[], osId: string, titulo: string, descricao: string): Promise<void> {
  if (!funcionarioIds.length) return;
  const { data } = await supabase.from('funcionarios').select('id, profile_id').in('id', funcionarioIds);
  for (const f of ((data as any[] | null) ?? [])) {
    if (f.profile_id) await criarNotificacao({ paraProfileId: f.profile_id, tipo: 'os', titulo, descricao, osId });
  }
}

/** Grava uma linha de histórico por-campo (4.1.f). Toda alteração de OS passa por aqui. */
async function hist(osId: string, campo: string, anterior: string | null, novo: string | null): Promise<void> {
  await supabase.from('os_historico').insert({
    os_id: osId, campo, valor_anterior: anterior, valor_novo: novo, actor_id: await actorId(),
  });
}

const brDate = (iso: string | null) => (iso ? iso.split('T')[0].split('-').reverse().join('/') : '—');
const brDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const todayIso = () => new Date().toISOString().slice(0, 10);
/** Regra: não permitir data programada no passado. */
export const isPastDate = (iso: string) => !!iso && iso < todayIso();

// ============================================================
// Status
// ============================================================
export type OsStatus = 'em_aberto' | 'em_andamento' | 'executada' | 'concluida' | 'cancelada';

/** Tons fiéis ao catálogo `status_os` (cores do seed de Configurações). */
export const osStatusTone: Record<OsStatus, BadgeTone> = {
  em_aberto: 'info',
  em_andamento: 'warn',
  executada: 'success',
  concluida: 'successStrong',
  cancelada: 'danger',
};
export const osStatusLabel: Record<OsStatus, string> = {
  em_aberto: 'Em aberto',
  em_andamento: 'Em andamento',
  executada: 'Executada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};
export const OS_STATUSES: OsStatus[] = ['em_aberto', 'em_andamento', 'executada', 'concluida', 'cancelada'];

/** OS concluída/cancelada é somente leitura (regra do board). */
export const isReadOnly = (status: OsStatus) => status === 'concluida' || status === 'cancelada';

export type Recorrencia = 'nenhuma' | 'semanal' | 'mensal' | 'trimestral';
export const recorrenciaLabel: Record<Recorrencia, string> = {
  nenhuma: 'Sem recorrência', semanal: 'Semanal', mensal: 'Mensal', trimestral: 'Trimestral',
};

// ============================================================
// Lista unificada (tela 4): OS + orçamentos convertíveis
// ============================================================
export type ItemKind = 'os' | 'orcamento';
export type OrigemOs = 'avulsa' | 'orcamento';

export interface OperacionalRow {
  id: string;
  kind: ItemKind;
  numero: string;
  clienteId: string;
  cliente: string;
  tipo: string;
  data: string;
  dataSort: string;
  funcionarios: string;
  status: string;
  statusLabel: string;
  statusTone: BadgeTone;
  valor: string;
  origem: OrigemOs | null;
  origemLabel: string;
  rascunho: boolean;
}

export interface ListOpts {
  search?: string;
  kind?: 'todos' | ItemKind;
  status?: string;
  clienteId?: string;
  funcionarioId?: string;
  tipoServico?: string;
  de?: string;   // ISO
  ate?: string;  // ISO
  sort?: 'data' | 'cliente' | 'status' | 'valor';
  page?: number;
  pageSize?: number;
}

/**
 * Lista unificada de OS e orçamentos convertíveis. Mescla + filtra + ordena + pagina em memória
 * (escala de demonstração; a paginação server-side sobre a união fica como evolução futura).
 */
export async function listOperacional(opts: ListOpts = {}): Promise<{ rows: OperacionalRow[]; total: number; totalOs: number }> {
  const [{ data: osData, error: e1 }, { data: orcData, error: e2 }] = await Promise.all([
    supabase
      .from('ordens_servico')
      .select('id, codigo, status, rascunho, tipos_servico, data_programada, created_at, orcamento_id, cliente_id, cliente:cliente_id(nome), funcs:os_funcionarios(funcionario_id, funcionario:funcionario_id(nome_completo))')
      .order('created_at', { ascending: false }),
    supabase
      .from('orcamentos')
      .select('id, codigo, status, data, valor_total, created_at, cliente_id, cliente:cliente_id(nome)')
      .neq('status', 'cancelado')
      .order('created_at', { ascending: false }),
  ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);

  const nome = (c: any) => (Array.isArray(c) ? c[0]?.nome : c?.nome) ?? '—';

  const osRows: OperacionalRow[] = (osData as any[]).map((o) => {
    const funcs = (o.funcs as any[] | null ?? [])
      .map((f) => (Array.isArray(f.funcionario) ? f.funcionario[0]?.nome_completo : f.funcionario?.nome_completo))
      .filter(Boolean);
    const st = o.status as OsStatus;
    const origem: OrigemOs = o.orcamento_id ? 'orcamento' : 'avulsa';
    return {
      id: o.id, kind: 'os', numero: o.codigo, clienteId: o.cliente_id, cliente: nome(o.cliente),
      tipo: (o.tipos_servico as string[] | null ?? []).join(', ') || '—',
      data: brDate(o.data_programada ?? o.created_at), dataSort: o.data_programada ?? o.created_at,
      funcionarios: funcs.length ? funcs.join(', ') : '—',
      status: st, statusLabel: osStatusLabel[st] ?? st, statusTone: osStatusTone[st] ?? 'muted',
      valor: '—', origem, origemLabel: origem === 'avulsa' ? 'Avulsa' : 'A partir de orçamento',
      rascunho: !!o.rascunho,
    };
  });

  // Orçamentos ainda não convertidos em OS.
  const usados = new Set((osData as any[]).map((o) => o.orcamento_id).filter(Boolean));
  const orcRows: OperacionalRow[] = (orcData as any[])
    .filter((o) => !usados.has(o.id))
    .map((o) => ({
      id: o.id, kind: 'orcamento', numero: o.codigo, clienteId: o.cliente_id, cliente: nome(o.cliente),
      tipo: '—', data: brDate(o.data ?? o.created_at), dataSort: o.data ?? o.created_at,
      funcionarios: '—',
      status: o.status, statusLabel: o.status === 'aprovado' ? 'Aprovado' : 'Em elaboração',
      statusTone: o.status === 'aprovado' ? 'success' : 'softWarn',
      valor: brl(Number(o.valor_total ?? 0)), origem: null, origemLabel: 'Orçamento', rascunho: false,
    }));

  let all = [...osRows, ...orcRows];
  const totalOs = osRows.length;

  // Filtros
  if (opts.kind && opts.kind !== 'todos') all = all.filter((r) => r.kind === opts.kind);
  if (opts.status && opts.status !== 'todos') all = all.filter((r) => r.status === opts.status);
  if (opts.clienteId) all = all.filter((r) => r.clienteId === opts.clienteId);
  if (opts.tipoServico) all = all.filter((r) => r.tipo.includes(opts.tipoServico!));
  if (opts.funcionarioId) {
    const ids = new Set(
      (osData as any[])
        .filter((o) => (o.funcs as any[] | null ?? []).some((f) => f.funcionario_id === opts.funcionarioId))
        .map((o) => o.id),
    );
    all = all.filter((r) => (r.kind === 'os' ? ids.has(r.id) : false));
  }
  if (opts.de) all = all.filter((r) => r.dataSort >= opts.de!);
  if (opts.ate) all = all.filter((r) => r.dataSort <= opts.ate! + 'T23:59:59');
  const s = opts.search?.trim().toLowerCase();
  if (s) all = all.filter((r) => `${r.numero} ${r.cliente}`.toLowerCase().includes(s));

  // Ordenação
  const sort = opts.sort ?? 'data';
  all.sort((a, b) => {
    if (sort === 'cliente') return a.cliente.localeCompare(b.cliente);
    if (sort === 'status') return a.statusLabel.localeCompare(b.statusLabel);
    if (sort === 'valor') return (b.kind === 'orcamento' ? 1 : 0) - (a.kind === 'orcamento' ? 1 : 0);
    return (b.dataSort ?? '').localeCompare(a.dataSort ?? ''); // data desc
  });

  const total = all.length;
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 10;
  const from = (page - 1) * pageSize;
  return { rows: all.slice(from, from + pageSize), total, totalOs };
}

// ============================================================
// Detalhe da OS (4.1)
// ============================================================
export interface OrdemServicoDetail {
  id: string;
  codigo: string;
  status: OsStatus;
  rascunho: boolean;
  clienteId: string;
  cliente: string;
  orcamentoId: string | null;
  orcamentoCodigo: string | null;
  origem: OrigemOs;
  tipos_servico: string[];
  descricao: string | null;
  data_programada: string | null;
  hora_prevista: string | null;
  duracao_estimada: string | null;
  recorrencia: Recorrencia;
  endereco_execucao: string | null;
  responsavel_admin_id: string | null;
  responsavel: string | null;
  funcionario_integrado_id: string | null;
  integrado: string | null;
  observacoes: string | null;
  pragas: string[];
  epis: string[];
  necessita_relatorio: boolean;
  outros_documentos: string | null;
  mapa_pontos_url: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  assinatura_url: string | null;
  cancelamento_motivo: string | null;
  created_at: string;
}

export async function getOrdemServico(id: string): Promise<OrdemServicoDetail> {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select('*, cliente:cliente_id(nome), orcamento:orcamento_id(codigo), responsavel:responsavel_admin_id(nome_completo), integrado:funcionario_integrado_id(nome_completo)')
    .eq('id', id).single();
  if (error) throw new Error(error.message);
  const o = data as any;
  const one = (r: any, k: string) => (Array.isArray(r) ? r[0]?.[k] : r?.[k]) ?? null;
  return {
    id: o.id, codigo: o.codigo, status: o.status, rascunho: o.rascunho,
    clienteId: o.cliente_id, cliente: one(o.cliente, 'nome') ?? '—',
    orcamentoId: o.orcamento_id, orcamentoCodigo: one(o.orcamento, 'codigo'),
    origem: o.orcamento_id ? 'orcamento' : 'avulsa',
    tipos_servico: o.tipos_servico ?? [], descricao: o.descricao,
    data_programada: o.data_programada, hora_prevista: o.hora_prevista, duracao_estimada: o.duracao_estimada,
    recorrencia: o.recorrencia, endereco_execucao: o.endereco_execucao,
    responsavel_admin_id: o.responsavel_admin_id, responsavel: one(o.responsavel, 'nome_completo'),
    funcionario_integrado_id: o.funcionario_integrado_id, integrado: one(o.integrado, 'nome_completo'),
    observacoes: o.observacoes, pragas: o.pragas ?? [], epis: o.epis ?? [],
    necessita_relatorio: o.necessita_relatorio, outros_documentos: o.outros_documentos,
    mapa_pontos_url: o.mapa_pontos_url,
    check_in_at: o.check_in_at, check_out_at: o.check_out_at, assinatura_url: o.assinatura_url,
    cancelamento_motivo: o.cancelamento_motivo, created_at: o.created_at,
  };
}

/** Campos editáveis da aba Dados gerais. Cada mudança vira uma linha de histórico. */
export interface DadosGeraisPatch {
  tipos_servico?: string[];
  descricao?: string | null;
  data_programada?: string | null;
  hora_prevista?: string | null;
  duracao_estimada?: string | null;
  recorrencia?: Recorrencia;
  endereco_execucao?: string | null;
  responsavel_admin_id?: string | null;
  funcionario_integrado_id?: string | null;
  observacoes?: string | null;
  pragas?: string[];
  necessita_relatorio?: boolean;
  outros_documentos?: string | null;
}

const CAMPO_LABEL: Record<string, string> = {
  tipos_servico: 'Tipos de serviço', descricao: 'Descrição', data_programada: 'Data programada',
  hora_prevista: 'Hora prevista', duracao_estimada: 'Duração estimada', recorrencia: 'Recorrência',
  endereco_execucao: 'Endereço de execução', responsavel_admin_id: 'Responsável administrativo',
  funcionario_integrado_id: 'Funcionário integrado', observacoes: 'Observações', pragas: 'Pragas-alvo',
  necessita_relatorio: 'Necessita relatório técnico', outros_documentos: 'Outros documentos',
};
const fmt = (v: unknown): string | null => {
  if (v == null) return null;
  if (Array.isArray(v)) return v.join(', ') || null;
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  return String(v);
};

export async function updateDadosGerais(id: string, patch: DadosGeraisPatch): Promise<void> {
  if (patch.data_programada && isPastDate(patch.data_programada)) {
    throw new Error('A data programada não pode estar no passado.');
  }
  const before = await getOrdemServico(id);
  const { error } = await supabase.from('ordens_servico').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
  // Histórico por-campo (só o que mudou).
  for (const k of Object.keys(patch) as (keyof DadosGeraisPatch)[]) {
    const antes = fmt((before as any)[k]);
    const depois = fmt(patch[k]);
    if (antes !== depois) await hist(id, CAMPO_LABEL[k] ?? k, antes, depois);
  }
  await audit('os_editada', { os_id: id, campos: Object.keys(patch) });
}

/** Transição de status com regras (executada exige assinatura). */
export async function setOsStatus(id: string, status: OsStatus): Promise<void> {
  const os = await getOrdemServico(id);
  if (isReadOnly(os.status)) throw new Error('OS concluída ou cancelada é somente leitura.');
  if (status === 'executada' && !os.assinatura_url) {
    throw new Error('Assinatura do cliente é obrigatória para marcar como executada.');
  }
  const { error } = await supabase.from('ordens_servico').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
  await hist(id, 'Status', osStatusLabel[os.status], osStatusLabel[status]);
  await audit('os_status', { os_id: id, de: os.status, para: status });
  if (status === 'executada') await notify('os_executada_portal', { os_id: id });
}

/** Cancelamento exige motivo (regra do board). */
export async function cancelarOs(id: string, motivo: string): Promise<void> {
  if (!motivo.trim()) throw new Error('Informe o motivo do cancelamento.');
  const os = await getOrdemServico(id);
  if (isReadOnly(os.status)) throw new Error('OS já finalizada.');
  const { error } = await supabase.from('ordens_servico').update({ status: 'cancelada', cancelamento_motivo: motivo.trim() }).eq('id', id);
  if (error) throw new Error(error.message);
  await hist(id, 'Status', osStatusLabel[os.status], 'Cancelada');
  await hist(id, 'Motivo do cancelamento', null, motivo.trim());
  await audit('os_cancelada', { os_id: id, motivo });
}

/** Duplica a OS (cabeçalho + itens previstos) como novo rascunho em aberto. */
export async function duplicarOs(id: string): Promise<string> {
  const o = await getOrdemServico(id);
  const { data, error } = await supabase.from('ordens_servico').insert({
    cliente_id: o.clienteId, orcamento_id: null, status: 'em_aberto', rascunho: true,
    tipos_servico: o.tipos_servico, descricao: o.descricao, recorrencia: o.recorrencia,
    endereco_execucao: o.endereco_execucao, responsavel_admin_id: o.responsavel_admin_id,
    funcionario_integrado_id: o.funcionario_integrado_id, observacoes: o.observacoes,
    pragas: o.pragas, epis: o.epis, necessita_relatorio: o.necessita_relatorio,
    outros_documentos: o.outros_documentos, created_by: await actorId(),
  }).select('id').single();
  if (error) throw new Error(error.message);
  const novoId = (data as any).id;
  // Copia produtos e equipamentos previstos (sem consumo).
  const [{ data: prods }, { data: equips }] = await Promise.all([
    supabase.from('os_produtos').select('produto_id, qtd_recomendada, unidade, lote, prazo_alvo, observacao').eq('os_id', id),
    supabase.from('os_equipamentos').select('produto_id, numero_serie, responsavel_id').eq('os_id', id),
  ]);
  if ((prods as any[])?.length) await supabase.from('os_produtos').insert((prods as any[]).map((p) => ({ ...p, os_id: novoId })));
  if ((equips as any[])?.length) await supabase.from('os_equipamentos').insert((equips as any[]).map((e) => ({ ...e, os_id: novoId })));
  await hist(novoId, 'OS criada', null, `Duplicada de ${o.codigo}`);
  await audit('os_duplicada', { origem: id, nova: novoId });
  return novoId;
}

// ============================================================
// Aba Execução (4.1.b) — funcionários vinculados
// ============================================================
export interface OsFuncionarioRow {
  vinculoId: string; funcionario_id: string; nome: string; cargo: string; integrado: boolean;
}
export async function listOsFuncionarios(osId: string): Promise<OsFuncionarioRow[]> {
  const { data, error } = await supabase
    .from('os_funcionarios')
    .select('id, funcionario_id, funcionario:funcionario_id(nome_completo, cargo)')
    .eq('os_id', osId).order('created_at');
  if (error) throw new Error(error.message);
  return (data as any[]).map((v) => {
    const f = Array.isArray(v.funcionario) ? v.funcionario[0] : v.funcionario;
    return { vinculoId: v.id, funcionario_id: v.funcionario_id, nome: f?.nome_completo ?? '—', cargo: f?.cargo ?? '—', integrado: false };
  });
}
export async function addOsFuncionario(osId: string, funcionarioId: string): Promise<void> {
  const { error } = await supabase.from('os_funcionarios').insert({ os_id: osId, funcionario_id: funcionarioId });
  if (error) throw new Error(error.code === '23505' ? 'Funcionário já vinculado a esta OS.' : error.message);
  await hist(osId, 'Funcionário vinculado', null, funcionarioId);
  await notify('os_funcionario_vinculado', { os_id: osId, funcionario_id: funcionarioId }); // → app mobile
  await notificarFuncionarios([funcionarioId], osId, 'Nova OS atribuída', 'Você foi vinculado a uma ordem de serviço.');
  await audit('os_func_add', { os_id: osId, funcionario_id: funcionarioId });
}
export async function removeOsFuncionario(osId: string, vinculoId: string, nome: string): Promise<void> {
  const { error } = await supabase.from('os_funcionarios').delete().eq('id', vinculoId);
  if (error) throw new Error(error.message);
  await hist(osId, 'Funcionário removido', nome, null);
  await notify('os_funcionario_removido', { os_id: osId }); // → app mobile
  await audit('os_func_remove', { os_id: osId, vinculo: vinculoId });
}

// ============================================================
// Aba Produtos e equipamentos (4.1.c)
// ============================================================
export interface OsProdutoRow {
  id: string; produto_id: string; codigo: string; produto: string; unidade: string;
  qtd_recomendada: number; qtd_utilizada: number | null; lote: string; prazoAlvo: string; observacao: string;
  divergente: boolean; // consumo difere do previsto
}
export async function listOsProdutos(osId: string): Promise<OsProdutoRow[]> {
  const { data, error } = await supabase
    .from('os_produtos')
    .select('*, produto:produto_id(codigo, nome, unidade)')
    .eq('os_id', osId).order('created_at');
  if (error) throw new Error(error.message);
  return (data as any[]).map((r) => {
    const p = Array.isArray(r.produto) ? r.produto[0] : r.produto;
    const used = r.qtd_utilizada == null ? null : Number(r.qtd_utilizada);
    return {
      id: r.id, produto_id: r.produto_id, codigo: p?.codigo ?? '—', produto: p?.nome ?? '—',
      unidade: r.unidade ?? p?.unidade ?? '—', qtd_recomendada: Number(r.qtd_recomendada),
      qtd_utilizada: used, lote: r.lote ?? '—', prazoAlvo: brDate(r.prazo_alvo), observacao: r.observacao ?? '',
      divergente: used != null && used !== Number(r.qtd_recomendada),
    };
  });
}
export async function addOsProduto(osId: string, input: { produto_id: string; qtd_recomendada: number; unidade: string | null; lote?: string | null; prazo_alvo?: string | null; observacao?: string | null }): Promise<void> {
  const { error } = await supabase.from('os_produtos').insert({ os_id: osId, ...input });
  if (error) throw new Error(error.code === '23505' ? 'Produto já previsto nesta OS.' : error.message);
  await hist(osId, 'Produto previsto adicionado', null, input.produto_id);
}
/** Ajuste manual do consumo (o valor "oficial" vem do app; ajuste fica registrado no histórico). */
export async function ajustarQtdUtilizada(osId: string, itemId: string, qtd: number | null): Promise<void> {
  const { data: before } = await supabase.from('os_produtos').select('qtd_utilizada').eq('id', itemId).single();
  const { error } = await supabase.from('os_produtos').update({ qtd_utilizada: qtd }).eq('id', itemId);
  if (error) throw new Error(error.message);
  await hist(osId, 'Consumo (ajuste manual)', (before as any)?.qtd_utilizada?.toString() ?? null, qtd?.toString() ?? null);
  await audit('os_consumo_ajuste', { os_id: osId, item: itemId, qtd });
}
export async function removeOsProduto(osId: string, itemId: string): Promise<void> {
  const { error } = await supabase.from('os_produtos').delete().eq('id', itemId);
  if (error) throw new Error(error.message);
  await hist(osId, 'Produto previsto removido', itemId, null);
}

export interface OsEquipamentoRow {
  id: string; produto_id: string; equipamento: string; numeroSerie: string; responsavel: string;
}
export async function listOsEquipamentos(osId: string): Promise<OsEquipamentoRow[]> {
  const { data, error } = await supabase
    .from('os_equipamentos')
    .select('*, produto:produto_id(nome, codigo), responsavel:responsavel_id(nome_completo)')
    .eq('os_id', osId).order('created_at');
  if (error) throw new Error(error.message);
  return (data as any[]).map((r) => {
    const p = Array.isArray(r.produto) ? r.produto[0] : r.produto;
    const resp = Array.isArray(r.responsavel) ? r.responsavel[0] : r.responsavel;
    return { id: r.id, produto_id: r.produto_id, equipamento: p?.nome ?? '—', numeroSerie: r.numero_serie ?? '—', responsavel: resp?.nome_completo ?? '—' };
  });
}
export async function addOsEquipamento(osId: string, input: { produto_id: string; numero_serie?: string | null; responsavel_id?: string | null }): Promise<void> {
  const { error } = await supabase.from('os_equipamentos').insert({ os_id: osId, ...input });
  if (error) throw new Error(error.code === '23505' ? 'Equipamento já vinculado a esta OS.' : error.message);
  await hist(osId, 'Equipamento adicionado', null, input.produto_id);
}
export async function removeOsEquipamento(osId: string, itemId: string): Promise<void> {
  const { error } = await supabase.from('os_equipamentos').delete().eq('id', itemId);
  if (error) throw new Error(error.message);
  await hist(osId, 'Equipamento removido', itemId, null);
}

// ============================================================
// Aba Relatórios (4.1.d)
// ============================================================
export interface OsRelatorioRow {
  id: string; titulo: string; arquivoUrl: string | null; publicado: boolean; publicadoEm: string; criadoEm: string;
}
export async function listOsRelatorios(osId: string): Promise<OsRelatorioRow[]> {
  const { data, error } = await supabase.from('os_relatorios').select('*').eq('os_id', osId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as any[]).map((r) => ({
    id: r.id, titulo: r.titulo, arquivoUrl: r.arquivo_url, publicado: r.publicado,
    publicadoEm: r.publicado_at ? brDateTime(r.publicado_at) : '—', criadoEm: brDateTime(r.created_at),
  }));
}
export async function emitirRelatorio(osId: string, titulo: string, arquivoUrl: string | null): Promise<void> {
  const { error } = await supabase.from('os_relatorios').insert({ os_id: osId, titulo, arquivo_url: arquivoUrl, created_by: await actorId() });
  if (error) throw new Error(error.message);
  await hist(osId, 'Relatório técnico emitido', null, titulo);
  await audit('os_relatorio_emitido', { os_id: osId, titulo });
}
/** Regra: só publica no portal quando a OS está executada ou concluída. */
export async function publicarRelatorio(osId: string, relatorioId: string, osStatus: OsStatus): Promise<void> {
  if (osStatus !== 'executada' && osStatus !== 'concluida') {
    throw new Error('Disponível apenas quando a OS estiver executada ou concluída.');
  }
  const { error } = await supabase.from('os_relatorios').update({ publicado: true, publicado_at: new Date().toISOString() }).eq('id', relatorioId);
  if (error) throw new Error(error.message);
  await hist(osId, 'Relatório disponibilizado ao cliente', null, relatorioId);
  await notify('relatorio_publicado_portal', { os_id: osId, relatorio_id: relatorioId }); // → portal do cliente
  const { data: osrow } = await supabase.from('ordens_servico').select('cliente_id, codigo').eq('id', osId).single();
  if ((osrow as any)?.cliente_id) {
    await criarNotificacao({ paraClienteId: (osrow as any).cliente_id, tipo: 'os', titulo: 'Relatório técnico disponível', descricao: `Um novo relatório técnico da ${(osrow as any).codigo} foi disponibilizado no seu portal.`, osId });
  }
  await audit('os_relatorio_publicado', { os_id: osId, relatorio_id: relatorioId });
}
export async function removerRelatorio(osId: string, relatorioId: string): Promise<void> {
  const { error } = await supabase.from('os_relatorios').delete().eq('id', relatorioId);
  if (error) throw new Error(error.message);
  await hist(osId, 'Relatório removido', relatorioId, null);
}

// ============================================================
// Aba Anexos (4.1.e)
// ============================================================
export type AnexoTipo = 'foto' | 'comprovante' | 'autorizacao' | 'extra' | 'outro';
export const anexoTipoLabel: Record<AnexoTipo, string> = {
  foto: 'Foto', comprovante: 'Comprovante', autorizacao: 'Autorização', extra: 'Extra', outro: 'Outro',
};
/**
 * URL temporária para abrir um documento do bucket `operacional-docs`.
 *
 * O bucket é privado — quem autoriza é a policy de SELECT, avaliada no momento
 * da assinatura da URL. Devolve null em vez de lançar porque a falha aqui é
 * sempre local a um arquivo (caminho antigo, objeto removido) e não deve
 * derrubar a tela inteira.
 */
export async function urlAssinadaOperacional(caminho: string, segundos = 60 * 60): Promise<string | null> {
  if (!caminho) return null;
  const { data } = await supabase.storage.from('operacional-docs').createSignedUrl(caminho, segundos);
  return data?.signedUrl ?? null;
}

export interface OsAnexoRow { id: string; nome: string; tipo: AnexoTipo; tipoLabel: string; arquivoUrl: string | null; criadoEm: string; }
export async function listOsAnexos(osId: string): Promise<OsAnexoRow[]> {
  const { data, error } = await supabase.from('os_anexos').select('*').eq('os_id', osId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as any[]).map((a) => ({
    id: a.id, nome: a.nome, tipo: a.tipo, tipoLabel: anexoTipoLabel[a.tipo as AnexoTipo] ?? a.tipo,
    arquivoUrl: a.arquivo_url, criadoEm: brDateTime(a.created_at),
  }));
}
export async function addAnexo(osId: string, nome: string, tipo: AnexoTipo, arquivoUrl: string | null): Promise<void> {
  const { error } = await supabase.from('os_anexos').insert({ os_id: osId, nome, tipo, arquivo_url: arquivoUrl, created_by: await actorId() });
  if (error) throw new Error(error.message);
  await hist(osId, 'Anexo adicionado', null, nome);
}
export async function removerAnexo(osId: string, anexoId: string, nome: string): Promise<void> {
  const { error } = await supabase.from('os_anexos').delete().eq('id', anexoId);
  if (error) throw new Error(error.message);
  await hist(osId, 'Anexo removido', nome, null);
}

// ============================================================
// Aba Histórico (4.1.f) — somente leitura
// ============================================================
export interface HistoricoRow { id: string; quando: string; usuario: string; campo: string; anterior: string; novo: string; }
export async function listOsHistorico(osId: string, filtro?: { de?: string; ate?: string; actorId?: string }): Promise<HistoricoRow[]> {
  let q = supabase.from('os_historico').select('*').eq('os_id', osId).order('created_at', { ascending: false });
  if (filtro?.de) q = q.gte('created_at', filtro.de);
  if (filtro?.ate) q = q.lte('created_at', filtro.ate + 'T23:59:59');
  if (filtro?.actorId) q = q.eq('actor_id', filtro.actorId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = data as any[];
  const nomes = await resolveActorNames(rows.map((r) => r.actor_id));
  return rows.map((r) => ({
    id: r.id, quando: brDateTime(r.created_at), usuario: r.actor_id ? nomes[r.actor_id] ?? 'Usuário' : 'Sistema',
    campo: r.campo, anterior: r.valor_anterior ?? '—', novo: r.valor_novo ?? '—',
  }));
}
async function resolveActorNames(ids: (string | null)[]): Promise<Record<string, string>> {
  const uniq = [...new Set(ids.filter(Boolean) as string[])];
  if (!uniq.length) return {};
  const { data } = await supabase.from('profiles').select('id, nome_completo').in('id', uniq);
  const map: Record<string, string> = {};
  (data as any[] | null)?.forEach((p) => { map[p.id] = p.nome_completo; });
  return map;
}
/** Autores distintos do histórico (filtro por usuário na aba). */
export async function listHistoricoAutores(osId: string): Promise<{ id: string; nome: string }[]> {
  const { data } = await supabase.from('os_historico').select('actor_id').eq('os_id', osId);
  const ids = [...new Set((data as any[] | null)?.map((r) => r.actor_id).filter(Boolean) as string[])];
  const nomes = await resolveActorNames(ids);
  return ids.map((id) => ({ id, nome: nomes[id] ?? 'Usuário' }));
}

// ============================================================
// Criação (wizard 4.2 / 4.2.1)
// ============================================================
export interface ProdutoPrevistoInput { produto_id: string; qtd_recomendada: number; unidade: string | null; lote?: string | null; prazo_alvo?: string | null; observacao?: string | null; }
export interface EquipamentoInput { produto_id: string; numero_serie?: string | null; responsavel_id?: string | null; }

export interface NovaOsInput {
  cliente_id: string;
  orcamento_id?: string | null;
  rascunho?: boolean;
  // Etapa 1
  tipos_servico: string[];
  descricao: string | null;
  data_programada: string | null;
  hora_prevista: string | null;
  duracao_estimada: string | null;
  recorrencia: Recorrencia;
  endereco_execucao: string | null;
  responsavel_admin_id: string | null;
  funcionario_integrado_id: string | null;
  observacoes: string | null;
  funcionario_ids: string[];
  necessita_relatorio: boolean;
  outros_documentos: string | null;
  // Etapa 2 (4.2.1)
  pragas: string[];
  epis: string[];
  mapa_pontos_url: string | null;
  produtos: ProdutoPrevistoInput[];
  equipamentos: EquipamentoInput[];
  cronograma: string[]; // ISO dates
}

export async function createOrdemServico(input: NovaOsInput): Promise<string> {
  if (!input.cliente_id) throw new Error('Selecione o cliente.');
  if (input.data_programada && isPastDate(input.data_programada)) throw new Error('A data programada não pode estar no passado.');

  const { data, error } = await supabase.from('ordens_servico').insert({
    cliente_id: input.cliente_id, orcamento_id: input.orcamento_id ?? null,
    status: 'em_aberto', rascunho: input.rascunho ?? false,
    tipos_servico: input.tipos_servico, descricao: input.descricao,
    data_programada: input.data_programada, hora_prevista: input.hora_prevista,
    duracao_estimada: input.duracao_estimada, recorrencia: input.recorrencia,
    endereco_execucao: input.endereco_execucao, responsavel_admin_id: input.responsavel_admin_id,
    funcionario_integrado_id: input.funcionario_integrado_id, observacoes: input.observacoes,
    pragas: input.pragas, epis: input.epis, necessita_relatorio: input.necessita_relatorio,
    outros_documentos: input.outros_documentos, mapa_pontos_url: input.mapa_pontos_url,
    created_by: await actorId(),
  }).select('id, codigo').single();
  if (error) throw new Error(error.message);
  const osId = (data as any).id;
  const codigo = (data as any).codigo;

  if (input.funcionario_ids.length) {
    await supabase.from('os_funcionarios').insert(input.funcionario_ids.map((funcionario_id) => ({ os_id: osId, funcionario_id })));
  }
  if (input.produtos.length) {
    await supabase.from('os_produtos').insert(input.produtos.map((p) => ({ os_id: osId, ...p })));
  }
  if (input.equipamentos.length) {
    await supabase.from('os_equipamentos').insert(input.equipamentos.map((e) => ({ os_id: osId, ...e })));
  }
  if (input.recorrencia !== 'nenhuma' && input.cronograma.length) {
    await supabase.from('os_cronograma').insert(input.cronograma.map((data_prevista, i) => ({ os_id: osId, data_prevista, ordem: i })));
  }

  await hist(osId, 'OS criada', null, codigo);
  await audit('os_criada', { os_id: osId, cliente_id: input.cliente_id, rascunho: input.rascunho });
  if (!input.rascunho && input.funcionario_ids.length) {
    await notify('os_criada', { os_id: osId, funcionarios: input.funcionario_ids }); // → app mobile
    await notificarFuncionarios(input.funcionario_ids, osId, 'Nova OS atribuída', `Você foi vinculado à ordem de serviço ${codigo}.`);
  }
  return osId;
}

/** Converte um orçamento aprovado em OS (pré-preenche o cliente e vincula o orçamento). */
export async function iniciarOsDeOrcamento(orcamentoId: string): Promise<{ clienteId: string; cliente: string; codigo: string } | null> {
  const { data, error } = await supabase.from('orcamentos').select('id, codigo, cliente_id, cliente:cliente_id(nome)').eq('id', orcamentoId).single();
  if (error) throw new Error(error.message);
  const o = data as any;
  const cliente = (Array.isArray(o.cliente) ? o.cliente[0]?.nome : o.cliente?.nome) ?? '—';
  return { clienteId: o.cliente_id, cliente, codigo: o.codigo };
}

// ============================================================
// Opções para selects (wizard e modais)
// ============================================================
export async function listClienteOptions(): Promise<{ id: string; nome: string }[]> {
  const { data, error } = await supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome');
  if (error) throw new Error(error.message);
  return (data as any[]).map((c) => ({ id: c.id, nome: c.nome }));
}

export interface ClienteResumo { endereco: string; contato: string; telefone: string; }
export async function getClienteResumo(clienteId: string): Promise<ClienteResumo> {
  const { data } = await supabase.from('clientes').select('*').eq('id', clienteId).single();
  const c = data as any;
  const endereco = [
    [c?.logradouro, c?.numero, c?.complemento, c?.bairro].filter(Boolean).join(', '),
    [c?.cidade, c?.uf].filter(Boolean).join('/'),
  ].filter(Boolean).join(' - ') || '—';
  return { endereco, contato: c?.nome ?? '—', telefone: c?.telefone ?? '—' };
}

export interface FuncionarioOption { id: string; nome: string; cargo: string; bloqueado: boolean; }
/** Funcionários ativos; `bloqueado` quando ASO/CNH vencidos (não devem ser vinculados a novas OS). */
export async function listFuncionarioOptions(): Promise<FuncionarioOption[]> {
  const { data, error } = await supabase.from('funcionarios').select('id, nome_completo, cargo, aso_validade, cnh_validade').eq('ativo', true).order('nome_completo');
  if (error) throw new Error(error.message);
  const hoje = todayIso();
  const venc = (d: string | null) => !!d && d < hoje;
  return (data as any[]).map((f) => ({
    id: f.id, nome: f.nome_completo, cargo: f.cargo ?? '—', bloqueado: venc(f.aso_validade) || venc(f.cnh_validade),
  }));
}

export const listTiposServico = () => listCatalogoAtivos('tipos_servico');
export const listPragas = () => listCatalogoAtivos('pragas');
export const listEpisCatalogo = () => listCatalogoAtivos('epis');

/**
 * EPIs obrigatórios derivados dos produtos selecionados. Sem vínculo produto↔EPI no schema,
 * usamos heurística: havendo produtos químicos, exige o conjunto de EPIs ativos do catálogo.
 * (Ponto de evolução: matriz produto→EPI em Configurações.)
 */
export async function deriveEpis(produtoIds: string[]): Promise<string[]> {
  if (!produtoIds.length) return [];
  return listEpisCatalogo();
}

export async function listProdutoOptions(): Promise<Produto[]> {
  const prods = await listProdutos();
  return prods.filter((p) => p.status === 'Ativo' && p.cat !== 'Equipamento');
}
export async function listEquipamentoOptions(): Promise<Produto[]> {
  const prods = await listProdutos();
  return prods.filter((p) => p.status === 'Ativo' && p.cat === 'Equipamento');
}
export { listBases };

/** Gera as próximas datas do cronograma a partir da recorrência (puro). */
export function gerarCronograma(dataInicialIso: string, recorrencia: Recorrencia, ocorrencias = 6): string[] {
  if (!dataInicialIso || recorrencia === 'nenhuma') return [];
  const out: string[] = [];
  const base = new Date(dataInicialIso + 'T00:00:00');
  for (let i = 1; i <= ocorrencias; i++) {
    const d = new Date(base);
    if (recorrencia === 'semanal') d.setDate(d.getDate() + 7 * i);
    else if (recorrencia === 'mensal') d.setMonth(d.getMonth() + i);
    else if (recorrencia === 'trimestral') d.setMonth(d.getMonth() + 3 * i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export const fmtDate = brDate;
export const fmtDateTime = brDateTime;
