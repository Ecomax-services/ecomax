import { View, Text } from 'react-native';
import { fonts } from '@/theme';

/** Bolinha com as iniciais do operador, na cor dele (agenda da equipe). */
export function AvatarOperador({ op, tamanho }: { op: { iniciais: string; cor: string; fundo: string }; tamanho: number }) {
  return (
    <View style={{ width: tamanho, height: tamanho, borderRadius: tamanho / 2, backgroundColor: op.fundo, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.bold, fontSize: tamanho > 28 ? 11.5 : 10.5, letterSpacing: 0.2, color: op.cor }}>{op.iniciais}</Text>
    </View>
  );
}
