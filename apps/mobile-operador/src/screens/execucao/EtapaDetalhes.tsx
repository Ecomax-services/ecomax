import { View, Text, Pressable, Linking, Alert, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Tag } from '@/components/Tag';
import { tagDoStatus, brDate } from '@/lib/operacional';
import { colors, fonts } from '@/theme';
import { Cartao, RotuloSecao, Aviso, LinhaDado, BotaoContorno, tons } from '@/screens/execucao/componentes';
import type { PacoteOs } from '@/lib/execucao/tipos';

/**
 * Etapa 1 — Detalhes da OS antes de iniciar.
 *
 * Tudo vem do pacote baixado: o técnico consulta isto já dentro do cliente,
 * muitas vezes sem sinal. Só abrir ficha e croqui precisa de rede (são
 * arquivos no storage), e a tela diz isso quando falha.
 */
export function EtapaDetalhes({ pacote, foraDaData }: { pacote: PacoteOs; foraDaData: boolean }) {
  const { os } = pacote;
  const tag = tagDoStatus(os.status);

  const abrirMapa = () => {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(os.cliente.endereco)}`)
      .catch(() => Alert.alert('Não foi possível abrir o mapa.'));
  };
  const ligar = () => {
    const tel = (os.cliente.telefone ?? '').replace(/\D/g, '');
    if (!tel) return Alert.alert('Sem telefone', 'O cadastro do cliente não tem telefone.');
    Linking.openURL(`tel:${tel}`).catch(() => Alert.alert('Não foi possível ligar daqui.'));
  };

  const abrirArquivo = async (bucket: string, caminho: string) => {
    if (/^https?:\/\//.test(caminho)) return Linking.openURL(caminho);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(caminho, 60 * 10);
    if (error || !data?.signedUrl) {
      return Alert.alert('Arquivo indisponível', 'Abrir o arquivo precisa de conexão. Tente de novo quando houver sinal.');
    }
    Linking.openURL(data.signedUrl);
  };

  const fichas = pacote.produtos.filter((p) => p.fichaTecnicaUrl);
  const campos: [string, string][] = [
    ['Tipo de serviço', os.tiposServico.join(', ')],
    ['Pragas-alvo', os.pragas.length ? os.pragas.join(', ') : 'Definidas na vistoria'],
    ['Data e horário', [os.dataProgramada ? brDate(os.dataProgramada) : null, os.horaPrevista ? `às ${os.horaPrevista}` : null].filter(Boolean).join(' ')],
    ['Tempo médio', os.duracaoEstimada ?? ''],
    ['Observações do escritório', os.observacoes ?? ''],
  ];

  return (
    <View>
      <Cartao>
        <View style={s.topo}>
          <Text style={s.codigo}>{os.codigo}</Text>
          <Tag label={tag.label} bg={tag.bg} fg={tag.fg} />
        </View>
        <Text style={s.cliente}>{os.cliente.nome}</Text>
        <Text style={s.endereco}>{os.cliente.endereco}</Text>
        <View style={s.acoes}>
          <BotaoContorno icone="map" rotulo="Abrir no mapa" onPress={abrirMapa} style={{ flex: 1 }} />
          <BotaoContorno icone="call" rotulo="Ligar" onPress={ligar} style={{ flex: 1 }} />
        </View>
      </Cartao>

      <RotuloSecao>Serviço programado</RotuloSecao>
      <Cartao compacto>
        {campos.map(([rotulo, valor], i) => (
          <LinhaDado key={rotulo} rotulo={rotulo} valor={valor || 'Não informado'} primeira={i === 0} />
        ))}
      </Cartao>

      <RotuloSecao>Fichas técnicas e mapeamento</RotuloSecao>
      {fichas.length === 0 && !os.mapaPontosUrl ? (
        <Text style={s.semDocs}>Nenhuma ficha técnica ou mapeamento anexado a esta OS.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {fichas.map((p) => (
            <Documento key={p.produtoId} icone="science" nome={p.nome} tipo="Ficha técnica em PDF"
              onPress={() => abrirArquivo('portal-docs', p.fichaTecnicaUrl!)} />
          ))}
          {os.mapaPontosUrl ? (
            <Documento icone="map" nome="Mapeamento do local" tipo="Planta com pontos de isca em PDF"
              onPress={() => abrirArquivo('operacional-docs', os.mapaPontosUrl!)} />
          ) : null}
        </View>
      )}

      {foraDaData && os.dataProgramada ? (
        <Aviso style={{ marginTop: 18 }}>O serviço só pode ser iniciado em {brDate(os.dataProgramada)}.</Aviso>
      ) : null}
    </View>
  );
}

function Documento({ icone, nome, tipo, onPress }: { icone: 'science' | 'map'; nome: string; tipo: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.doc, pressed && { opacity: 0.85 }]}>
      <MaterialIcons name={icone} size={20} color={colors.primary} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.docNome}>{nome}</Text>
        <Text style={s.docTipo}>{tipo}</Text>
      </View>
      <MaterialIcons name="open-in-new" size={19} color={tons.iconeApagado} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  codigo: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.neutral500 },
  cliente: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  endereco: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.neutral400, marginTop: 3, marginBottom: 12 },
  acoes: { flexDirection: 'row', gap: 10 },
  semDocs: { fontFamily: fonts.regular, fontSize: 13, color: colors.neutral500, marginLeft: 2 },
  doc: {
    flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.white,
    borderWidth: 0.5, borderColor: tons.bordaCartao, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14,
  },
  docNome: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.ink },
  docTipo: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.neutral400, marginTop: 2 },
});
