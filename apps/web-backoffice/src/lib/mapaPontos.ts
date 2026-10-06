import { supabase } from '@/lib/supabase';
import { msgErro } from '@/lib/erros';
import { NOME_SERVICO, SERVICOS_MONITORAMENTO, COMPORTAMENTO, type ServicoCodigo } from '@/lib/monitoramento';

/**
 * Mapa de pontos do cliente: áreas e, dentro delas, os pontos por serviço.
 *
 * É o cadastro permanente que o App percorre em campo e que dá histórico ao
 * relatório — o PI-03 de hoje é o mesmo do mês passado. A OS copia daqui na
 * emissão (`preparar_monitoramento_os`); mudar o mapa não altera OS já
 * emitida.
 *
 * Regras que vêm do banco, e que a tela só reflete:
 *   - ponto não se apaga depois de lido numa OS, e área com pontos não se
 *     apaga — inativa-se;
 *   - nem área nem ponto mudam de cliente;
 *   - número repetido no mesmo serviço, área e fase é recusado.
 */

/** Serviços que têm ponto. A Desinsetização registra aplicação por área. */
export const SERVICOS_COM_PONTO = SERVICOS_MONITORAMENTO.filter((s) => COMPORTAMENTO[s] !== 'aplicacao');

export interface AreaCliente {
  id: string;
  nome: string;
  ativo: boolean;
  pontos: number;
}

export interface PontoCliente {
  id: string;
  areaId: string;
  area: string;
  servico: ServicoCodigo;
  servicoNome: string;
  fase: number | null;
  numero: number;
  local: string;
  ativo: boolean;
}

/** "PI-03", "PI-03 · Fase 2". */
export function rotuloPonto(p: Pick<PontoCliente, 'servico' | 'numero' | 'fase'>): string {
  const base = `${p.servico}-${String(p.numero).padStart(2, '0')}`;
  return p.fase ? `${base} · Fase ${p.fase}` : base;
}

export async function listAreas(clienteId: string): Promise<AreaCliente[]> {
  const { data, error } = await supabase
    .from('cliente_areas')
    .select('id, nome, ativo, pontos:cliente_pontos(count)')
    .eq('cliente_id', clienteId)
    .order('ordem')
    .order('nome');
  if (error) throw new Error(msgErro(error));
  return (data ?? []).map((a) => ({
    id: a.id,
    nome: a.nome,
    ativo: a.ativo,
    pontos: (a.pontos as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}

export async function listPontosCliente(clienteId: string): Promise<PontoCliente[]> {
  const { data, error } = await supabase
    .from('cliente_pontos')
    .select('id, area_id, servico_codigo, fase, numero, local, ativo, area:cliente_areas(nome)')
    .eq('cliente_id', clienteId)
    .order('servico_codigo')
    .order('numero');
  if (error) throw new Error(msgErro(error));
  return (data ?? []).map((p) => {
    const servico = p.servico_codigo as ServicoCodigo;
    const area = p.area as unknown as { nome: string } | null;
    return {
      id: p.id, areaId: p.area_id, area: area?.nome ?? '—',
      servico, servicoNome: NOME_SERVICO[servico] ?? servico,
      fase: p.fase, numero: p.numero, local: p.local, ativo: p.ativo,
    };
  });
}

/**
 * O próximo número livre do serviço na área e fase — a sugestão do formulário.
 * A pessoa pode trocar; o banco recusa só o repetido.
 */
export function proximoNumero(pontos: PontoCliente[], areaId: string, servico: ServicoCodigo, fase: number | null): number {
  const usados = pontos
    .filter((p) => p.areaId === areaId && p.servico === servico && (p.fase ?? null) === fase)
    .map((p) => p.numero);
  return usados.length ? Math.max(...usados) + 1 : 1;
}

async function actorId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function criarArea(clienteId: string, nome: string): Promise<void> {
  const limpo = nome.trim();
  if (!limpo) throw new Error('Informe o nome da área.');
  const { error } = await supabase.from('cliente_areas').insert({ cliente_id: clienteId, nome: limpo, created_by: await actorId() });
  if (error) throw new Error(msgErro(error));
}

export async function definirAtivoArea(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from('cliente_areas').update({ ativo }).eq('id', id);
  if (error) throw new Error(msgErro(error));
}

/** Só área sem pontos. Com pontos o banco recusa, e a mensagem diz para inativar. */
export async function excluirArea(id: string): Promise<void> {
  const { error } = await supabase.from('cliente_areas').delete().eq('id', id);
  if (error) throw new Error(msgErro(error));
}

export interface NovoPonto {
  areaId: string;
  servico: ServicoCodigo;
  fase: number | null;
  numero: number;
  local: string;
}

export async function criarPonto(clienteId: string, p: NovoPonto): Promise<void> {
  if (!p.local.trim()) throw new Error('Informe o local do ponto.');
  if (!Number.isInteger(p.numero) || p.numero < 1) throw new Error('O número do ponto começa em 1.');
  if (p.fase != null && (!Number.isInteger(p.fase) || p.fase < 1)) throw new Error('A fase começa em 1.');
  const { error } = await supabase.from('cliente_pontos').insert({
    cliente_id: clienteId, area_id: p.areaId, servico_codigo: p.servico,
    fase: p.fase, numero: p.numero, local: p.local.trim(), created_by: await actorId(),
  });
  if (error) throw new Error(msgErro(error));
}

/**
 * Só o local muda. Número, serviço e área são a identidade do ponto no
 * histórico: trocá-los faria a leitura de março parecer de outro ponto.
 * A OS já emitida guarda a cópia do local de quando foi emitida.
 */
export async function renomearPonto(id: string, local: string): Promise<void> {
  if (!local.trim()) throw new Error('Informe o local do ponto.');
  const { error } = await supabase.from('cliente_pontos').update({ local: local.trim() }).eq('id', id);
  if (error) throw new Error(msgErro(error));
}

export async function definirAtivoPonto(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from('cliente_pontos').update({ ativo }).eq('id', id);
  if (error) throw new Error(msgErro(error));
}
