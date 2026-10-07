import { ReactNode, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView, type ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme';

/**
 * Peças visuais da execução, nas medidas e cores do protótipo aprovado
 * ("Revisão tela de Monitoramento", 28/09). Ficam juntas para as seis etapas
 * terem o mesmo cartão, o mesmo rótulo de seção e o mesmo aviso.
 */

/** Tons do protótipo que não estão no tema geral. */
export const tons = {
  fundo: '#f4f6f4',
  bordaCartao: '#e6e8e6',
  linha: '#f1f2f4',
  etapaFeita: '#7fb583',
  etapaPendente: '#e2e5e2',
  botaoInativoBg: '#e9ebe9',
  botaoInativoFg: '#a9aeb4',
  avisoBg: '#fdf6e8',
  avisoBorda: '#f6e0b0',
  avisoIcone: '#b45309',
  avisoTexto: '#8a6410',
  erroBg: '#fff5f2',
  erroBorda: '#f3d3cc',
  erroTexto: '#a81400',
  okBg: '#eef8ee',
  okTexto: '#2e6b31',
  texto2: '#3a3e45',
  iconeApagado: '#c3c7cd',
};

export function Cartao({ children, style, compacto }: { children: ReactNode; style?: ViewStyle; compacto?: boolean }) {
  return <View style={[estilos.cartao, compacto && { paddingVertical: 2 }, style]}>{children}</View>;
}

/** Rótulo de seção em caixa alta ("SERVIÇO PROGRAMADO"). */
export function RotuloSecao({ children, primeiro }: { children: string; primeiro?: boolean }) {
  return <Text style={[estilos.rotulo, primeiro && { marginTop: 0 }]}>{children.toUpperCase()}</Text>;
}

type Icone = keyof typeof MaterialIcons.glyphMap;

/** Aviso amarelo (fora da data, lâmpada a vencer, pendência). */
export function Aviso({ icone = 'schedule', children, style }: { icone?: Icone; children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[estilos.aviso, style]}>
      <MaterialIcons name={icone} size={19} color={tons.avisoIcone} />
      <Text style={estilos.avisoTexto}>{children}</Text>
    </View>
  );
}

/** Erro de validação, logo acima do botão que o causou. */
export function Erro({ children }: { children: ReactNode }) {
  return <Text style={estilos.erro}>{children}</Text>;
}

/** Linha "rótulo em cima, valor embaixo" dos cartões de dados. */
export function LinhaDado({ rotulo, valor, primeira }: { rotulo: string; valor: string; primeira?: boolean }) {
  return (
    <View style={[estilos.linhaDado, !primeira && estilos.linhaDadoBorda]}>
      <Text style={estilos.linhaRotulo}>{rotulo}</Text>
      <Text style={estilos.linhaValor}>{valor}</Text>
    </View>
  );
}

/** Botão de contorno com ícone verde ("Abrir no mapa", "Adicionar produto"). */
export function BotaoContorno({ icone, rotulo, onPress, style, verde }: { icone?: Icone; rotulo: string; onPress: () => void; style?: ViewStyle; verde?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [estilos.contorno, verde && estilos.contornoVerde, pressed && { opacity: 0.85 }, style]}>
      {icone ? <MaterialIcons name={icone} size={19} color={colors.primary} /> : null}
      <Text style={[estilos.contornoTexto, verde && { color: colors.primary, fontFamily: fonts.bold }]}>{rotulo}</Text>
    </Pressable>
  );
}

export interface Opcao<T extends string> {
  valor: T;
  rotulo: string;
  detalhe?: string;
}

/**
 * Campo de escolha. O React Native não tem `<select>`; este abre uma lista em
 * folha inferior, que funciona igual no iOS e no Android.
 */
