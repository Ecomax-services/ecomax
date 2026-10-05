/**
 * Regras do monitoramento — fonte da verdade compartilhada.
 *
 * ARQUIVO CANÔNICO. Ele é copiado para os três apps por `scripts/sync-shared.sh`
 * e o CI falha se alguma cópia divergir. Edite aqui, rode o script, commite as
 * quatro versões. Editar direto no app faz o CI barrar.
 *
 * Por que existe: o App calcula tudo isto SEM REDE — o técnico avalia os
 * pontos no aparelho e só envia no fim. O banco calcula de novo quando a
 * execução chega (`os_ponto_calcula_situacao` e `registrar_execucao`). Se as
 * duas contas divergirem, o técnico vê "tudo avaliado" no App e o envio é
 * recusado no fim do dia, sem sinal para entender por quê. Por isso a regra
 * mora num lugar só do lado do cliente, e os testes em `shared/tests/` fixam
 * os mesmos casos que a suíte do banco prova.
 *
 * As regras são as do protótipo aprovado do App ("Revisão tela de
 * Monitoramento", fechado em 28/09). Sem dependências: o módulo roda igual no
 * React, no React Native e no teste.
 */

// ---------------------------------------------------------------------------
// Serviços
// ---------------------------------------------------------------------------

/** Os seis serviços, na ordem das abas do App. Fixos: espelham `monitoramento_servicos`. */
export const SERVICOS_MONITORAMENTO = ['DI', 'PI', 'PA', 'AL', 'PG', 'OC'] as const;

export type ServicoCodigo = (typeof SERVICOS_MONITORAMENTO)[number];

/**
 * Qual tela cada serviço abre.
 *
 * - `aplicacao`: registro do que foi aplicado, sem ponto (Desinsetização);
 * - `status`: grade de status 1–4 por ponto (porta-isca, placa);
 * - `contagem`: contagem por espécie por ponto (armadilha luminosa, grãos);
 * - `ocorrencia`: pragas encontradas por setor (Ocorrência Setorial).
 */
export type Comportamento = 'aplicacao' | 'status' | 'contagem' | 'ocorrencia';

export const COMPORTAMENTO: Record<ServicoCodigo, Comportamento> = {
  DI: 'aplicacao',
  PI: 'status',
  PA: 'status',
  AL: 'contagem',
  PG: 'contagem',
  OC: 'ocorrencia',
};

export const NOME_SERVICO: Record<ServicoCodigo, string> = {
  DI: 'Desinsetização',
  PI: 'Porta Iscas (PI)',
  PA: 'Placas Adesivas (PA)',
  AL: 'Armadilhas Luminosas',
  PG: 'Pragas de Grãos',
  OC: 'Ocorrência Setorial',
};

export function isServicoCodigo(valor: string): valor is ServicoCodigo {
  return (SERVICOS_MONITORAMENTO as readonly string[]).includes(valor);
}

// ---------------------------------------------------------------------------
// Situação de um ponto
// ---------------------------------------------------------------------------

/** Os mesmos quatro valores de `os_plano_pontos.situacao`. */
export type Situacao = 'pendente' | 'conforme' | 'nao_conforme' | 'inacessivel';

/** Códigos de status da grade 1–4. O rótulo e a cor vêm da Planilha; o código, não. */
export const STATUS_CODIGOS = [1, 2, 3, 4] as const;
export type StatusCodigo = (typeof STATUS_CODIGOS)[number];

/** O que o técnico registrou num ponto. Campos ausentes valem como não preenchidos. */
export interface LeituraPonto {
  statusCodigo?: number | null;
  /** Espécie ou praga → quantidade. */
  contagens?: Record<string, number> | null;
  semOcorrencia?: boolean;
}

/**
 * Status 1–4 → situação, como no relatório aprovado: 3 (intacta) é conforme;
 * 1 e 2 (consumida, mofada; com ocorrência, danificada) são não conforme; 4
 * (obstruído, sem acesso) é inacessível.
 */
export function situacaoDoStatus(codigo: number | null | undefined): Situacao {
  switch (codigo) {
    case 3: return 'conforme';
    case 1:
    case 2: return 'nao_conforme';
    case 4: return 'inacessivel';
    default: return 'pendente';
  }
}

function temPragaContada(contagens: Record<string, number> | null | undefined): boolean {
  return !!contagens && Object.keys(contagens).length > 0;
}

/**
 * A situação de um ponto a partir do que foi registrado.
 *
 * Espelha `os_ponto_calcula_situacao` no banco. Mudar uma sem a outra faz o
 * App e o servidor discordarem sobre o que está pendente.
 */
