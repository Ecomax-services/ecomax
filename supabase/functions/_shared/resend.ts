/**
 * Envio de e-mail pela API HTTP do Resend.
 *
 * O caminho por SMTP do GoTrue não é usado: ele ficou fora do ar por dias
 * (timeout de 35 s na porta 587) e, mesmo funcionando, só serve aos e-mails de
 * autenticação — notificação e aviso de operação ficariam sem canal.
 *
 * Aqui a chave é `RESEND_API_KEY` e o remetente é `RESEND_FROM`, ambos secrets
 * da função. Sem a chave nada é enviado, e o chamador recebe o motivo — nunca
 * um "enviado" que não aconteceu.
 */

const API = 'https://api.resend.com/emails';

export interface Email {
  para: string;
  assunto: string;
  html: string;
  /** Alternativa em texto puro, para cliente de e-mail que não renderiza HTML. */
  texto?: string;
}

export interface ResultadoEnvio {
  enviado: boolean;
  id?: string;
  motivo?: string;
}

export async function enviarEmail({ para, assunto, html, texto }: Email): Promise<ResultadoEnvio> {
  const chave = Deno.env.get('RESEND_API_KEY');
  if (!chave) {
    return { enviado: false, motivo: 'RESEND_API_KEY não configurada nas secrets da função' };
  }
  const remetente = Deno.env.get('RESEND_FROM') ?? 'Ecomax <nao-responda@ecomax.com.br>';

  let r: Response;
  try {
    r = await fetch(API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: remetente, to: [para], subject: assunto, html, text: texto }),
    });
  } catch (e) {
    // Rede fora entre a função e o Resend. Vale distinguir de recusa do
    // provedor: uma se resolve tentando de novo, a outra não.
    return { enviado: false, motivo: `Falha de rede ao falar com o Resend: ${(e as Error).message}` };
  }

  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) {
    // O Resend devolve `message` com o motivo — domínio não verificado,
    // destinatário recusado, chave inválida. Passar adiante evita o suporte
    // adivinhar.
    const motivo = (corpo as { message?: string }).message ?? `HTTP ${r.status}`;
    console.error('resend recusou o envio', { status: r.status, motivo, para });
    return { enviado: false, motivo };
  }
  return { enviado: true, id: (corpo as { id?: string }).id };
}
