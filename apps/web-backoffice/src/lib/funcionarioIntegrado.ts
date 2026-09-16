/**
 * Funcionário integrado — o cadastro completo de quem a Ecomax aloca num
 * cliente.
 *
 * "Integrado" é o funcionário da Ecomax vinculado a uma empresa cliente. O que
 * o diferencia do cadastro de Gestão de Usuários são as três dimensões que o
 * protótipo abre em sub-abas:
 *
 *   • com quais empresas ele está integrado, e até quando cada integração vale;
 *   • para quais tipos de serviço ele é habilitado, com a certificação e a
 *     validade dela;
 *   • as linhas MEC, que nascem da integração fiscal com o Omie.
 */
import { supabase } from '@/lib/supabase';
import type { Json } from '@/lib/database.types';
import { msgErro } from '@/lib/erros';
import { hojeISO } from '@/lib/datas';
import { docState, docStateComArquivo, SEM_DATA, type DocState } from '@/lib/documentos';

/** dd/mm/aaaa a partir do ISO do banco. */
const brDate = (iso: string | null) => (iso ? iso.split('T')[0].split('-').reverse().join('/') : '—');

async function actorId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function audit(acao: string, detalhes?: Json): Promise<void> {
  await supabase.from('auditoria').insert({
    actor_id: await actorId(), funcionario_id: null, modulo: 'gestao_clientes', acao, detalhes: detalhes ?? null,
  });
}

// ============================================================
// O cadastro
// ============================================================
export interface FuncionarioIntegrado {
  id: string;
  nome_completo: string;
  cargo: string;
  setor: string;
  gestor_id: string | null;
  gestor: string;
  telefone: string | null;
  rg: string | null;
  cpf: string;
  cep: string | null;
  aso_validade: string | null;
  aso_arquivo_url: string | null;
  cnh_validade: string | null;
  cnh_arquivo_url: string | null;
  cnh_numero: string | null;
  cnh_categoria: string | null;
  utiliza_caixa: boolean;
  ativo: boolean;
}

const SELECT =
  'id, nome_completo, cargo, setor, gestor_id, telefone, rg, cpf, cep, ' +
  'aso_validade, aso_arquivo_url, cnh_validade, cnh_arquivo_url, cnh_numero, cnh_categoria, ' +
  'utiliza_caixa, ativo, gestor:gestor_id(nome_completo)';

export async function getFuncionarioIntegrado(id: string): Promise<FuncionarioIntegrado> {
  const { data, error } = await supabase.from('funcionarios').select(SELECT).eq('id', id).single();
  if (error) throw new Error(msgErro(error));
  const f = data as any;
  const g = Array.isArray(f.gestor) ? f.gestor[0] : f.gestor;
  return { ...f, gestor: g?.nome_completo ?? '—' };
}

export interface FuncionarioIntegradoInput {
  nome_completo: string;
  cargo: string;
  setor: string;
  gestor_id: string | null;
  telefone: string | null;
  rg: string | null;
  cpf: string;
  cep: string | null;
  aso_validade: string | null;
  cnh_validade: string | null;
  cnh_numero: string | null;
  cnh_categoria: string | null;
  utiliza_caixa: boolean;
  ativo: boolean;
}

export async function salvarFuncionarioIntegrado(id: string, input: FuncionarioIntegradoInput): Promise<void> {
  const { error } = await supabase.from('funcionarios').update(input).eq('id', id);
  if (error) throw new Error(msgErro(error));
  await audit('funcionario_integrado_editado', { funcionario_id: id });
}

/** Estado dos dois documentos, com a mesma regra do resto do sistema. */
export function estadoDocumentos(f: FuncionarioIntegrado): { aso: DocState; cnh: DocState; asoLabel: string; cnhLabel: string } {
  const aso = docStateComArquivo(f.aso_validade, f.aso_arquivo_url);
  const cnh = docStateComArquivo(f.cnh_validade, f.cnh_arquivo_url);
  return {
    aso, cnh,
    asoLabel: f.aso_validade ? brDate(f.aso_validade) : SEM_DATA,
    cnhLabel: f.cnh_validade ? brDate(f.cnh_validade) : SEM_DATA,
  };
}

