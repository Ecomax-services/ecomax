// Mede o custo de gerar o relatório técnico sintético em PDF.
//
//   deno run -A scripts/relatorio-pdf/medir.ts [foto.jpg]
//
// Sem argumento usa uma foto do App. Para simular a câmera sem redução, passe
// um JPEG de 12 MP. A medição no runtime da Supabase foi feita publicando este
// mesmo gerador numa função temporária (ver docs/relatorio-pdf-prova.md).
import { gerar, relatorioSintetico } from './relatorio-sintetico.ts';

const caminho = Deno.args[0] ?? new URL('../../apps/mobile-operador/assets/forest-light.jpg', import.meta.url).pathname;
const bytes = await Deno.readFile(caminho);
let bin = '';
for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
const foto = `data:image/jpeg;base64,${btoa(bin)}`;

for (const escala of [0.5, 1, 2]) {
  const t0 = performance.now();
  const pdf = await gerar(relatorioSintetico(foto, escala));
  const ms = Math.round(performance.now() - t0);
  const paginas = (new TextDecoder('latin1').decode(pdf).match(/\/Type \/Page[^s]/g) ?? []).length;
  console.log(`escala ${escala}: ${paginas} páginas, ${Math.round(24 * escala)} fotos, ${(pdf.length / 1048576).toFixed(1)} MB, ${ms} ms`);
}
