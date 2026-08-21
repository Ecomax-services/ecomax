// Edge Function: recuperar-senha
//
// Substitui o `resetPasswordForEmail` do cliente, que depende do SMTP do GoTrue
// — fora do ar por dias, com timeout de 35 s na porta 587. Aqui o link é gerado
// com service_role (`generateLink`, que não envia nada) e entregue pela API do
// Resend.
//
// Pública de propósito: quem esqueceu a senha não tem sessão. Duas
// consequências que o desenho precisa respeitar — a resposta nunca revela se o
// e-mail existe, e há limite por endereço para o formulário não virar
// disparador de e-mail.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { enviarEmail } from '../_shared/resend.ts';
import { emailRecuperacao } from '../_shared/templates.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const APP_URLS: Record<string, string | undefined> = {
  backoffice: Deno.env.get('APP_URL_BACKOFFICE'),
  portal: Deno.env.get('APP_URL_PORTAL'),
  mobile: Deno.env.get('APP_URL_MOBILE'),
};
const HORAS_VALIDADE = 1;

/**
 * Janela mínima entre dois pedidos para o mesmo endereço.
 *
 * Vive em memória e some quando a função hiberna, então não é uma trava dura —
 * é o suficiente para o botão clicado três vezes seguidas não virar três
 * e-mails. O limite de verdade é o do Resend.
 */
const ultimoPedido = new Map<string, number>();
const JANELA_MS = 60_000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  let body: { email?: string; app?: string; redirect_to?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Corpo inválido.' }, 400);
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const app = body.app ?? 'backoffice';
  if (!email || !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) {
    return json({ error: 'Informe um e-mail válido.' }, 400);
  }

  const agora = Date.now();
  const anterior = ultimoPedido.get(email);
  if (anterior && agora - anterior < JANELA_MS) {
    // Mesma resposta do caminho feliz: dizer "espere" a um endereço e "ok" a
    // outro entregaria quais existem.
    return json({ ok: true });
  }
  ultimoPedido.set(email, agora);

  // O `redirect_to` do app tem precedência: o aplicativo do operador roda com
  // esquema próprio (`ecomaxoperador://`) ou `exp://` no Expo Go, e só ele sabe
  // qual dos dois vale na instalação em uso.
  const base = APP_URLS[app];
  const destino = body.redirect_to
    ?? (base ? `${base.replace(/\/$/, '')}/criar-senha` : undefined);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: destino ? { redirectTo: destino } : undefined,
  });

  // E-mail inexistente cai aqui. A resposta é a mesma do sucesso, de propósito:
  // responder "não existe" entrega quem tem conta a quem só chutou endereços.
  if (error || !data?.properties?.action_link) {
    console.info('pedido de recuperação sem envio', { motivo: error?.message ?? 'sem link' });
    return json({ ok: true });
  }

  const { assunto, html, texto } = emailRecuperacao(data.properties.action_link, HORAS_VALIDADE);
  const envio = await enviarEmail({ para: email, assunto, html, texto });

  if (!envio.enviado) {
    // Falha de envio **não** é engolida: aqui o e-mail existe e a pessoa está
    // esperando. Silenciar deixaria ela tentando a senha antiga para sempre.
    console.error('falha ao enviar recuperação', { motivo: envio.motivo });

    // Erro de configuração sobe no corpo. Não conta nada sobre quem tem conta —
    // fala do servidor, não do usuário — e é a diferença entre "o QA reporta um
    // e-mail que não chega" e "alguém lê que falta a chave e resolve em um
    // minuto".
    const configuracao = /RESEND_API_KEY|não configurada|domain|verify|from address/i.test(envio.motivo ?? '');
    return json({
      error: 'Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.',
      ...(configuracao ? { motivo_configuracao: envio.motivo } : {}),
    }, 502);
  }

  return json({ ok: true });
});
