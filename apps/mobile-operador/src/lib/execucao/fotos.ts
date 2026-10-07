import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { guardarArquivo, novoIdLocal } from '@/lib/execucao/rascunho';
import { extensaoDe } from '@/lib/execucao/regras';
import type { FotoNoRascunho } from '@/lib/execucao/tipos';

/**
 * Foto da execução: câmera ou galeria, copiada para a pasta da OS.
 *
 * A foto não sobe aqui — sobe no envio, junto com o resto. A cópia sai do
 * cache do picker, que o sistema limpa quando quer: perder a evidência antes
 * do envio é pior que ocupar alguns megabytes.
 */
export function perguntarOrigemDaFoto(): Promise<'camera' | 'galeria' | null> {
  return new Promise((resolve) => {
    Alert.alert('Adicionar foto', 'De onde vem a foto?', [
      { text: 'Câmera', onPress: () => resolve('camera') },
      { text: 'Galeria', onPress: () => resolve('galeria') },
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

export async function capturarFoto(osId: string, pontoId: string | null, nome: string): Promise<FotoNoRascunho | null> {
  const origem = await perguntarOrigemDaFoto();
  if (!origem) return null;

  const perm = origem === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permissão necessária', `Autorize o acesso ${origem === 'camera' ? 'à câmera' : 'às fotos'} nos ajustes do aparelho.`);
    return null;
  }

  const opcoes: ImagePicker.ImagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    // Evidência, não material publicitário: arquivo menor sobe mais rápido
    // com o sinal ruim do fim da execução.
    quality: 0.6,
    allowsEditing: false,
  };
  const r = origem === 'camera' ? await ImagePicker.launchCameraAsync(opcoes) : await ImagePicker.launchImageLibraryAsync(opcoes);
  if (r.canceled || !r.assets?.[0]) return null;

  const id = novoIdLocal();
  const uriLocal = await guardarArquivo(osId, r.assets[0].uri, id, extensaoDe(r.assets[0].uri));
  return { id, uriLocal, nome, pontoId };
}
