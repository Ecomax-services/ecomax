import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Image, Modal, Alert, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fonts } from '@/theme';
import { Cartao, LinhaDado, RotuloSecao, tons } from '@/screens/execucao/componentes';
import { PILULA, situacaoNaAgenda } from '@/lib/agenda/regras';
import { brDate } from '@/lib/operacional';
import { baixarPdf, getDetalheConcluida, urlDoDocumento, type DetalheConcluida } from '@/lib/historico/dados';
import type { OsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<OsStackParamList, 'OsConcluida'>;

/**
 * "Detalhes do serviço" de uma OS concluída — o registro do que foi feito em
 * campo, só leitura.
 *
 * Segue o protótipo aprovado na estrutura (dados do serviço, produtos,
 * mapeamento e pontos, assinaturas, documentos, compartilhar), mas com o
 * modelo novo: o desenho do protótipo ainda usa "Conforme/Consumo" e duas
 * assinaturas; aqui cada ponto diz o que o serviço dele registra e as
 * assinaturas são as três do certificado (cliente, técnico e RT).
 */
export function OsConcluidaScreen({ navigation, route }: Props) {
  const { id, codigo } = route.params;
  const insets = useSafeAreaInsets();
  const [d, setD] = useState<DetalheConcluida | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [compartilhando, setCompartilhando] = useState(false);

  useFocusEffect(useCallback(() => {
    setErro(null);
    getDetalheConcluida(id).then(setD).catch((e) => setErro((e as Error).message));
  }, [id]));

  const visualizar = async (caminho: string) => {
    try {
      await Linking.openURL(await urlDoDocumento(caminho));
    } catch (e) {
      Alert.alert('Documento', (e as Error).message);
    }
  };

  const compartilhar = async () => {
    if (!d?.certificadoPdf) return;
    setCompartilhando(true);
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error('Este aparelho não permite compartilhar arquivos.');
      const uri = await baixarPdf(d.certificadoPdf, `certificado-${d.codigo}`);
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Certificado ${d.codigo}` });
    } catch (e) {
      Alert.alert('Compartilhar', (e as Error).message);
    } finally {
      setCompartilhando(false);
    }
  };

  if (!d) {
    return (
      <View style={s.root}>
        <StatusBar style="dark" />
        <ScreenHeader title="Detalhes do serviço" onBack={() => navigation.goBack()} />
        <View style={s.centro}>
          {erro ? <Text style={s.erro}>{erro}</Text> : <ActivityIndicator color={colors.primary} />}
        </View>
      </View>
    );
  }

  const pilula = PILULA[situacaoNaAgenda(d.status)];
  const dados: [string, string][] = [
    ['Tipo de serviço', d.tipos],
    ['Pragas-alvo e escopo', d.pragas],
    ['Tempo real de execução', d.tempo ?? '—'],
    ['Operador responsável', d.operador],
  ];

  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <ScreenHeader title="Detalhes do serviço" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[s.conteudo, { paddingBottom: 28 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <Cartao>
          <View style={s.topo}>
            <Text style={s.codigo}>{d.codigo || codigo}</Text>
            <Text style={[s.pilula, { backgroundColor: pilula.bg, color: pilula.fg }]}>{pilula.rotulo}</Text>
          </View>
          <Text style={s.quando}>Executada em {brDate(d.data)}</Text>
          <Text style={s.cliente}>{d.cliente}</Text>
          <Text style={s.endereco}>{d.endereco}</Text>
        </Cartao>

        <RotuloSecao>Dados do serviço</RotuloSecao>
        <Cartao compacto>
          {dados.map(([rotulo, valor], i) => <LinhaDado key={rotulo} rotulo={rotulo} valor={valor} primeira={i === 0} />)}
        </Cartao>

        <RotuloSecao>Produtos utilizados</RotuloSecao>
        <Cartao compacto>
          {d.produtos.length === 0 ? (
            <Text style={s.semItens}>Nenhum produto registrado.</Text>
          ) : d.produtos.map((p, i) => (
            <View key={p.id} style={[s.produto, i > 0 && s.produtoBorda]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.produtoNome}>{p.nome}</Text>
                <Text style={s.produtoLote}>Lote {p.lote}</Text>
              </View>
              <Text style={s.produtoQtd}>{p.qtd}</Text>
            </View>
          ))}
        </Cartao>

        {d.pontos.length > 0 ? (
          <>
            <View style={s.secaoPontos}>
              <Text style={s.rotuloPontos}>MAPEAMENTO E PONTOS</Text>
              <Text style={s.resumoPontos}>{d.resumoPontos}</Text>
            </View>
            <View style={{ gap: 8 }}>
              {d.pontos.map((pt) => (
                <View key={pt.id} style={s.ponto}>
                  <View style={s.pontoTopo}>
                    <MaterialIcons name={pt.ok ? 'check-circle' : 'error'} size={19} color={pt.ok ? colors.primary : tons.avisoIcone} />
                    <Text style={s.pontoNome}>{pt.nome}</Text>
                    <Text style={[s.pontoChip, pt.ok ? { backgroundColor: '#e7f6e7', color: '#1d6b25' } : { backgroundColor: '#fdf3e3', color: '#8a6410' }]}>{pt.status}</Text>
                  </View>
                  {pt.obs ? <Text style={s.pontoObs}>{pt.obs}</Text> : null}
                  {pt.fotos.length > 0 ? (
                    <View style={s.fotos}>
                      {pt.fotos.map((f) => (
                        <Pressable key={f.id} onPress={() => setFoto(f.url)} style={s.foto}>
                          <Image source={{ uri: f.url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </>
        ) : null}

        <RotuloSecao>Assinaturas</RotuloSecao>
        <View style={s.assinaturas}>
          {d.assinaturas.map((a) => (
            <View key={a.papel} style={s.assinatura}>
              <View style={s.assinaturaTraco}>
                {a.url ? <Image source={{ uri: a.url }} style={StyleSheet.absoluteFill} resizeMode="contain" /> : null}
              </View>
              <View style={s.assinaturaRodape}>
                <Text style={s.assinaturaNome} numberOfLines={1}>{a.nome}</Text>
                <Text style={s.assinaturaPapel} numberOfLines={2}>{a.papel}</Text>
              </View>
            </View>
          ))}
        </View>

        <RotuloSecao>Documentos</RotuloSecao>
        {d.documentos.length === 0 ? (
          <Text style={s.semDocs}>Nenhum documento gerado para esta OS ainda.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {d.documentos.map((doc) => (
              <View key={doc.chave} style={s.documento}>
                <MaterialIcons name="picture-as-pdf" size={20} color={colors.primary} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.docNome}>{doc.nome}</Text>
                  <Text style={s.docInfo}>{doc.info}</Text>
                </View>
                <Pressable onPress={() => visualizar(doc.caminho)} style={({ pressed }) => [s.docBotao, pressed && { opacity: 0.8 }]}>
                  <Text style={s.docBotaoTexto}>Visualizar</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Pressable
          onPress={compartilhar}
          disabled={!d.certificadoPdf || compartilhando}
          style={({ pressed }) => [s.compartilhar, (!d.certificadoPdf || compartilhando) && { opacity: 0.5 }, pressed && { transform: [{ scale: 0.99 }] }]}
        >
          {compartilhando ? <ActivityIndicator color={colors.primary} /> : <MaterialIcons name="share" size={19} color={colors.primary} />}
          <Text style={s.compartilharTexto}>Compartilhar</Text>
        </Pressable>
        <Text style={s.nota}>
          {d.certificadoPdf
            ? 'Registro somente leitura. O compartilhamento usa o PDF gerado na execução.'
            : 'Registro somente leitura. O compartilhamento fica disponível quando o certificado em PDF for gerado.'}
        </Text>
      </ScrollView>

      <Modal visible={!!foto} transparent animationType="fade" onRequestClose={() => setFoto(null)}>
        <Pressable style={s.fotoFundo} onPress={() => setFoto(null)}>
          {foto ? <Image source={{ uri: foto }} style={s.fotoGrande} resizeMode="contain" /> : null}
          <View style={[s.fotoFechar, { top: insets.top + 12 }]}>
            <MaterialIcons name="close" size={24} color={colors.white} />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const sombra = {
  shadowColor: '#0b1b3a', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 6 }, shadowRadius: 18, elevation: 1,
} as const;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: tons.fundo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  erro: { color: colors.danger, fontFamily: fonts.medium, fontSize: 13, textAlign: 'center' },
  conteudo: { padding: 20 },

  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  codigo: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.neutral500, fontVariant: ['tabular-nums'] },
  pilula: { fontFamily: fonts.bold, fontSize: 11.5, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 7, overflow: 'hidden' },
  quando: { fontFamily: fonts.regular, fontSize: 13, color: colors.neutral400, marginBottom: 12 },
  cliente: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  endereco: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.neutral400, marginTop: 3, lineHeight: 20 },

  semItens: { fontFamily: fonts.regular, fontSize: 14, color: colors.neutral500, paddingVertical: 13 },
  produto: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  produtoBorda: { borderTopWidth: 1, borderTopColor: tons.linha },
  produtoNome: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.ink },
  produtoLote: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.neutral400, marginTop: 2 },
  produtoQtd: { fontFamily: fonts.bold, fontSize: 13.5, color: tons.texto2, fontVariant: ['tabular-nums'] },

  secaoPontos: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginTop: 20, marginBottom: 8, marginLeft: 2 },
  rotuloPontos: { fontFamily: fonts.bold, fontSize: 11.5, letterSpacing: 0.8, color: colors.neutral400 },
  resumoPontos: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral400 },
  ponto: { backgroundColor: colors.white, borderWidth: 0.5, borderColor: tons.bordaCartao, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, ...sombra },
  pontoTopo: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  pontoNome: { flex: 1, minWidth: 0, fontFamily: fonts.semibold, fontSize: 14.5, color: colors.ink },
  pontoChip: { fontFamily: fonts.bold, fontSize: 11, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 7, overflow: 'hidden', maxWidth: 160 },
  pontoObs: { fontFamily: fonts.regular, fontSize: 13, color: colors.neutral500, marginTop: 8, lineHeight: 19 },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  foto: { width: 60, height: 60, borderRadius: 10, borderWidth: 1, borderColor: tons.bordaCartao, backgroundColor: '#f1f3f1', overflow: 'hidden' },

  assinaturas: { flexDirection: 'row', gap: 10 },
  assinatura: { flex: 1, minWidth: 0, backgroundColor: colors.white, borderWidth: 0.5, borderColor: tons.bordaCartao, borderRadius: 12, padding: 12, ...sombra },
  assinaturaTraco: { height: 44 },
  assinaturaRodape: { borderTopWidth: 1, borderTopColor: '#eeeff1', marginTop: 8, paddingTop: 8 },
  assinaturaNome: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.ink },
  assinaturaPapel: { fontFamily: fonts.regular, fontSize: 11, color: colors.neutral400, marginTop: 2 },

  semDocs: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.neutral500, marginLeft: 2 },
  documento: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    backgroundColor: colors.white, borderWidth: 0.5, borderColor: tons.bordaCartao, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, ...sombra,
  },
  docNome: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.ink },
  docInfo: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral400, marginTop: 2 },
  docBotao: { height: 32, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 9, justifyContent: 'center', backgroundColor: colors.white },
  docBotaoTexto: { fontFamily: fonts.semibold, fontSize: 12.5, color: tons.texto2 },

  compartilhar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, marginTop: 12, borderWidth: 1, borderColor: '#bfe3c2', borderRadius: 12, backgroundColor: '#f2fbf2',
  },
  compartilharTexto: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.primary },
  nota: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral400, marginTop: 12, textAlign: 'center', lineHeight: 18 },

  fotoFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  fotoGrande: { width: '100%', height: '80%' },
  fotoFechar: { position: 'absolute', right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
});
