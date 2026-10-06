/**
 * Regras puras da execução: sem React Native, sem rede, sem armazenamento.
 *
 * Ficam separadas de propósito, para serem testadas fora do App
 * (`regras.test.ts`, rodado na CI). É aqui que mora o que precisa estar
 * certo antes de o técnico perder o sinal: o envio que sai do rascunho e os
 * caminhos dos arquivos.
 */
import {
  COMPORTAMENTO, aplicacaoCompleta, erroDaLeitura, podeAvancar, textoBloqueio,
  type ServicoNaOs,
} from '@/lib/monitoramento';
import type { CaminhosEnviados, PacoteOs, RascunhoExecucao } from '@/lib/execucao/tipos';

// ---------------------------------------------------------------------------
// Caminhos fixos
// ---------------------------------------------------------------------------

/**
 * Caminho do arquivo no storage, FIXO por execução.
 *
 * O caminho comum do App leva a hora do envio (`caminhoOs`), o que faria um
 * reenvio depois de falha gravar o mesmo arquivo duas vezes. Aqui o nome vem
 * do identificador da execução e do arquivo: o reenvio cai no mesmo caminho,
 * o storage responde "já existe", e isso conta como enviado. O técnico não
 * tem UPDATE nem DELETE no bucket, então nada é sobrescrito.
 *
 * Segue a convenção que a policy exige: `os/<os_id>/<tipo>/<nome>`.
 */
export function caminhoFixo(osId: string, tipo: 'foto' | 'assinatura', execucaoUuid: string, nome: string, extensao: string): string {
  const ext = extensao.replace(/^\./, '').toLowerCase() || 'bin';
  return `os/${osId}/${tipo}/${execucaoUuid}-${nome}.${ext}`;
}

/** A extensão de um arquivo local, para o caminho e o content-type. */
export function extensaoDe(uri: string): string {
  const m = /\.([a-z0-9]+)(?:\?.*)?$/i.exec(uri);
  return (m?.[1] ?? 'jpg').toLowerCase();
}

export function contentTypeDe(extensao: string): string {
  switch (extensao) {
    case 'png': return 'image/png';
    case 'heic': return 'image/heic';
    case 'webp': return 'image/webp';
    default: return 'image/jpeg';
  }
}

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------

/** O storage recusou porque o caminho já existe: é um reenvio, e vale como enviado. */
export function arquivoJaEnviado(mensagem: string | undefined | null, statusCode?: string | number | null): boolean {
  if (String(statusCode ?? '') === '409') return true;
  const m = (mensagem ?? '').toLowerCase();
  return m.includes('already exists') || m.includes('duplicate');
}

export type TipoFalha = 'sem_rede' | 'sessao' | 'recusado';

/**
 * Por que o envio falhou, para a tela dizer o que fazer.
 *
 * - sem_rede: guardar e tentar de novo quando houver sinal; nada se perdeu;
 * - sessao: o login expirou; entrar de novo e reenviar;
 * - recusado: o servidor recusou por uma regra — a mensagem já vem escrita
 *   para o técnico e diz o que corrigir.
 */
export function classificarFalha(erro: { message?: string | null; code?: string | null } | null | undefined): TipoFalha {
  const msg = (erro?.message ?? '').toLowerCase();
  const code = erro?.code ?? '';
  if (msg.includes('network request failed') || msg.includes('failed to fetch') || msg.includes('network error')
      || msg.includes('timed out') || msg.includes('timeout')) {
    return 'sem_rede';
  }
  if (code === 'PGRST301' || code === 'PGRST302' || msg.includes('jwt') || msg.includes('refresh token')) {
    return 'sessao';
  }
  return 'recusado';
}

// ---------------------------------------------------------------------------
// O envio
// ---------------------------------------------------------------------------

/**
 * "1,5" → 1.5; "1.234,5" → 1234.5; "1.5" → 1.5. Vazio ou inválido → NaN.
 *
 * O ponto só é separador de milhar quando há vírgula: o teclado numérico do
 * aparelho pode oferecer ponto como decimal, e "1.5" virar 15 tiraria do
 * estoque dez vezes o que foi aplicado.
 */
export function numeroDigitado(valor: string | number | null | undefined): number {
  if (typeof valor === 'number') return valor;
  const texto = String(valor ?? '').trim();
  if (texto === '') return Number.NaN;
  const limpo = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto;
  return /^\d+(\.\d+)?$/.test(limpo) ? Number(limpo) : Number.NaN;
}

/** A data (AAAA-MM-DD) de um instante no fuso de Brasília — o mesmo critério do banco. */
export function dataEmBrasilia(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(iso));
}

/** Os serviços do pacote com as leituras do rascunho, no formato das regras compartilhadas. */
export function servicosDaOs(pacote: PacoteOs, rascunho: RascunhoExecucao): ServicoNaOs[] {
  return pacote.planos
    .filter((p) => p.servico != null)
    .map((p) => ({
      servico: p.servico!,
      pontos: p.pontos.map((pt) => rascunho.pontos[pt.id] ?? {}),
      aplicacoes: rascunho.aplicacoes
        .filter((a) => a.planoId === p.id)
        .map((a) => ({ produtoId: a.produtoId, tecnica: a.tecnica, quantidade: a.quantidade, areas: a.areas })),
    }));
}

export type ResultadoMontagem =
  | { ok: true; dados: Record<string, unknown> }
  | { ok: false; problemas: string[] };