export function situacaoDaLeitura(servico: ServicoCodigo, leitura: LeituraPonto): Situacao {
  switch (COMPORTAMENTO[servico]) {
    case 'status':
      return situacaoDoStatus(leitura.statusCodigo);
    case 'ocorrencia':
      if (leitura.semOcorrencia) return 'conforme';
      return temPragaContada(leitura.contagens) ? 'nao_conforme' : 'pendente';
    case 'contagem':
      // [A DEFINIR — captura em Armadilha Luminosa e Pragas de Grãos conta como
      // não conforme?] Provisório, igual ao banco: armadilha lida é
      // "conforme", no sentido de verificada.
      return leitura.contagens != null ? 'conforme' : 'pendente';
    case 'aplicacao':
      // Desinsetização não tem ponto; o que conta é a aplicação (ver
      // `aplicacaoCompleta`).
      return 'pendente';
  }
}

export function pontoAvaliado(servico: ServicoCodigo, leitura: LeituraPonto): boolean {
  return situacaoDaLeitura(servico, leitura) !== 'pendente';
}

/**
 * O que o banco recusaria nesta leitura, com a mesma mensagem. `null` quando
 * está tudo certo. Conferir antes de salvar evita descobrir o erro só no
 * envio, no fim do dia.
 */
export function erroDaLeitura(servico: ServicoCodigo, leitura: LeituraPonto): string | null {
  const comportamento = COMPORTAMENTO[servico];

  if (leitura.statusCodigo != null) {
    if (comportamento !== 'status') return `O serviço ${servico} não registra status 1–4.`;
    if (!(STATUS_CODIGOS as readonly number[]).includes(leitura.statusCodigo)) return 'Status fora de 1–4.';
  }

  if (leitura.contagens != null) {
    if (comportamento !== 'contagem' && comportamento !== 'ocorrencia') {
      return `O serviço ${servico} não registra contagem.`;
    }
    for (const [nome, valor] of Object.entries(leitura.contagens)) {
      if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < 0) {
        return `Contagem inválida para "${nome}": informe um número inteiro a partir de zero.`;
      }
    }
  }

  if (leitura.semOcorrencia) {
    if (comportamento !== 'ocorrencia') return 'Só a Ocorrência Setorial registra "sem ocorrência".';
    if (temPragaContada(leitura.contagens)) return 'Setor marcado sem ocorrência não pode ter pragas contadas.';
  }

  return null;
}

/**
 * Normaliza o que o técnico digita no campo de contagem: só dígitos, sem zero
 * à esquerda, no máximo quatro algarismos — como o protótipo.
 */
export function sanitizarContagem(valor: string | number | null | undefined): string {
  return String(valor ?? '').replace(/[^0-9]/g, '').replace(/^0+(?=[0-9])/, '').slice(0, 4);
}

// ---------------------------------------------------------------------------
// Desinsetização
// ---------------------------------------------------------------------------

export interface Aplicacao {
  produtoId?: string | null;
  tecnica?: string | null;
  quantidade?: number | string | null;
  areas?: string[] | null;
}

