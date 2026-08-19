import { supabase } from '@/lib/supabase';
import type { BadgeTone } from '@/components/ui/Badge';

// ============================================================
// 3.1.1 Elaborar orçamento
// ============================================================

export type OrcStatus = 'em_elaboracao' | 'aprovado' | 'cancelado';

export const orcStatusLabel: Record<OrcStatus, string> = {
  em_elaboracao: 'Em elaboração',
  aprovado: 'Aprovado',
  cancelado: 'Cancelado',
};

export const orcStatusTone: Record<OrcStatus, BadgeTone> = {
  em_elaboracao: 'softWarn',
  aprovado: 'success',
  cancelado: 'danger',
};

export const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const brDate = (iso: string | null) =>
  iso ? iso.split('T')[0].split('-').reverse().join('/') : '—';

export interface ItemOrcamento {
  /** Nulo enquanto a linha não foi gravada — a grade mostra todos os tipos. */
  id: string | null;
  tipoControle: string;
  frequencia: string;
  valor: number;
  /** Marcado quando a linha existe no orçamento. */
  contratado: boolean;
}

export interface OrcamentoDetalhe {
  id: string;
  codigo: string;
  clienteId: string;
  cliente: string;
  data: string;
  status: OrcStatus;
  observacao: string;
  gestorId: string | null;
  valorTotal: number;
  itens: ItemOrcamento[];
  /** Quantas OS nasceram deste orçamento — a coluna "OS vinc." da aba. */
  osVinculadas: number;
}

export async function getOrcamento(id: string): Promise<OrcamentoDetalhe | null> {
  const [orc, itens, osCount] = await Promise.all([
    supabase
      .from('orcamentos')
      .select('id, codigo, cliente_id, data, status, observacao, valor_total, gestor_id, cliente:cliente_id(nome)')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('orcamento_itens').select('id, tipo_controle, frequencia, valor').eq('orcamento_id', id),
    supabase.from('ordens_servico').select('id', { count: 'exact', head: true }).eq('orcamento_id', id),
  ]);
  if (orc.error) throw new Error(orc.error.message);
  if (!orc.data) return null;
  if (itens.error) throw new Error(itens.error.message);

  const o = orc.data as any;
  const cliente = Array.isArray(o.cliente) ? o.cliente[0] : o.cliente;

  return {
    id: o.id,
    codigo: o.codigo,
    clienteId: o.cliente_id,
    cliente: cliente?.nome ?? '—',
    data: o.data ?? '',
    status: o.status,
    observacao: o.observacao ?? '',
    gestorId: o.gestor_id,
    valorTotal: Number(o.valor_total ?? 0),
    osVinculadas: osCount.count ?? 0,
    itens: ((itens.data as any[]) ?? []).map((i) => ({
      id: i.id,
      tipoControle: i.tipo_controle,
      frequencia: i.frequencia,
      valor: Number(i.valor),
      contratado: true,
    })),
  };
}

/**
 * Monta a grade da tela: todos os tipos do catálogo, marcando os já contratados.
 *
 * A grade precisa mostrar o que NÃO foi contratado também — é assim que se
 * contrata algo novo. Guardar só as linhas existentes obrigaria a um botão
 * "adicionar tipo" que o design não tem.
 */
export function montarGrade(tipos: string[], itens: ItemOrcamento[], frequenciaPadrao: string): ItemOrcamento[] {
  const porTipo = new Map(itens.map((i) => [i.tipoControle, i]));
  return tipos.map(
    (t) =>
      porTipo.get(t) ?? {
        id: null,
        tipoControle: t,
        frequencia: frequenciaPadrao,
        valor: 0,
        contratado: false,
      },
  );
}

