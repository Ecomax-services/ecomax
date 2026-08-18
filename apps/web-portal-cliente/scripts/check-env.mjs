// Falha o build quando falta variável de ambiente.
//
// Sem isto, o modo de falha é o pior possível: o Vite compila sem reclamar, o
// deploy fica verde, e o `throw` no topo de src/lib/supabase.ts derruba o app
// no primeiro import — o QA vê tela branca e nenhuma mensagem. Aqui a falha é
// vermelha no log do build, com o nome exato da variável.

import { loadEnv } from 'vite'

// loadEnv, e não process.env: localmente as variáveis vivem no arquivo .env, que
// o Node não carrega sozinho — checar process.env reprovaria todo build local.
// Na Vercel não há .env e loadEnv cai no process.env, que é onde as variáveis do
// projeto chegam. Assim a checagem enxerga exatamente o que o Vite vai enxergar.
const env = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), 'VITE_')

const OBRIGATORIAS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

const faltando = OBRIGATORIAS.filter((k) => !env[k]?.trim())

if (faltando.length > 0) {
  console.error('\n✖ Build interrompido: variáveis de ambiente faltando\n')
  for (const k of faltando) console.error(`   • ${k}`)
  console.error(
    '\n  Local:  copie .env.example para .env' +
      '\n  Vercel: Settings → Environment Variables (marque Production, Preview e Development)\n',
  )
  process.exit(1)
}

// A URL errada só aparece como falha de rede depois do login, então vale checar
// o formato aqui.
const url = env.VITE_SUPABASE_URL.trim()
if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/.test(url)) {
  console.error(`\n✖ VITE_SUPABASE_URL não parece uma URL de projeto Supabase: ${url}`)
  console.error('  Esperado algo como https://abcdefghijklm.supabase.co\n')
  process.exit(1)
}

console.log('✓ Variáveis de ambiente ok')
