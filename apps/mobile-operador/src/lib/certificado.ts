import { Linking } from 'react-native';
import * as Sharing from 'expo-sharing';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { baixarPdf, urlDoDocumento } from '@/lib/historico/dados';

/**
 * Certificado de execução: emissão pela Edge Function `certificado` e as
 * ações "Visualizar" e "Compartilhar" do protótipo.
 *
 * O PDF oficial só existe depois do envio da execução — é o servidor que o
 * desenha, com os dados da empresa e do RT. Por isso as ações aparecem na tela
 * de conclusão e no histórico, não antes de enviar.
 */

export type ResultadoCertificado =
  | { tipo: 'emitido'; numero: string; caminho: string }
  /** Falta cadastro (empresa, RT, validade…): quem resolve é o escritório. */
  | { tipo: 'pendente'; faltas: string[] }
  /** Sem rede ou falha do servidor: tentar de novo depois. */
  | { tipo: 'falhou'; mensagem: string };

export async function emitirCertificado(osId: string): Promise<ResultadoCertificado> {
  try {
    const { data, error } = await supabase.functions.invoke('certificado', { body: { os_id: osId } });
    if (!error && data?.pdf_path) return { tipo: 'emitido', numero: data.numero, caminho: data.pdf_path };
    if (error instanceof FunctionsHttpError) {
      const corpo = await error.context.json().catch(() => null);
      if (error.context.status === 422 && Array.isArray(corpo?.faltas)) return { tipo: 'pendente', faltas: corpo.faltas };
      return { tipo: 'falhou', mensagem: corpo?.error ?? 'Não foi possível emitir o certificado agora.' };
    }
    return { tipo: 'falhou', mensagem: 'Sem conexão. O certificado sai quando você abrir a OS no histórico com internet.' };
  } catch {
    return { tipo: 'falhou', mensagem: 'Sem conexão. O certificado sai quando você abrir a OS no histórico com internet.' };
  }
}

export async function visualizarPdf(caminho: string): Promise<void> {
  await Linking.openURL(await urlDoDocumento(caminho));
}

/** Compartilha o arquivo PDF (e-mail, WhatsApp…) — não um link que expira. */
export async function compartilharPdf(caminho: string, codigo: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Este aparelho não permite compartilhar arquivos.');
  const uri = await baixarPdf(caminho, `certificado-${codigo}`);
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Certificado ${codigo}` });
}
