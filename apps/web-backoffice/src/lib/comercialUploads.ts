import { supabase } from '@/lib/supabase';

const BUCKET = 'comercial-docs';

/** Onde o anexo vive: no follow-up ou na garantia. */
export type EscopoAnexo = 'follow-up' | 'garantia';

/** 10 MB por arquivo, como o Discovery define. O bucket também limita. */
export const TAMANHO_MAX = 10 * 1024 * 1024;

/**
 * Tipos aceitos, agrupados como o Discovery lista.
 *
 * `.msg` e `.eml` quase nunca chegam com MIME confiável do navegador, então a
 * checagem é por extensão — validar por `file.type` recusaria e-mail salvo, que
 * é justamente um dos formatos que o comercial mais anexa.
 */
const EXTENSOES: Record<string, string> = {
  pdf: 'PDF', doc: 'Documento', docx: 'Documento',
  jpg: 'Imagem', jpeg: 'Imagem', png: 'Imagem',
  xls: 'Planilha', xlsx: 'Planilha', csv: 'Planilha',
  msg: 'E-mail', eml: 'E-mail',
};

export const extensaoDe = (nome: string) => nome.split('.').pop()?.toLowerCase() ?? '';
export const tipoDe = (nome: string) => EXTENSOES[extensaoDe(nome)] ?? 'Outro';
export const ehVisualizavel = (nome: string) => ['pdf', 'jpg', 'jpeg', 'png'].includes(extensaoDe(nome));

function slug(nome: string): string {
  return (
    nome
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'arquivo'
  );
}

/**
 * Caminho no formato que a policy exige: `<escopo>/<id>/<ts>-<slug>.<ext>`.
 *
 * A policy confere o prefixo por regex antes de qualquer outra coisa, então
 * nome fora do padrão é recusado no servidor — não é convenção de organização.
 */
export const caminhoAnexo = (escopo: EscopoAnexo, id: string, nome: string) =>
  `${escopo}/${id}/${Date.now()}-${slug(nome)}`;

function traduzErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('row-level security') || m.includes('unauthorized')) {
    return 'Você não tem permissão para anexar arquivos aqui.';
  }
  if (m.includes('exceeded the maximum') || m.includes('payload too large')) {
    return 'O arquivo passa de 10 MB.';
  }
  if (m.includes('already exists')) return 'Já existe um arquivo com este nome. Tente novamente.';
  return msg;
}

/** Recusa antes de subir, para a pessoa não esperar por um upload que vai falhar. */
export function validar(file: File): string | null {
  if (!EXTENSOES[extensaoDe(file.name)]) {
    return `"${file.name}": formato não aceito. Use PDF, Word, imagem, planilha ou e-mail.`;
  }
  if (file.size > TAMANHO_MAX) {
    return `"${file.name}" tem ${(file.size / 1024 / 1024).toFixed(1)} MB — o limite é 10 MB.`;
  }
  return null;
}

async function actorId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Sobe o arquivo e registra a linha.
 *
 * Nesta ordem: se o upload falhar, não fica uma linha apontando para um arquivo
 * que não existe — que é o defeito que a lista de anexos tinha antes, mostrando
 * itens sem conteúdo.
 */
export async function enviarAnexo(escopo: EscopoAnexo, id: string, file: File): Promise<void> {
  const erro = validar(file);
  if (erro) throw new Error(erro);

  const caminho = caminhoAnexo(escopo, id, file.name);
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, file, { contentType: file.type || undefined, upsert: false });
  if (upErr) throw new Error(traduzErro(upErr.message));

  const tabela = escopo === 'follow-up' ? 'comercial_fup_anexos' : 'comercial_garantia_anexos';
  const chave = escopo === 'follow-up' ? 'follow_up_id' : 'garantia_id';
  const { error } = await supabase.from(tabela).insert({
    [chave]: id,
    nome: file.name,
    tipo: tipoDe(file.name),
    tamanho_bytes: file.size,
    arquivo_url: caminho,
    created_by: await actorId(),
  } as never);
  if (error) {
    // A linha é o que torna o arquivo encontrável. Sem ela o objeto viraria
    // lixo invisível no bucket, então é melhor desfazer o upload.
    await supabase.storage.from(BUCKET).remove([caminho]);
    throw new Error(error.message);
  }
}

export async function urlAnexo(caminho: string | null, segundos = 60 * 60): Promise<string | null> {
  if (!caminho) return null;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, segundos);
  return data?.signedUrl ?? null;
}

export async function abrirAnexo(caminho: string | null): Promise<void> {
  const url = await urlAnexo(caminho);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

/** Remove a linha e o objeto. O arquivo vai depois: se a linha não sair, nada se perde. */
export async function removerAnexo(escopo: EscopoAnexo, anexoId: string, caminho: string | null): Promise<void> {
  const tabela = escopo === 'follow-up' ? 'comercial_fup_anexos' : 'comercial_garantia_anexos';
  const { error } = await supabase.from(tabela).delete().eq('id', anexoId);
  if (error) throw new Error(error.message);
  if (caminho) await supabase.storage.from(BUCKET).remove([caminho]);
}
