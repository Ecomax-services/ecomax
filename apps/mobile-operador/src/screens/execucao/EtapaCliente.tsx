import { View, Text, TextInput, StyleSheet } from 'react-native';
import { textoProgressoDaOs } from '@/lib/monitoramento';
import { brDate } from '@/lib/operacional';
import { servicosDaOs } from '@/lib/execucao/regras';
import { colors, fonts } from '@/theme';
import { Cartao, RotuloSecao, LinhaDado, Erro, estilos } from '@/screens/execucao/componentes';
import { CampoAssinatura } from '@/screens/execucao/CampoAssinatura';
import type { PacoteOs, RascunhoExecucao } from '@/lib/execucao/tipos';

const mascaraCpf = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

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
 * Nome, CPF e cargo de quem recebe são obrigatórios — estão no certificado
 * aprovado. O CPF vai só com dígitos para o servidor; a máscara é da tela.
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
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={estilos.campoRotulo}>CPF</Text>
            <TextInput value={mascaraCpf(a.cpf)} onChangeText={(v) => set({ cpf: v.replace(/\D/g, '').slice(0, 11) })}
              keyboardType="number-pad" placeholder="000.000.000-00" placeholderTextColor={colors.neutral400} style={[estilos.campo, s.input]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={estilos.campoRotulo}>Cargo</Text>
            <TextInput value={a.cargo} onChangeText={(v) => set({ cargo: v })} placeholder="Cargo"
              placeholderTextColor={colors.neutral400} style={[estilos.campo, s.input]} />
          </View>
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
