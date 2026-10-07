import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { brDate } from '@/lib/operacional';
import { numeroDigitado } from '@/lib/execucao/regras';
import { colors, fonts } from '@/theme';
import { Cartao, Aviso, Erro, BotaoContorno, CampoEscolha, estilos, tons, type Opcao } from '@/screens/execucao/componentes';
import type { PacoteOs, ProdutoNoRascunho } from '@/lib/execucao/tipos';

/**
 * Etapa 2 — Produtos utilizados.
 *
 * O lote vem da lista da base do técnico (decisão de 06/10) e a unidade só
 * oferece o que converte para aquele produto: a de estoque e, se houver, a de
 * aplicação. Unidade que não converte seria recusada no envio.
 */
export function EtapaProdutos({
  pacote, produtos, onChange,
}: { pacote: PacoteOs; produtos: ProdutoNoRascunho[]; onChange: (p: ProdutoNoRascunho[]) => void }) {
  const [form, setForm] = useState<(ProdutoNoRascunho & { indice: number }) | null>(null);
  const [erro, setErro] = useState('');

  const produto = (id: string | null) => pacote.produtos.find((p) => p.produtoId === id);
  const lote = (id: string | null) => pacote.lotes.find((l) => l.id === id);

  const unidadesDe = (produtoId: string | null): string[] => {
    const p = produto(produtoId);
    if (!p) return [];
    return [...new Set([p.unidadeAplicacao, p.unidade].filter((u): u is string => !!u))];
  };

  const abrir = (indice = -1) => {
    setErro('');
    if (indice >= 0) return setForm({ ...produtos[indice], indice });
    const primeiro = pacote.produtos[0];
    setForm({
      produtoId: primeiro?.produtoId ?? '',
      estoqueLoteId: null,
      quantidade: '',
      unidade: primeiro ? unidadesDe(primeiro.produtoId)[0] ?? null : null,
      indice: -1,
    });
  };

  const salvar = () => {
    if (!form) return;
    if (!form.produtoId) return setErro('Selecione o produto.');
    if (!form.estoqueLoteId) return setErro('O lote é obrigatório.');
    if (!(numeroDigitado(form.quantidade) > 0)) return setErro('Informe a quantidade aplicada.');
    const { indice, ...item } = form;
    onChange(indice >= 0 ? produtos.map((p, i) => (i === indice ? item : p)) : [...produtos, item]);
    setForm(null);
  };

  const opcoesProduto: Opcao<string>[] = pacote.produtos.map((p) => ({
    valor: p.produtoId,
    rotulo: p.nome,
    detalhe: p.previsto ? 'Previsto na OS' : undefined,
  }));
  const lotesDoProduto = form ? pacote.lotes.filter((l) => l.produtoId === form.produtoId) : [];
  const opcoesLote: Opcao<string>[] = lotesDoProduto.map((l) => ({
    valor: l.id,
    rotulo: `Lote ${l.lote}`,
    detalhe: [l.validade ? `vence ${brDate(l.validade)}` : null, `saldo ${l.quantidade.toLocaleString('pt-BR')} ${produto(l.produtoId)?.unidade ?? ''}`]
      .filter(Boolean).join(' · '),
  }));

  return (
    <View>
      <Text style={s.intro}>Registre o que foi aplicado. O lote é obrigatório.</Text>

      {!pacote.base ? (
        <Aviso icone="warning-amber" style={{ marginBottom: 12 }}>
          Seu cadastro não tem base de estoque. Peça ao escritório para definir a sua base — sem ela não há lote para escolher.
        </Aviso>
      ) : null}

      <View style={{ gap: 10 }}>
        {produtos.map((p, i) => (
          <Cartao key={`${p.produtoId}-${p.estoqueLoteId}-${i}`} style={{ paddingVertical: 14 }}>
            <View style={s.itemLinha}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.itemNome}>{produto(p.produtoId)?.nome ?? 'Produto'}</Text>
                <Text style={s.itemDetalhe}>Lote {lote(p.estoqueLoteId)?.lote ?? '—'} · {p.quantidade} {p.unidade ?? produto(p.produtoId)?.unidade ?? ''}</Text>
              </View>
              <Pressable hitSlop={6} onPress={() => abrir(i)} style={s.icone}><MaterialIcons name="edit" size={18} color={colors.neutral500} /></Pressable>
              <Pressable hitSlop={6} onPress={() => onChange(produtos.filter((_, j) => j !== i))} style={s.icone}>
                <MaterialIcons name="delete-outline" size={19} color={colors.neutral500} />
              </Pressable>
            </View>
          </Cartao>
        ))}
      </View>

      {produtos.length === 0 && !form ? (
        <View style={s.vazio}>
          <MaterialIcons name="science" size={30} color={tons.iconeApagado} />
          <Text style={s.vazioTexto}>Nenhum produto registrado.</Text>
        </View>
      ) : null}

      {!form ? (
        <BotaoContorno verde icone="add" rotulo="Adicionar produto" onPress={() => abrir()} style={{ marginTop: 12 }} />
      ) : (
        <Cartao style={{ marginTop: 12, gap: 12 }}>
          <Text style={s.formTitulo}>{form.indice >= 0 ? 'Editar produto' : 'Novo produto'}</Text>
          <CampoEscolha
            rotulo="Produto" valor={form.produtoId || null} opcoes={opcoesProduto}
            onChange={(v) => setForm({ ...form, produtoId: v, estoqueLoteId: null, unidade: unidadesDe(v)[0] ?? null })}
          />
          <CampoEscolha
            rotulo="Lote" valor={form.estoqueLoteId} opcoes={opcoesLote}
            vazio={lotesDoProduto.length ? 'Escolha o lote' : 'Nenhum lote deste produto na sua base'}
            desabilitado={lotesDoProduto.length === 0}
            invalido={!!erro && !form.estoqueLoteId}
            onChange={(v) => setForm({ ...form, estoqueLoteId: v })}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.campoRotulo}>Quantidade</Text>
              <TextInput
                value={form.quantidade} onChangeText={(v) => setForm({ ...form, quantidade: v.replace(/[^0-9.,]/g, '') })}
                keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.neutral400}
                style={[estilos.campo, s.input, !!erro && !(numeroDigitado(form.quantidade) > 0) && { borderColor: colors.danger }]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <CampoEscolha
                rotulo="Unidade" valor={form.unidade}
                opcoes={unidadesDe(form.produtoId).map((u) => ({ valor: u, rotulo: u }))}
                onChange={(v) => setForm({ ...form, unidade: v })}
              />
            </View>
          </View>
          {erro ? <Erro>{erro}</Erro> : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <BotaoContorno rotulo="Cancelar" onPress={() => { setForm(null); setErro(''); }} style={{ flex: 1, height: 46 }} />
            <Pressable onPress={salvar} style={({ pressed }) => [s.salvar, pressed && { opacity: 0.9 }]}>
              <Text style={s.salvarTexto}>Salvar</Text>
            </Pressable>
          </View>
        </Cartao>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  intro: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.neutral500, marginBottom: 14, lineHeight: 20 },
  itemLinha: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemNome: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.ink },
  itemDetalhe: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.neutral400, marginTop: 3 },
  icone: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: '#eeeff1', alignItems: 'center', justifyContent: 'center' },
  vazio: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  vazioTexto: { fontFamily: fonts.regular, fontSize: 14, color: colors.neutral500 },
  formTitulo: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  input: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  salvar: { flex: 1, height: 46, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  salvarTexto: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
});
