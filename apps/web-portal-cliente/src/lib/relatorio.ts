/**
 * Relatório técnico — montagem dos blocos. Fonte da verdade compartilhada.
 *
 * ARQUIVO CANÔNICO. Copiado para os apps por `scripts/sync-shared.sh`; o CI
 * falha se alguma cópia divergir. Edite aqui, rode o script, commite tudo.
 *
 * Por que existe: o relatório aparece em dois lugares — a tela do Backoffice
 * (aba Blocos, pré-visualização) e o PDF publicado ao cliente (Edge Function).
 * Os dois partem dos mesmos dados crus (`relatorio_dados` no banco) e passam
 * por aqui. Se cada um montasse do seu jeito, o cliente receberia um PDF
 * diferente do que o escritório revisou.
 *
 * Regras do protótipo aprovado do Backoffice ("Versão Final", aprovado em
 * 06/10/2026), aba "Blocos do relatório":
 *   - um bloco por área × serviço × fase;
 *   - ordem: Desinsetização, Porta-Isca, Placa Adesiva, Comparativo (quando a
 *     área tem Porta-Isca e Placa Adesiva), Captura Não-Alvo, Armadilhas
 *     Luminosas, Pragas de Grãos, Ocorrências;
 *   - Captura Não-Alvo e Comparativo saem ocultos por padrão;
 *   - legenda 1 a 4 só na Desratização (Porta-Isca e Placa Adesiva).
 * Sem dependências: roda igual no React, no Deno e no teste.
 */

import { codigoDoPonto } from './monitoramento';

// ---------------------------------------------------------------------------
// Dados crus (o que `relatorio_dados` devolve)
// ---------------------------------------------------------------------------

export type Frequencia = 'semanal' | 'quinzenal' | 'mensal';

export interface DadosRelatorio {
  os: {
    id: string; codigo: string; status: string; tipos: string[]; pragas: string[];
    data_execucao: string; inicio: string | null; termino: string | null;
    endereco_execucao: string | null; assinante_nome: string | null;
    cliente: { id: string; nome: string; endereco: string | null };
    equipe: string[]; tecnico_executor: string | null;
  };
  empresa: { razao_social: string | null; cnpj: string | null; endereco: string | null; contato: string | null; ceatox: string | null; logo_path: string | null } | null;
  licencas: { rotulo: string; descricao: string }[];
  responsavel_tecnico: { nome: string; formacao: string | null; conselho: string | null; registro: string | null } | null;
  relatorio: { versao_atual: number; versao_publicada: number | null; publicado_em: string | null } | null;
  janela: { de: string; ate: string };
  historico: Historico;
  areas: { id: string; nome: string; ordem: number | null }[];
  visitas: { os_id: string; codigo: string; data: string }[];
  planos: { id: string; servico: string | null; tipo_controle: string; frequencia: string | null }[];
  pontos: PontoLido[];
  aplicacoes: { id: string; produto: string | null; lote: string | null; tecnica: string | null; quantidade: number | null; unidade: string | null; areas: string[] }[];
  placas: { id: string; area_id: string | null; fase: number | null; numero: number; local: string | null }[];
  capturas: { os_id: string; cliente_ponto_id: string; especie: string }[];
  especies_nao_alvo: string[];
  legendas: { tipo_servico: string; servico: string; codigo: number; nome: string; cor_bg: string | null; cor_fg: string | null }[];
}

/** Histórico agregado por mês, do 1º de janeiro do ano anterior até a execução. */
export interface Historico {
  ano: number;
  mes_atual: number;
  visitas: ({ ano: number; mes: number; servico: string; fase: number | null; n: number } & AreaCrua)[];
  status: ({ ano: number; mes: number; servico: string; fase: number | null; codigo: number; n: number } & AreaCrua)[];
  contagens: ({ ano: number; mes: number; servico: string; especie: string; total: number } & AreaCrua)[];
  ocorrencias: ({ ano: number; mes: number; n: number } & AreaCrua)[];
  capturas: { ano: number; mes: number; area_id: string | null; especie: string; n: number }[];
}

interface AreaCrua { area_id: string | null; area_texto: string | null }

export interface PontoLido {
  os_id: string; id: string; cliente_ponto_id: string | null;
  area_id: string | null; area_texto: string | null; servico: string | null;
  fase: number | null; numero: number; local: string | null;
  situacao: string | null; status_codigo: number | null; status_rotulo: string | null;
  contagens: Record<string, number> | null; sem_ocorrencia: boolean | null;
  observacao: string | null; acao_corretiva: string | null;
}

