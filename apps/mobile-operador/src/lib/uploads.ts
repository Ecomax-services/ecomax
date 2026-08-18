import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';

const BUCKET = 'operacional-docs';

/**
 * Tipos de documento que o app de campo produz.
 *
 * A lista é a mesma da policy `opdocs_operador_insert`: relatório e certificado
 * ficam de fora de propósito, porque são documentos de registro emitidos pelo
 * backoffice. Enviar qualquer outro tipo daqui toma 403.
 */
export type TipoDoc = 'assinatura' | 'foto' | 'anexo';

function slug(nome: string): string {
  return (
    nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'arquivo'
  );
}

/**
 * Monta o caminho no formato que as policies de storage exigem:
 * `os/<os_id>/<tipo>/<timestamp>-<slug>.<ext>`.
 *
 * A policy extrai o os_id do próprio caminho para decidir o acesso, então nome
 * fora deste formato é recusado — não é convenção de organização, é o
 * mecanismo de autorização.
 *
 * O timestamp também é o que torna reenvio possível: o operador não tem UPDATE
 * nem DELETE no bucket (assinatura e foto são evidência de execução), então
 * corrigir significa gravar um caminho novo.
 */
export function caminhoOs(osId: string, tipo: TipoDoc, nomeArquivo: string): string {
  return `os/${osId}/${tipo}/${Date.now()}-${slug(nomeArquivo)}`;
}

/** Envia conteúdo já em base64 (é o que o quadro de assinatura devolve). */
export async function enviarBase64(
  caminho: string,
  base64: string,
  contentType: string,
): Promise<string> {
  // O supabase-js aceita ArrayBuffer no React Native; Blob e File não existem
  // aqui de forma confiável, e mandar a string crua grava o base64 como texto.
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, decode(base64), { contentType, upsert: false });
  if (error) throw new Error(traduzErro(error.message));
  return caminho;
}

/** Envia um arquivo que já está no aparelho (foto da câmera ou da galeria). */
export async function enviarArquivoLocal(
  caminho: string,
  uri: string,
  contentType: string,
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return enviarBase64(caminho, base64, contentType);
}

/**
 * URL temporária para exibir um documento privado.
 * O bucket não é público — quem autoriza é a policy de SELECT, avaliada no
 * momento em que a URL é assinada.
 */
export async function urlAssinada(caminho: string, segundos = 60 * 60): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, segundos);
  return data?.signedUrl ?? null;
}

/**
 * O 403 do storage chega como "new row violates row-level security policy",
 * que não diz nada para quem está em campo.
 */
function traduzErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('row-level security') || m.includes('unauthorized')) {
    return 'Você não está escalado nesta OS, então não pode enviar arquivos nela.';
  }
  if (m.includes('already exists')) {
    return 'Já existe um arquivo com este nome. Tente novamente.';
  }
  return msg;
}
