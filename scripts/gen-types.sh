#!/usr/bin/env bash
# Regenera os tipos do banco e distribui para os três apps.
#
# Rode depois de qualquer migration. O job `tipos` da CI falha se o arquivo
# versionado estiver defasado em relação ao schema, então esquecer de rodar isto
# aparece no pull request, não em produção.
set -euo pipefail

PROJETO="${SUPABASE_PROJECT_ID:-imnfcffmzzukabhsotul}"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
ALVO="$RAIZ/supabase/types/database.ts"

CABECALHO='// GERADO AUTOMATICAMENTE — não edite à mão.
//
// Origem: `supabase gen types typescript` sobre o schema public do projeto.
// Para atualizar depois de qualquer migration:  ./scripts/gen-types.sh
//
// As três cópias em apps/*/src/lib/database.types.ts são deste arquivo. A
// duplicação existe porque ainda não há workspace na raiz — cada app tem seu
// próprio package.json, e Vite e Metro resolvem fora do root de formas
// diferentes. O job de tipos da CI falha se as cópias divergirem, e tudo isso
// colapsa num pacote compartilhado quando packages/core existir.
'

echo "Gerando tipos do projeto $PROJETO…"
{ echo "$CABECALHO"; npx --yes supabase gen types typescript --project-id "$PROJETO" --schema public; } > "$ALVO"

for app in web-backoffice web-portal-cliente mobile-operador; do
  cp "$ALVO" "$RAIZ/apps/$app/src/lib/database.types.ts"
  echo "  → apps/$app/src/lib/database.types.ts"
done

echo "Pronto. Confira o diff antes de commitar."