// ============================================================
// Sub-aba 1 — Integração com Empresas
// ============================================================
export interface IntegracaoEmpresa {
  vinculoId: string;
  clienteId: string;
  empresa: string;
  vencimento: string;
  vencimentoIso: string | null;
  /** Negativo quando já venceu. `null` quando não há prazo definido. */
  diasParaVencer: number | null;
  situacao: 'Em dia' | 'A vencer' | 'Vencida' | 'Sem prazo';
}

export async function listIntegracoes(funcionarioId: string): Promise<IntegracaoEmpresa[]> {
  const { data, error } = await supabase
    .from('cliente_funcionarios')
    .select('id, cliente_id, vencimento, cliente:cliente_id(nome)')
    .eq('funcionario_id', funcionarioId);
  if (error) throw new Error(msgErro(error));

  const hoje = new Date(hojeISO() + 'T00:00:00').getTime();
  return (data as any[])
    .map((v) => {
      const c = Array.isArray(v.cliente) ? v.cliente[0] : v.cliente;
      const dias = v.vencimento
        ? Math.round((new Date(v.vencimento + 'T00:00:00').getTime() - hoje) / 86_400_000)
        : null;
      // "A vencer" usa os mesmos 60 dias do alerta de garantia e de documento —
      // três janelas diferentes para a mesma pergunta só confundem quem lê.
      const situacao: IntegracaoEmpresa['situacao'] =
        dias === null ? 'Sem prazo' : dias < 0 ? 'Vencida' : dias <= 60 ? 'A vencer' : 'Em dia';
      return {
        vinculoId: v.id, clienteId: v.cliente_id, empresa: c?.nome ?? '—',
        vencimento: v.vencimento ? brDate(v.vencimento) : '—',
        vencimentoIso: v.vencimento, diasParaVencer: dias, situacao,
      };
    })
    .sort((a, b) => a.empresa.localeCompare(b.empresa, 'pt-BR'));
}

export async function definirVencimentoIntegracao(vinculoId: string, vencimentoIso: string | null): Promise<void> {
  const { error } = await supabase.from('cliente_funcionarios').update({ vencimento: vencimentoIso }).eq('id', vinculoId);
  if (error) throw new Error(msgErro(error));
  await audit('integracao_vencimento', { vinculo_id: vinculoId, vencimento: vencimentoIso });
}

export async function integrarEmEmpresa(funcionarioId: string, clienteId: string, vencimentoIso: string | null): Promise<void> {
  const { error } = await supabase
    .from('cliente_funcionarios')
    .insert({ funcionario_id: funcionarioId, cliente_id: clienteId, vencimento: vencimentoIso });
  if (error) {
    throw new Error(error.code === '23505' ? 'Este funcionário já está integrado a esta empresa.' : msgErro(error));
  }
  await audit('funcionario_integrado_em_empresa', { funcionario_id: funcionarioId, cliente_id: clienteId });
}

export async function removerIntegracao(vinculoId: string): Promise<void> {
  const { error } = await supabase.from('cliente_funcionarios').delete().eq('id', vinculoId);
  if (error) throw new Error(msgErro(error));
  await audit('integracao_removida', { vinculo_id: vinculoId });
}

/** Empresas às quais o funcionário ainda não está integrado. */
export async function listEmpresasDisponiveis(funcionarioId: string): Promise<{ id: string; nome: string }[]> {
  const [{ data: todas, error }, jaIntegradas] = await Promise.all([
    supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome'),
    listIntegracoes(funcionarioId),
  ]);
  if (error) throw new Error(msgErro(error));
  const ligadas = new Set(jaIntegradas.map((i) => i.clienteId));
  return (todas as any[]).filter((c) => !ligadas.has(c.id));
}