export function CampoEscolha<T extends string>({
  rotulo, valor, opcoes, onChange, vazio = 'Selecione', desabilitado, invalido,
}: {
  rotulo: string;
  valor: T | null;
  opcoes: Opcao<T>[];
  onChange: (v: T) => void;
  vazio?: string;
  desabilitado?: boolean;
  invalido?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const atual = opcoes.find((o) => o.valor === valor);
  const insets = useSafeAreaInsets();
  return (
    <View>
      <Text style={estilos.campoRotulo}>{rotulo}</Text>
      <Pressable
        disabled={desabilitado}
        onPress={() => setAberto(true)}
        style={[estilos.campo, invalido && { borderColor: colors.danger }, desabilitado && { opacity: 0.5 }]}
      >
        <Text style={[estilos.campoTexto, !atual && { color: colors.neutral400 }]} numberOfLines={1}>
          {atual ? atual.rotulo : vazio}
        </Text>
        <MaterialIcons name="expand-more" size={22} color={colors.neutral500} />
      </Pressable>
      <Modal visible={aberto} transparent animationType="slide" onRequestClose={() => setAberto(false)}>
        <Pressable style={estilos.fundoModal} onPress={() => setAberto(false)} />
        <View style={[estilos.folha, { paddingBottom: insets.bottom + 12 }]}>
          <View style={estilos.puxador} />
          <Text style={estilos.folhaTitulo}>{rotulo}</Text>
          <ScrollView style={{ maxHeight: 420 }}>
            {opcoes.length === 0 ? (
              <Text style={estilos.folhaVazia}>Nenhuma opção disponível.</Text>
            ) : opcoes.map((o) => (
              <Pressable
                key={o.valor}
                onPress={() => { onChange(o.valor); setAberto(false); }}
                style={({ pressed }) => [estilos.opcao, pressed && { backgroundColor: colors.bg }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={estilos.opcaoTexto}>{o.rotulo}</Text>
                  {o.detalhe ? <Text style={estilos.opcaoDetalhe}>{o.detalhe}</Text> : null}
                </View>
                {o.valor === valor ? <MaterialIcons name="check" size={20} color={colors.primary} /> : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

export const estilos = StyleSheet.create({
  cartao: {
    backgroundColor: colors.white,
    borderWidth: 0.5,
    borderColor: tons.bordaCartao,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#0b1b3a',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
    elevation: 1,
  },
  rotulo: {
    fontFamily: fonts.bold, fontSize: 11.5, letterSpacing: 0.8, color: colors.neutral400,
    marginTop: 20, marginBottom: 8, marginLeft: 2,
  },
  aviso: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: tons.avisoBg, borderWidth: 0.5, borderColor: tons.avisoBorda, borderRadius: 12,
    paddingVertical: 11, paddingHorizontal: 14,
  },
  avisoTexto: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: tons.avisoTexto, lineHeight: 19 },
  erro: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger, marginTop: 10 },
  linhaDado: { paddingVertical: 13 },
  linhaDadoBorda: { borderTopWidth: 1, borderTopColor: tons.linha },
  linhaRotulo: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral400 },
  linhaValor: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink, marginTop: 3, lineHeight: 21 },
  contorno: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 42, borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: colors.white,
  },
  contornoVerde: { height: 48, borderColor: '#bfe3c2', backgroundColor: '#f2fbf2', borderRadius: 12 },
  contornoTexto: { fontFamily: fonts.semibold, fontSize: 14, color: tons.texto2 },
  campoRotulo: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.neutral800, marginBottom: 6 },
  campo: {
    height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: '#fbfcfb',
    paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center',
  },
  campoTexto: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  fundoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  folha: {
    backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: 16, paddingTop: 12,
  },
  puxador: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 },
  folhaTitulo: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink, marginBottom: 8, marginLeft: 4 },
  folhaVazia: { fontFamily: fonts.regular, fontSize: 14, color: colors.neutral500, padding: 16, textAlign: 'center' },
  opcao: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 8, borderRadius: 10 },
  opcaoTexto: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  opcaoDetalhe: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.neutral400, marginTop: 2 },
});
