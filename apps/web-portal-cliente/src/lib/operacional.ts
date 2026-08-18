import { supabase } from '@/lib/supabase';

export type OsStatus = 'em_aberto' | 'em_andamento' | 'executada' | 'concluida' | 'cancelada';

export const osStatusLabel: Record<OsStatus, string> = {
  em_aberto: 'Em aberto', em_andamento: 'Em andamento', executada: 'Executada', concluida: 'Concluída', cancelada: 'Cancelada',
};
/** Classes Tailwind disponíveis no portal (tokens enxutos). */
export const osStatusClass: Record<OsStatus, string> = {
  em_aberto: 'bg-infoTag-bg text-infoTag-fg',
  em_andamento: 'bg-warnTag-bg text-warnTag-fg',
  executada: 'bg-forest-100 text-forest-900',
  concluida: 'bg-forest-100 text-forest-900',
  cancelada: 'bg-expiredTag-bg text-expiredTag-fg',
};

const brDate = (iso: string | null) => (iso ? iso.split('T')[0].split('-').reverse().join('/') : '—');
const brDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const codigoOf = (r: any) => (Array.isArray(r) ? r[0]?.codigo : r?.codigo) ?? '—';

// ---------- Minhas OS (RLS já filtra pelo cliente do portal) ----------
export interface MinhaOs { id: string; codigo: string; tipos: string; status: OsStatus; statusLabel: string; data: string; }
export async function listMinhasOs(): Promise<MinhaOs[]> {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select('id, codigo, status, data_programada, created_at, tipos_servico')
    .order('data_programada', { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data as any[]).map((o) => ({
    id: o.id, codigo: o.codigo, tipos: (o.tipos_servico as string[] | null ?? []).join(', ') || '—',
    status: o.status, statusLabel: osStatusLabel[o.status as OsStatus] ?? o.status,
    data: brDate(o.data_programada ?? o.created_at),
  }));
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
