import { supabase } from '@/lib/supabase';

/** Bucket privado dos documentos que o portal enxerga. */
const BUCKET = 'portal-docs';

/**
 * URL temporária para abrir um documento.
 *
 * O bucket não é público: quem autoriza é a policy de SELECT, avaliada no
 * momento em que a URL é assinada. Devolve null em vez de lançar porque a falha
 * é sempre local a um arquivo — caminho antigo, objeto removido — e não deve
 * derrubar a tela inteira.
 */
export async function urlAssinada(caminho: string | null, segundos = 60 * 60): Promise<string | null> {
  if (!caminho) return null;
  // Documento cadastrado como link externo (o registro na ANVISA, por exemplo)
  // não passa pelo storage.
  if (/^https?:\/\//.test(caminho)) return caminho;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, segundos);
  return data?.signedUrl ?? null;
}

/** Abre um documento numa aba nova, pedindo a URL assinada na hora do clique. */
export async function abrirDocumento(caminho: string | null): Promise<void> {
  const url = await urlAssinada(caminho);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

const brDate = (iso: string | null) => (iso ? iso.split('T')[0].split('-').reverse().join('/') : '—');

/** Faltando, a vencer ou vencido — o mesmo vocabulário nas três telas. */
export type EstadoValidade = 'valido' | 'vence_em_breve' | 'vencido' | 'indisponivel';

const DIAS_ALERTA = 30;

/**
 * Classifica uma validade.
 *
 * A data é comparada a partir da meia-noite de hoje: usar o horário atual faria
 * um documento que vence hoje aparecer como vencido depois do almoço.
 */
export function estadoValidade(iso: string | null): EstadoValidade {
  if (!iso) return 'indisponivel';
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const d = new Date(`${iso.split('T')[0]}T00:00:00`);
  const dias = (d.getTime() - hoje.getTime()) / 86_400_000;
  if (dias < 0) return 'vencido';
  if (dias <= DIAS_ALERTA) return 'vence_em_breve';
  return 'valido';
}

export const validadeMeta: Record<EstadoValidade, { label: string; classe: string }> = {
  valido: { label: 'Válido', classe: 'bg-forest-100 text-forest-900' },
  vence_em_breve: { label: 'Vence em breve', classe: 'bg-warnTag-bg text-warnTag-fg' },
  vencido: { label: 'Vencido', classe: 'bg-expiredTag-bg text-expiredTag-fg' },
  indisponivel: { label: 'Indisponível', classe: 'bg-ink-50 text-ink-400' },
};

// ===========================================================================
// Documentos
// ===========================================================================

export interface DocumentoCliente {
  id: string;
  categoria: string;
  titulo: string;
  descricao: string | null;
  arquivoUrl: string | null;
  validade: string | null;
  validadeBr: string;
  estado: EstadoValidade;
  /** Sem cliente = documento institucional, igual para todos os clientes. */
  institucional: boolean;
  /** Data de cadastro, usada pelo indicador "emitidos nos últimos 30 dias". */
  criadoEm: string | null;
}

export async function listDocumentos(): Promise<DocumentoCliente[]> {
  // O RLS já entrega só o que é institucional ou do cliente logado, e só ativo.
  const { data, error } = await supabase
    .from('cliente_documentos')
    .select('id, cliente_id, categoria, titulo, descricao, arquivo_url, validade, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as any[]).map((d) => ({
    id: d.id,
    categoria: d.categoria,
    titulo: d.titulo,
    descricao: d.descricao,
    arquivoUrl: d.arquivo_url,
    validade: d.validade,
    validadeBr: brDate(d.validade),
    estado: estadoValidade(d.validade),
    institucional: d.cliente_id === null,
    criadoEm: d.created_at ? d.created_at.slice(0, 10) : null,
  }));
}

/** Categorias do catálogo, para as abas da tela ficarem estáveis mesmo vazias. */
export async function listCategoriasDocumento(): Promise<string[]> {
  const { data, error } = await supabase
    .from('catalogo_itens')
    .select('nome')
    .eq('catalogo', 'categorias_documento_cliente')
    .eq('ativo', true)
    .order('ordem');
  if (error) throw new Error(error.message);
  return (data as { nome: string }[]).map((c) => c.nome);
}

// ===========================================================================
// Produtos
// ===========================================================================

export interface ProdutoCliente {
  id: string;
  nome: string;
  codigo: string;
  categoria: string;
  fichaTecnicaUrl: string | null;
  fichaEmergenciaUrl: string | null;
  fdsUrl: string | null;
  anvisaUrl: string | null;
  registroAnvisa: string | null;
  /** Homologado e dentro da validade. */
  disponivel: boolean;
  homologadoAte: string;
}

