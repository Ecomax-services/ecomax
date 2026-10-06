// Registra o resolvedor de `@/` e de importações sem extensão para o `node --test`.
// Ver resolver-ts.mjs.
import { register } from 'node:module';

register('./resolver-ts.mjs', import.meta.url);
