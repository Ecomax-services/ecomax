// Edge Function: garantia-publica
//
// Atende o link que o cliente recebe por e-mail, sem login. É a primeira
// superfície anônima do produto, e por isso NÃO existe policy de `anon` sobre
// as tabelas do Comercial: o acesso passa só por aqui, onde token, expiração e
// revogação são conferidos antes de qualquer dado sair.
//
// GET  ?token=…            → devolve o mínimo para a tela de renovação
// POST { token, resposta } → registra a resposta do cliente
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

const RESPOSTAS = ['renovar', 'recusar', 'contato'];

/**
 * Resolve o token.
 *
 * A mesma mensagem para token inexistente, expirado e revogado é deliberada:
 * distinguir os casos diria a quem tenta adivinhar se acertou um código válido.
 */
async function resolver(token: string) {
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;

  const { data } = await admin
    .from('comercial_garantia_links')
    .select('id, garantia_id, expira_em, revogado, respondido_em, resposta')
    .eq('token', token)
    .maybeSingle();

  if (!data || data.revogado) return null;
  if (new Date(data.expira_em).getTime() < Date.now()) return null;
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    if (req.method === 'GET') {
      const token = new URL(req.url).searchParams.get('token') ?? '';
      const link = await resolver(token);
      if (!link) return json({ error: 'Link inválido ou expirado.' }, 404);

      const { data: g } = await admin
        .from('comercial_garantias')
        .select('data_execucao, data_validade, status, cliente:cliente_id(nome), os:os_id(codigo)')
        .eq('id', link.garantia_id)
        .maybeSingle();
      if (!g) return json({ error: 'Link inválido ou expirado.' }, 404);

      const { data: servicos } = await admin
        .from('comercial_garantia_servicos')
        .select('tipo_servico')
        .eq('garantia_id', link.garantia_id);

      // Primeira abertura fica registrada; as seguintes não sobrescrevem, para
      // o comercial saber quando o cliente viu pela primeira vez.
      if (!link.respondido_em) {
        await admin.from('comercial_garantia_links')
          .update({ aberto_em: new Date().toISOString() })
          .eq('id', link.id)
          .is('aberto_em', null);
      }

      const cliente = Array.isArray(g.cliente) ? g.cliente[0] : g.cliente;
      const os = Array.isArray(g.os) ? g.os[0] : g.os;

      // Só o necessário para a tela. Nada de id interno, valor ou histórico.
      return json({
        cliente: cliente?.nome ?? '',
        os: os?.codigo ?? '',
        data_execucao: g.data_execucao,
        data_validade: g.data_validade,
        servicos: (servicos ?? []).map((s) => s.tipo_servico),
        ja_respondido: !!link.respondido_em,
        resposta: link.resposta,
      });
    }

    if (req.method === 'POST') {
      const { token, resposta } = await req.json().catch(() => ({}));
      if (!RESPOSTAS.includes(resposta)) return json({ error: 'Resposta inválida.' }, 400);

      const link = await resolver(token);
      if (!link) return json({ error: 'Link inválido ou expirado.' }, 404);
      if (link.respondido_em) return json({ error: 'Este link já foi respondido.' }, 409);

      const agora = new Date().toISOString();
      await admin.from('comercial_garantia_links')
        .update({ respondido_em: agora, resposta })
        .eq('id', link.id);

      // A resposta move o status da garantia. É o ponto do módulo: o cliente
      // responde e o comercial vê no funil, sem ninguém transcrever e-mail.
      const novoStatus =
        resposta === 'renovar' ? 'Renovado' :
        resposta === 'recusar' ? 'Renovação Recusada' : 'Aguardando Retorno';

      const { data: atual } = await admin
        .from('comercial_garantias').select('status').eq('id', link.garantia_id).maybeSingle();

      await admin.from('comercial_garantias')
        .update({ status: novoStatus, data_contato_renovacao: agora.slice(0, 10) })
        .eq('id', link.garantia_id);

      await admin.from('comercial_garantia_historico').insert({
        garantia_id: link.garantia_id,
        campo: 'Status',
        valor_anterior: atual?.status ?? null,
        valor_novo: novoStatus,
        comentario: `Resposta do cliente pelo link público: ${resposta}.`,
        actor_id: null,   // não há usuário logado — é o cliente final
      });

      return json({ ok: true, status: novoStatus });
    }

    return json({ error: 'Método não permitido' }, 405);
  } catch (e) {
    console.error('garantia-publica', e);
    // Erro interno não descreve o que houve para quem está fora.
    return json({ error: 'Não foi possível processar agora.' }, 500);
  }
});
