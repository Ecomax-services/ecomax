import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { msgErro } from '@/lib/erros';
import { brDate } from '@/lib/operacional';
import { hojeEmBrasilia } from '@/lib/agenda/regras';
import {
  STATUS_CONCLUIDOS, cartaoDoPonto, compararPontos, dataDaExecucao, resumoDosPontos, tempoDeExecucao,
  type CartaoPonto, type PontoRegistrado,
} from '@/lib/historico/regras';

/**
 * Leitura do Histórico: a aba OS ("A executar" e "Concluídas") e o "Detalhes
 * do serviço" de uma OS concluída. Tudo pela RLS de sempre — o técnico lê só
 * as OS em que está escalado.
 */

const BUCKET_OS = 'operacional-docs';
const BUCKET_INSTITUCIONAL = 'institucional';

const nomeOf = (c: unknown): string => {
  const um = Array.isArray(c) ? c[0] : c;
  return (um as { nome?: string } | null)?.nome ?? '—';
};
const umSo = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

interface ClienteEndereco {
  nome?: string; logradouro?: string | null; numero?: string | null; complemento?: string | null;
  bairro?: string | null; cidade?: string | null; uf?: string | null;
}

function endereco(execucao: string | null, c: ClienteEndereco | null): string {
  if (execucao) return execucao;
  const linha = [c?.logradouro, c?.numero, c?.complemento, c?.bairro].filter(Boolean).join(', ');
  const cidade = [c?.cidade, c?.uf].filter(Boolean).join('/');
  return [linha, cidade].filter(Boolean).join(' - ') || '—';
}

// ---------------------------------------------------------------------------
// A executar
// ---------------------------------------------------------------------------

export interface OsDoDia {
  id: string;
  codigo: string;
  status: string;
  hora: string;
  cliente: string;
  endereco: string;
  tipos: string;
  duracao: string;
}

/**
 * As minhas OS programadas para hoje que ainda não foram executadas. É o que
 * o protótipo mostra em "A executar"; os outros dias ficam na Agenda, e a
 * execução só começa na data programada.
 */
export async function listOsDeHoje(): Promise<OsDoDia[]> {
  const hoje = hojeEmBrasilia();
  const { data, error } = await supabase
    .from('ordens_servico')
    .select('id, codigo, status, hora_prevista, duracao_estimada, tipos_servico, endereco_execucao, rascunho, cliente:cliente_id(nome, logradouro, numero, complemento, bairro, cidade, uf)')
    .eq('data_programada', hoje)
    .not('status', 'in', '(executada,concluida,cancelada,nao_executada)');
  if (error) throw new Error(msgErro(error));
  return (data ?? [])
    .filter((o) => !o.rascunho)
    .map((o) => ({
      id: o.id, codigo: o.codigo, status: o.status, hora: o.hora_prevista ?? '',
      cliente: nomeOf(o.cliente), endereco: endereco(o.endereco_execucao, umSo(o.cliente as ClienteEndereco | ClienteEndereco[] | null)),
      tipos: (o.tipos_servico ?? []).join(', ') || '—', duracao: o.duracao_estimada ?? '',
    }))
    .sort((a, b) => (a.hora || '99:99').localeCompare(b.hora || '99:99') || a.codigo.localeCompare(b.codigo));
}

// ---------------------------------------------------------------------------
// Concluídas
// ---------------------------------------------------------------------------

export interface OsConcluida {
  id: string;
  codigo: string;
  cliente: string;
  tipos: string;
  /** Dia da execução (ISO), para o filtro de período. */
  data: string | null;
}

/**
 * As minhas OS concluídas, da mais recente para a mais antiga. Busca e
 * período são filtrados na tela.
 *   [A DEFINIR — paginação. O teto de 500 cobre bem mais que um ano de um
 *   técnico; passando disso, vira busca no servidor.]
 */
export async function listConcluidas(): Promise<OsConcluida[]> {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select('id, codigo, tipos_servico, data_programada, termino_execucao, check_out_at, rascunho, cliente:cliente_id(nome)')
    .in('status', [...STATUS_CONCLUIDOS])
    .order('termino_execucao', { ascending: false, nullsFirst: false })
    .order('data_programada', { ascending: false, nullsFirst: false })
    .limit(500);
  if (error) throw new Error(msgErro(error));
  return (data ?? [])
    .filter((o) => !o.rascunho)
    .map((o) => ({
      id: o.id, codigo: o.codigo, cliente: nomeOf(o.cliente),
      tipos: (o.tipos_servico ?? []).join(', ') || '—',
      data: dataDaExecucao({ termino: o.termino_execucao, checkOut: o.check_out_at, dataProgramada: o.data_programada }),
    }))
    .sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''));
}

// ---------------------------------------------------------------------------
// Detalhes do serviço
// ---------------------------------------------------------------------------

export interface ProdutoUtilizado { id: string; nome: string; lote: string; qtd: string }
export interface Assinatura { papel: string; nome: string; url: string | null }
export interface Documento { chave: string; nome: string; info: string; caminho: string }
export interface CartaoComFotos extends CartaoPonto { fotos: { id: string; url: string }[] }