// ============================================================
// Sub-aba 2 — Serviços do Funcionário
// ============================================================
export interface ServicoDoFuncionario {
  id: string;
  tipo_servico: string;
  habilitacao: string;
  validade: string;
  validadeIso: string | null;
  estado: DocState;
}

export async function listServicosDoFuncionario(funcionarioId: string): Promise<ServicoDoFuncionario[]> {
  const { data, error } = await supabase
    .from('funcionario_servicos')
    .select('id, tipo_servico, habilitacao, validade')
    .eq('funcionario_id', funcionarioId)
    .order('tipo_servico');
  if (error) throw new Error(msgErro(error));
  return (data as any[]).map((s) => ({
    id: s.id, tipo_servico: s.tipo_servico, habilitacao: s.habilitacao ?? '—',
    validade: s.validade ? brDate(s.validade) : '—',
    validadeIso: s.validade,
    // Sem validade aqui é legítimo: treinamento interno não vence. Por isso
    // 'sem_validade' e não 'ausente' — a segunda é pendência, a primeira não.
    estado: s.validade ? docState(s.validade) : 'sem_validade',
  }));
}

export async function vincularServico(
  funcionarioId: string,
  tipo: string,
  habilitacao: string | null,
  validadeIso: string | null,
): Promise<void> {
  const { error } = await supabase.from('funcionario_servicos').insert({
    funcionario_id: funcionarioId, tipo_servico: tipo,
    habilitacao: habilitacao?.trim() || null, validade: validadeIso, created_by: await actorId(),
  });
  if (error) {
    throw new Error(error.code === '23505' ? 'Este serviço já está vinculado a este funcionário.' : msgErro(error));
  }
  await audit('funcionario_servico_vinculado', { funcionario_id: funcionarioId, tipo_servico: tipo });
}

export async function removerServico(id: string): Promise<void> {
  const { error } = await supabase.from('funcionario_servicos').delete().eq('id', id);
  if (error) throw new Error(msgErro(error));
  await audit('funcionario_servico_removido', { id });
}

// ============================================================
// Substituir funcionário
// ============================================================
/**
 * Troca o funcionário em todas as OS ainda abertas de uma empresa.
 *
 * Só as abertas de propósito: OS concluída é registro do que aconteceu, e quem
 * esteve lá esteve lá. Reescrever o passado para arrumar o presente é como se
 * perde a rastreabilidade que o resto do sistema tenta manter.
 */
export async function substituirFuncionario(
  clienteId: string,
  deId: string,
  paraId: string,
): Promise<{ trocadas: number }> {
  if (deId === paraId) throw new Error('Escolha um funcionário diferente do atual.');

  const { data: abertas, error: e1 } = await supabase
    .from('ordens_servico')
    .select('id')
    .eq('cliente_id', clienteId)
    .in('status', ['em_aberto', 'emitida', 'confirmada', 'em_andamento', 'remarcada']);
  if (e1) throw new Error(msgErro(e1));

  const ids = (abertas as any[]).map((o) => o.id);
  if (ids.length === 0) return { trocadas: 0 };

  const { data: vinculos, error: e2 } = await supabase
    .from('os_funcionarios').select('id, os_id').eq('funcionario_id', deId).in('os_id', ids);
  if (e2) throw new Error(msgErro(e2));

  let trocadas = 0;
  for (const v of (vinculos as any[])) {
    const { error } = await supabase.from('os_funcionarios').update({ funcionario_id: paraId }).eq('id', v.id);
    // Se o substituto já estiver na mesma OS, a única unique bate: não é erro,
    // é a troca já estar feita. Some o vínculo antigo e segue.
    if (error?.code === '23505') {
      await supabase.from('os_funcionarios').delete().eq('id', v.id);
      trocadas += 1;
      continue;
    }
    if (error) throw new Error(msgErro(error));
    trocadas += 1;
  }
  await audit('funcionario_substituido', { cliente_id: clienteId, de: deId, para: paraId, os: trocadas });
  return { trocadas };
}
