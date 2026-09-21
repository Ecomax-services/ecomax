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
