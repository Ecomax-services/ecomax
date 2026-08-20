import { supabase } from '@/lib/supabase';
import type { Json, TablesUpdate } from '@/lib/database.types';
import type { Usuario, DocState } from '@/data/usuarios';

/** Linha crua da tabela `funcionarios` (subconjunto usado pela UI). */
export interface FuncionarioRow {
  id: string;
  nome_completo: string;
  cpf: string;
  rg: string | null;
  data_nascimento: string | null;
  telefone: string | null;
  email: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cargo: string;
  setor: string;
  gestor_id: string | null;
  data_admissao: string | null;
  carga_horaria: string | null;
  turno: string | null;
  ativo: boolean;
  aso_validade: string | null;
  aso_arquivo_url: string | null;
  cnh_numero: string | null;
  cnh_categoria: string | null;
  cnh_validade: string | null;
  cnh_arquivo_url: string | null;
  profile_id: string | null;
  avatar_url: string | null;
  observacoes: string | null;
  gestor?: { nome_completo: string } | { nome_completo: string }[] | null;
}

const DAY = 86400000;
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (n: number) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);

export function docState(date: string | null): DocState {
  if (!date) return 'na';
  const d = new Date(date + 'T00:00:00');
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const diff = (d.getTime() - t.getTime()) / DAY;
  if (diff < 0) return 'expired';
  if (diff <= 30) return 'soon';
  return 'ok';
}

function fmtDate(date: string | null): string {
  if (!date) return 'Não se aplica';
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

function initialsOf(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || 'U';
}

const gestorNome = (g: FuncionarioRow['gestor']): string => {
  const o = Array.isArray(g) ? g[0] : g;
  return o?.nome_completo ?? '—';
};

/** Converte a linha do banco para o shape `Usuario` consumido pela UI. */
export function toUsuario(r: FuncionarioRow): Usuario {
  return {
    id: r.id,
    name: r.nome_completo,
    initials: initialsOf(r.nome_completo),
    cpf: r.cpf,
    cargo: r.cargo,
    setor: r.setor,
    gestor: gestorNome(r.gestor),
    status: r.ativo ? 'Ativo' : 'Inativo',
    aso: fmtDate(r.aso_validade),
    asoState: docState(r.aso_validade),
    cnh: fmtDate(r.cnh_validade),
    cnhState: docState(r.cnh_validade),
    last: '—',
    access: !!r.profile_id,
  };
}

const LIST_SELECT =
  'id, nome_completo, cpf, cargo, setor, ativo, aso_validade, cnh_validade, profile_id, gestor:gestor_id(nome_completo)';

export type ListFilter = 'todos' | 'ativos' | 'inativos' | 'vencimentos';

export interface ListParams {
  filtro?: ListFilter;
  cargo?: string;
  setor?: string;
  gestor?: string; // gestor_id ou 'todos'
  search?: string;
  page?: number;
  pageSize?: number;
}

/** Lista funcionários com filtros/paginação SERVER-SIDE. */
export async function listFuncionarios(
  params: ListParams,
): Promise<{ rows: Usuario[]; total: number }> {
  const { filtro = 'todos', cargo, setor, gestor, search, page = 1, pageSize = 5 } = params;
  const from = (page - 1) * pageSize;

  let q = supabase.from('funcionarios').select(LIST_SELECT, { count: 'exact' });

  if (filtro === 'ativos') q = q.eq('ativo', true);
  else if (filtro === 'inativos') q = q.eq('ativo', false);
  else if (filtro === 'vencimentos') {
    const lim = addDaysISO(30);
    q = q.or(`aso_validade.lte.${lim},cnh_validade.lte.${lim}`);
  }
  if (cargo && cargo !== 'todos') q = q.eq('cargo', cargo);
  if (setor && setor !== 'todos') q = q.eq('setor', setor);
  if (gestor && gestor !== 'todos') q = q.eq('gestor_id', gestor);
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    q = q.or(`nome_completo.ilike.${s},cpf.ilike.${s}`);
  }

  const { data, count, error } = await q.order('nome_completo').range(from, from + pageSize - 1);
  if (error) throw new Error(error.message);
  return { rows: (data as FuncionarioRow[]).map(toUsuario), total: count ?? 0 };
}