/** Aplicação que conta: produto, técnica, quantidade e ao menos uma área. */
export function aplicacaoCompleta(a: Aplicacao): boolean {
  return !!a.produtoId && !!a.tecnica && String(a.quantidade ?? '').trim() !== '' && (a.areas?.length ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Progresso e bloqueio de avanço
// ---------------------------------------------------------------------------

/** Um serviço da OS como o App o tem em memória. */
export interface ServicoNaOs {
  servico: ServicoCodigo;
  /** Leituras dos pontos, na ordem da grade. Vazio na Desinsetização. */
  pontos: LeituraPonto[];
  /** Só na Desinsetização. */
  aplicacoes?: Aplicacao[];
}

export interface Progresso {
  total: number;
  avaliados: number;
  faltam: number;
}

/**
 * Quantos registros o serviço tem e quantos estão feitos.
 *
 * A Desinsetização conta como UM registro, completo com ao menos uma aplicação
 * válida — é assim que o protótipo soma no total da OS.
 */
export function progressoDoServico(s: ServicoNaOs): Progresso {
  if (COMPORTAMENTO[s.servico] === 'aplicacao') {
    const avaliados = (s.aplicacoes ?? []).some(aplicacaoCompleta) ? 1 : 0;
    return { total: 1, avaliados, faltam: 1 - avaliados };
  }
  const avaliados = s.pontos.filter((p) => pontoAvaliado(s.servico, p)).length;
  return { total: s.pontos.length, avaliados, faltam: s.pontos.length - avaliados };
}

export function progressoDaOs(servicos: ServicoNaOs[]): Progresso {
  return servicos.map(progressoDoServico).reduce(
    (acc, p) => ({ total: acc.total + p.total, avaliados: acc.avaliados + p.avaliados, faltam: acc.faltam + p.faltam }),
    { total: 0, avaliados: 0, faltam: 0 },
  );
}

/** O técnico só avança do monitoramento com tudo avaliado. */
export function podeAvancar(servicos: ServicoNaOs[]): boolean {
  return progressoDaOs(servicos).faltam === 0;
}

/** Contador da aba: "3 de 6 avaliados", "2 de 5 setores", "1 de 2 aplicações completas". */
export function textoProgressoDoServico(s: ServicoNaOs): string {
  if (COMPORTAMENTO[s.servico] === 'aplicacao') {
    const total = s.aplicacoes?.length ?? 0;
    if (total === 0) return 'Nenhuma aplicação registrada';
    return `${(s.aplicacoes ?? []).filter(aplicacaoCompleta).length} de ${total} aplicações completas`;
  }
  const p = progressoDoServico(s);
  return COMPORTAMENTO[s.servico] === 'ocorrencia'
    ? `${p.avaliados} de ${p.total} setores`
    : `${p.avaliados} de ${p.total} avaliados`;
}

/** Rodapé do monitoramento: "Na OS: 7 de 12 registros concluídos." */
export function textoProgressoDaOs(servicos: ServicoNaOs[]): string {
  const p = progressoDaOs(servicos);
  return `Na OS: ${p.avaliados} de ${p.total} registros concluídos.`;
}

/** O aviso quando o técnico tenta avançar com pendência. */
export function textoBloqueio(servicos: ServicoNaOs[]): string | null {
  const { faltam } = progressoDaOs(servicos);
  return faltam > 0 ? `Avalie todos os pontos para avançar. Faltam ${faltam}.` : null;
}

/**
 * "Ir ao pendente": o primeiro registro em aberto, começando pelo serviço que
 * está na tela e seguindo a ordem das abas. `indice` é o ponto dentro do
 * serviço; na Desinsetização é sempre 0 (abre a lista de aplicações).
 */
export function proximoPendente(
  servicos: ServicoNaOs[],
  atual?: ServicoCodigo,
): { servico: ServicoCodigo; indice: number } | null {
  const ordem = atual
    ? [...servicos.filter((s) => s.servico === atual), ...servicos.filter((s) => s.servico !== atual)]
    : servicos;

  for (const s of ordem) {
    if (COMPORTAMENTO[s.servico] === 'aplicacao') {
      if (progressoDoServico(s).faltam > 0) return { servico: s.servico, indice: 0 };
      continue;
    }
    const indice = s.pontos.findIndex((p) => !pontoAvaliado(s.servico, p));
    if (indice >= 0) return { servico: s.servico, indice };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Lâmpada da armadilha luminosa
// ---------------------------------------------------------------------------

/** O alerta aparece a partir de 30 dias do vencimento (aprovado em 17/09). */
export const DIAS_ALERTA_LAMPADA = 30;

/**
 * Dias até a validade, contando em datas de calendário (sem hora).
 * `validade` e `hoje` no formato AAAA-MM-DD. Negativo = vencida.
 */
export function diasAteVencer(validade: string | null | undefined, hoje: string): number | null {
  const v = paraDiaUtc(validade);
  const h = paraDiaUtc(hoje);
  if (v === null || h === null) return null;
  return Math.round((v - h) / 86_400_000);
}

function paraDiaUtc(iso: string | null | undefined): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export interface AlertaLampada {
  nivel: 'vencida' | 'vence_em_breve';
  texto: string;
}

/**
 * O aviso de lâmpada, com o texto do protótipo.
 *
 * NÃO bloqueia o registro, mesmo vencida: o protótipo diz "troque antes de
 * registrar", mas deixa registrar — e o técnico pode não ter lâmpada no carro.
 */
export function alertaLampada(validade: string | null | undefined, hoje: string): AlertaLampada | null {
  const n = diasAteVencer(validade, hoje);
  if (n === null || n > DIAS_ALERTA_LAMPADA) return null;
  if (n < 0) {
    return {
      nivel: 'vencida',
      texto: n === -1
        ? 'Lâmpadas vencidas há 1 dia. Troque antes de registrar.'
        : `Lâmpadas vencidas há ${Math.abs(n)} dias. Troque antes de registrar.`,
    };
  }
  return {
    nivel: 'vence_em_breve',
    texto: n === 0
      ? 'Lâmpadas vencem hoje. Programe a troca.'
      : `Vence em ${n} ${n === 1 ? 'dia' : 'dias'}. Programe a troca.`,
  };
}
