// Edge Function: relatorio
//
// PDF do relatório técnico (Release 4, Fase 3 — PR 24). Um gerador só para
// a pré-visualização, o "Baixar PDF", a publicação no Portal e o envio por
// e-mail — o cliente recebe exatamente o que o escritório viu.
//
// POST { os_id, acao, ... }  (com o token da sessão)
//   acao 'previa'   { conteudo }  → PDF do rascunho ainda não salvo (Relatórios › ler)
//   acao 'pdf'      { numero? }   → PDF de uma versão; sem número, a atual (Relatórios › ler)
//   acao 'publicar'               → publica a última versão no Portal e envia por
//                                   e-mail aos contatos do cliente (Relatórios › editar)
//   acao 'enviar'                 → envia o PDF da última versão por e-mail,
//                                   sem publicar (Relatórios › editar)
//
// Os blocos são montados por `_shared/relatorio.ts`, o mesmo código da tela.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { ConteudoVersao, DadosRelatorio } from '../_shared/relatorio.ts';
import { gerarPdf, sha256 } from '../_shared/pdf.ts';
import { LOGO_PADRAO } from '../_shared/logo.ts';
import { enviarEmail } from '../_shared/resend.ts';
import { emailRelatorioTecnico } from '../_shared/templates.ts';
import { documentoRelatorio } from './documento.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const pdf = (bytes: Uint8Array<ArrayBuffer>, nome: string) =>
  new Response(bytes, { headers: { ...cors, 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${nome}"` } });

const URL_SUPABASE = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(URL_SUPABASE, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const BUCKET = 'operacional-docs';

async function imagem(bucket: string, caminho: string | null): Promise<string | null> {
  if (!caminho) return null;
  const { data, error } = await admin.storage.from(bucket).download(caminho);
  if (error || !data) return null;
  const bytes = new Uint8Array(await data.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${data.type?.startsWith('image/') ? data.type : 'image/png'};base64,${btoa(bin)}`;
}

function base64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function renderizar(dados: DadosRelatorio, conteudo: ConteudoVersao, versao: number): Promise<Uint8Array<ArrayBuffer>> {
  const logo = (await imagem('institucional', dados.empresa?.logo_path ?? null)) ?? LOGO_PADRAO;
  return gerarPdf(documentoRelatorio(dados, conteudo, versao, new Date(), { logo }));
}

/**
 * Para quem vai o e-mail: contatos ativos com e-mail marcados como
 * "Rel. técnica"; se o cliente não tiver nenhum, os marcados "Recebe e-mail".
 *   [A DEFINIR — confirmar o critério com o cliente.]
 */
async function destinatarios(clienteId: string): Promise<{ nome: string; email: string }[]> {
  const { data } = await admin.from('cliente_contatos')
    .select('nome, email, rel_tecnica, recebe_email')
    .eq('cliente_id', clienteId).eq('ativo', true).not('email', 'is', null);
  const comEmail = (data ?? []).filter((c) => (c.email ?? '').includes('@'));
  const tecnicos = comEmail.filter((c) => c.rel_tecnica);
  return (tecnicos.length ? tecnicos : comEmail.filter((c) => c.recebe_email)).map((c) => ({ nome: c.nome, email: c.email! }));
}

async function enviarAosContatos(dados: DadosRelatorio, bytes: Uint8Array, versao: number, publicado: boolean) {
  const para = await destinatarios(dados.os.cliente.id);
  if (para.length === 0) {
    return { enviados: [] as string[], motivo: 'Nenhum contato do cliente está marcado como "Rel. técnica" ou "Recebe e-mail" (Gestão de Clientes › Contatos).' };
  }
  const msg = emailRelatorioTecnico(dados.os.codigo, dados.os.cliente.nome, versao, publicado);
  const anexo = { nome: `relatorio-tecnico-${dados.os.codigo.toLowerCase()}-v${versao}.pdf`, base64: base64(bytes) };
  const enviados: string[] = [];
  const falhas: string[] = [];
  for (const c of para) {
    const r = await enviarEmail({ para: c.email, assunto: msg.assunto, html: msg.html, texto: msg.texto, anexos: [anexo] });
    if (r.enviado) enviados.push(c.email); else falhas.push(`${c.email}: ${r.motivo}`);
  }
  return { enviados, motivo: falhas.length ? falhas.join('; ') : null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  try {
    const corpo = await req.json().catch(() => ({}));
    const { os_id: osId, acao } = corpo as { os_id?: string; acao?: string };
    if (typeof osId !== 'string' || !/^[0-9a-f-]{36}$/i.test(osId)) return json({ error: 'Informe a OS.' }, 400);
    if (!['previa', 'pdf', 'publicar', 'enviar'].includes(acao ?? '')) return json({ error: 'Ação inválida.' }, 400);

    const sessao = createClient(URL_SUPABASE, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }, auth: { persistSession: false },
    });
    const { data: usuario } = await sessao.auth.getUser();
    if (!usuario.user) return json({ error: 'Sessão expirada.' }, 401);
    const precisa = acao === 'publicar' || acao === 'enviar' ? 'editar' : 'ler';
    const { data: pode } = await sessao.rpc('has_module_perm', { _modulo: 'relatorios', _acao: precisa });
    if (!pode) return json({ error: precisa === 'editar' ? 'Você não tem permissão para publicar ou enviar relatórios técnicos.' : 'Você não tem acesso aos relatórios técnicos.' }, 403);

    // Dados crus com a chave de serviço (a função do banco aceita service_role).
    const { data: d, error: e1 } = await admin.rpc('relatorio_dados', { _os_id: osId });
    if (e1) return json({ error: e1.message }, e1.code === 'P0002' ? 404 : 400);
    const dados = d as unknown as DadosRelatorio;
    const atual = dados.relatorio?.versao_atual ?? 1;

    if (acao === 'previa') {
      // O cabeçalho mostra o número da última versão salva, como no protótipo.
      const conteudo = (corpo.conteudo ?? {}) as ConteudoVersao;
      return pdf(await renderizar(dados, conteudo, atual), `previa-${dados.os.codigo}.pdf`);
    }

    const numero = acao === 'pdf' && Number.isInteger(corpo.numero) ? Number(corpo.numero) : atual;
    const { data: versao } = await admin.from('os_relatorio_versoes').select('conteudo').eq('os_id', osId).eq('numero', numero).maybeSingle();
    if (!versao) return json({ error: `A versão v${numero} não existe.` }, 404);
    const conteudo = versao.conteudo as ConteudoVersao;
    const bytes = await renderizar(dados, conteudo, numero);

    if (acao === 'pdf') return pdf(bytes, `relatorio-tecnico-${dados.os.codigo.toLowerCase()}-v${numero}.pdf`);

    if (acao === 'enviar') {
      const envio = await enviarAosContatos(dados, bytes, numero, dados.relatorio?.versao_publicada === numero);
      if (envio.enviados.length === 0) return json({ error: envio.motivo }, 422);
      return json({ numero, enviados: envio.enviados, motivo: envio.motivo });
    }

    // Publicar: guarda o PDF e registra a publicação numa transação no banco.
    const hash = await sha256(bytes);
    const caminho = `os/${osId}/relatorio/relatorio-tecnico-${dados.os.codigo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-v${numero}-${hash.slice(0, 12)}.pdf`;
    const up = await admin.storage.from(BUCKET).upload(caminho, bytes, { contentType: 'application/pdf', upsert: false });
    if (up.error && !/exists|duplicate/i.test(up.error.message)) throw new Error(up.error.message);
    const { error: e2 } = await admin.rpc('registrar_publicacao_relatorio', { _os_id: osId, _numero: numero, _caminho: caminho, _usuario: usuario.user.id });
    if (e2) return json({ error: e2.message }, e2.code === '23514' || e2.code === '40001' ? 422 : 400);

    // E-mail aos contatos: a publicação já valeu; falha no envio só é avisada.
    const envio = await enviarAosContatos(dados, bytes, numero, true);
    return json({ numero, caminho, enviados: envio.enviados, motivo: envio.motivo });
  } catch (e) {
    console.error('relatorio:', e);
    return json({ error: 'Não foi possível gerar o relatório agora. Tente de novo em instantes.' }, 500);
  }
});
