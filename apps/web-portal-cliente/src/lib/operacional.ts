import { supabase } from '@/lib/supabase';

// O mapa de status vive em `shared/statusOs.ts`, copiado para os três apps por
// `scripts/sync-shared.sh`. Antes havia uma definição por app: os rótulos
// concordavam por manutenção manual, mas as cores não — aqui `executada` e
// `concluida` caíam na mesma pílula, e o cliente não distinguia uma da outra.
export type { OsStatus } from '@/lib/statusOs';
export { osStatusLabel, rotuloStatus, corDoStatus } from '@/lib/statusOs';

import type { OsStatus } from '@/lib/statusOs';
import { corDoStatus, rotuloStatus } from '@/lib/statusOs';

/**
 * Estilo inline da pílula de status.
 *
 * Inline, e não classe do Tailwind, porque as cores agora vêm do módulo
 * compartilhado em hexadecimal — é o único formato que o App Operador, que não
 * tem Tailwind, também lê. Gerar classe a partir de hex exigiria uma safelist,
 * que é justamente o tipo de tradução onde a divergência nasce.
 */
export function estiloStatus(status: string): { backgroundColor: string; color: string } {
  const { bg, fg } = corDoStatus(status);
  return { backgroundColor: bg, color: fg };
}

const brDate = (iso: string | null) => (iso ? iso.split('T')[0].split('-').reverse().join('/') : '—');
const brDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const codigoOf = (r: any) => (Array.isArray(r) ? r[0]?.codigo : r?.codigo) ?? '—';

// ---------- Minhas OS (RLS já filtra pelo cliente do portal) ----------
export interface MinhaOs {
  id: string; codigo: string; tipos: string; status: OsStatus; statusLabel: string; data: string;
  /** Cliente e local da execução — um mesmo usuário pode ter mais de uma unidade. */
  identificacao: string;
}

/** Status que contam como "aberta" no indicador da tela. */
// Do ponto de vista do cliente, tudo que ainda não foi executado está aberto.
const ABERTAS: OsStatus[] = ['em_aberto', 'emitida', 'confirmada', 'em_andamento'];
export const contaAbertas = (os: MinhaOs[]) => os.filter((o) => ABERTAS.includes(o.status)).length;

export async function listMinhasOs(): Promise<MinhaOs[]> {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select('id, codigo, status, data_programada, created_at, tipos_servico, endereco_execucao, cliente:cliente_id(nome)')
    .order('data_programada', { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data as any[]).map((o) => {
    const c = Array.isArray(o.cliente) ? o.cliente[0] : o.cliente;
    return {
      id: o.id, codigo: o.codigo, tipos: (o.tipos_servico as string[] | null ?? []).join(', ') || '—',
      status: o.status, statusLabel: rotuloStatus(o.status),
      data: brDate(o.data_programada ?? o.created_at),
      identificacao: [c?.nome, o.endereco_execucao].filter(Boolean).join(' · ') || '—',
    };
  });
}

// ---------- Relatórios técnicos publicados ----------
export interface RelatorioCliente { id: string; titulo: string; osCodigo: string; publicadoEm: string; arquivoUrl: string | null; }
export async function listRelatorios(): Promise<RelatorioCliente[]> {
  const { data, error } = await supabase
    .from('os_relatorios')
    .select('id, titulo, publicado_at, arquivo_url, os:os_id(codigo)')
    .eq('publicado', true)
    .order('publicado_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as any[]).map((r) => ({
    id: r.id, titulo: r.titulo, osCodigo: codigoOf(r.os), publicadoEm: brDateTime(r.publicado_at), arquivoUrl: r.arquivo_url,
  }));
}

// ---------- Cronograma das minhas OS ----------
export interface CronogramaCliente { id: string; osCodigo: string; data: string; dataSort: string; status: string; }
export async function listCronograma(): Promise<CronogramaCliente[]> {
  const { data, error } = await supabase
    .from('os_cronograma')
    .select('id, data_prevista, status, os:os_id(codigo)')
    .neq('status', 'cancelada')
    .order('data_prevista', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as any[]).map((c) => ({ id: c.id, osCodigo: codigoOf(c.os), data: brDate(c.data_prevista), dataSort: c.data_prevista, status: c.status }));
}

// ===========================================================================
// Detalhe de uma ordem de serviço
// ===========================================================================
// O protótipo abre a OS num detalhe com quatro abas. Cada função abaixo alimenta
// uma delas. Nenhuma filtra por cliente: quem faz isso é a RLS, e repetir a
// regra aqui criaria um segundo lugar para ela ficar desatualizada.

export interface OsDetalhe {
  id: string;
  codigo: string;
  status: string;
  statusLabel: string;
  identificacao: string;
  tipos: string;
  data: string;
}