export interface Kpis {
  ativos: number;
  inativos: number;
  vencidos: number;
  semAcesso: number;
}

/**
 * Contadores dos KPIs (queries de contagem, sem trazer linhas).
 *
 * `vencidos` e `semAcesso` contam só quem está ativo. Os quatro cartões ficam
 * lado a lado e se leem como um retrato de quem trabalha hoje: apontar
 * documento vencido ou falta de acesso de alguém desligado manda o admin
 * resolver algo que não existe. Antes os dois varriam a tabela inteira — a tela
 * dizia 10 "sem acesso" com 9 ativos nessa situação, sendo o décimo o inativo.
 */
export async function getKpis(): Promise<Kpis> {
  const t = todayISO();
  const base = () => supabase.from('funcionarios').select('id', { count: 'exact', head: true });
  const [ativos, inativos, vencidos, semAcesso] = await Promise.all([
    base().eq('ativo', true),
    base().eq('ativo', false),
    base().eq('ativo', true).or(`aso_validade.lt.${t},cnh_validade.lt.${t}`),
    base().eq('ativo', true).is('profile_id', null),
  ]);
  return {
    ativos: ativos.count ?? 0,
    inativos: inativos.count ?? 0,
    vencidos: vencidos.count ?? 0,
    semAcesso: semAcesso.count ?? 0,
  };
}

export interface AcessoStatus { bloqueado: boolean; ultimoLogin: string | null; }

/**
 * Bloqueio e último login. Vêm por função no banco porque moram em `auth.users`,
 * que o cliente não lê.
 */
export async function acessoStatus(profileId: string | null): Promise<AcessoStatus> {
  if (!profileId) return { bloqueado: false, ultimoLogin: null };
  const { data, error } = await supabase.rpc('acesso_status', { _profile_id: profileId });
  if (error) throw new Error(error.message);
  const r = Array.isArray(data) ? data[0] : data;
  return { bloqueado: r?.bloqueado === true, ultimoLogin: r?.ultimo_login ?? null };
}