/** O que a versão do relatório guarda (`os_relatorio_versoes.conteudo`). */
export interface ConteudoVersao {
  observacoes?: string;
  recomendacoes?: string;
  parecer?: string;
  sugestoes?: string;
  blocos?: Record<string, string>;
  visibilidade?: Record<string, boolean>;
  frequencias?: Record<string, Frequencia>;
}

// ---------------------------------------------------------------------------
// Blocos
// ---------------------------------------------------------------------------

export type TipoBloco = 'aplicacao' | 'status' | 'comparativo' | 'captura' | 'contagem' | 'ocorrencia';

/** Serviço do bloco: os seis do monitoramento, mais Captura (CN) e Comparativo (CMP). */
export type ServicoBloco = 'DI' | 'PI' | 'PA' | 'CMP' | 'CN' | 'AL' | 'PG' | 'OC';

const ORDEM: ServicoBloco[] = ['DI', 'PI', 'PA', 'CMP', 'CN', 'AL', 'PG', 'OC'];

/** Nomes do protótipo do relatório (não os do App). */
export const NOME_BLOCO: Record<ServicoBloco, string> = {
  DI: 'Desinsetização',
  PI: 'Desratização · Porta-Isca',
  PA: 'Desratização · Placa Adesiva',
  CMP: 'Pontos de Monitoramento · Iscas Consumidas × Placas com Ocorrência',
  CN: 'Captura Não-Alvo',
  AL: 'Armadilhas Luminosas',
  PG: 'Pragas de Grãos',
  OC: 'Ocorrências',
};

const UNIDADE: Record<ServicoBloco, string> = {
  DI: 'pontos de aplicação', PI: 'porta-iscas', PA: 'placas', CMP: 'pontos',
  CN: 'placas monitoradas', AL: 'armadilhas', PG: 'amostras', OC: 'registros',
};

const TIPO: Record<ServicoBloco, TipoBloco> = {
  DI: 'aplicacao', PI: 'status', PA: 'status', CMP: 'comparativo',
  CN: 'captura', AL: 'contagem', PG: 'contagem', OC: 'ocorrencia',
};

/** Ocultos por padrão: "situação atípica" e "bloco opcional" no protótipo. */
const OCULTO_PADRAO: ServicoBloco[] = ['CN', 'CMP'];

/** Cores da legenda 1–4 do protótipo, quando a Planilha não define cor. */
const COR_PADRAO: Record<number, { bg: string; fg: string }> = {
  1: { bg: '#fdece8', fg: '#c2410c' },
  2: { bg: '#fdf3e6', fg: '#b45309' },
  3: { bg: '#eaf6ea', fg: '#1a5c1a' },
  4: { bg: '#ffddd5', fg: '#a81400' },
};

export interface Visita { os_id: string; codigo: string; data: string }
export interface ItemLegenda { codigo: number | string; nome: string; bg: string; fg: string }

export interface BlocoBase {
  id: string;
  tipo: TipoBloco;
  servico: ServicoBloco;
  areaId: string | null;
  areaNome: string;
  fase: number | null;
  /** "Desratização · Porta-Isca (semanal) · Fábrica · Fase 1" */
  titulo: string;
  /** Rótulo no índice, sem a área (que já está no grupo). */
  rotulo: string;
  unidade: string;
  frequenciaPadrao: Frequencia | null;
  frequencia: Frequencia | null;
  ocultoPadrao: boolean;
  incluido: boolean;
  /** Texto livre do bloco na versão ("Bloco descritivo deste serviço"). */
  texto: string;
  /** Linha de resumo do protótipo, usada no painel, na pré-visualização e no PDF. */
  resumo: string;
}

/** Doze meses; `null` = sem valor (mês sem visita, ou ainda por vir). */
export type Meses = (number | null)[];

export const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** "Consolidação anual · Evolução mês a mês · meses sem visita aparecem sem valor". */
export interface Consolidacao { ano: number; mesAtual: number; linhas: { codigo: number | string; nome: string; valores: Meses }[] }

/** "Tendência <ano anterior> × <ano> · <rótulo>". */
export interface Tendencia {
  ano: number;
  anoAnterior: number;
  /** Último mês do ano com dado (1–12); 0 quando ainda não há. */
  ate: number;
  rotulo: string;
  atual: Meses;
  anterior: Meses;
  somaAtual: number;
  somaAnterior: number;
  /** Variação percentual contra o ano anterior; `null` sem base de comparação. */
  variacao: number | null;
}

export interface LinhaGrade { chave: string; codigo: string; local: string; celulas: Record<string, { valor: number | string; rotulo: string } | null> }

