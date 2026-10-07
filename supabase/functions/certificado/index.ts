// Edge Function: certificado
//
// Emite o certificado de execução de uma OS executada pelo App (PR 18).
//
// POST { os_id }  (com o token da sessão)
//   200 { numero, pdf_path, ja_emitido }  — emitido agora, ou já existia
//   403 — quem chamou não é técnico da OS nem tem Operacional › editar
//   404 — OS inexistente ou fora do alcance de quem chamou
//   422 { error, faltas[] } — falta dado para emitir (empresa, RT, validade…)
//
// Quem emite é esta função, com a chave de serviço: `os_certificados` não
// aceita INSERT pela API. Uma emissão por OS (unique em os_id); chamar de novo
// devolve a mesma. Se uma tentativa anterior gravou o certificado e caiu antes
// do PDF, esta desenha o PDF a partir do snapshot gravado — nunca de um
// cadastro que pode ter mudado.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { DadosCertificado, Snapshot, documento, faltas, montarSnapshot } from './conteudo.ts';
import { gerarPdf, sha256 } from './pdf.ts';
import { LOGO_PADRAO } from './logo.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const URL_SUPABASE = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(URL_SUPABASE, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

const BUCKET_OS = 'operacional-docs';
const um = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

function enderecoDoCliente(c: Record<string, string | null> | null): string {
  if (!c) return '—';
  const linha = [c.logradouro, c.numero, c.complemento, c.bairro].filter(Boolean).join(', ');
  const cidade = [c.cidade, c.uf].filter(Boolean).join('/');
  return [linha, cidade, c.cep ? `CEP ${c.cep}` : null].filter(Boolean).join(' · ') || '—';
}

/** Lê tudo o que o certificado imprime, com a chave de serviço. */
async function carregar(osId: string): Promise<DadosCertificado> {
  const [osR, empR, licR, rtR, prodR, aplR, tiposR] = await Promise.all([
    admin.from('ordens_servico')
      .select('id, codigo, status, tipos_servico, pragas, inicio_execucao, termino_execucao, contato, endereco_execucao, assinatura_url, assinante_nome, assinante_cargo, tecnico_assinatura_url, tecnico:funcionarios!ordens_servico_tecnico_executor_id_fkey(nome_completo), cliente:cliente_id(nome, razao_social, cnpj, cpf, telefone, logradouro, numero, complemento, bairro, cidade, uf, cep)')
      .eq('id', osId).single(),
    admin.from('empresa_config').select('razao_social, cnpj, endereco, contato, ceatox, logo_path').maybeSingle(),
    admin.from('empresa_licencas').select('rotulo, descricao').eq('ativo', true).order('ordem'),
    // O RT vigente é o que não tem fim de vigência. Troca de RT é linha nova.
    admin.from('responsaveis_tecnicos').select('id, nome, formacao, conselho, registro, assinatura_path')
      .is('vigente_ate', null).order('vigente_desde', { ascending: false }).limit(1).maybeSingle(),
    admin.from('os_produtos')
      .select('produto_id, qtd_utilizada, unidade, unidade_utilizada, lote, produto:produto_id(nome, categoria, registro_anvisa, unidade), escolhido:estoque_lote_id(lote)')
      .eq('os_id', osId).gt('qtd_utilizada', 0).order('created_at'),
    admin.from('os_aplicacoes').select('produto_id, tecnica').eq('os_id', osId),
    admin.from('catalogo_itens').select('nome, validade_certificado_dias').eq('catalogo', 'tipos_servico'),
  ]);
  for (const r of [osR, empR, licR, rtR, prodR, aplR, tiposR]) if (r.error) throw new Error(r.error.message);

  const o = osR.data!;
  const c = um(o.cliente as Record<string, string | null> | Record<string, string | null>[] | null);
  const tecnicas = new Map<string, string>();
  for (const a of aplR.data ?? []) if (a.produto_id && a.tecnica && !tecnicas.has(a.produto_id)) tecnicas.set(a.produto_id, a.tecnica);
  const e = empR.data;
  const rt = rtR.data;

  return {
    os: {
      id: o.id, codigo: o.codigo, status: o.status, tipos: o.tipos_servico ?? [], pragas: o.pragas ?? [],
      inicio: o.inicio_execucao, termino: o.termino_execucao, contato: o.contato, endereco: o.endereco_execucao,
      assinaturaPath: o.assinatura_url, assinanteNome: o.assinante_nome, assinanteCargo: o.assinante_cargo,
      tecnicoAssinaturaPath: o.tecnico_assinatura_url,
    },
    cliente: {
      nome: c?.razao_social || c?.nome || '—', documento: c?.cnpj || c?.cpf || null,
      endereco: enderecoDoCliente(c), telefone: c?.telefone ?? null,
    },
    empresa: e ? { razaoSocial: e.razao_social, cnpj: e.cnpj, endereco: e.endereco, contato: e.contato, ceatox: e.ceatox, logoPath: e.logo_path } : null,
    licencas: (licR.data ?? []).map((l) => ({ rotulo: l.rotulo, descricao: l.descricao })),
    rt: rt ? { id: rt.id, nome: rt.nome, formacao: rt.formacao, conselho: rt.conselho, registro: rt.registro, assinaturaPath: rt.assinatura_path } : null,
    tecnico: (() => { const t = um(o.tecnico as { nome_completo: string } | { nome_completo: string }[] | null); return t ? { nome: t.nome_completo } : null; })(),
    produtos: (prodR.data ?? []).map((p) => {
      const prod = um(p.produto as Record<string, string | null> | Record<string, string | null>[] | null);
      const escolhido = um(p.escolhido as { lote: string } | { lote: string }[] | null);
      return {
        nome: prod?.nome ?? 'Produto', categoria: prod?.categoria ?? null, registro: prod?.registro_anvisa ?? null,
        lote: escolhido?.lote ?? p.lote, quantidade: p.qtd_utilizada, unidade: p.unidade_utilizada ?? p.unidade ?? prod?.unidade ?? null,
        tecnica: p.produto_id ? tecnicas.get(p.produto_id) ?? null : null,
      };
    }),
    validades: Object.fromEntries((tiposR.data ?? []).map((t) => [t.nome, t.validade_certificado_dias])),
  };
}

