import { useRef, useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import SignatureScreen, { type SignatureViewRef } from 'react-native-signature-canvas';
import { colors, fonts, radius } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Recebe a assinatura em base64 (sem o prefixo data:). */
  onConfirm: (base64: string) => Promise<void>;
}

// O quadro é um WebView; o estilo dele vai por CSS, não por prop.
const CANVAS_CSS = `
  .m-signature-pad { box-shadow: none; border: none; margin: 0; }
  .m-signature-pad--body { border: none; }
  .m-signature-pad--footer { display: none; }
  body, html { margin: 0; padding: 0; height: 100%; background: #fff; }
`;

/**
 * Coleta a assinatura do cliente no fim da execução.
 *
 * Antes desta tela existir, o botão "Coletar assinatura" gravava direto uma URL
 * inventada: ninguém assinava nada e a OS ficava apta a ser finalizada.
 */
export function AssinaturaSheet({ visible, onClose, onConfirm }: Props) {
  const ref = useRef<SignatureViewRef>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [vazio, setVazio] = useState(true);

  async function receber(dataUrl: string) {
    setErro('');
    setEnviando(true);
    try {
      await onConfirm(dataUrl.replace(/^data:image\/\w+;base64,/, ''));
      onClose();
    } catch (e) {
      // O erro fica aqui e a folha não fecha: fechar apagaria o traço e
      // obrigaria o cliente a assinar de novo por causa de uma falha de rede.
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Assinatura do cliente</Text>
          <Text style={styles.subtitle}>Peça que assine no quadro abaixo.</Text>

          <View style={styles.canvas}>
            <SignatureScreen
              ref={ref}
              webStyle={CANVAS_CSS}
              onOK={receber}
              onBegin={() => setVazio(false)}
              onEmpty={() => setErro('O quadro está em branco.')}
              descriptionText=""
              backgroundColor="#ffffff"
              penColor="#111111"
            />
          </View>

          {!!erro && <Text style={styles.erro}>{erro}</Text>}

          <View style={styles.acoes}>
            <Pressable
              style={[styles.btn, styles.btnGhost]}
              disabled={enviando}
              onPress={() => {
                ref.current?.clearSignature();
                setVazio(true);
                setErro('');
              }}
            >
              <Text style={styles.btnGhostText}>Limpar</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnGhost]} disabled={enviando} onPress={onClose}>
              <Text style={styles.btnGhostText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnPrimary, (vazio || enviando) && styles.btnOff]}
              disabled={vazio || enviando}
              onPress={() => ref.current?.readSignature()}
            >
              {enviando ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.btnPrimaryText}>Confirmar</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: 20,
    paddingBottom: 28,
    gap: 4,
  },
  title: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.neutral500 },
  canvas: {
    height: 220,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  erro: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger, marginTop: 10 },
  acoes: { flexDirection: 'row', gap: 8, marginTop: 16 },
  btn: { flex: 1, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { borderWidth: 1, borderColor: colors.border },
  btnGhostText: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.white },
  btnOff: { opacity: 0.5 },
});
