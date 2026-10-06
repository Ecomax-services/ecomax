import { supabase } from '@/lib/supabase';
import { enviarArquivoNoCaminho } from '@/lib/uploads';
import { pacoteGuardado, apagarPacote } from '@/lib/execucao/pacote';
import {
  rascunhoGuardado, salvarRascunho, caminhosEnviados, salvarCaminhosEnviados, apagarExecucaoLocal,
} from '@/lib/execucao/rascunho';
import { caminhoFixo, classificarFalha, contentTypeDe, extensaoDe, montarEnvio, type TipoFalha } from '@/lib/execucao/regras';
import type { CaminhosEnviados, PacoteOs, RascunhoExecucao } from '@/lib/execucao/tipos';
import type { Json } from '@/lib/database.types';

/**
 * O envio da execução: o único momento em que a execução precisa de rede.
 *
 * Ordem, e por quê:
 *   1. arquivos primeiro, cada um anotado assim que sobe — o servidor exige
 *      que fotos e assinaturas existam no storage antes de registrar;
 *   2. o registro, numa chamada só (`registrar_execucao`), tudo ou nada;
 *   3. só com a confirmação, apagar o que está no aparelho.
 *
 * Qualquer passo pode falhar por falta de sinal. Tentar de novo é seguro em
 * todos: o arquivo já enviado é pulado (ou o storage responde "já existe"), e
 * o registro com o mesmo identificador responde "já registrada".
 */

export class FalhaNoEnvio extends Error {
  constructor(public tipo: TipoFalha, mensagem: string, public problemas: string[] = []) {
    super(mensagem);
    this.name = 'FalhaNoEnvio';
  }
}

export type ResultadoEnvio = { status: 'registrada' | 'ja_registrada'; osId: string };

const MENSAGEM: Record<TipoFalha, string> = {
  sem_rede: 'Sem conexão. A execução continua guardada no aparelho; envie de novo quando houver sinal.',
  sessao: 'Sua sessão expirou. Entre de novo no app e reenvie — a execução continua guardada.',
  recusado: 'O envio foi recusado.',
};

async function anotarTentativa(r: RascunhoExecucao, erro: string | null): Promise<void> {
  await salvarRascunho({
    ...r,
    envio: { tentativas: r.envio.tentativas + 1, ultimoErro: erro, ultimaTentativa: new Date().toISOString() },
  });
}

/** Sobe o que ainda não subiu. Anota cada arquivo assim que chega. */
async function enviarArquivos(pacote: PacoteOs, r: RascunhoExecucao): Promise<CaminhosEnviados> {
  const c = await caminhosEnviados(r.osId);
  const subir = async (uri: string, tipo: 'foto' | 'assinatura', nome: string): Promise<string> => {
    const ext = extensaoDe(uri);
    const caminho = caminhoFixo(pacote.os.id, tipo, r.execucaoUuid, nome, ext);
    await enviarArquivoNoCaminho(caminho, uri, contentTypeDe(ext));
    return caminho;
  };

  for (const f of r.fotos) {
    if (c.fotos[f.id]) continue;
    c.fotos[f.id] = await subir(f.uriLocal, 'foto', f.id);
    await salvarCaminhosEnviados(r.osId, c);
  }
  if (r.assinante.assinaturaUri && !c.assinaturaCliente) {
    c.assinaturaCliente = await subir(r.assinante.assinaturaUri, 'assinatura', 'cliente');
    await salvarCaminhosEnviados(r.osId, c);
  }
  if (r.tecnicoAssinaturaUri && !c.assinaturaTecnico) {
    c.assinaturaTecnico = await subir(r.tecnicoAssinaturaUri, 'assinatura', 'tecnico');
    await salvarCaminhosEnviados(r.osId, c);
  }
  return c;
}

/**
 * Envia a execução da OS guardada no aparelho.
 *
 * Lança `FalhaNoEnvio` com o tipo (sem rede, sessão, recusado) para a tela
 * dizer o que fazer. Em `recusado` por regra local, `problemas` lista cada
 * pendência, com o mesmo texto que o servidor usaria.
 */
export async function enviarExecucao(osId: string): Promise<ResultadoEnvio> {
  const [pacote, r] = await Promise.all([pacoteGuardado(osId), rascunhoGuardado(osId)]);
  if (!pacote || !r) {
    throw new FalhaNoEnvio('recusado', 'Não há execução guardada para esta OS neste aparelho.');
  }

  let caminhos: CaminhosEnviados;
  try {
    caminhos = await enviarArquivos(pacote, r);
  } catch (e) {
    const tipo = classificarFalha({ message: (e as Error).message });
    await anotarTentativa(r, (e as Error).message);
    throw new FalhaNoEnvio(tipo, tipo === 'recusado' ? (e as Error).message : MENSAGEM[tipo]);
  }

  const montagem = montarEnvio(pacote, r, caminhos, new Date().toISOString());
  if (!montagem.ok) {
    await anotarTentativa(r, montagem.problemas.join(' '));
    throw new FalhaNoEnvio('recusado', 'Há pendências antes de enviar.', montagem.problemas);
  }

  const { data, error } = await supabase.rpc('registrar_execucao', {
    _os_id: osId,
    _dados: montagem.dados as Json,
  });
  if (error) {
    const tipo = classificarFalha(error);
    await anotarTentativa(r, error.message);
    // Recusa do servidor já vem escrita para o técnico ("Avalie todos os
    // pontos para concluir. Faltam 2."); as outras ganham a explicação daqui.
    throw new FalhaNoEnvio(tipo, tipo === 'recusado' ? error.message : MENSAGEM[tipo]);
  }

  const status = (data as { status?: string } | null)?.status === 'ja_registrada' ? 'ja_registrada' : 'registrada';
  // Confirmado pelo servidor: agora, e só agora, o aparelho pode esquecer.
  await apagarExecucaoLocal(osId);
  await apagarPacote(osId);
  return { status, osId };
}