/** Cabeçalho do detalhe. Devolve null quando a OS não é do cliente logado. */
export async function getOsDetalhe(id: string): Promise<OsDetalhe | null> {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select('id, codigo, status, data_programada, created_at, tipos_servico, endereco_execucao, cliente:cliente_id(nome)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const o = data as any;
  const c = Array.isArray(o.cliente) ? o.cliente[0] : o.cliente;
  return {
    id: o.id,
    codigo: o.codigo,
    status: o.status,
    statusLabel: rotuloStatus(o.status),
    identificacao: [c?.nome, o.endereco_execucao].filter(Boolean).join(' · ') || '—',
    tipos: (o.tipos_servico as string[] | null ?? []).join(', ') || '—',
    data: brDate(o.data_programada ?? o.created_at),
  };
}

/** Aba "Relatórios Técnicos". A RLS já entrega só os publicados. */
export async function listRelatoriosDaOs(osId: string): Promise<RelatorioCliente[]> {
  const { data, error } = await supabase
    .from('os_relatorios')
    .select('id, titulo, publicado_at, arquivo_url, os:os_id(codigo)')
    .eq('os_id', osId)
    .eq('publicado', true)
    .order('publicado_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as any[]).map((r) => ({
    id: r.id, titulo: r.titulo, osCodigo: codigoOf(r.os),
    publicadoEm: brDateTime(r.publicado_at), arquivoUrl: r.arquivo_url,
  }));
}

/** Aba "Cronograma" — as visitas desta OS. */
export async function listCronogramaDaOs(osId: string): Promise<CronogramaCliente[]> {
  const { data, error } = await supabase
    .from('os_cronograma')
    .select('id, data_prevista, status, os:os_id(codigo)')
    .eq('os_id', osId)
    .neq('status', 'cancelada')
    .order('data_prevista', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as any[]).map((c) => ({
    id: c.id, osCodigo: codigoOf(c.os), data: brDate(c.data_prevista),
    dataSort: c.data_prevista, status: c.status,
  }));
}

// ---------- Aba "Mapeamento" ----------

/**
 * Situação de um ponto do plano de controle.
 *
 * Os rótulos são do cliente, não do operador: "Não conforme" diz mais a quem
 * recebe o relatório do que o slug do banco. `pendente` vira "Não registrado"
 * porque, para quem lê depois da visita, o que importa é que ficou sem registro
 * — e não que alguém ainda vai preencher.
 */
export const situacaoPontoLabel: Record<string, string> = {
  conforme: 'Conforme',
  nao_conforme: 'Não conforme',
  inacessivel: 'Inacessível',
  pendente: 'Não registrado',
};

export const situacaoPontoCor: Record<string, { bg: string; fg: string }> = {
  conforme: { bg: '#e7f6e7', fg: '#1d6b25' },
  nao_conforme: { bg: '#fdeceb', fg: '#a3341f' },
  inacessivel: { bg: '#eef0f2', fg: '#515761' },
  pendente: { bg: '#fff6e6', fg: '#b45309' },
};

export interface PontoDoPlano {
  id: string;
  numero: number;
  identificacao: string;
  situacao: string;
  situacaoLabel: string;
  observacao: string | null;
}

export interface PlanoDeControle {
  id: string;
  tipoControle: string;
  frequencia: string;
  pontosPrevistos: number;
  pontos: PontoDoPlano[];
}

export async function listMapeamentoDaOs(osId: string): Promise<PlanoDeControle[]> {
  const { data: planos, error: e1 } = await supabase
    .from('os_planos_controle')
    .select('id, tipo_controle, frequencia, pontos_previstos')
    .eq('os_id', osId)
    .order('tipo_controle');
  if (e1) throw new Error(e1.message);
  if (!planos?.length) return [];

  const { data: pontos, error: e2 } = await supabase
    .from('os_plano_pontos')
    .select('id, plano_id, numero, identificacao, situacao, observacao')
    .in('plano_id', (planos as any[]).map((p) => p.id))
    .order('numero');
  if (e2) throw new Error(e2.message);

  const porPlano = new Map<string, PontoDoPlano[]>();
  for (const p of (pontos as any[] | null) ?? []) {
    const lista = porPlano.get(p.plano_id) ?? [];
    lista.push({
      id: p.id, numero: p.numero, identificacao: p.identificacao ?? `Ponto ${p.numero}`,
      situacao: p.situacao, situacaoLabel: situacaoPontoLabel[p.situacao] ?? p.situacao,
      observacao: p.observacao,
    });
    porPlano.set(p.plano_id, lista);
  }

  return (planos as any[]).map((p) => ({
    id: p.id, tipoControle: p.tipo_controle, frequencia: p.frequencia,
    pontosPrevistos: p.pontos_previstos, pontos: porPlano.get(p.id) ?? [],
  }));
}

/**
 * Aba "Certificado".
 *
 * A RLS já recorta por tipo — o cliente só enxerga certificado e comprovante,
 * nunca foto ou autorização, que são material de trabalho da equipe.
 */
export interface AnexoCliente { id: string; nome: string; tipo: string; arquivoUrl: string | null; criadoEm: string; }
export async function listCertificadosDaOs(osId: string): Promise<AnexoCliente[]> {
  const { data, error } = await supabase
    .from('os_anexos')
    .select('id, nome, tipo, arquivo_url, created_at')
    .eq('os_id', osId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as any[]).map((a) => ({
    id: a.id, nome: a.nome, tipo: a.tipo, arquivoUrl: a.arquivo_url, criadoEm: brDate(a.created_at),
  }));
}
