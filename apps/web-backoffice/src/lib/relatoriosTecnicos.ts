import { supabase } from '@/lib/supabase';
import { msgErro } from '@/lib/erros';
import type { ConteudoVersao, DadosRelatorio } from '@/lib/relatorio';

/**
 * Relatórios técnicos (Relatórios › Relatórios técnicos).
 *
 * O relatório nasce da execução da OS (v1) e cada "Salvar e gerar nova
 * versão" cria a seguinte — ver `20261007180000_relatorio_tecnico_versoes.sql`.
 * Os dados vêm de `relatorio_dados` e os blocos são montados por
 * `lib/relatorio.ts`, o mesmo código do PDF.
 */

export interface LinhaRelatorio {
  osId: string;
  codigo: string;
  cliente: string;
  tipos: string;
  dataExecucao: string | null;
  statusOs: string;
  versaoAtual: number;
  versaoPublicada: number | null;
  publicadoEm: string | null;
}

export async function listarRelatoriosTecnicos(): Promise<LinhaRelatorio[]> {
  const { data, error } = await supabase.rpc('listar_relatorios_tecnicos');
  if (error) throw new Error(msgErro(error));
  return (data ?? []).map((r) => ({
    osId: r.os_id, codigo: r.codigo, cliente: r.cliente, tipos: (r.tipos ?? []).join(', ') || '—',
    dataExecucao: r.data_execucao, statusOs: r.status_os, versaoAtual: r.versao_atual,
    versaoPublicada: r.versao_publicada, publicadoEm: r.publicado_em,
  }));
}

export interface RelatorioAberto {
  dados: DadosRelatorio;
  /** Conteúdo da versão atual: é o ponto de partida da edição. */
  conteudo: ConteudoVersao;
  notasInternas: string;
  versaoAtual: number;
}

/** Os dados do relatório e a versão atual, para abrir o editor. */
export async function abrirRelatorio(osId: string): Promise<RelatorioAberto> {
  const { data: dados, error } = await supabase.rpc('relatorio_dados', { _os_id: osId });
  if (error) throw new Error(msgErro(error));
  const d = dados as unknown as DadosRelatorio;
  const versaoAtual = d.relatorio?.versao_atual ?? 1;
  const { data: v, error: e2 } = await supabase
    .from('os_relatorio_versoes')
    .select('conteudo, notas_internas')
    .eq('os_id', osId).eq('numero', versaoAtual)
    .maybeSingle();
  if (e2) throw new Error(msgErro(e2));
  return {
    dados: d,
    conteudo: (v?.conteudo as ConteudoVersao | null) ?? {},
    notasInternas: v?.notas_internas ?? '',
    versaoAtual,
  };
}

/**
 * "Salvar e gerar nova versão". `versaoBase` é a versão que estava aberta: se
 * outra pessoa salvou no meio, o banco recusa em vez de sobrescrever.
 */
export async function salvarVersao(osId: string, conteudo: ConteudoVersao, notasInternas: string, versaoBase: number): Promise<number> {
  const { data, error } = await supabase.rpc('salvar_versao_relatorio', {
    _os_id: osId, _conteudo: conteudo as never, _notas_internas: notasInternas, _versao_base: versaoBase,
  });
  if (error) throw new Error(msgErro(error));
  return data as number;
}

/**
 * Captura Não-Alvo de uma placa adesiva nesta visita. `especie` nula apaga
 * o lançamento ("Sem captura").
 */
export async function lancarCaptura(osId: string, clientePontoId: string, especie: string | null): Promise<void> {
  if (!especie) {
    const { error } = await supabase.from('os_capturas_nao_alvo').delete().eq('os_id', osId).eq('cliente_ponto_id', clientePontoId);
    if (error) throw new Error(msgErro(error));
    return;
  }
  const { error } = await supabase
    .from('os_capturas_nao_alvo')
    .upsert({ os_id: osId, cliente_ponto_id: clientePontoId, especie }, { onConflict: 'os_id,cliente_ponto_id' });
  if (error) throw new Error(msgErro(error));
}
