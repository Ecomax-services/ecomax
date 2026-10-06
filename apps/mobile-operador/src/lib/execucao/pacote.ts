import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { msgErro } from '@/lib/erros';
import { isServicoCodigo, type ServicoCodigo } from '@/lib/monitoramento';
import { VERSAO_PACOTE, type PacoteOs, type LegendaDoPacote } from '@/lib/execucao/tipos';

/**
 * O pacote da OS: tudo que a execução lê, baixado de uma vez com rede.
 *
 * O técnico abre a OS ainda com sinal (na base, no carro) e depois trabalha
 * dentro da planta do cliente, onde muitas vezes não há. A partir do pacote,
 * nenhuma tela da execução consulta o servidor.
 *
 * Tudo aqui passa pela RLS do técnico: ele só baixa OS em que está escalado.
 */

const chave = (osId: string) => `ecomax:execucao:pacote:${osId}`;

function enderecoDe(c: { logradouro?: string | null; numero?: string | null; complemento?: string | null; bairro?: string | null; cidade?: string | null; uf?: string | null } | null): string {
  if (!c) return '—';
  const linha = [c.logradouro, c.numero, c.complemento, c.bairro].filter(Boolean).join(', ');
  const cidade = [c.cidade, c.uf].filter(Boolean).join('/');
  return [linha, cidade].filter(Boolean).join(' - ') || '—';
}

