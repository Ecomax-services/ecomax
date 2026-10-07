import { View, Text, TextInput, StyleSheet } from 'react-native';
import { textoProgressoDaOs } from '@/lib/monitoramento';
import { brDate } from '@/lib/operacional';
import { servicosDaOs } from '@/lib/execucao/regras';
import { colors, fonts } from '@/theme';
import { Cartao, RotuloSecao, LinhaDado, Erro, estilos } from '@/screens/execucao/componentes';
import { CampoAssinatura } from '@/screens/execucao/CampoAssinatura';
import type { PacoteOs, RascunhoExecucao } from '@/lib/execucao/tipos';

/** Resumo de uma linha do monitoramento e dos produtos, para o cliente conferir antes de assinar. */
export function resumoDaExecucao(pacote: PacoteOs, r: RascunhoExecucao): [string, string][] {
  const nomeProduto = (id: string) => pacote.produtos.find((p) => p.produtoId === id)?.nome ?? 'Produto';
  const produtos = r.produtos.length
    ? r.produtos.map((p) => `${nomeProduto(p.produtoId)} (${p.quantidade} ${p.unidade ?? ''})`.replace(' )', ')')).join(', ')
    : 'Nenhum';
  const servicos = servicosDaOs(pacote, r);
  const inicio = r.inicio ? new Date(r.inicio) : null;
  return [
    ['Cliente', pacote.os.cliente.nome],
    ['Serviço', pacote.os.tiposServico.join(', ')],
    ['Produtos aplicados', produtos],
    ['Monitoramento', servicos.length ? textoProgressoDaOs(servicos).replace(/^Na OS: /, '') : 'Sem monitoramento nesta OS'],
    ['Data', inicio ? `${brDate(inicio.toISOString())} às ${inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '—'],
  ];
}

/**
 * Etapa 5 — Assinatura do cliente.
 *
 * Quem recebe se identifica pelo nome e pela assinatura. O protótipo pedia
 * também CPF e cargo; a Ecomax pediu para retirá-los na aprovação da Release 4
 * (e-mail de 06/10/2026), e eles não existem mais nem no banco.
 */
export function EtapaCliente({
  pacote, rascunho, atualizar, erro,
}: { pacote: PacoteOs; rascunho: RascunhoExecucao; atualizar: (fn: (r: RascunhoExecucao) => RascunhoExecucao) => void; erro: string }) {
  const a = rascunho.assinante;
  const set = (campos: Partial<RascunhoExecucao['assinante']>) => atualizar((r) => ({ ...r, assinante: { ...r.assinante, ...campos } }));

  return (
    <View>
      <RotuloSecao primeiro>Resumo do serviço</RotuloSecao>
      <Cartao compacto>
        {resumoDaExecucao(pacote, rascunho).map(([rotulo, valor], i) => <LinhaDado key={rotulo} rotulo={rotulo} valor={valor} primeira={i === 0} />)}
      </Cartao>

      <RotuloSecao>Quem assina</RotuloSecao>
      <Cartao style={{ gap: 12 }}>
        <View>
          <Text style={estilos.campoRotulo}>Nome</Text>
          <TextInput value={a.nome} onChangeText={(v) => set({ nome: v })} placeholder="Nome de quem recebe"
            placeholderTextColor={colors.neutral400} style={[estilos.campo, s.input]} />
        </View>
      </Cartao>

      <RotuloSecao>Assinatura</RotuloSecao>
      <CampoAssinatura
        osId={rascunho.osId} uri={a.assinaturaUri} nome="cliente"
        titulo="Assinatura do cliente" subtitulo="Peça que assine no quadro abaixo."
        onChange={(uri) => set({ assinaturaUri: uri })} invalido={!!erro}
      />
      {erro ? <Erro>{erro}</Erro> : null}
    </View>
  );
}

const s = StyleSheet.create({
  input: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
});
