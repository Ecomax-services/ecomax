import { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { numeroDigitado } from '@/lib/execucao/regras';
import { colors, fonts } from '@/theme';
import { Cartao, Erro, BotaoContorno, estilos, tons } from '@/screens/execucao/componentes';
import type { PacoteOs, RascunhoExecucao } from '@/lib/execucao/tipos';

/**
 * Etapa 4 — Solicitar reposição ao almoxarifado. Opcional.
 *
 * A solicitação não sai na hora: vai junto com o envio da execução, que é o
 * único momento com rede garantido. A confirmação diz isso, para o técnico
 * não achar que o almoxarifado já foi avisado.
 */
export function EtapaReposicao({
  pacote, reposicao, onChange,
}: { pacote: PacoteOs; reposicao: RascunhoExecucao['reposicao']; onChange: (r: RascunhoExecucao['reposicao']) => void }) {
  const inicial = Object.fromEntries((reposicao?.itens ?? []).map((i) => [i.produtoId, i.quantidade]));
  const [marcados, setMarcados] = useState<Record<string, string>>(inicial);
  const [obs, setObs] = useState(reposicao?.observacao ?? '');
  const [registrada, setRegistrada] = useState(!!reposicao?.itens.length);
  const [erro, setErro] = useState('');

  const alternar = (produtoId: string) => {
    setRegistrada(false);
    setErro('');
    const n = { ...marcados };
    if (produtoId in n) delete n[produtoId]; else n[produtoId] = '';
    setMarcados(n);
  };

  const registrar = () => {
    const itens = Object.entries(marcados).map(([produtoId, quantidade]) => ({ produtoId, quantidade }));
    if (itens.length === 0) return setErro('Selecione ao menos um produto.');
    if (itens.some((i) => !(numeroDigitado(i.quantidade) > 0))) return setErro('Informe a quantidade de cada produto marcado.');
    onChange({ observacao: obs, itens });
    setRegistrada(true);
  };

  return (
    <View>
      <Text style={s.intro}>Peça reposição ao almoxarifado se algum produto acabou. Esta etapa é opcional.</Text>
      <Cartao style={{ paddingVertical: 2 }}>
        {pacote.produtos.length === 0 ? (
          <Text style={[s.nome, { paddingVertical: 14, color: colors.neutral500 }]}>Nenhum produto disponível na sua base.</Text>
        ) : pacote.produtos.map((p, i) => {
          const on = p.produtoId in marcados;
          return (
            <View key={p.produtoId} style={[s.linha, i > 0 && { borderTopWidth: 1, borderTopColor: tons.linha }]}>
              <Pressable onPress={() => alternar(p.produtoId)} hitSlop={6} style={[s.check, on && s.checkOn]}>
                {on ? <MaterialIcons name="check" size={15} color={colors.white} /> : null}
              </Pressable>
              <Text style={s.nome} numberOfLines={2}>{p.nome}</Text>
              <TextInput
                value={marcados[p.produtoId] ?? ''} editable={on} placeholder="Qtd" placeholderTextColor={colors.neutral400}
                keyboardType="decimal-pad" style={[s.qtd, !on && { opacity: 0.4 }]}
                onChangeText={(v) => { setRegistrada(false); setMarcados({ ...marcados, [p.produtoId]: v.replace(/[^0-9.,]/g, '') }); }}
              />
            </View>
          );
        })}
      </Cartao>

      <Text style={[estilos.campoRotulo, { marginTop: 16 }]}>Observação ao almoxarifado</Text>
      <TextInput value={obs} onChangeText={(v) => { setObs(v); setRegistrada(false); }} multiline
        placeholder="Ex.: consumo acima do previsto nesta unidade" placeholderTextColor={colors.neutral400} style={s.textarea} />

      {erro ? <Erro>{erro}</Erro> : null}
      <BotaoContorno verde rotulo="Enviar solicitação" onPress={registrar} style={{ marginTop: 14 }} />
      {registrada ? (
        <View style={s.ok}>
          <MaterialIcons name="check-circle" size={19} color={colors.primary} />
          <Text style={s.okTexto}>Solicitação registrada. Ela chega ao almoxarifado junto com o envio da OS.</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  intro: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.neutral500, marginBottom: 14, lineHeight: 20 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  check: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: '#c8ccd2', backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  checkOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  nome: { flex: 1, fontFamily: fonts.medium, fontSize: 14.5, color: colors.neutral800 },
  qtd: { width: 70, height: 38, borderWidth: 1, borderColor: colors.border, borderRadius: 10, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  textarea: {
    minHeight: 84, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12,
    fontFamily: fonts.regular, fontSize: 14, color: colors.ink, textAlignVertical: 'top', backgroundColor: colors.white,
  },
  ok: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: tons.okBg, borderWidth: 0.5, borderColor: '#dcefdc', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, marginTop: 12 },
  okTexto: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: tons.okTexto, lineHeight: 18 },
});