export async function salvarOrcamento(
  id: string,
  cabecalho: { data: string; status: OrcStatus; observacao: string; gestorId: string | null },
  grade: ItemOrcamento[],
): Promise<void> {
  const { error } = await supabase
    .from('orcamentos')
    .update({
      // `data` é obrigatória no banco: enviar null quebraria a linha, então o
      // campo vazio simplesmente não entra no update.
      ...(cabecalho.data ? { data: cabecalho.data } : {}),
      status: cabecalho.status,
      observacao: cabecalho.observacao.trim() || null,
      gestor_id: cabecalho.gestorId,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);

  const contratados = grade.filter((i) => i.contratado);
  const remover = grade.filter((i) => !i.contratado && i.id).map((i) => i.id as string);

  if (remover.length) {
    const { error: e } = await supabase.from('orcamento_itens').delete().in('id', remover);
    if (e) throw new Error(e.message);
  }

  if (contratados.length) {
    // upsert pela chave natural (orçamento + tipo): a grade é reenviada inteira
    // a cada salvamento, e comparar linha a linha aqui só criaria caminhos para
    // divergir do que está na tela.
    const { error: e } = await supabase.from('orcamento_itens').upsert(
      contratados.map((i) => ({
        orcamento_id: id,
        tipo_controle: i.tipoControle,
        frequencia: i.frequencia,
        valor: i.valor,
      })),
      { onConflict: 'orcamento_id,tipo_controle' },
    );
    if (e) throw new Error(e.message);
  }

  // O total é recalculado por trigger — não é enviado daqui de propósito, para
  // não haver duas fontes para o mesmo número.
}

export async function criarOrcamento(clienteId: string): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('orcamentos')
    .insert({
      cliente_id: clienteId,
      data: new Date().toISOString().slice(0, 10),
      status: 'em_elaboracao',
      valor_total: 0,
      created_by: u.user?.id ?? null,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

// ============================================================
// 3.1.3 Emitir ordem de serviço · planos de controle
// ============================================================

export interface PlanoControle {
  id: string;
  tipoControle: string;
  frequencia: string;
  pontosPrevistos: number;
  pontosPreenchidos: number;
}

export interface PontoPlano {
  id: string;
  numero: number;
  identificacao: string;
  situacao: 'pendente' | 'conforme' | 'nao_conforme' | 'inacessivel';
  observacao: string;
}

export const situacaoPontoLabel: Record<PontoPlano['situacao'], string> = {
  pendente: 'Pendente',
  conforme: 'Conforme',
  nao_conforme: 'Não conforme',
  inacessivel: 'Inacessível',
};

export const situacaoPontoTone: Record<PontoPlano['situacao'], BadgeTone> = {
  pendente: 'muted',
  conforme: 'success',
  nao_conforme: 'danger',
  inacessivel: 'softWarn',
};

export async function listPlanos(osId: string): Promise<PlanoControle[]> {
  const { data, error } = await supabase
    .from('os_planos_controle')
    .select('id, tipo_controle, frequencia, pontos_previstos, pontos:os_plano_pontos(situacao)')
    .eq('os_id', osId)
    .order('tipo_controle');
  if (error) throw new Error(error.message);
  return (data as any[]).map((p) => ({
    id: p.id,
    tipoControle: p.tipo_controle,
    frequencia: p.frequencia ?? '—',
    pontosPrevistos: p.pontos_previstos,
    // Conta aqui em vez de pedir ao banco por plano: a tela já traz os pontos
    // no mesmo select, e uma consulta por plano seria N+1 por nada.
    pontosPreenchidos: ((p.pontos as any[]) ?? []).filter((x) => x.situacao !== 'pendente').length,
  }));
}

export async function listPontos(planoId: string): Promise<PontoPlano[]> {
  const { data, error } = await supabase
    .from('os_plano_pontos')
    .select('id, numero, identificacao, situacao, observacao')
    .eq('plano_id', planoId)
    .order('numero');
  if (error) throw new Error(error.message);
  return (data as any[]).map((p) => ({
    id: p.id,
    numero: p.numero,
    identificacao: p.identificacao ?? '',
    situacao: p.situacao,
    observacao: p.observacao ?? '',
  }));
}

export async function salvarPonto(
  id: string,
  patch: { identificacao?: string; situacao?: PontoPlano['situacao']; observacao?: string },
): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('os_plano_pontos')
    .update({
      ...patch,
      // Só carimba quem preencheu quando a situação sai de pendente; editar a
      // observação de um ponto já conferido não deve reescrever a autoria.
      ...(patch.situacao && patch.situacao !== 'pendente'
        ? { preenchido_em: new Date().toISOString(), preenchido_por: u.user?.id ?? null }
        : {}),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Ajusta quantos pontos o plano tem, criando ou removendo as linhas do fim. */
export async function definirPontosPrevistos(planoId: string, quantidade: number): Promise<void> {
  if (quantidade < 0 || quantidade > 200) throw new Error('Informe entre 0 e 200 pontos.');

  const atuais = await listPontos(planoId);
  const { error } = await supabase
    .from('os_planos_controle')
    .update({ pontos_previstos: quantidade })
    .eq('id', planoId);
  if (error) throw new Error(error.message);

  if (quantidade > atuais.length) {
    const novos = Array.from({ length: quantidade - atuais.length }, (_, i) => ({
      plano_id: planoId,
      numero: atuais.length + i + 1,
    }));
    const { error: e } = await supabase.from('os_plano_pontos').insert(novos);
    if (e) throw new Error(e.message);
  } else if (quantidade < atuais.length) {
    // Remove do fim para a frente, e só os que ninguém preencheu — apagar um
    // ponto conferido descartaria trabalho de campo.
    const excedentes = atuais.slice(quantidade).filter((p) => p.situacao === 'pendente');
    if (excedentes.length) {
      const { error: e } = await supabase.from('os_plano_pontos').delete().in('id', excedentes.map((p) => p.id));
      if (e) throw new Error(e.message);
    }
  }
}

/**
 * Cria a OS a partir de um orçamento aprovado, com os planos contratados.
 *
 * É o "Criar OS recorrente" da aba de orçamentos. Só vale para aprovado — o
 * design é explícito, e emitir OS de um orçamento em elaboração seria
 * comprometer serviço que ainda não foi fechado.
 */
export async function criarOsDeOrcamento(orcamentoId: string): Promise<string> {
  const orc = await getOrcamento(orcamentoId);
  if (!orc) throw new Error('Orçamento não encontrado.');
  if (orc.status !== 'aprovado') {
    throw new Error('Só é possível emitir OS de um orçamento aprovado.');
  }
  if (orc.itens.length === 0) {
    throw new Error('O orçamento não tem nenhum tipo de controle contratado.');
  }

  const { data: u } = await supabase.auth.getUser();
  const { data: os, error } = await supabase
    .from('ordens_servico')
    .insert({
      cliente_id: orc.clienteId,
      orcamento_id: orcamentoId,
      status: 'em_aberto',
      etapa: 'Planejamento',
      created_by: u.user?.id ?? null,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  const { error: e } = await supabase.from('os_planos_controle').insert(
    orc.itens.map((i) => ({
      os_id: os.id,
      tipo_controle: i.tipoControle,
      frequencia: i.frequencia,
      pontos_previstos: 0,
    })),
  );
  if (e) throw new Error(e.message);

  return os.id;
}

export { brDate };
