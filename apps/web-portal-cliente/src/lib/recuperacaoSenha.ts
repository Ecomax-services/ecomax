import { supabase } from '@/lib/supabase';

/**
 * Pede o e-mail de recuperação de senha.
 *
 * Não usa `supabase.auth.resetPasswordForEmail`: aquele caminho depende do SMTP
 * do GoTrue, que ficou dias fora do ar com timeout de 35 s — e enquanto isso a
 * tela anunciava "enviamos um link" que nunca saía. A Edge Function
 * `recuperar-senha` gera o link com service_role e entrega pela API do Resend.
 *
 * Erro de envio sobe como exceção, de propósito: quem está esperando o e-mail
 * precisa saber que ele não saiu, em vez de ficar tentando a senha antiga.
 */
export async function pedirRecuperacaoDeSenha(email: string, app: 'portal', redirectTo?: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('recuperar-senha', {
    body: { email: email.trim(), app, ...(redirectTo ? { redirect_to: redirectTo } : {}) },
  });

  if (error) {
    // O corpo da resposta 502 traz o motivo quando ele é de configuração —
    // "RESEND_API_KEY não configurada" é informação de servidor, não de
    // usuário, e economiza uma investigação inteira.
    const detalhe = (data as { motivo_configuracao?: string } | null)?.motivo_configuracao;
    throw new Error(detalhe
      ? `Não foi possível enviar o e-mail: ${detalhe}`
      : 'Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.');
  }
}