/** Baixa uma imagem do storage como data URL; `null` se não houver ou falhar. */
async function imagem(bucket: string, caminho: string | null): Promise<string | null> {
  if (!caminho) return null;
  const { data, error } = await admin.storage.from(bucket).download(caminho);
  if (error || !data) return null;
  const bytes = new Uint8Array(await data.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const tipo = data.type && data.type.startsWith('image/') ? data.type : 'image/png';
  return `data:${tipo};base64,${btoa(bin)}`;
}

/** Desenha o PDF do snapshot, envia ao storage e liga ao certificado e aos anexos da OS. */
async function anexarPdf(certId: string, osId: string, s: Snapshot, criadoPor: string): Promise<string> {
  const [logo, ...assinaturas] = await Promise.all([
    s.logoPath ? imagem('institucional', s.logoPath) : Promise.resolve(null),
    ...s.assinaturas.map((a) => imagem(a.bucket, a.caminho)),
  ]);
  const pdf = await gerarPdf(documento(s, { logo: logo ?? LOGO_PADRAO, assinaturas }));
  const hash = await sha256(pdf);
  const slug = s.numero.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  // O hash no nome deixa cada tentativa num caminho próprio: o storage não
  // sobrescreve, e uma tentativa que caiu depois do upload não trava a próxima.
  const caminho = `os/${osId}/certificado/certificado-${slug}-${hash.slice(0, 12)}.pdf`;

  const up = await admin.storage.from(BUCKET_OS).upload(caminho, pdf, { contentType: 'application/pdf', upsert: false });
  if (up.error && !/exists|duplicate/i.test(up.error.message)) throw new Error(up.error.message);

  // O trigger aceita anexar o PDF uma vez só. `is null` evita corrida entre
  // duas chamadas: a segunda não atualiza e devolve o caminho da primeira.
  const { data: atual, error } = await admin.from('os_certificados')
    .update({ pdf_path: caminho, pdf_sha256: hash })
    .eq('id', certId).is('pdf_path', null)
    .select('pdf_path').maybeSingle();
  if (error) throw new Error(error.message);
  if (!atual) {
    const { data } = await admin.from('os_certificados').select('pdf_path').eq('id', certId).single();
    return data!.pdf_path as string;
  }

  // Espelho em os_anexos: é por aí que o Portal (aba Certificado) e o
  // Backoffice listam os documentos da OS.
  await admin.from('os_anexos').insert({ os_id: osId, nome: 'Certificado de Execução', tipo: 'certificado', arquivo_url: caminho, created_by: criadoPor });
  return caminho;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  try {
    const auth = req.headers.get('Authorization') ?? '';
    const { os_id: osId } = await req.json().catch(() => ({}));
    if (typeof osId !== 'string' || !/^[0-9a-f-]{36}$/i.test(osId)) return json({ error: 'Informe a OS.' }, 400);

    // Quem chamou, com a sessão dele: a RLS decide se ele enxerga a OS.
    const sessao = createClient(URL_SUPABASE, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } }, auth: { persistSession: false },
    });
    const { data: usuario } = await sessao.auth.getUser();
    if (!usuario.user) return json({ error: 'Sessão expirada.' }, 401);
    const { data: visivel } = await sessao.from('ordens_servico').select('id').eq('id', osId).maybeSingle();
    if (!visivel) return json({ error: 'OS não encontrada.' }, 404);
    // Ver a OS não basta (o cliente do Portal também vê): emite o técnico
    // escalado nela ou quem edita o Operacional.
    const [{ data: minha }, { data: edita }] = await Promise.all([
      sessao.rpc('os_is_mine', { _os_id: osId }),
      sessao.rpc('has_module_perm', { _modulo: 'operacional', _acao: 'editar' }),
    ]);
    if (!minha && !edita) return json({ error: 'Só o técnico da OS ou o escritório emitem o certificado.' }, 403);

    const { data: existente } = await admin.from('os_certificados').select('id, numero, snapshot, pdf_path').eq('os_id', osId).maybeSingle();
    if (existente?.pdf_path) return json({ numero: existente.numero, pdf_path: existente.pdf_path, ja_emitido: true });
    if (existente) {
      const caminho = await anexarPdf(existente.id, osId, existente.snapshot as Snapshot, usuario.user.id);
      return json({ numero: existente.numero, pdf_path: caminho, ja_emitido: true });
    }

    const dados = await carregar(osId);
    const pendencias = faltas(dados);
    if (pendencias.length) return json({ error: 'Ainda não dá para emitir o certificado.', faltas: pendencias }, 422);

    const emitidoEm = new Date().toISOString();
    const snapshot = montarSnapshot(dados, emitidoEm);
    const { data: cert, error } = await admin.from('os_certificados').insert({
      os_id: osId, numero: snapshot.numero, emitido_em: emitidoEm, validade: snapshot.validade,
      responsavel_tecnico_id: dados.rt!.id, snapshot, emitido_por: usuario.user.id,
    }).select('id').single();
    if (error) {
      // Duas chamadas ao mesmo tempo: a outra emitiu primeiro. Usa a dela.
      if (error.code === '23505') {
        const { data: outro } = await admin.from('os_certificados').select('id, numero, snapshot, pdf_path').eq('os_id', osId).single();
        const caminho = outro!.pdf_path ?? await anexarPdf(outro!.id, osId, outro!.snapshot as Snapshot, usuario.user.id);
        return json({ numero: outro!.numero, pdf_path: caminho, ja_emitido: true });
      }
      throw new Error(error.message);
    }

    const caminho = await anexarPdf(cert.id, osId, snapshot, usuario.user.id);
    return json({ numero: snapshot.numero, pdf_path: caminho, ja_emitido: false });
  } catch (e) {
    console.error('certificado:', e);
    return json({ error: 'Não foi possível emitir o certificado agora. Tente de novo em instantes.' }, 500);
  }
});
