// Permite ao `node --test` importar módulos dos apps como o bundler importa.
//
// O Node roda TypeScript direto (strip-types), mas resolve caminhos como Node:
// exige extensão e não conhece o atalho `@/`. Os apps escrevem
// `import ... from '@/lib/monitoramento'`, que o Vite e o Metro entendem. Este
// gancho traduz:
//   - `@/x`  → `apps/<app>/src/x`, com `<app>` tirado de quem importa;
//   - `./x`  → `./x.ts` (ou `.tsx`, ou `/index.ts`) quando não há extensão.
//
// Só serve a testes de módulos PUROS. Módulo que importa react-native ou
// supabase não roda fora do app, e é por isso que as regras ficam separadas.
//
// E declara como ESM TypeScript todo `.ts` dos apps: o package.json do App
// não é "type": "module" (o babel.config.js é CommonJS), e sem isto o Node
// avisa a cada arquivo que precisou adivinhar o formato.
//
// Uso: node --import ./scripts/testes/registrar.mjs --test "<padrão>"

import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const EXTENSOES = ['.ts', '.tsx', '/index.ts'];

function comExtensao(base) {
  if (existsSync(base) && !base.endsWith('/')) {
    // Caminho exato existe e é arquivo com extensão: usa como está.
    if (path.extname(base)) return base;
  }
  for (const ext of EXTENSOES) {
    if (existsSync(base + ext)) return base + ext;
  }
  return null;
}

export async function resolve(especificador, contexto, proximo) {
  const pai = contexto.parentURL ? fileURLToPath(contexto.parentURL) : null;

  if (especificador.startsWith('@/') && pai) {
    const m = pai.match(/^(.*\/apps\/[^/]+\/src)\//);
    if (m) {
      const alvo = comExtensao(path.join(m[1], especificador.slice(2)));
      if (alvo) return proximo(pathToFileURL(alvo).href, contexto);
    }
  }

  if ((especificador.startsWith('./') || especificador.startsWith('../')) && pai && !path.extname(especificador)) {
    const alvo = comExtensao(path.resolve(path.dirname(pai), especificador));
    if (alvo) return proximo(pathToFileURL(alvo).href, contexto);
  }

  return proximo(especificador, contexto);
}

export async function load(url, contexto, proximo) {
  if (url.startsWith('file:') && url.includes('/apps/') && /\.tsx?$/.test(url)) {
    return proximo(url, { ...contexto, format: 'module-typescript' });
  }
  return proximo(url, contexto);
}
