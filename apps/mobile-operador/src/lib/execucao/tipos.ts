/**
 * Tipos da execução em campo.
 *
 * Dois objetos vivem no aparelho durante a execução de uma OS:
 *
 * - o PACOTE: tudo que a execução precisa ler, baixado ao abrir a OS com
 *   rede. Depois disso o técnico trabalha sem sinal;
 * - o RASCUNHO: o que o técnico registrou até agora, gravado a cada mudança.
 *   Fecha o app, acaba a bateria, e ele volta de onde parou.
 *
 * No fim, o rascunho vira UM envio (`registrar_execucao`). Não há fila de
 * sincronização linha a linha: o envio é atômico e idempotente pelo
 * `execucaoUuid`, então reenviar depois de uma falha nunca duplica nada.
 *
 * Arquivos (fotos, assinaturas) ficam como ARQUIVO no aparelho e no rascunho
 * só o caminho local — base64 dentro do rascunho estouraria o AsyncStorage.
 */
import type { ServicoCodigo } from '@/lib/monitoramento';

/** Muda quando o formato do pacote muda; pacote de versão diferente é baixado de novo. */
export const VERSAO_PACOTE = 1;
export const VERSAO_RASCUNHO = 1;

export interface PontoDoPacote {
  id: string;
  numero: number;
  area: string | null;
  fase: number | null;
  local: string;
}

export interface PlanoDoPacote {
  id: string;
  tipoControle: string;
  frequencia: string | null;
  /** Nulo: plano antigo, preenchido pelo Backoffice — o App não o registra. */
  servico: ServicoCodigo | null;
  pontos: PontoDoPacote[];
}

export interface LegendaDoPacote {
  codigo: number;
  rotulo: string;
  corBg: string | null;
  corFg: string | null;
}

export interface ProdutoDoPacote {
  produtoId: string;
  nome: string;
  /** Unidade de estoque (L, kg). */
  unidade: string;
  /** Unidade em que o técnico registra (mL, g); nula = a mesma do estoque. */
  unidadeAplicacao: string | null;
  fatorAplicacao: number | null;
  qtdRecomendada: number;
}

export interface PacoteOs {
  versao: typeof VERSAO_PACOTE;
  baixadoEm: string;
  os: {
    id: string;
    codigo: string;
    status: string;
    /** AAAA-MM-DD. */
    dataProgramada: string | null;
    horaPrevista: string | null;
    tiposServico: string[];
    cliente: { id: string; nome: string; endereco: string };
    /** Já tem execução registrada (por este ou outro aparelho). */
    jaExecutada: boolean;
  };
  planos: PlanoDoPacote[];
  /** Legendas 1–4 de PI e PA, com rótulo e cor da Planilha. */
  legendas: Partial<Record<ServicoCodigo, LegendaDoPacote[]>>;
  listas: {
    especiesAl: string[];
    outrasPragasAl: string[];
    pragasPg: string[];
    pragasOc: string[];
    tecnicasDi: string[];
  };
  /** Áreas ativas do cliente, para as aplicações da Desinsetização. */
  areas: string[];
  produtos: ProdutoDoPacote[];
}

export interface LeituraNoRascunho {
  statusCodigo?: number | null;
  contagens?: Record<string, number> | null;
  semOcorrencia?: boolean;
  observacao?: string;
  acaoCorretiva?: string;
}

export interface ProdutoNoRascunho {
  produtoId: string;
  estoqueLoteId: string | null;
  /** Como o técnico digitou: "1,5". */
  quantidade: string;
  /** Nula = unidade de estoque. */
  unidade: string | null;
}

export interface AplicacaoNoRascunho {
  planoId: string;
  produtoId: string | null;
  tecnica: string | null;
  quantidade: string;
  unidade: string;
  areas: string[];
}

export interface FotoNoRascunho {
  /** Identificador local, também usado no caminho fixo do upload. */
  id: string;
  /** file:// dentro da pasta da execução. */
  uriLocal: string;
  nome: string;
  pontoId: string | null;
}

export interface RascunhoExecucao {
  versao: typeof VERSAO_RASCUNHO;
  osId: string;
  /** Gerado no aparelho na primeira abertura; é a chave de idempotência do envio. */
  execucaoUuid: string;
  /** Momento em que o técnico iniciou, no aparelho (ISO). */
  inicio: string | null;
  atualizadoEm: string;
  /** Etapa em que o técnico parou (1–6), para reabrir no mesmo lugar. */
  etapa: number;
  produtos: ProdutoNoRascunho[];
  planos: Record<string, { observacao?: string; lampadaInstalacao?: string | null; lampadaValidade?: string | null }>;
  pontos: Record<string, LeituraNoRascunho>;
  aplicacoes: AplicacaoNoRascunho[];
  fotos: FotoNoRascunho[];
  reposicao: { observacao: string; itens: { produtoId: string; quantidade: string }[] } | null;
  assinante: { nome: string; cpf: string; cargo: string; assinaturaUri: string | null };
  tecnicoAssinaturaUri: string | null;
  /** Rastro das tentativas de envio, para a tela explicar o que houve. */
  envio: { tentativas: number; ultimoErro: string | null; ultimaTentativa: string | null };
}

/** Os caminhos no storage dos arquivos já enviados, por arquivo local. */
export interface CaminhosEnviados {
  fotos: Record<string, string>;
  assinaturaCliente: string | null;
  assinaturaTecnico: string | null;
}