export interface BlocoStatus extends BlocoBase {
  tipo: 'status' | 'captura';
  visitas: Visita[];
  linhas: LinhaGrade[];
  legenda: ItemLegenda[];
  totais: { codigo: number | string; nome: string; n: number }[];
  verificados: number;
  total: number;
  consolidacao: Consolidacao;
  tendencia: Tendencia;
}

export interface BlocoContagem extends BlocoBase {
  tipo: 'contagem';
  visitas: Visita[];
  especies: string[];
  linhas: { chave: string; codigo: string; local: string; contagens: Record<string, number>; total: number }[];
  totalGeral: number;
  indiceMedio: number;
  /** "Evolução mensal do total capturado" e "Visão mensal por tipo". */
  mensal: { ano: number; mesAtual: number; total: Meses; porTipo: { especie: string; valores: Meses }[] };
  tendencia: Tendencia;
}

export interface BlocoAplicacao extends BlocoBase {
  tipo: 'aplicacao';
  aplicacoes: { produto: string; lote: string; tecnica: string; areas: string; quantidade: string }[];
}

export interface BlocoOcorrencia extends BlocoBase {
  tipo: 'ocorrencia';
  linhas: { data: string; setor: string; ocorrencia: string; praga: string; acao: string }[];
  /** "Visão por período": ocorrências registradas por mês. */
  mensal: { ano: number; mesAtual: number; registradas: Meses };
  tendencia: Tendencia;
}

export interface BlocoComparativo extends BlocoBase {
  tipo: 'comparativo';
  ano: number;
  mesAtual: number;
  /** Mês a mês: iscas consumidas (Porta-Isca com status 1) e placas com ocorrência (Placa Adesiva com status 1). */
  iscas: Meses;
  placas: Meses;
  totalIscas: number;
  totalPlacas: number;
  portaIscas: number;
  placasAdesivas: number;
  /** "1,5 iscas consumidas por placa com ocorrência" / "Sem placas com ocorrência no período". */
  relacao: string;
}

export type Bloco = BlocoStatus | BlocoContagem | BlocoAplicacao | BlocoOcorrencia | BlocoComparativo;

export interface GrupoDeBlocos { areaId: string | null; areaNome: string; blocos: Bloco[] }

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

export const ddmm = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function frequenciaDe(texto: string | null | undefined): Frequencia | null {
  const t = (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (t.startsWith('seman')) return 'semanal';
  if (t.startsWith('quinz')) return 'quinzenal';
  if (t.startsWith('mens')) return 'mensal';
  return null;
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** "4 visitas no período · 13/07 a 03/08"; uma visita: só a data. */
export function rotuloDoPeriodo(visitas: Visita[]): string {
  if (visitas.length === 0) return 'nenhuma visita no período';
  if (visitas.length === 1) return `1 visita no período · ${ddmm(visitas[0].data)}`;
  return `${visitas.length} visitas no período · ${ddmm(visitas[0].data)} a ${ddmm(visitas[visitas.length - 1].data)}`;
}

function slug(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'area';
}

interface Area { chave: string; id: string | null; nome: string; ordem: number }

/** A área de um ponto: a do mapa do cliente; senão o texto gravado; senão "Geral". */
function areaDoPonto(p: { area_id: string | null; area_texto: string | null }, areas: Map<string, Area>): Area {
  if (p.area_id && areas.has(p.area_id)) return areas.get(p.area_id)!;
  if (p.area_texto) return { chave: `txt-${slug(p.area_texto)}`, id: null, nome: p.area_texto, ordem: 900 };
  return { chave: 'geral', id: null, nome: 'Geral', ordem: 999 };
}

const idDoBloco = (area: Area, servico: ServicoBloco, fase: number | null) => `${area.chave}:${servico}${fase ? `:f${fase}` : ''}`;

/**
 * Os doze meses de um ano: o valor nos meses com visita; sem valor nos meses
 * sem visita e nos que ainda não chegaram ("meses sem visita aparecem sem
 * valor", no protótipo).
 */
function meses(ano: number, ate: number, comVisita: Set<string>, valor: (mes: number) => number): Meses {
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return m > ate || !comVisita.has(`${ano}-${m}`) ? null : valor(m);
  });
}

/**
 * Tendência: o ano da execução, de janeiro até o último mês com dado, contra o
 * mesmo período do ano anterior. Variação negativa é melhora (menos atividade).
 */
