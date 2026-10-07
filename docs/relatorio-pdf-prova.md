# Prova de PDF do relatório técnico (Release 4, Fase 3 — PR 20)

**Pergunta:** dá para gerar o PDF do relatório técnico numa Edge Function da
Supabase, dentro do limite de CPU (2 s por requisição), ou é preciso um
renderizador externo (plano B do plano da release)?

**Resposta:** dá, **desde que as fotos cheguem reduzidas**. O App passa a reduzir
cada foto para 1600 px no lado maior ao capturar (`reducaoDaFoto` em
`apps/mobile-operador/src/lib/execucao/regras.ts`).

## Como foi medido

- Gerador sintético em `scripts/relatorio-pdf/relatorio-sintetico.ts`. Usa o
  mesmo pdfmake 0.2.20 do certificado e segue a estrutura aprovada:
  - blocos por área × serviço (2 áreas × 5 serviços);
  - grade de pontos × 12 visitas com o código de status colorido;
  - gráfico de tendência e comparativo em SVG;
  - galeria de fotos, com cada foto embutida separadamente.
- Medição local: `deno run -A scripts/relatorio-pdf/medir.ts [foto.jpg]`.
- Medição no runtime real: o mesmo gerador foi publicado numa função
  temporária (`relatorio-prova`).
  - Não tinha acesso a banco nem a dado de cliente e só respondia com um token
    aleatório.
  - Foi chamada várias vezes e **removida logo depois** (07/10/2026).

## Resultados no runtime da Supabase (07/10/2026)

Tempo de geração do PDF dentro da função (sem rede):

| Relatório | Páginas | Fotos | Foto usada | PDF | Tempo |
|---|---|---|---|---|---|
| médio | 26 | 24 | ~1600 px, 270 KB | 6,5 MB | ~0,6 s |
| pesado | 32 | 48 | ~1600 px, 270 KB | 12,8 MB | ~0,9 s |
| médio | 24 | 24 | 12 MP, 740 KB | 17,1 MB | ~0,7 s |
| pesado | 28 | 48 | 12 MP, 740 KB | 34,1 MB | ~1,3 s |

Localmente (Apple Silicon) os mesmos casos levam de 0,3 a 0,5 s. O runtime da
Supabase ficou cerca de 2× mais lento.

## Conclusões

1. **Texto, tabelas e gráficos custam pouco.** 20 a 30 páginas de grade e
   gráficos ficam bem abaixo de 1 s.
2. **Foto é o que pesa,** em tamanho e em tempo. A foto de 12 MP do teste tinha
   740 KB porque a imagem de origem comprime bem. Foto real de celular em
   qualidade 0,6 costuma ter 2 a 4 MB. Com 48 fotos assim:
   - o PDF passaria de 100 MB, inviável de enviar por e-mail;
   - a geração encostaria nos limites de CPU e de memória da função.
3. **Decisão:**
   - o App reduz a foto na captura (1600 px, JPEG 0,7), o que também deixa o
     envio da execução mais leve com sinal ruim;
   - o relatório usa as fotos já reduzidas.

   Renderizador externo não é necessário.
4. **Fotos antigas, de antes da redução:** no relatório entram só as fotos
   marcadas para a galeria. Se aparecer foto grande do fluxo antigo, a função
   deve limitar a quantidade por relatório em vez de arriscar o limite.
   **[A DEFINIR — teto de fotos por relatório, a fixar quando a galeria for
   implementada (PR 24).]**

## Ainda a medir na implementação real (PRs 21 a 24)

- **Leitura dos dados e download das fotos do storage:** entram no tempo de
  relógio (limite de 150 s), não no de CPU. Baixar em paralelo.
- **Relatórios anuais consolidados** (12 visitas × todos os pontos):
  repetir esta medição com dados reais quando houver um ano de execuções.
