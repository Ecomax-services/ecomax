/**
 * PDF com o pdfmake (build de navegador, que roda no Deno sem arquivos de
 * fonte: a Roboto vem embutida no `vfs_fonts`). Um certificado de uma página
 * leva ~100 ms de CPU, longe do limite da Edge Function.
 */
import pdfMake from 'npm:pdfmake@0.2.20/build/pdfmake.js';
import pdfFonts from 'npm:pdfmake@0.2.20/build/vfs_fonts.js';

// deno-lint-ignore no-explicit-any
const pm = pdfMake as any;
// deno-lint-ignore no-explicit-any
const fontes = pdfFonts as any;
pm.vfs = fontes.pdfMake?.vfs ?? fontes.vfs ?? fontes;

export function gerarPdf(definicao: unknown): Promise<Uint8Array<ArrayBuffer>> {
  return new Promise((resolve, reject) => {
    try {
      pm.createPdf(definicao).getBuffer((b: Uint8Array) => resolve(new Uint8Array(b)));
    } catch (e) {
      reject(e);
    }
  });
}

export async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
