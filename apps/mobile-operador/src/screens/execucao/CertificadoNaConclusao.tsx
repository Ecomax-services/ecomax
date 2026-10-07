import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { colors, fonts } from '@/theme';
import { Aviso, BotaoContorno } from '@/screens/execucao/componentes';
import { compartilharPdf, emitirCertificado, visualizarPdf, type ResultadoCertificado } from '@/lib/certificado';

/**
 * Certificado na tela de conclusão: pede a emissão logo depois do envio e,
 * quando o PDF existe, mostra "Visualizar certificado" e "Compartilhar" — as
 * duas ações do protótipo. Se faltar cadastro no escritório, diz o quê; a OS
 * já está enviada de qualquer jeito.
 */
export function CertificadoNaConclusao({ osId, codigo }: { osId: string; codigo: string }) {
  const [r, setR] = useState<ResultadoCertificado | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => { emitirCertificado(osId).then(setR); }, [osId]);

  const agir = async (fn: () => Promise<void>) => {
    setOcupado(true);
    try { await fn(); } catch (e) { Alert.alert('Certificado', (e as Error).message); } finally { setOcupado(false); }
  };

  if (!r) {
    return (
      <View style={s.linha}>
        <ActivityIndicator color={colors.primary} />
        <Text style={s.texto}>Gerando o certificado…</Text>
      </View>
    );
  }
  if (r.tipo === 'emitido') {
    return (
      <View style={s.botoes}>
        <BotaoContorno icone="description" rotulo="Visualizar certificado" onPress={() => agir(() => visualizarPdf(r.caminho))} style={{ flex: 1 }} />
        <BotaoContorno icone="share" rotulo="Compartilhar" onPress={() => agir(() => compartilharPdf(r.caminho, codigo))} style={{ flex: 1, opacity: ocupado ? 0.6 : 1 }} />
      </View>
    );
  }
  if (r.tipo === 'pendente') {
    return (
      <Aviso icone="info-outline" style={{ alignSelf: 'stretch' }}>
        O certificado sai assim que o escritório completar o cadastro: {r.faltas.join(' ')}
      </Aviso>
    );
  }
  return <Aviso icone="cloud-off" style={{ alignSelf: 'stretch' }}>{r.mensagem}</Aviso>;
}

const s = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  texto: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.neutral500 },
  botoes: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 8 },
});