export function tendencia(ano: number, mesAtual: number, comVisita: Set<string>, valorDe: (ano: number, mes: number) => number, rotulo: string): Tendencia {
  const atual = meses(ano, mesAtual, comVisita, (m) => valorDe(ano, m));
  const anterior = meses(ano - 1, 12, comVisita, (m) => valorDe(ano - 1, m));
  let ate = 0;
  atual.forEach((v, i) => { if (v != null) ate = i + 1; });
  const soma = (xs: Meses) => xs.slice(0, ate).reduce<number>((t, v) => t + (v ?? 0), 0);
  const somaAtual = soma(atual);
  const somaAnterior = soma(anterior);
  const variacao = somaAnterior > 0 ? Math.round(((somaAtual - somaAnterior) / somaAnterior) * 100) : null;
  return { ano, anoAnterior: ano - 1, ate, rotulo, atual, anterior, somaAtual, somaAnterior, variacao };
}

const somaMeses = (xs: Meses) => xs.reduce<number>((t, v) => t + (v ?? 0), 0);

// ---------------------------------------------------------------------------
// Montagem
// ---------------------------------------------------------------------------

/**
 * Monta os blocos do relatório a partir dos dados crus e do conteúdo da
 * versão (textos, incluir/ocultar, frequência). Devolve TODOS os blocos;
 * `incluidos()` filtra o que vai para a pré-visualização e o PDF.
 */