/**
 * Monta o envio de `registrar_execucao` a partir do rascunho.
 *
 * Confere ANTES as mesmas regras que o servidor confere, com as mesmas
 * mensagens: descobrir no fim do dia, sem sinal, que faltava o CPF de quem
 * assinou é o pior momento possível. O servidor confere de novo — o App pode
 * estar desatualizado.
 *
 * `caminhos` são os arquivos já enviados ao storage; sem eles o envio não
 * fecha, porque o servidor exige que a assinatura exista lá.
 */
export function montarEnvio(pacote: PacoteOs, rascunho: RascunhoExecucao, caminhos: CaminhosEnviados, termino: string): ResultadoMontagem {
  const problemas: string[] = [];

  // 1. Data programada
  if (!rascunho.inicio) {
    problemas.push('A execução não foi iniciada.');
  } else if (!pacote.os.dataProgramada || dataEmBrasilia(rascunho.inicio) !== pacote.os.dataProgramada) {
    problemas.push('Só é possível iniciar na data programada.');
  }

  // 2. Produtos
  if (rascunho.produtos.length === 0) problemas.push('Registre pelo menos um produto.');
  for (const p of rascunho.produtos) {
    if (!p.estoqueLoteId) problemas.push('O lote é obrigatório.');
    const q = numeroDigitado(p.quantidade);
    if (!(q > 0)) problemas.push('Informe a quantidade aplicada.');
  }

  // 3. Monitoramento: leituras válidas e nada pendente
  const pontosEnviados: Record<string, unknown>[] = [];
  for (const plano of pacote.planos) {
    if (!plano.servico || COMPORTAMENTO[plano.servico] === 'aplicacao') continue;
    for (const pt of plano.pontos) {
      const leitura = rascunho.pontos[pt.id];
      if (!leitura) continue;
      const erro = erroDaLeitura(plano.servico, leitura);
      if (erro) problemas.push(`${plano.servico}-${String(pt.numero).padStart(2, '0')}: ${erro}`);
      pontosEnviados.push({
        ponto_id: pt.id,
        status_codigo: leitura.statusCodigo ?? null,
        contagens: leitura.contagens ?? null,
        sem_ocorrencia: !!leitura.semOcorrencia,
        observacao: leitura.observacao?.trim() || null,
        acao_corretiva: leitura.acaoCorretiva?.trim() || null,
      });
    }
  }
  const servicos = servicosDaOs(pacote, rascunho);
  if (!podeAvancar(servicos)) problemas.push(textoBloqueio(servicos) ?? 'Há pontos pendentes.');

  // 4 e 5. Assinaturas
  const a = rascunho.assinante;
  if (!a.nome.trim()) problemas.push('Informe o nome de quem assina.');
  if (!a.cpf.trim()) problemas.push('Informe o CPF de quem assina.');
  if (!a.cargo.trim()) problemas.push('Informe o cargo de quem assina.');
  if (!a.assinaturaUri) problemas.push('Colete a assinatura do cliente.');
  if (!rascunho.tecnicoAssinaturaUri) problemas.push('Assine antes de concluir.');

  // Arquivos: o envio só fecha com tudo no storage.
  if (a.assinaturaUri && !caminhos.assinaturaCliente) problemas.push('A assinatura do cliente ainda não foi enviada.');
  if (rascunho.tecnicoAssinaturaUri && !caminhos.assinaturaTecnico) problemas.push('A sua assinatura ainda não foi enviada.');
  const fotosFaltando = rascunho.fotos.filter((f) => !caminhos.fotos[f.id]).length;
  if (fotosFaltando > 0) problemas.push(`${fotosFaltando} ${fotosFaltando === 1 ? 'foto ainda não foi enviada' : 'fotos ainda não foram enviadas'}.`);

  if (problemas.length > 0) return { ok: false, problemas: [...new Set(problemas)] };

  const itensReposicao = (rascunho.reposicao?.itens ?? [])
    .map((i) => ({ produto_id: i.produtoId, quantidade: numeroDigitado(i.quantidade) }))
    .filter((i) => i.quantidade > 0);

  return {
    ok: true,
    dados: {
      execucao_uuid: rascunho.execucaoUuid,
      inicio: rascunho.inicio,
      termino,
      produtos: rascunho.produtos.map((p) => ({
        produto_id: p.produtoId,
        estoque_lote_id: p.estoqueLoteId,
        quantidade: numeroDigitado(p.quantidade),
        unidade: p.unidade,
      })),
      planos: Object.entries(rascunho.planos).map(([planoId, pl]) => ({
        plano_id: planoId,
        observacao: pl.observacao?.trim() || null,
        lampada_instalacao: pl.lampadaInstalacao || null,
        lampada_validade: pl.lampadaValidade || null,
      })),
      pontos: pontosEnviados,
      // Só as aplicações completas: a linha que o técnico abriu e não preencheu
      // não é registro de nada.
      aplicacoes: rascunho.aplicacoes
        .filter((ap) => aplicacaoCompleta({ produtoId: ap.produtoId, tecnica: ap.tecnica, quantidade: ap.quantidade, areas: ap.areas }))
        .map((ap) => ({
          plano_id: ap.planoId, produto_id: ap.produtoId, tecnica: ap.tecnica,
          quantidade: numeroDigitado(ap.quantidade), unidade: ap.unidade, areas: ap.areas,
        })),
      fotos: rascunho.fotos.map((f) => ({ caminho: caminhos.fotos[f.id], nome: f.nome, ponto_id: f.pontoId })),
      reposicao: itensReposicao.length
        ? { observacao: rascunho.reposicao?.observacao?.trim() || null, itens: itensReposicao }
        : null,
      assinante: {
        nome: a.nome.trim(), cpf: a.cpf, cargo: a.cargo.trim(), assinatura: caminhos.assinaturaCliente,
      },
      tecnico_assinatura: caminhos.assinaturaTecnico,
    },
  };
}
