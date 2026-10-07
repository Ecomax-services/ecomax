/**
 * Regras puras do Histórico (segmento "Concluídas" da aba OS e "Detalhes do
 * serviço"): períodos do filtro, data e tempo da execução, e como cada ponto
 * do monitoramento aparece no registro.
 *
 * Sem rede e sem React, para serem testadas fora do App.
 */

import { COMPORTAMENTO, isServicoCodigo, type ServicoCodigo } from '@/lib/monitoramento';
import { hojeEmBrasilia } from '@/lib/agenda/regras';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

/** OS que já saíram de campo. */
export const STATUS_CONCLUIDOS = ['executada', 'concluida'] as const;

export const estaConcluida = (status: string): boolean =>
  (STATUS_CONCLUIDOS as readonly string[]).includes(status);

/** `todos`, `dia` (hoje) ou um mês `2026-08`. */
export type Periodo = string;

/**
 * Filtros de período do protótipo: "Todo o período", "Hoje" e os três últimos
 * meses pelo nome ("Agosto", "Julho", "Junho" no protótipo de agosto).
 */
export function periodos(hoje: string): { chave: Periodo; rotulo: string }[] {
  const [a, m] = hoje.split('-').map(Number);
  const meses = [0, 1, 2].map((k) => {
    const total = a * 12 + (m - 1) - k;
    const ano = Math.floor(total / 12);
    const mes = (total % 12) + 1;
    return { chave: `${ano}-${String(mes).padStart(2, '0')}`, rotulo: MESES[mes - 1] };
  });
  return [{ chave: 'todos', rotulo: 'Todo o período' }, { chave: 'dia', rotulo: 'Hoje' }, ...meses];
}

/**
 * Dia em que a OS foi executada, em Brasília. O envio do App grava
 * `termino_execucao`; OS do fluxo antigo têm só o check-out, e as mais antigas
 * nem isso — aí vale a data programada.
 */
export function dataDaExecucao(os: { termino: string | null; checkOut: string | null; dataProgramada: string | null }): string | null {
  const instante = os.termino ?? os.checkOut;
  if (instante) return hojeEmBrasilia(new Date(instante));
  return os.dataProgramada;
}

export function passaNoPeriodo(data: string | null, periodo: Periodo, hoje: string): boolean {
  if (periodo === 'todos') return true;
  if (!data) return false;
  if (periodo === 'dia') return data === hoje;
  return data.slice(0, 7) === periodo;
}

/** Busca do protótipo: "Buscar por cliente ou código", sem diferenciar acento nem caixa. */
export function passaNaBusca(os: { cliente: string; codigo: string }, busca: string): boolean {
  const q = normalizar(busca.trim());
  if (!q) return true;
  return normalizar(`${os.cliente} ${os.codigo}`).includes(q);
}

const normalizar = (t: string): string => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** "1h42", "42 min" — o "Tempo real de execução" do protótipo. */
export function tempoDeExecucao(inicio: string | null, termino: string | null): string | null {
  if (!inicio || !termino) return null;
  const minutos = Math.round((new Date(termino).getTime() - new Date(inicio).getTime()) / 60000);
  if (!(minutos >= 0)) return null;
  if (minutos < 60) return `${minutos} min`;
  return `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, '0')}`;
}

/** Ponto como veio do banco (`os_plano_pontos` + o serviço do plano). */
export interface PontoRegistrado {
  id: string;
  servico: string | null;
  numero: number;
  identificacao: string | null;
  area: string | null;
  situacao: string | null;
  statusRotulo: string | null;
  contagens: Record<string, number> | null;
  semOcorrencia: boolean | null;
  observacao: string | null;
  acaoCorretiva: string | null;
}

/** Cartão do ponto no "Mapeamento e pontos". */
export interface CartaoPonto {
  id: string;
  nome: string;
  status: string;
  ok: boolean;
  obs: string;
}

const ROTULO_SITUACAO: Record<string, string> = {
  conforme: 'Conforme',
  nao_conforme: 'Não conforme',
  inacessivel: 'Inacessível',
  pendente: 'Não avaliado',
};

/**
 * O protótipo desenha o detalhe com o modelo antigo ("Conforme"/"Consumo").
 * No modelo aprovado cada serviço diz uma coisa diferente:
 *   - status (PI, PA): o rótulo da legenda gravado no ponto;
 *   - contagem (AL, PG): o total capturado, com a quantidade por espécie;
 *   - ocorrência (OC): com ou sem ocorrência, e a ação corretiva.
 * O ícone verde/âmbar segue a `situacao` calculada pelo banco.
 */
export function cartaoDoPonto(p: PontoRegistrado): CartaoPonto {
  const servico: ServicoCodigo | null = p.servico && isServicoCodigo(p.servico) ? p.servico : null;
  const codigo = servico ?? 'Ponto';
  const nome = [`${codigo}-${String(p.numero).padStart(2, '0')}`, p.identificacao].filter(Boolean).join(' · ');
  const ok = p.situacao === 'conforme';
  const obs: string[] = [];
  let status = ROTULO_SITUACAO[p.situacao ?? 'pendente'] ?? 'Não avaliado';

  const comportamento = servico ? COMPORTAMENTO[servico] : null;
  if (comportamento === 'status' && p.statusRotulo) {
    status = p.statusRotulo;
  } else if (comportamento === 'contagem') {
    const itens = Object.entries(p.contagens ?? {}).filter(([, n]) => n > 0);
    const total = itens.reduce((t, [, n]) => t + n, 0);
    if (p.situacao !== 'inacessivel') status = total === 0 ? 'Sem captura' : `${total} ${total === 1 ? 'captura' : 'capturas'}`;
    if (itens.length) obs.push(itens.map(([especie, n]) => `${especie}: ${n}`).join(' · '));
  } else if (comportamento === 'ocorrencia') {
    status = p.semOcorrencia ? 'Sem ocorrência' : 'Com ocorrência';
  }

  if (p.observacao) obs.push(p.observacao);
  if (p.acaoCorretiva) obs.push(`Ação corretiva: ${p.acaoCorretiva}`);
  return { id: p.id, nome, status, ok, obs: obs.join('\n') };
}

/** "12 pontos, 11 conformes". */
export function resumoDosPontos(pontos: { situacao: string | null }[]): string {
  const total = pontos.length;
  const conformes = pontos.filter((p) => p.situacao === 'conforme').length;
  return `${total} ${total === 1 ? 'ponto' : 'pontos'}, ${conformes} ${conformes === 1 ? 'conforme' : 'conformes'}`;
}

/** Ordem do registro: pela ordem dos serviços no App, depois pelo número. */
export function compararPontos(a: PontoRegistrado, b: PontoRegistrado): number {
  const ordem = ['DI', 'PI', 'PA', 'AL', 'PG', 'OC'];
  const ia = ordem.indexOf(a.servico ?? '');
  const ib = ordem.indexOf(b.servico ?? '');
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.numero - b.numero;
}
