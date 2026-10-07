import { View, Text, Image, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { brDate } from '@/lib/operacional';
import { colors, fonts } from '@/theme';
import { Cartao, RotuloSecao, tons } from '@/screens/execucao/componentes';
import { CampoAssinatura } from '@/screens/execucao/CampoAssinatura';
import type { PacoteOs, RascunhoExecucao } from '@/lib/execucao/tipos';

/** Data de validade do certificado: início da execução + dias do tipo de serviço. */
function validadeDoCertificado(pacote: PacoteOs, r: RascunhoExecucao): string {
  if (!pacote.validadeCertificadoDias || !r.inicio) return 'Definida na emissão';
  const d = new Date(r.inicio);
  d.setDate(d.getDate() + pacote.validadeCertificadoDias);
  return `${brDate(d.toISOString())} (${pacote.validadeCertificadoDias} dias)`;
}

/**
 * Etapa 6 — Emissão: assinatura do técnico e prévia do certificado.
 *
 * A prévia mostra o que vai no certificado com os dados do pacote. O PDF
 * oficial é gerado no servidor, depois do envio — por isso esta tela não tem
 * "baixar" nem "compartilhar" ainda.
 */
export function EtapaEmissao({
  pacote, rascunho, atualizar, erro, problemas,
}: {
  pacote: PacoteOs;
  rascunho: RascunhoExecucao;
  atualizar: (fn: (r: RascunhoExecucao) => RascunhoExecucao) => void;
  erro: string;
  problemas: string[];
}) {
  const rt = pacote.responsavelTecnico;
  const inicio = rascunho.inicio ? new Date(rascunho.inicio) : null;
  const linhas: [string, string][] = [
    ['Cliente', pacote.os.cliente.nome],
    ['Serviço', pacote.os.tiposServico.join(', ')],
    ['Execução', inicio ? `${brDate(inicio.toISOString())} às ${inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '—'],
    ['Validade', validadeDoCertificado(pacote, rascunho)],
    ['Responsável técnico', rt ? `${rt.nome} · ${rt.conselho} ${rt.registro}` : 'A definir pelo escritório'],
  ];

  return (
    <View>
      <RotuloSecao primeiro>Sua assinatura</RotuloSecao>
      <CampoAssinatura
        osId={rascunho.osId} uri={rascunho.tecnicoAssinaturaUri} nome="tecnico"
        titulo="Sua assinatura" subtitulo="Assine no quadro abaixo."
        onChange={(uri) => atualizar((r) => ({ ...r, tecnicoAssinaturaUri: uri }))}
        invalido={!!erro && !rascunho.tecnicoAssinaturaUri}
      />
      <Cartao style={{ marginTop: 10, paddingVertical: 12 }}>
        <Text style={s.carimboRotulo}>CARIMBO</Text>
        <Text style={s.carimboNome}>{pacote.tecnico?.nome ?? 'Técnico'}</Text>
        <Text style={s.carimboSub}>Técnico executor · Ecomax</Text>
      </Cartao>

      <RotuloSecao>Certificado de execução</RotuloSecao>
      <Cartao>
        <View style={s.certTopo}>
          <Image source={require('../../../assets/ecomax-logo.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.certCodigo}>{pacote.os.codigo}</Text>
        </View>
        {linhas.map(([rotulo, valor]) => (
          <View key={rotulo} style={s.certLinha}>
            <Text style={s.certRotulo}>{rotulo}</Text>
            <Text style={s.certValor}>{valor}</Text>
          </View>
        ))}
        <View style={s.assinaturas}>
          {[
            [rascunho.assinante.nome || 'Cliente', 'Cliente'],
            [pacote.tecnico?.nome ?? 'Técnico', 'Técnico'],
            [rt?.nome ?? 'A definir', 'Resp. técnico'],
          ].map(([nome, papel]) => (
            <View key={papel} style={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
              <View style={s.traco} />
              <Text style={s.assNome} numberOfLines={1}>{nome}</Text>
              <Text style={s.assPapel}>{papel}</Text>
            </View>
          ))}
        </View>
      </Cartao>

      <View style={s.atencao}>
        <MaterialIcons name="error-outline" size={18} color={tons.avisoIcone} />
        <Text style={s.atencaoTexto}>Ao concluir, a OS vai para o histórico e não pode mais ser editada.</Text>
      </View>

      {erro ? (
        <View style={s.erroCaixa}>
          <Text style={s.erroTitulo}>{erro}</Text>
          {problemas.map((p) => <Text key={p} style={s.erroItem}>• {p}</Text>)}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  carimboRotulo: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.8, color: colors.neutral400 },
  carimboNome: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.ink, marginTop: 4 },
  carimboSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral500, marginTop: 1 },
  certTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  logo: { width: 96, height: 26 },
  certCodigo: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.neutral500 },
  certLinha: { flexDirection: 'row', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f4f5f4' },
  certRotulo: { width: 110, fontFamily: fonts.regular, fontSize: 11.5, color: colors.neutral400 },
  certValor: { flex: 1, fontFamily: fonts.regular, fontSize: 12.5, color: colors.neutral800, lineHeight: 18 },
  assinaturas: { flexDirection: 'row', gap: 12, marginTop: 18 },
  traco: { height: 28, alignSelf: 'stretch', borderBottomWidth: 1, borderBottomColor: '#c8ccc8' },
  assNome: { fontFamily: fonts.medium, fontSize: 11, color: tons.texto2, marginTop: 6 },
  assPapel: { fontFamily: fonts.regular, fontSize: 10, color: colors.neutral400, marginTop: 1 },
  atencao: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: tons.avisoBg, borderWidth: 0.5, borderColor: tons.avisoBorda, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, marginTop: 16 },
  atencaoTexto: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: tons.avisoTexto, lineHeight: 18 },
  erroCaixa: { backgroundColor: tons.erroBg, borderWidth: 0.5, borderColor: tons.erroBorda, borderRadius: 12, padding: 14, marginTop: 12, gap: 4 },
  erroTitulo: { fontFamily: fonts.bold, fontSize: 13.5, color: tons.erroTexto },
  erroItem: { fontFamily: fonts.regular, fontSize: 13, color: tons.erroTexto, lineHeight: 19 },
});