export async function getFuncionario(id: string): Promise<FuncionarioRow | null> {
  const { data, error } = await supabase
    .from('funcionarios')
    .select('*, gestor:gestor_id(nome_completo)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as FuncionarioRow) ?? null;
}

/**
 * `TablesUpdate`, e não `Partial<FuncionarioRow>`: FuncionarioRow carrega o
 * campo `gestor`, que vem de um join e não é coluna. Com o tipo da linha, o
 * PostgREST recebia um campo inexistente e o ignorava calado.
 */
export async function updateFuncionario(id: string, patch: TablesUpdate<'funcionarios'>): Promise<void> {
  const { error } = await supabase.from('funcionarios').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function logAuditoria(
  funcionarioId: string | null,
  acao: string,
  detalhes?: Json,
  justificativa?: string,
): Promise<void> {
  const actor = await currentUserId();
  await supabase.from('auditoria').insert({
    actor_id: actor,
    funcionario_id: funcionarioId,
    acao,
    detalhes: detalhes ?? null,
    justificativa: justificativa ?? null,
  });
}

export async function setAtivo(id: string, ativo: boolean, nome: string): Promise<void> {
  await updateFuncionario(id, { ativo });
  await logAuditoria(id, ativo ? 'funcionario_ativado' : 'funcionario_inativado', { nome });
}

export async function bulkSetAtivo(ids: string[], ativo: boolean): Promise<void> {
  const { error } = await supabase.from('funcionarios').update({ ativo }).in('id', ids);
  if (error) throw new Error(error.message);
  await logAuditoria(null, ativo ? 'bulk_ativado' : 'bulk_inativado', { ids });
}

export interface AuditoriaRow {
  id: string;
  acao: string;
  detalhes: Record<string, unknown> | null;
  justificativa: string | null;
  created_at: string;
}

export async function listAuditoria(funcionarioId: string): Promise<AuditoriaRow[]> {
  const { data, error } = await supabase
    .from('auditoria')
    .select('id, acao, detalhes, justificativa, created_at')
    .eq('funcionario_id', funcionarioId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data as AuditoriaRow[]) ?? [];
}

/** Valores distintos de um campo (para os selects de filtro). */
export async function distinctValues(field: 'cargo' | 'setor'): Promise<string[]> {
  const { data, error } = await supabase.from('funcionarios').select(field);
  if (error) throw new Error(error.message);
  const set = new Set<string>();
  (data as Record<string, string>[]).forEach((r) => r[field] && set.add(r[field]));
  return [...set].sort();
}

export async function listGestores(): Promise<{ id: string; nome: string }[]> {
  const { data, error } = await supabase
    .from('funcionarios')
    .select('id, nome_completo')
    .order('nome_completo');
  if (error) throw new Error(error.message);
  return (data as { id: string; nome_completo: string }[]).map((r) => ({ id: r.id, nome: r.nome_completo }));
}

export async function listPerfisAcesso(): Promise<{ id: string; nome: string }[]> {
  const { data, error } = await supabase
    .from('perfis_acesso')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome');
  if (error) throw new Error(error.message);
  return (data as { id: string; nome: string }[]) ?? [];
}

export async function cpfExists(cpf: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('funcionarios')
    .select('id', { count: 'exact', head: true })
    .eq('cpf', cpf);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

// ---- Storage (documentos/foto) ----

const DOCS_BUCKET = 'funcionario-docs';

/** Faz upload de um arquivo para o bucket privado e retorna o caminho (path). */
export async function uploadFuncionarioFile(file: File, folder: string, kind: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const path = `${folder}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(DOCS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw new Error(error.message);
  return path;
}

/** Gera uma URL assinada (temporária) para exibir/baixar um documento privado. */
export async function signedDocUrl(path: string | null, expiresIn = 3600): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(DOCS_BUCKET).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

// ---- Operações privilegiadas (Edge Function funcionarios-admin) ----

async function invokeAdmin<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('funcionarios-admin', { body });
  if (error) {
    // A function retorna { error } com status !=2xx; supabase envelopa em FunctionsHttpError.
    const msg = (data as { error?: string })?.error || error.message;
    throw new Error(msg);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export interface NovoFuncionario {
  funcionario: Partial<FuncionarioRow>;
  acesso?: { email: string; role?: string; perfil_acesso_id?: string; senha_provisoria?: string };
}

export interface FuncionarioCriado {
  id: string;
  profile_id: string | null;
  /** undefined quando o funcionário foi criado sem acesso à plataforma. */
  email_enviado?: boolean;
  email_erro?: string;
}

export function criarFuncionario(payload: NovoFuncionario) {
  return invokeAdmin<FuncionarioCriado>({ action: 'create', ...payload });
}

/**
 * Dispara o e-mail de redefinição de senha.
 *
 * O `profileId` decide para qual app o link aponta: operador vai para o
 * aplicativo, cliente para o portal, o resto para o Backoffice. Sem ele a Edge
 * Function não tem como saber o papel, e mandar um operador para o Backoffice —
 * onde ele nem tem acesso — equivale a não mandar e-mail nenhum.
 */
export function resetSenha(funcionarioId: string, email: string, profileId?: string | null) {
  return invokeAdmin({
    action: 'reset_password',
    funcionario_id: funcionarioId,
    email,
    profile_id: profileId ?? null,
  });
}

export async function alterarPerfilAcesso(profileId: string, perfilId: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ perfil_acesso_id: perfilId }).eq('id', profileId);
  if (error) throw new Error(error.message);
}

export function setBloqueioLogin(
  funcionarioId: string,
  profileId: string,
  bloquear: boolean,
  justificativa?: string,
) {
  return invokeAdmin({
    action: 'set_block',
    funcionario_id: funcionarioId,
    profile_id: profileId,
    bloquear,
    justificativa,
  });
}

// ============================================================
// Operacional do funcionário — abas Cronograma, OS vinculadas e Indicadores
// ============================================================

export interface OsDoFuncionario {
  id: string;
  codigo: string;
  cliente: string;
  status: string;
  dataISO: string | null;
  data: string;
  checkIn: string | null;
  checkOut: string | null;
  /** Minutos entre check-in e check-out, quando os dois existem. */
  minutosEmCampo: number | null;
}

export interface IndicadoresFuncionario {
  atribuidas: number;
  executadas: number;
  concluidas: number;
  emAndamento: number;
  /** Média de minutos em campo entre as OS que têm os dois carimbos. */
  mediaMinutos: number | null;
  comCheckin: number;
}

/**
 * OS de um funcionário, com o que as três abas do detalhe precisam.
 *
 * As abas eram um marcador "(em breve)" que dizia depender de dados de OS "que
 * ainda não existem". Existem: `os_funcionarios` liga funcionário e OS desde o
 * Operacional, e os carimbos de campo vêm do app do operador.
 *
 * Uma consulta só para as três abas: elas mostram recortes diferentes do mesmo
 * conjunto, e buscar três vezes é como elas passam a discordar entre si.
 */
export async function listOsDoFuncionario(funcionarioId: string): Promise<OsDoFuncionario[]> {
  const { data, error } = await supabase
    .from('os_funcionarios')
    .select('os:os_id(id, codigo, status, data_programada, check_in_at, check_out_at, cliente:cliente_id(nome))')
    .eq('funcionario_id', funcionarioId);
  if (error) throw new Error(error.message);

  const hhmm = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;

  return ((data as any[]) ?? [])
    .map((v) => {
      const o = Array.isArray(v.os) ? v.os[0] : v.os;
      if (!o) return null;
      const c = Array.isArray(o.cliente) ? o.cliente[0] : o.cliente;
      const entrada = o.check_in_at ? new Date(o.check_in_at).getTime() : null;
      const saida = o.check_out_at ? new Date(o.check_out_at).getTime() : null;
      return {
        id: o.id,
        codigo: o.codigo,
        cliente: c?.nome ?? '—',
        status: o.status,
        dataISO: o.data_programada,
        data: o.data_programada ? o.data_programada.split('-').reverse().join('/') : '—',
        checkIn: hhmm(o.check_in_at),
        checkOut: hhmm(o.check_out_at),
        // Só conta quando os dois carimbos existem: um check-in sem saída não é
        // tempo em campo, é visita em aberto.
        minutosEmCampo: entrada && saida ? Math.max(0, Math.round((saida - entrada) / 60000)) : null,
      };
    })
    .filter((x): x is OsDoFuncionario => x !== null)
    // Sem data programada vai para o fim: é OS que ainda não foi agendada.
    .sort((a, b) => (b.dataISO ?? '').localeCompare(a.dataISO ?? ''));
}

export function indicadoresDe(os: OsDoFuncionario[]): IndicadoresFuncionario {
  const comTempo = os.filter((o) => o.minutosEmCampo != null);
  return {
    atribuidas: os.length,
    executadas: os.filter((o) => o.status === 'executada').length,
    concluidas: os.filter((o) => o.status === 'concluida').length,
    emAndamento: os.filter((o) => o.status === 'em_andamento').length,
    comCheckin: os.filter((o) => o.checkIn).length,
    mediaMinutos: comTempo.length
      ? Math.round(comTempo.reduce((s, o) => s + (o.minutosEmCampo ?? 0), 0) / comTempo.length)
      : null,
  };
}
