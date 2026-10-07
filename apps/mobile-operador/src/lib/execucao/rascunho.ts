import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { VERSAO_RASCUNHO, type CaminhosEnviados, type RascunhoExecucao } from '@/lib/execucao/tipos';

/**
 * O rascunho da execução, no aparelho.
 *
 * Cada mudança é gravada na hora: o app pode ser fechado, a bateria pode
 * acabar, e o técnico volta exatamente de onde parou. Os arquivos ficam numa
 * pasta própria da OS, fora do cache — o sistema pode limpar o cache sozinho,
 * e foto de evidência não pode sumir antes do envio.
 */

const chaveRascunho = (osId: string) => `ecomax:execucao:rascunho:${osId}`;
const chaveEnviados = (osId: string) => `ecomax:execucao:enviados:${osId}`;

/** Pasta dos arquivos da execução desta OS. */
export function pastaDaExecucao(osId: string): string {
  return `${FileSystem.documentDirectory}execucoes/${osId}/`;
}

function novoRascunho(osId: string): RascunhoExecucao {
  return {
    versao: VERSAO_RASCUNHO,
    osId,
    // A chave de idempotência do envio: nasce aqui, uma vez, e acompanha o
    // rascunho até o fim. Reenviar com ela nunca duplica a execução.
    execucaoUuid: Crypto.randomUUID(),
    inicio: null,
    atualizadoEm: new Date().toISOString(),
    etapa: 1,
    produtos: [],
    planos: {},
    pontos: {},
    aplicacoes: [],
    fotos: [],
    reposicao: null,
    assinante: { nome: '', assinaturaUri: null },
    tecnicoAssinaturaUri: null,
    envio: { tentativas: 0, ultimoErro: null, ultimaTentativa: null },
  };
}

export async function rascunhoGuardado(osId: string): Promise<RascunhoExecucao | null> {
  const bruto = await AsyncStorage.getItem(chaveRascunho(osId));
  if (!bruto) return null;
  try {
    const r = JSON.parse(bruto) as RascunhoExecucao;
    return r.versao === VERSAO_RASCUNHO ? r : null;
  } catch {
    return null;
  }
}

/** O rascunho da OS; cria um novo, com identificador próprio, se não houver. */
export async function abrirRascunho(osId: string): Promise<RascunhoExecucao> {
  const existente = await rascunhoGuardado(osId);
  if (existente) return existente;
  const r = novoRascunho(osId);
  await FileSystem.makeDirectoryAsync(pastaDaExecucao(osId), { intermediates: true });
  await AsyncStorage.setItem(chaveRascunho(osId), JSON.stringify(r));
  return r;
}

export async function salvarRascunho(r: RascunhoExecucao): Promise<RascunhoExecucao> {
  const atualizado = { ...r, atualizadoEm: new Date().toISOString() };
  await AsyncStorage.setItem(chaveRascunho(r.osId), JSON.stringify(atualizado));
  return atualizado;
}

/** Marca o início, uma vez só: reabrir a execução não reinicia o relógio. */
export async function iniciarExecucao(r: RascunhoExecucao): Promise<RascunhoExecucao> {
  if (r.inicio) return r;
  return salvarRascunho({ ...r, inicio: new Date().toISOString() });
}

/**
 * Traz um arquivo (foto da câmera, assinatura exportada) para a pasta da
 * execução e devolve o caminho local definitivo. O original pode estar no
 * cache, que o sistema limpa quando quer.
 */
export async function guardarArquivo(osId: string, uriOrigem: string, nome: string, extensao: string): Promise<string> {
  const pasta = pastaDaExecucao(osId);
  await FileSystem.makeDirectoryAsync(pasta, { intermediates: true });
  const destino = `${pasta}${nome}.${extensao}`;
  await FileSystem.copyAsync({ from: uriOrigem, to: destino });
  return destino;
}

/** Grava conteúdo em base64 (o quadro de assinatura devolve assim) como arquivo da execução. */
export async function guardarBase64(osId: string, base64: string, nome: string, extensao: string): Promise<string> {
  const pasta = pastaDaExecucao(osId);
  await FileSystem.makeDirectoryAsync(pasta, { intermediates: true });
  const destino = `${pasta}${nome}.${extensao}`;
  await FileSystem.writeAsStringAsync(destino, base64, { encoding: FileSystem.EncodingType.Base64 });
  return destino;
}

/** Identificador local de um arquivo (foto), também usado no caminho do upload. */
export function novoIdLocal(): string {
  return Crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Arquivos já enviados
// ---------------------------------------------------------------------------
// Separado do rascunho: o envio anota cada arquivo assim que ele sobe, e uma
// nova tentativa pula o que já chegou.

export async function caminhosEnviados(osId: string): Promise<CaminhosEnviados> {
  const bruto = await AsyncStorage.getItem(chaveEnviados(osId));
  const vazio: CaminhosEnviados = { fotos: {}, assinaturaCliente: null, assinaturaTecnico: null };
  if (!bruto) return vazio;
  try {
    return { ...vazio, ...(JSON.parse(bruto) as CaminhosEnviados) };
  } catch {
    return vazio;
  }
}

export async function salvarCaminhosEnviados(osId: string, c: CaminhosEnviados): Promise<void> {
  await AsyncStorage.setItem(chaveEnviados(osId), JSON.stringify(c));
}

/**
 * Apaga tudo da execução no aparelho. Só depois de o servidor confirmar o
 * registro — antes disso, o rascunho é a única cópia do trabalho do dia.
 */
export async function apagarExecucaoLocal(osId: string): Promise<void> {
  await AsyncStorage.multiRemove([chaveRascunho(osId), chaveEnviados(osId)]);
  await FileSystem.deleteAsync(pastaDaExecucao(osId), { idempotent: true });
}
