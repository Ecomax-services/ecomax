import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AvatarOperador } from '@/components/AvatarOperador';
import { colors, fonts } from '@/theme';
import { Cartao, LinhaDado, RotuloSecao, tons } from '@/screens/execucao/componentes';
import { DIAS_DA_SEMANA, PILULA, diaDaSemana, situacaoNaAgenda } from '@/lib/agenda/regras';
import { brDate } from '@/lib/operacional';
import type { OsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<OsStackParamList, 'OsEquipe'>;

/**
 * "Detalhes do serviço" de uma OS de colega, aberta da agenda da equipe.
 *
 * Só leitura e só o que o protótipo mostra nesse modo — cabeçalho, aviso de
 * que é a agenda da equipe e os dados do serviço. Os dados vêm da própria
 * agenda (`agenda_da_equipe`): o gestor não lê a OS do colega pela tabela.
 */
export function OsEquipeScreen({ navigation, route }: Props) {
  const { item, operador, responsaveis } = route.params;
  const pilula = PILULA[situacaoNaAgenda(item.status)];
  const concluida = situacaoNaAgenda(item.status) === 'concluida';
  const quando = `${DIAS_DA_SEMANA[diaDaSemana(item.data)]}, ${brDate(item.data)}`;

  const linhas: [string, string][] = [
    ['Tipo de serviço', item.tipos],
    ['Pragas-alvo e escopo', `${item.pragas || 'Definidas na vistoria'}. Escopo definido no Backoffice.`],
    ['Horário previsto', [item.hora, item.duracao].filter(Boolean).join(' · ') || '—'],
    ['Operador responsável', responsaveis.join(', ') || operador.nome],
  ];

  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <ScreenHeader title="Detalhes do serviço" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={s.conteudo} showsVerticalScrollIndicator={false}>
        <Cartao>
          <View style={s.topo}>
            <Text style={s.codigo}>{item.codigo}</Text>
            <Text style={[s.pilula, { backgroundColor: pilula.bg, color: pilula.fg }]}>{pilula.rotulo}</Text>
          </View>
          <Text style={s.quando}>{concluida ? 'Executada em ' : 'Programada para '}{quando}</Text>
          <Text style={s.cliente}>{item.cliente}</Text>
          <Text style={s.endereco}>{item.endereco || '—'}</Text>
        </Cartao>

        <View style={s.aviso}>
          <AvatarOperador op={operador} tamanho={30} />
          <Text style={s.avisoTexto}>OS de {operador.nome}. Você está vendo a agenda da equipe, sem editar.</Text>
        </View>

        <RotuloSecao>Dados do serviço</RotuloSecao>
        <Cartao compacto>
          {linhas.map(([rotulo, valor], i) => <LinhaDado key={rotulo} rotulo={rotulo} valor={valor} primeira={i === 0} />)}
        </Cartao>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: tons.fundo },
  conteudo: { padding: 20, paddingBottom: 28 },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  codigo: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.neutral500, fontVariant: ['tabular-nums'] },
  pilula: { fontFamily: fonts.bold, fontSize: 11.5, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 7, overflow: 'hidden' },
  quando: { fontFamily: fonts.regular, fontSize: 13, color: colors.neutral400, marginBottom: 12 },
  cliente: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  endereco: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.neutral400, marginTop: 3, lineHeight: 20 },
  aviso: {
    flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12,
    backgroundColor: tons.okBg, borderWidth: 0.5, borderColor: '#dcefdc', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13,
  },
  avisoTexto: { flex: 1, minWidth: 0, fontFamily: fonts.regular, fontSize: 13, color: tons.okTexto, lineHeight: 19 },
});