/** Baixa o pacote do servidor e guarda no aparelho. Exige rede. */
export async function baixarPacote(osId: string): Promise<PacoteOs> {
  const { data: os, error } = await supabase
    .from('ordens_servico')
    .select('id, codigo, status, data_programada, hora_prevista, tipos_servico, execucao_uuid, cliente:clientes(id, nome, logradouro, numero, complemento, bairro, cidade, uf)')
    .eq('id', osId)
    .single();
  if (error) throw new Error(msgErro(error));
  const cliente = os.cliente as unknown as { id: string; nome: string } & Parameters<typeof enderecoDe>[0];

  // A base do técnico vem do cadastro dele. `base:base_id(...)` com a coluna:
  // há duas relações entre colaborador e base (o responsável da base é um
  // colaborador), e sem a coluna o PostgREST não sabe qual embutir.
  const { data: usuario } = await supabase.auth.getUser();
  const { data: eu, error: eEu } = await supabase
    .from('funcionarios')
    .select('base_id, base:base_id(id, nome)')
    .eq('profile_id', usuario.user?.id ?? '')
    .maybeSingle();
  if (eEu) throw new Error(msgErro(eEu));
  const base = (eu?.base as unknown as { id: string; nome: string } | null) ?? null;

  const [planos, legendas, listas, areas, produtos, lotes, porTipo] = await Promise.all([
    supabase
      .from('os_planos_controle')
      .select('id, tipo_controle, frequencia, servico_codigo, pontos:os_plano_pontos(id, numero, area, fase, identificacao)')
      .eq('os_id', osId)
      .order('tipo_controle'),
    supabase
      .from('planilha_itens')
      .select('servico_codigo, codigo, nome, cor_bg, cor_fg')
      .not('codigo', 'is', null)
      .order('codigo'),
    supabase
      .from('catalogo_itens')
      .select('catalogo, nome')
      .like('catalogo', 'monitoramento_%')
      .eq('ativo', true)
      .order('ordem'),
    supabase
      .from('cliente_areas')
      .select('nome')
      .eq('cliente_id', cliente.id)
      .eq('ativo', true)
      .order('ordem'),
    supabase
      .from('os_produtos')
      .select('produto_id, qtd_recomendada, produto:produtos(nome, unidade, unidade_aplicacao, fator_aplicacao)')
      .eq('os_id', osId),
    // Filtro explícito pela base: quem também tem acesso ao Estoque leria os
    // lotes de todas as bases pela RLS, e a lista do App é só a dele.
    base
      ? supabase
          .from('estoque_lotes')
          .select('id, produto_id, lote, validade, quantidade, produto:produtos(nome, unidade, unidade_aplicacao, fator_aplicacao)')
          .eq('base_id', base.id)
          .gt('quantidade', 0)
          .order('validade', { ascending: true, nullsFirst: false })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('tipo_servico_produtos')
      .select('produto_id, tipo_servico')
      .in('tipo_servico', os.tipos_servico ?? []),
  ]);
  for (const r of [planos, legendas, listas, areas, produtos, lotes, porTipo]) {
    if (r.error) throw new Error(msgErro(r.error));
  }

  const porLista = (nome: string) => (listas.data ?? []).filter((l) => l.catalogo === nome).map((l) => l.nome);

  const legendasPorServico: Partial<Record<ServicoCodigo, LegendaDoPacote[]>> = {};
  for (const l of legendas.data ?? []) {
    if (!l.servico_codigo || !isServicoCodigo(l.servico_codigo) || l.codigo == null) continue;
    (legendasPorServico[l.servico_codigo] ??= []).push({ codigo: l.codigo, rotulo: l.nome, corBg: l.cor_bg, corFg: l.cor_fg });
  }

  type InfoProduto = { nome: string; unidade: string; unidade_aplicacao: string | null; fator_aplicacao: number | null };
  const paraProduto = (produtoId: string, info: InfoProduto, qtd: number, previsto: boolean): PacoteOs['produtos'][number] => ({
    produtoId,
    nome: info.nome,
    unidade: info.unidade,
    unidadeAplicacao: info.unidade_aplicacao,
    fatorAplicacao: info.fator_aplicacao == null ? null : Number(info.fator_aplicacao),
    qtdRecomendada: qtd,
    previsto,
  });

  // Previstos primeiro. O mesmo produto pode aparecer duas vezes (dois lotes
  // previstos); no pacote ele é um só — o lote é escolhido em campo.
  const produtosUnicos = new Map<string, PacoteOs['produtos'][number]>();
  for (const p of produtos.data ?? []) {
    const info = p.produto as unknown as InfoProduto | null;
    if (!info || produtosUnicos.has(p.produto_id)) continue;
    produtosUnicos.set(p.produto_id, paraProduto(p.produto_id, info, Number(p.qtd_recomendada), true));
  }

  // Depois, os da base do técnico ligados aos tipos de serviço da OS
  // ("produto filtrado por tipo de serviço"). Sem nenhum produto configurado
  // para esses tipos, vale tudo que a base tem — uma lista vazia deixaria o
  // técnico sem como registrar o que aplicou.
  const daOs = new Set((porTipo.data ?? []).map((x) => x.produto_id));
  for (const l of lotes.data ?? []) {
    const info = l.produto as unknown as InfoProduto | null;
    if (!info || produtosUnicos.has(l.produto_id)) continue;
    if (daOs.size > 0 && !daOs.has(l.produto_id)) continue;
    produtosUnicos.set(l.produto_id, paraProduto(l.produto_id, info, 0, false));
  }

  const pacote: PacoteOs = {
    versao: VERSAO_PACOTE,
    baixadoEm: new Date().toISOString(),
    os: {
      id: os.id,
      codigo: os.codigo,
      status: os.status,
      dataProgramada: os.data_programada,
      horaPrevista: os.hora_prevista,
      tiposServico: os.tipos_servico ?? [],
      cliente: { id: cliente.id, nome: cliente.nome, endereco: enderecoDe(cliente) },
      jaExecutada: os.execucao_uuid != null,
    },
    planos: (planos.data ?? []).map((p) => ({
      id: p.id,
      tipoControle: p.tipo_controle,
      frequencia: p.frequencia,
      servico: p.servico_codigo && isServicoCodigo(p.servico_codigo) ? p.servico_codigo : null,
      pontos: ((p.pontos as unknown as { id: string; numero: number; area: string | null; fase: number | null; identificacao: string | null }[]) ?? [])
        .map((pt) => ({ id: pt.id, numero: pt.numero, area: pt.area, fase: pt.fase, local: pt.identificacao ?? '' }))
        .sort((a, b) => (a.area ?? '').localeCompare(b.area ?? '') || (a.fase ?? 0) - (b.fase ?? 0) || a.numero - b.numero),
    })),
    legendas: legendasPorServico,
    listas: {
      especiesAl: porLista('monitoramento_especies_al'),
      outrasPragasAl: porLista('monitoramento_outras_pragas_al'),
      pragasPg: porLista('monitoramento_pragas_pg'),
      pragasOc: porLista('monitoramento_pragas_oc'),
      tecnicasDi: porLista('monitoramento_tecnicas_di'),
    },
    areas: (areas.data ?? []).map((a) => a.nome),
    produtos: [...produtosUnicos.values()],
    base,
    lotes: (lotes.data ?? []).map((l) => ({
      id: l.id, produtoId: l.produto_id, lote: l.lote, validade: l.validade, quantidade: Number(l.quantidade),
    })),
  };

  await AsyncStorage.setItem(chave(osId), JSON.stringify(pacote));
  return pacote;
}

/** O pacote guardado no aparelho, se houver e for da versão atual. */
export async function pacoteGuardado(osId: string): Promise<PacoteOs | null> {
  const bruto = await AsyncStorage.getItem(chave(osId));
  if (!bruto) return null;
  try {
    const p = JSON.parse(bruto) as PacoteOs;
    return p.versao === VERSAO_PACOTE ? p : null;
  } catch {
    return null;
  }
}

/**
 * O pacote para trabalhar: o do servidor quando há rede, o guardado quando
 * não há. `origem` deixa a tela avisar que está usando a cópia do aparelho.
 */
export async function obterPacote(osId: string): Promise<{ pacote: PacoteOs; origem: 'servidor' | 'aparelho' }> {
  try {
    return { pacote: await baixarPacote(osId), origem: 'servidor' };
  } catch (e) {
    const guardado = await pacoteGuardado(osId);
    if (guardado) return { pacote: guardado, origem: 'aparelho' };
    throw new Error(`Não foi possível baixar a OS e não há cópia no aparelho. Abra a OS com sinal antes de ir a campo. (${(e as Error).message})`);
  }
}

export async function apagarPacote(osId: string): Promise<void> {
  await AsyncStorage.removeItem(chave(osId));
}