export function montarBlocos(dados: DadosRelatorio, conteudo: ConteudoVersao = {}): GrupoDeBlocos[] {
  const areas = new Map<string, Area>(dados.areas.map((a) => [a.id, { chave: a.id, id: a.id, nome: a.nome, ordem: a.ordem ?? 500 }]));
  const osId = dados.os.id;
  const visitas = [...dados.visitas].sort((a, b) => a.data.localeCompare(b.data) || a.codigo.localeCompare(b.codigo));
  const freqPlano = new Map<string, Frequencia | null>();
  for (const p of dados.planos) if (p.servico && !freqPlano.has(p.servico)) freqPlano.set(p.servico, frequenciaDe(p.frequencia));
  const servicosDaOs = new Set(dados.planos.map((p) => p.servico).filter(Boolean) as string[]);

  // Histórico mês a mês, pela mesma chave de área dos blocos.
  const h = dados.historico;
  const ano = h.ano;
  const mesAtual = h.mes_atual;
  const chaveDe = (r: { area_id: string | null; area_texto: string | null }) => areaDoPonto(r, areas).chave;
  const mesesComVisita = (area: Area, servicos: string[], fase?: number | null) => new Set(
    h.visitas
      .filter((v) => chaveDe(v) === area.chave && servicos.includes(v.servico) && (fase === undefined || (v.fase ?? null) === fase))
      .map((v) => `${v.ano}-${v.mes}`),
  );
  const somaStatus = (area: Area, servicos: string[], fase: number | null | undefined, ano_: number, mes: number, filtro: (codigo: number) => boolean) =>
    h.status
      .filter((r) => r.ano === ano_ && r.mes === mes && chaveDe(r) === area.chave && servicos.includes(r.servico)
        && (fase === undefined || (r.fase ?? null) === fase) && filtro(r.codigo))
      .reduce((t, r) => t + r.n, 0);

  // Agrupa as leituras por bloco (área × serviço × fase).
  const porBloco = new Map<string, { area: Area; servico: ServicoBloco; fase: number | null; pontos: PontoLido[] }>();
  for (const p of dados.pontos) {
    if (!p.servico || !['PI', 'PA', 'AL', 'PG', 'OC'].includes(p.servico)) continue;
    const area = areaDoPonto(p, areas);
    const servico = p.servico as ServicoBloco;
    // Fase só separa bloco na Desratização (Porta-Isca e Placa Adesiva), como no protótipo.
    const fase = servico === 'PI' || servico === 'PA' ? p.fase ?? null : null;
    const id = idDoBloco(area, servico, fase);
    const b = porBloco.get(id) ?? { area, servico, fase, pontos: [] };
    b.pontos.push(p);
    porBloco.set(id, b);
  }

  const blocos: Bloco[] = [];
  const base = (area: Area, servico: ServicoBloco, fase: number | null, resumo: string, freqPadrao: Frequencia | null): BlocoBase => {
    const id = idDoBloco(area, servico, fase);
    const ocultoPadrao = OCULTO_PADRAO.includes(servico);
    const frequencia = freqPadrao ? conteudo.frequencias?.[id] ?? freqPadrao : null;
    const rotulo = `${NOME_BLOCO[servico]}${frequencia ? ` (${frequencia})` : ''}${fase ? ` · Fase ${fase}` : ''}`;
    return {
      id, tipo: TIPO[servico], servico, areaId: area.id, areaNome: area.nome, fase,
      titulo: `${NOME_BLOCO[servico]}${frequencia ? ` (${frequencia})` : ''} · ${area.nome}${fase ? ` · Fase ${fase}` : ''}`,
      rotulo, unidade: UNIDADE[servico], frequenciaPadrao: freqPadrao, frequencia,
      ocultoPadrao, incluido: conteudo.visibilidade?.[id] ?? !ocultoPadrao,
      texto: conteudo.blocos?.[id] ?? '', resumo,
    };
  };

  // Desinsetização: registro de aplicação desta OS, por área citada na aplicação.
  if (servicosDaOs.has('DI')) {
    const porArea = new Map<string, { area: Area; itens: BlocoAplicacao['aplicacoes'] ; tecnicas: Set<string> }>();
    const nomeParaArea = new Map([...areas.values()].map((a) => [a.nome.toLowerCase(), a]));
    for (const a of dados.aplicacoes) {
      const alvos = a.areas.map((n) => nomeParaArea.get(n.toLowerCase())).filter(Boolean) as Area[];
      const destino = alvos.length ? alvos : [{ chave: 'geral', id: null, nome: 'Geral', ordem: 999 }];
      for (const area of destino) {
        const g = porArea.get(area.chave) ?? { area, itens: [], tecnicas: new Set<string>() };
        g.itens.push({
          produto: a.produto ?? '—', lote: a.lote ?? '—', tecnica: a.tecnica ?? '—',
          areas: a.areas.join(', ') || '—',
          quantidade: a.quantidade == null ? '—' : `${a.quantidade.toLocaleString('pt-BR')}${a.unidade ? ` ${a.unidade}` : ''}`,
        });
        if (a.tecnica) g.tecnicas.add(a.tecnica);
        porArea.set(area.chave, g);
      }
    }
    if (porArea.size === 0) porArea.set('geral', { area: { chave: 'geral', id: null, nome: 'Geral', ordem: 999 }, itens: [], tecnicas: new Set() });
    for (const { area, itens, tecnicas } of porArea.values()) {
      const resumo = `${plural(itens.length, 'aplicação registrada', 'aplicações registradas')} no app${tecnicas.size ? ` · ${[...tecnicas].join(' · ')}` : ''}`;
      blocos.push({ ...base(area, 'DI', null, resumo, null), tipo: 'aplicacao', aplicacoes: itens });
    }
  }

  const legendaDe = (servico: 'PI' | 'PA', pontos: PontoLido[]): ItemLegenda[] => {
    const candidatas = dados.legendas.filter((l) => l.servico === servico);
    const daOs = candidatas.filter((l) => dados.os.tipos.includes(l.tipo_servico));
    const usar = new Map<number, ItemLegenda>();
    for (const l of [...daOs, ...candidatas]) {
      if (usar.has(l.codigo)) continue;
      usar.set(l.codigo, { codigo: l.codigo, nome: l.nome, bg: l.cor_bg || COR_PADRAO[l.codigo]?.bg || '#f2f3f4', fg: l.cor_fg || COR_PADRAO[l.codigo]?.fg || '#686f7d' });
    }
    // Rótulo gravado no ponto, quando a Planilha não tem o código.
    for (const p of pontos) {
      if (p.status_codigo != null && !usar.has(p.status_codigo)) {
        usar.set(p.status_codigo, { codigo: p.status_codigo, nome: p.status_rotulo ?? `Status ${p.status_codigo}`, ...(COR_PADRAO[p.status_codigo] ?? { bg: '#f2f3f4', fg: '#686f7d' }) });
      }
    }
    return [...usar.values()].sort((a, b) => Number(a.codigo) - Number(b.codigo));
  };

  const visitasCom = (pontos: { os_id: string }[]) => {
    const ids = new Set(pontos.map((p) => p.os_id));
    return visitas.filter((v) => ids.has(v.os_id));
  };

  const linhasDe = (pontos: PontoLido[], servico: string) => {
    const linhas = new Map<string, { chave: string; codigo: string; local: string; numero: number; pontos: PontoLido[] }>();
    for (const p of pontos) {
      const chave = p.cliente_ponto_id ?? p.id;
      const l = linhas.get(chave) ?? { chave, codigo: codigoDoPonto(servico, p.numero), local: p.local ?? '—', numero: p.numero, pontos: [] };
      l.pontos.push(p);
      linhas.set(chave, l);
    }
    return [...linhas.values()].sort((a, b) => a.numero - b.numero);
  };

  for (const { area, servico, fase, pontos } of porBloco.values()) {
    const vis = visitasCom(pontos);
    const daOs = pontos.filter((p) => p.os_id === osId);
    const periodo = rotuloDoPeriodo(vis);
    const freq = freqPlano.get(servico) ?? null;

    if (servico === 'PI' || servico === 'PA') {
      const legenda = legendaDe(servico, pontos);
      const nomeDe = new Map(legenda.map((l) => [Number(l.codigo), l.nome]));
      const linhas: LinhaGrade[] = linhasDe(pontos, servico).map((l) => ({
        chave: l.chave, codigo: l.codigo, local: l.local,
        celulas: Object.fromEntries(vis.map((v) => {
          const p = l.pontos.find((x) => x.os_id === v.os_id);
          return [v.os_id, p?.status_codigo != null ? { valor: p.status_codigo, rotulo: nomeDe.get(p.status_codigo) ?? p.status_rotulo ?? '' } : null];
        })),
      }));
      const totais = legenda.map((l) => ({ codigo: l.codigo, nome: l.nome, n: pontos.filter((p) => p.status_codigo === l.codigo).length }));
      const verificados = daOs.filter((p) => p.situacao && p.situacao !== 'pendente').length;
      const resumo = `${verificados} de ${daOs.length} ${UNIDADE[servico]} verificados no app · ${periodo}`;
      const comVisita = mesesComVisita(area, [servico], fase);
      const consolidacao: Consolidacao = {
        ano, mesAtual,
        linhas: legenda.map((l) => ({
          codigo: l.codigo, nome: l.nome,
          valores: meses(ano, mesAtual, comVisita, (m) => somaStatus(area, [servico], fase, ano, m, (c) => c === Number(l.codigo))),
        })),
      };
      // Atividade = todo status diferente de 3 (intacta/sem ocorrência), como no protótipo.
      const tend = tendencia(ano, mesAtual, comVisita, (a, m) => somaStatus(area, [servico], fase, a, m, (c) => c !== 3), 'pontos com atividade por mês');
      blocos.push({
        ...base(area, servico, fase, resumo, freq), tipo: 'status', visitas: vis, linhas, legenda, totais, verificados, total: daOs.length,
        consolidacao, tendencia: tend,
      });
    } else if (servico === 'AL' || servico === 'PG') {
      const linhasBase = linhasDe(pontos, servico);
      const especiesSet = new Set<string>();
      const linhas = linhasBase.map((l) => {
        const contagens: Record<string, number> = {};
        for (const p of l.pontos) for (const [esp, n] of Object.entries(p.contagens ?? {})) {
          if (!(n > 0)) continue;
          contagens[esp] = (contagens[esp] ?? 0) + n;
          especiesSet.add(esp);
        }
        return { chave: l.chave, codigo: l.codigo, local: l.local, contagens, total: Object.values(contagens).reduce((a, b) => a + b, 0) };
      });
      const especies = [...especiesSet].sort((a, b) => (a === 'Outros' ? 1 : b === 'Outros' ? -1 : a.localeCompare(b, 'pt-BR')));
      const totalGeral = linhas.reduce((t, l) => t + l.total, 0);
      const indiceMedio = linhas.length ? Math.round((totalGeral / linhas.length) * 10) / 10 : 0;
      const resumo = `${linhas.length} ${UNIDADE[servico]} com contagem lançada no app · ${totalGeral} no total · ${periodo}`;
      const comVisita = mesesComVisita(area, [servico]);
      const contagensDoBloco = h.contagens.filter((r) => r.servico === servico && chaveDe(r) === area.chave);
      const totalDe = (a: number, m: number, especie?: string) => contagensDoBloco
        .filter((r) => r.ano === a && r.mes === m && (especie === undefined || r.especie === especie))
        .reduce((t, r) => t + Number(r.total), 0);
      const especiesDoAno = [...new Set([...especies, ...contagensDoBloco.filter((r) => r.ano === ano).map((r) => r.especie)])]
        .sort((a, b) => (a === 'Outros' ? 1 : b === 'Outros' ? -1 : a.localeCompare(b, 'pt-BR')));
      const mensal = {
        ano, mesAtual,
        total: meses(ano, mesAtual, comVisita, (m) => totalDe(ano, m)),
        porTipo: especiesDoAno.map((e) => ({ especie: e, valores: meses(ano, mesAtual, comVisita, (m) => totalDe(ano, m, e)) })),
      };
      const tend = tendencia(ano, mesAtual, comVisita, (a, m) => totalDe(a, m), 'total capturado por mês');
      blocos.push({ ...base(area, servico, null, resumo, freq), tipo: 'contagem', visitas: vis, especies, linhas, totalGeral, indiceMedio, mensal, tendencia: tend });
    } else if (servico === 'OC') {
      const dataDe = new Map(visitas.map((v) => [v.os_id, v.data]));
      // Só o que teve ocorrência: "sem ocorrência" é conforme e não vira linha.
      const linhas = pontos
        .filter((p) => p.situacao === 'nao_conforme')
        .map((p) => ({
          data: dataDe.get(p.os_id) ?? '',
          setor: p.local ?? '—',
          ocorrencia: p.observacao ?? '—',
          praga: Object.keys(p.contagens ?? {}).join(', ') || '—',
          acao: p.acao_corretiva ?? '—',
        }))
        .sort((a, b) => a.data.localeCompare(b.data) || a.setor.localeCompare(b.setor));
      const resumo = `${plural(linhas.length, 'ocorrência setorial registrada', 'ocorrências setoriais registradas')} na execução`;
      const comVisita = mesesComVisita(area, ['OC']);
      const registradasDe = (a: number, m: number) => h.ocorrencias
        .filter((r) => r.ano === a && r.mes === m && chaveDe(r) === area.chave).reduce((t, r) => t + r.n, 0);
      const mensal = { ano, mesAtual, registradas: meses(ano, mesAtual, comVisita, (m) => registradasDe(ano, m)) };
      const tend = tendencia(ano, mesAtual, comVisita, registradasDe, 'ocorrências registradas por mês');
      blocos.push({ ...base(area, servico, null, resumo, null), tipo: 'ocorrencia', linhas, mensal, tendencia: tend });
    }
  }

  // Comparativo: por área com Porta-Isca e Placa Adesiva (todas as fases, inclusive ocultos).
  const areasComDesratizacao = new Map<string, { area: Area; pi: PontoLido[]; pa: PontoLido[] }>();
  for (const { area, servico, pontos } of porBloco.values()) {
    if (servico !== 'PI' && servico !== 'PA') continue;
    const g = areasComDesratizacao.get(area.chave) ?? { area, pi: [], pa: [] };
    (servico === 'PI' ? g.pi : g.pa).push(...pontos);
    areasComDesratizacao.set(area.chave, g);
  }
  for (const { area, pi, pa } of areasComDesratizacao.values()) {
    if (!pi.length || !pa.length) continue;
    // Consolida todos os blocos de Porta-Isca e Placa Adesiva da área — todas
    // as fases, inclusive os ocultos —, mês a mês no ano da execução.
    const comVisita = mesesComVisita(area, ['PI', 'PA']);
    const iscas = meses(ano, mesAtual, comVisita, (m) => somaStatus(area, ['PI'], undefined, ano, m, (c) => c === 1));
    const placas = meses(ano, mesAtual, comVisita, (m) => somaStatus(area, ['PA'], undefined, ano, m, (c) => c === 1));
    const totalIscas = somaMeses(iscas);
    const totalPlacas = somaMeses(placas);
    const relacao = totalPlacas > 0
      ? `${(totalIscas / totalPlacas).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} iscas consumidas por placa com ocorrência`
      : 'Sem placas com ocorrência no período';
    const resumo = `Consolida os blocos de Porta-Isca e Placa Adesiva da área · ${totalIscas} iscas consumidas e ${totalPlacas} placas com ocorrência em ${ano}`;
    blocos.push({
      ...base(area, 'CMP', null, resumo, null), tipo: 'comparativo', ano, mesAtual, iscas, placas, totalIscas, totalPlacas,
      portaIscas: new Set(pi.map((p) => p.cliente_ponto_id ?? p.id)).size,
      placasAdesivas: new Set(pa.map((p) => p.cliente_ponto_id ?? p.id)).size,
      relacao,
    });
  }

  // Captura Não-Alvo: nas placas adesivas da área, quando a OS tem Placa Adesiva.
  if (servicosDaOs.has('PA')) {
    const areasPa = new Map<string, Area>();
    for (const { area, servico } of porBloco.values()) if (servico === 'PA') areasPa.set(area.chave, area);
    for (const area of areasPa.values()) {
      const placas = dados.placas.filter((p) => (p.area_id ?? null) === area.id).sort((a, b) => a.numero - b.numero);
      const ids = new Set(placas.map((p) => p.id));
      const capturas = dados.capturas.filter((c) => ids.has(c.cliente_ponto_id));
      // As colunas são as visitas com Placa Adesiva lida nesta área (qualquer fase).
      const vis = visitasCom([...porBloco.values()].filter((b) => b.servico === 'PA' && b.area.chave === area.chave).flatMap((b) => b.pontos));
      const codigos = abreviacoes(dados.especies_nao_alvo);
      const linhas: LinhaGrade[] = placas.map((p) => ({
        chave: p.id, codigo: `CN-${String(p.numero).padStart(2, '0')}`, local: p.local ?? '—',
        celulas: Object.fromEntries(vis.map((v) => {
          const c = capturas.find((x) => x.cliente_ponto_id === p.id && x.os_id === v.os_id);
          return [v.os_id, c ? { valor: codigos.get(c.especie) ?? c.especie, rotulo: c.especie } : null];
        })),
      }));
      const legenda: ItemLegenda[] = dados.especies_nao_alvo.map((e, i) => ({ codigo: codigos.get(e) ?? e, nome: e, ...COR_ESPECIE[i % COR_ESPECIE.length] }));
      const totais = legenda.map((l) => ({ codigo: l.codigo, nome: l.nome, n: capturas.filter((c) => c.especie === l.nome).length }));
      const resumo = `${placas.length} ${UNIDADE.CN} · ${capturas.length} ${capturas.length === 1 ? 'captura' : 'capturas'} · ${rotuloDoPeriodo(vis)}`;
      // Meses com Placa Adesiva lida na área; capturas do histórico pela área do mapa.
      const comVisita = mesesComVisita(area, ['PA']);
      const capturasDe = (a: number, m: number, especie?: string) => h.capturas
        .filter((r) => r.ano === a && r.mes === m && (r.area_id ?? null) === area.id && (especie === undefined || r.especie === especie))
        .reduce((t, r) => t + r.n, 0);
      const consolidacao: Consolidacao = {
        ano, mesAtual,
        linhas: legenda.map((l) => ({ codigo: l.codigo, nome: l.nome, valores: meses(ano, mesAtual, comVisita, (m) => capturasDe(ano, m, l.nome)) })),
      };
      const tend = tendencia(ano, mesAtual, comVisita, (a, m) => capturasDe(a, m), 'capturas não-alvo por mês');
      blocos.push({
        ...base(area, 'CN', null, resumo, freqPlano.get('PA') ?? null), tipo: 'captura', visitas: vis, linhas, legenda, totais,
        verificados: placas.length, total: placas.length, consolidacao, tendencia: tend,
      });
    }
  }

  // Agrupa por área, na ordem das áreas; dentro, na ordem do protótipo.
  const grupos = new Map<string, GrupoDeBlocos & { ordem: number }>();
  for (const b of blocos) {
    const chave = b.id.split(':')[0];
    const ordem = b.areaId ? areas.get(b.areaId)?.ordem ?? 500 : b.areaNome === 'Geral' ? 999 : 900;
    const g = grupos.get(chave) ?? { areaId: b.areaId, areaNome: b.areaNome, blocos: [], ordem };
    g.blocos.push(b);
    grupos.set(chave, g);
  }
  return [...grupos.values()]
    .sort((a, b) => a.ordem - b.ordem || a.areaNome.localeCompare(b.areaNome, 'pt-BR'))
    .map(({ areaId, areaNome, blocos: bs }) => ({
      areaId, areaNome,
      blocos: bs.sort((a, b) => ORDEM.indexOf(a.servico) - ORDEM.indexOf(b.servico) || (a.fase ?? 0) - (b.fase ?? 0)),
    }));
}