export async function listProdutos(): Promise<ProdutoCliente[]> {
  // Duas consultas em vez de um join: `produtos` e a homologação têm policies
  // diferentes, e um produto aplicado numa OS aparece mesmo sem homologação.
  const [prod, homol] = await Promise.all([
    supabase
      .from('produtos')
      .select('id, nome, codigo, categoria, ficha_tecnica_url, ficha_emergencia_url, fds_url, anvisa_url, registro_anvisa')
      .eq('ativo', true)
      .order('nome'),
    supabase.from('cliente_produtos_homologados').select('produto_id, validade'),
  ]);
  if (prod.error) throw new Error(prod.error.message);
  if (homol.error) throw new Error(homol.error.message);

  const porProduto = new Map<string, string | null>();
  for (const h of (homol.data as any[]) ?? []) porProduto.set(h.produto_id, h.validade);

  return (prod.data as any[]).map((p) => {
    const homologado = porProduto.has(p.id);
    const validade = porProduto.get(p.id) ?? null;
    return {
      id: p.id,
      nome: p.nome,
      codigo: p.codigo,
      categoria: p.categoria,
      fichaTecnicaUrl: p.ficha_tecnica_url,
      fichaEmergenciaUrl: p.ficha_emergencia_url,
      fdsUrl: p.fds_url,
      anvisaUrl: p.anvisa_url,
      registroAnvisa: p.registro_anvisa,
      // "Disponível" = homologado para este cliente e ainda válido. Produto que
      // aparece só por ter sido aplicado numa OS não está homologado, e dizer o
      // contrário seria afirmar uma aprovação que não existe.
      disponivel: homologado && estadoValidade(validade) !== 'vencido',
      homologadoAte: homologado ? brDate(validade) : '—',
    };
  });
}

// ===========================================================================
// Colaboradores
// ===========================================================================

export interface DocumentoColaborador {
  tipo: string;
  validade: string | null;
  validadeBr: string;
  estado: EstadoValidade;
  arquivoUrl: string | null;
}

export interface Colaborador {
  id: string;
  nome: string;
  cargo: string;
  /** Chaveado por tipo de documento, para a matriz montar por coluna. */
  documentos: Record<string, DocumentoColaborador>;
}

export async function listColaboradores(): Promise<Colaborador[]> {
  const [func, docs] = await Promise.all([
    // `!inner` em os_funcionarios é o que restringe a lista a quem foi escalado
    // numa OS deste cliente. Pedir `funcionarios` solto traria também a própria
    // pessoa logada, pela policy funcionarios_self_select — a conta do portal
    // nasce com uma linha em funcionarios, criada pela Gestão de Usuários.
    supabase
      .from('funcionarios')
      .select('id, nome_completo, cargo, os_funcionarios!inner(os_id)')
      .eq('ativo', true)
      .order('nome_completo'),
    supabase.from('funcionario_documentos').select('funcionario_id, tipo, validade, arquivo_url'),
  ]);
  if (func.error) throw new Error(func.error.message);
  if (docs.error) throw new Error(docs.error.message);

  const porFuncionario = new Map<string, Record<string, DocumentoColaborador>>();
  for (const d of (docs.data as any[]) ?? []) {
    const mapa = porFuncionario.get(d.funcionario_id) ?? {};
    mapa[d.tipo] = {
      tipo: d.tipo,
      validade: d.validade,
      validadeBr: brDate(d.validade),
      estado: estadoValidade(d.validade),
      arquivoUrl: d.arquivo_url,
    };
    porFuncionario.set(d.funcionario_id, mapa);
  }

  // O join pode repetir a pessoa, uma vez por OS em que ela entrou.
  const unicos = new Map<string, any>();
  for (const f of (func.data as any[]) ?? []) if (!unicos.has(f.id)) unicos.set(f.id, f);

  return [...unicos.values()].map((f) => ({
    id: f.id,
    nome: f.nome_completo,
    cargo: f.cargo ?? '—',
    documentos: porFuncionario.get(f.id) ?? {},
  }));
}

/** Colunas da matriz, na ordem do catálogo. */
export async function listTiposDocumentoColaborador(): Promise<string[]> {
  const { data, error } = await supabase
    .from('catalogo_itens')
    .select('nome')
    .eq('catalogo', 'documentos_colaborador')
    .eq('ativo', true)
    .order('ordem');
  if (error) throw new Error(error.message);
  return (data as { nome: string }[]).map((c) => c.nome);
}

