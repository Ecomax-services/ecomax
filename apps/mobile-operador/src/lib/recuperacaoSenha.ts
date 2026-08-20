import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

/**
 * Para onde o link do e-mail de recuperação deve trazer a pessoa de volta.
 *
 * `Linking.createURL` é quem sabe montar isso, e o resultado muda conforme onde
 * o app está rodando: dentro do Expo Go vira `exp://<host>/--/criar-senha`, e num
 * build nativo vira `ecomaxoperador://criar-senha`. Montar a URL à mão quebraria
 * um dos dois — e é justamente no Expo Go que o QA vai testar primeiro.
 */
export const urlDeRetorno = () => Linking.createURL('/criar-senha');

/**
 * Envia o e-mail de recuperação de senha para o próprio aplicativo.
 *
 * Sem o `redirectTo`, o Supabase usa o Site URL do projeto — que é o Backoffice.
 * O operador receberia um link para um sistema onde ele nem tem acesso.
 */
export async function enviarLinkDeRecuperacao(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: urlDeRetorno() });
  if (!error) return;

  // Limite de tentativas do GoTrue. Vem como 4xx e não pode ser engolido: nada
  // foi enviado, e a pessoa precisa saber que é só esperar — não que o link já
  // está a caminho.
  if (error.status === 429) {
    throw new Error('Aguarde um minuto antes de pedir outro link.');
  }

  // Falha de envio (5xx, ou o timeout de SMTP que aparece no log do GoTrue como
  // `context deadline exceeded`) precisa estourar. Devolver o erro para o
  // chamador decidir não bastava: dois dos três ignoravam o retorno e
  // anunciavam "Enviamos um link" com o e-mail parado na fila.
  if (!error.status || error.status >= 500) {
    throw new Error('Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.');
  }

  // O que sobra é e-mail inexistente — engolido de propósito: responder "esse
  // e-mail não existe" entrega quem tem conta a quem só chutou endereços.
}

/** URLs já processadas, para o mesmo link não ser consumido duas vezes. */
const jaUsadas = new Set<string>();

/**
 * Transforma o link aberto pela pessoa numa sessão de recuperação.
 *
 * No React Native o client roda com `detectSessionInUrl: false` — não existe
 * `window.location` para ele inspecionar —, então quem lê a URL somos nós.
 *
 * Trata os dois formatos que o Supabase pode mandar, conforme o template de
 * e-mail configurado no projeto:
 *   • `?token_hash=…&type=recovery` (verifyOtp)
 *   • `#access_token=…&refresh_token=…` (setSession)
 *
 * Um token só vale uma vez. Como esta função é chamada tanto no cold start
 * (getInitialURL) quanto pelo listener de URL, o mesmo link chegaria duas vezes
 * e a segunda falharia com "token expirado" — daí o controle de já usadas.
 */
export async function consumirLinkDeRecuperacao(url: string): Promise<boolean> {
  if (!url || jaUsadas.has(url)) return false;

  const { queryParams, hostname, path } = Linking.parse(url);
  const alvo = `${hostname ?? ''}${path ?? ''}`;
  const hash = url.includes('#') ? new URLSearchParams(url.slice(url.indexOf('#') + 1)) : null;

  const tokenHash = (queryParams?.token_hash as string | undefined) ?? undefined;
  const tipo = (queryParams?.type as string | undefined) ?? hash?.get('type') ?? undefined;
  const accessToken = hash?.get('access_token') ?? undefined;
  const refreshToken = hash?.get('refresh_token') ?? undefined;

  // O e-mail de primeiro acesso e o de "esqueci a senha" chegam os dois como
  // `recovery` — é o mesmo fluxo do ponto de vista do app.
  const ehRecuperacao = tipo === 'recovery' || alvo.includes('criar-senha');
  if (!ehRecuperacao) return false;

  jaUsadas.add(url);

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
    return !error;
  }
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return !error;
  }
  return false;
}