export interface DetalheConcluida {
  id: string;
  codigo: string;
  status: string;
  data: string | null;
  cliente: string;
  endereco: string;
  tipos: string;
  pragas: string;
  tempo: string | null;
  operador: string;
  produtos: ProdutoUtilizado[];
  pontos: CartaoComFotos[];
  resumoPontos: string;
  assinaturas: Assinatura[];
  documentos: Documento[];
  /** Caminho do PDF do certificado, que é o que o "Compartilhar" envia. */
  certificadoPdf: string | null;
}

const qtd = (n: number | null, unidade: string | null): string =>
  n == null ? '—' : `${n.toLocaleString('pt-BR')}${unidade ? ` ${unidade}` : ''}`;

async function assinar(bucket: string, caminhos: string[]): Promise<Map<string, string>> {
  const unicos = [...new Set(caminhos.filter((c) => c && !/^https?:\/\//.test(c)))];
  const mapa = new Map<string, string>(caminhos.filter((c) => /^https?:\/\//.test(c)).map((c) => [c, c]));
  if (unicos.length === 0) return mapa;
  const { data } = await supabase.storage.from(bucket).createSignedUrls(unicos, 60 * 60);
  for (const r of data ?? []) if (r.path && r.signedUrl) mapa.set(r.path, r.signedUrl);
  return mapa;
}

export async function getDetalheConcluida(osId: string): Promise<DetalheConcluida> {
  const [osR, prodR, planosR, aplR, fotosR, certR, relR] = await Promise.all([
    supabase.from('ordens_servico')
      .select('id, codigo, status, tipos_servico, pragas, descricao, endereco_execucao, data_programada, inicio_execucao, termino_execucao, check_in_at, check_out_at, assinatura_url, assinante_nome, tecnico_assinatura_url, executor:funcionarios!ordens_servico_tecnico_executor_id_fkey(nome_completo), cliente:cliente_id(nome, logradouro, numero, complemento, bairro, cidade, uf)')
      .eq('id', osId).single(),
    supabase.from('os_produtos')
      .select('id, qtd_utilizada, unidade, unidade_utilizada, lote, produto:produto_id(nome, unidade), lote_escolhido:estoque_lote_id(lote)')
      .eq('os_id', osId).gt('qtd_utilizada', 0).order('created_at'),
    supabase.from('os_planos_controle')
      .select('id, servico_codigo, pontos:os_plano_pontos(id, numero, identificacao, area, situacao, status_rotulo, contagens, sem_ocorrencia, observacao, acao_corretiva)')
      .eq('os_id', osId),
    supabase.from('os_aplicacoes')
      .select('id, tecnica, quantidade, unidade, lote, areas, produto:produto_id(nome)')
      .eq('os_id', osId).order('created_at'),
    supabase.from('os_anexos').select('id, arquivo_url, ponto_id').eq('os_id', osId).eq('tipo', 'foto').not('ponto_id', 'is', null),
    supabase.from('os_certificados')
      .select('numero, emitido_em, pdf_path, rt:responsavel_tecnico_id(nome, conselho, registro, assinatura_path)')
      .eq('os_id', osId).maybeSingle(),
    supabase.from('os_relatorios').select('id, titulo, arquivo_url, publicado_at, created_at')
      .eq('os_id', osId).eq('publicado', true).order('publicado_at', { ascending: false }),
  ]);
  for (const r of [osR, prodR, planosR, aplR, fotosR, certR, relR]) if (r.error) throw new Error(msgErro(r.error));
  const o = osR.data!;
  const cliente = umSo(o.cliente as ClienteEndereco | ClienteEndereco[] | null);

  const pontosBrutos: PontoRegistrado[] = (planosR.data ?? []).flatMap((p) =>
    (p.pontos ?? []).map((pt) => ({
      id: pt.id, servico: p.servico_codigo, numero: pt.numero, identificacao: pt.identificacao, area: pt.area,
      situacao: pt.situacao, statusRotulo: pt.status_rotulo,
      contagens: (pt.contagens as Record<string, number> | null) ?? null,
      semOcorrencia: pt.sem_ocorrencia, observacao: pt.observacao, acaoCorretiva: pt.acao_corretiva,
    })),
  ).sort(compararPontos);

  const cert = certR.data;
  const rt = umSo(cert?.rt as { nome: string; conselho: string | null; registro: string | null; assinatura_path: string | null } | null);

  const [urlsOs, urlsInst] = await Promise.all([
    assinar(BUCKET_OS, [
      ...(fotosR.data ?? []).map((f) => f.arquivo_url ?? ''),
      o.assinatura_url ?? '', o.tecnico_assinatura_url ?? '',
    ]),
    assinar(BUCKET_INSTITUCIONAL, [rt?.assinatura_path ?? '']),
  ]);

  const fotosPorPonto = new Map<string, { id: string; url: string }[]>();
  for (const f of fotosR.data ?? []) {
    const url = f.arquivo_url ? urlsOs.get(f.arquivo_url) : undefined;
    if (!url || !f.ponto_id) continue;
    fotosPorPonto.set(f.ponto_id, [...(fotosPorPonto.get(f.ponto_id) ?? []), { id: f.id, url }]);
  }

  // Desinsetização não tem ponto: o registro é a aplicação. Entra na mesma
  // lista, antes dos pontos, como no App.
  const aplicacoes: CartaoComFotos[] = (aplR.data ?? []).map((a) => ({
    id: a.id,
    nome: `DI · ${a.tecnica ?? 'Aplicação'}`,
    status: 'Aplicado',
    ok: true,
    obs: [
      [nomeOf(a.produto), a.lote ? `Lote ${a.lote}` : null, qtd(a.quantidade, a.unidade)].filter(Boolean).join(' · '),
      (a.areas ?? []).length ? `Áreas: ${(a.areas ?? []).join(', ')}` : null,
    ].filter(Boolean).join('\n'),
    fotos: [],
  }));

  const executor = umSo(o.executor as { nome_completo: string } | { nome_completo: string }[] | null);
  const assinaturas: Assinatura[] = [
    {
      papel: 'Cliente',
      nome: o.assinante_nome ?? '—',
      url: o.assinatura_url ? urlsOs.get(o.assinatura_url) ?? null : null,
    },
    {
      papel: 'Técnico executor',
      nome: executor?.nome_completo ?? '—',
      url: o.tecnico_assinatura_url ? urlsOs.get(o.tecnico_assinatura_url) ?? null : null,
    },
    {
      papel: ['Responsável técnico', rt?.conselho && rt?.registro ? `${rt.conselho} ${rt.registro}` : null].filter(Boolean).join(' · '),
      nome: rt?.nome ?? 'Aguardando o certificado',
      url: rt?.assinatura_path ? urlsInst.get(rt.assinatura_path) ?? null : null,
    },
  ];

  const documentos: Documento[] = [];
  if (cert?.pdf_path) {
    documentos.push({ chave: 'cert', nome: 'Certificado de Execução', info: `PDF gerado em ${brDate(cert.emitido_em)}`, caminho: cert.pdf_path });
  }
  for (const r of relR.data ?? []) {
    if (!r.arquivo_url) continue;
    documentos.push({ chave: r.id, nome: r.titulo || 'Relatório Técnico', info: `PDF gerado em ${brDate(r.publicado_at ?? r.created_at)}`, caminho: r.arquivo_url });
  }

  return {
    id: o.id, codigo: o.codigo, status: o.status,
    data: dataDaExecucao({ termino: o.termino_execucao, checkOut: o.check_out_at, dataProgramada: o.data_programada }),
    cliente: cliente?.nome ?? '—', endereco: endereco(o.endereco_execucao, cliente),
    tipos: (o.tipos_servico ?? []).join(', ') || '—',
    pragas: [(o.pragas ?? []).join(', '), o.descricao].filter(Boolean).join('. ') || '—',
    tempo: tempoDeExecucao(o.inicio_execucao ?? o.check_in_at, o.termino_execucao ?? o.check_out_at),
    operador: executor?.nome_completo ?? '—',
    produtos: (prodR.data ?? []).map((p) => {
      const produto = umSo(p.produto as { nome: string; unidade: string | null } | { nome: string; unidade: string | null }[] | null);
      const escolhido = umSo(p.lote_escolhido as { lote: string } | { lote: string }[] | null);
      return {
        id: p.id, nome: produto?.nome ?? 'Produto', lote: escolhido?.lote ?? p.lote ?? '—',
        qtd: qtd(p.qtd_utilizada, p.unidade_utilizada ?? p.unidade ?? produto?.unidade ?? null),
      };
    }),
    pontos: [...aplicacoes, ...pontosBrutos.map((p) => ({ ...cartaoDoPonto(p), fotos: fotosPorPonto.get(p.id) ?? [] }))],
    resumoPontos: resumoDosPontos(pontosBrutos),
    assinaturas,
    documentos,
    certificadoPdf: cert?.pdf_path ?? null,
  };
}

/** URL temporária de um documento da OS (caminho no bucket, ou URL pronta). */
export async function urlDoDocumento(caminho: string): Promise<string> {
  if (/^https?:\/\//.test(caminho)) return caminho;
  const { data, error } = await supabase.storage.from(BUCKET_OS).createSignedUrl(caminho, 60 * 10);
  if (error || !data?.signedUrl) throw new Error('Não foi possível abrir o documento.');
  return data.signedUrl;
}

/** Baixa o PDF para o cache do aparelho, para compartilhar o arquivo (e não um link que expira). */
export async function baixarPdf(caminho: string, nome: string): Promise<string> {
  const url = await urlDoDocumento(caminho);
  const destino = `${FileSystem.cacheDirectory}${nome.replace(/[^A-Za-z0-9._-]+/g, '-')}.pdf`;
  const r = await FileSystem.downloadAsync(url, destino);
  if (r.status !== 200) throw new Error('Não foi possível baixar o PDF.');
  return r.uri;
}