// ===========================================================================
// Início
// ===========================================================================

export interface ProximaVisita {
  id: string;
  osCodigo: string;
  data: string;
  /** Nulo quando a OS ainda não tem data programada. */
  dataIso: string | null;
  diaSemana: string;
  servico: string;
  local: string;
  status: string;
}

export interface AlertaValidade {
  id: string;
  titulo: string;
  detalhe: string;
  validadeBr: string;
  estado: EstadoValidade;
  arquivoUrl: string | null;
}

export interface ResumoInicio {
  osAbertas: number;
  documentosRecentes: number;
  aVencer: number;
  naoLidas: number;
  proximaVisita: ProximaVisita | null;
  proximasVisitas: ProximaVisita[];
  ultimosDocumentos: DocumentoCliente[];
  alertas: AlertaValidade[];
}

const DIA_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/**
 * Tudo o que a tela Início mostra, numa chamada só.
 *
 * Reaproveita as listas das outras telas em vez de escrever consultas próprias:
 * o portal de um cliente lida com dezenas de linhas, não milhares, e ter uma
 * origem só evita o clássico de o indicador discordar da tela que ele resume.
 */
export async function getResumoInicio(): Promise<ResumoInicio> {
  const [os, docs, colaboradores, naoLidasRes] = await Promise.all([
    listMinhasOsComData(),
    listDocumentos(),
    listColaboradores(),
    supabase.from('notificacoes').select('id', { count: 'exact', head: true }).eq('lida', false),
  ]);

  const hojeIso = new Date().toISOString().slice(0, 10);

  const futuras = os
    .filter((o) => o.dataIso && o.dataIso >= hojeIso && o.status !== 'cancelada' && o.status !== 'concluida')
    .sort((a, b) => (a.dataIso ?? '').localeCompare(b.dataIso ?? ''));

  const trintaDiasAtras = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

  // "A vencer" junta documentos do cliente e documentos de quem o atende: para
  // quem está do lado de fora, é tudo conformidade do serviço contratado.
  const alertas: AlertaValidade[] = [
    ...docs
      .filter((d) => d.validade && d.estado !== 'valido')
      .map((d) => ({
        id: d.id,
        titulo: d.titulo,
        detalhe: d.categoria,
        validadeBr: d.validadeBr,
        estado: d.estado,
        arquivoUrl: d.arquivoUrl,
      })),
    ...colaboradores.flatMap((c) =>
      Object.values(c.documentos)
        .filter((doc) => doc.validade && doc.estado !== 'valido')
        .map((doc) => ({
          id: `${c.id}-${doc.tipo}`,
          titulo: `${doc.tipo}: ${c.nome}`,
          detalhe: c.cargo,
          validadeBr: doc.validadeBr,
          estado: doc.estado,
          arquivoUrl: doc.arquivoUrl,
        })),
    ),
  ].sort((a, b) => (a.validadeBr < b.validadeBr ? -1 : 1));

  return {
    osAbertas: os.filter((o) => o.status === 'em_aberto' || o.status === 'em_andamento').length,
    documentosRecentes: docs.filter((d) => (d.criadoEm ?? '') >= trintaDiasAtras).length,
    aVencer: alertas.length,
    naoLidas: naoLidasRes.count ?? 0,
    proximaVisita: futuras[0] ?? null,
    proximasVisitas: futuras.slice(0, 3),
    ultimosDocumentos: docs.slice(0, 4),
    alertas: alertas.slice(0, 5),
  };
}

/** Como listMinhasOs, mas guardando a data crua, que o Início precisa comparar. */
async function listMinhasOsComData() {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select('id, codigo, status, data_programada, created_at, tipos_servico, endereco_execucao, cliente:cliente_id(nome)')
    .order('data_programada', { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data as any[]).map((o) => {
    const c = Array.isArray(o.cliente) ? o.cliente[0] : o.cliente;
    const iso: string | null = o.data_programada;
    return {
      id: o.id,
      osCodigo: o.codigo,
      status: o.status as string,
      dataIso: iso,
      data: brDate(iso),
      diaSemana: iso ? DIA_SEMANA[new Date(`${iso}T00:00:00`).getDay()] : '',
      servico: (o.tipos_servico as string[] | null ?? []).join(', ') || '—',
      local: [c?.nome, o.endereco_execucao].filter(Boolean).join(' · ') || '—',
    };
  });
}
