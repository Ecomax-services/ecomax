import { supabase } from '@/lib/supabase';

/**
 * Estado de um documento com validade (ASO, CNH).
 *
 * A mesma regra vive no backoffice, em `lib/documentos.ts` — lá ela já é única
 * para as quatro telas que perguntavam. Enquanto não existe um pacote
 * compartilhado, estas duas cópias precisam continuar dizendo a mesma coisa:
 * meia-noite local como referência, o documento vale **até** a data impressa, e
 * ausência é pendência, não dispensa. Ao mexer aqui, conferir lá.
 */
/**
 * `ausente` é documento que falta, não documento dispensado. O perfil lista CNH
 * e ASO para todo operador, então a ausência nunca significa "não se aplica" —
 * significa que ninguém enviou, e para trabalho de campo os dois são exigidos.
 */
export type DocState = 'ok' | 'soon' | 'expired' | 'ausente';

const DIA = 86400000;

export function docState(iso: string | null): DocState {
  if (!iso) return 'ausente';
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(iso + 'T00:00:00').getTime();
  if (venc < hoje.getTime()) return 'expired';
  if (venc <= hoje.getTime() + 30 * DIA) return 'soon';
  return 'ok';
}

export const brDate = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—');

export interface DocumentoPerfil {
  tipo: 'CNH' | 'ASO';
  validade: string;      // dd/mm/aaaa ou '—'
  estado: DocState;
}

export interface MeuPerfil {
  cargo: string;
  setor: string;
  documentos: DocumentoPerfil[];
  /** true quando o login não está vinculado a um cadastro de funcionário. */
  semCadastro: boolean;
}

/**
 * Dados do funcionário vinculado ao usuário logado.
 *
 * A policy `funcionarios_self_select` permite ao operador ler apenas o próprio
 * registro (`profile_id = auth.uid()`), então esta consulta não precisa do
 * módulo `gestao_usuarios`.
 */
export async function getMeuPerfil(): Promise<MeuPerfil> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  const vazio: MeuPerfil = { cargo: '—', setor: '—', documentos: [], semCadastro: true };
  if (!uid) return vazio;

  const { data, error } = await supabase
    .from('funcionarios')
    .select('cargo, setor, aso_validade, cnh_validade')
    .eq('profile_id', uid)
    .maybeSingle();
  if (error || !data) return vazio;

  const f = data as { cargo: string | null; setor: string | null; aso_validade: string | null; cnh_validade: string | null };
  return {
    cargo: f.cargo ?? '—',
    setor: f.setor ?? '—',
    documentos: [
      { tipo: 'CNH', validade: brDate(f.cnh_validade), estado: docState(f.cnh_validade) },
      { tipo: 'ASO', validade: brDate(f.aso_validade), estado: docState(f.aso_validade) },
    ],
    semCadastro: false,
  };
}