const COR_ESPECIE = [
  { bg: '#eef3fb', fg: '#2b5fa8' }, { bg: '#eaf6ea', fg: '#1a5c1a' }, { bg: '#fdf3e6', fg: '#b45309' },
  { bg: '#fdece8', fg: '#c2410c' }, { bg: '#f2f3f4', fg: '#686f7d' },
];

/** "Aranha" → "AR", "Lagartixa" → "LG" (como no protótipo); sem colisão. */
export function abreviacoes(especies: string[]): Map<string, string> {
  const usadas = new Set<string>();
  const out = new Map<string, string>();
  const fixas: Record<string, string> = { Aranha: 'AR', Lagartixa: 'LG', Grilo: 'GR', Barata: 'BA', Outros: 'OU' };
  for (const e of especies) {
    const limpo = e.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
    const candidatas = [fixas[e], limpo.slice(0, 2), limpo[0] + (limpo[limpo.length - 1] ?? ''), ...[...limpo].slice(1).map((c) => limpo[0] + c)].filter(Boolean) as string[];
    const cod = candidatas.find((c) => !usadas.has(c)) ?? e;
    usadas.add(cod);
    out.set(e, cod);
  }
  return out;
}

/** Os blocos que vão para a pré-visualização e o PDF. */
export function incluidos(grupos: GrupoDeBlocos[]): GrupoDeBlocos[] {
  return grupos.map((g) => ({ ...g, blocos: g.blocos.filter((b) => b.incluido) })).filter((g) => g.blocos.length > 0);
}

/** "12 de 16" — para a aba "Blocos do relatório (12 de 16)". */
export function contagemDeBlocos(grupos: GrupoDeBlocos[]): { incluidos: number; total: number } {
  const todos = grupos.flatMap((g) => g.blocos);
  return { incluidos: todos.filter((b) => b.incluido).length, total: todos.length };
}
