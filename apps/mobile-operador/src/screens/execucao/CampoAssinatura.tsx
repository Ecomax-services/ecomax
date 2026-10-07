import { useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AssinaturaSheet } from '@/components/AssinaturaSheet';
import { guardarBase64 } from '@/lib/execucao/rascunho';
import { colors, fonts } from '@/theme';
import { tons } from '@/screens/execucao/componentes';

/**
 * Assinatura da execução (cliente ou técnico).
 *
 * O traço vira arquivo na pasta da OS — não base64 no rascunho — e só sobe no
 * envio, com caminho fixo. O nome do arquivo leva a hora: trocar a assinatura
 * grava um arquivo novo em vez de sobrescrever um que a tela ainda mostra.
 */
export function CampoAssinatura({
  osId, uri, nome, titulo, subtitulo, onChange, invalido,
}: {
  osId: string;
  uri: string | null;
  nome: 'cliente' | 'tecnico';
  titulo: string;
  subtitulo: string;
  onChange: (uri: string | null) => void;
  invalido?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <View>
      <View style={[s.caixa, invalido && !uri && { borderColor: colors.danger }]}>
        {uri ? (
          <Image source={{ uri }} style={s.imagem} resizeMode="contain" />
        ) : (
          <Pressable onPress={() => setAberto(true)} style={s.vazia}>
            <MaterialIcons name="draw" size={26} color={tons.iconeApagado} />
            <Text style={s.vaziaTexto}>Toque para assinar</Text>
          </Pressable>
        )}
      </View>
      <View style={s.rodape}>
        <Text style={s.dica}>{uri ? 'Assinatura coletada.' : 'Assine dentro do quadro.'}</Text>
        {uri ? (
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <Pressable onPress={() => setAberto(true)}><Text style={s.link}>Refazer</Text></Pressable>
            <Pressable onPress={() => onChange(null)}><Text style={s.link}>Limpar</Text></Pressable>
          </View>
        ) : null}
      </View>
      <AssinaturaSheet
        visible={aberto}
        titulo={titulo}
        subtitulo={subtitulo}
        onClose={() => setAberto(false)}
        onConfirm={async (base64) => {
          onChange(await guardarBase64(osId, base64, `assinatura-${nome}-${Date.now()}`, 'png'));
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  caixa: { height: 150, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.white, overflow: 'hidden' },
  imagem: { flex: 1 },
  vazia: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  vaziaTexto: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.neutral400 },
  rodape: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 2 },
  dica: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.neutral400 },
  link: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
});
