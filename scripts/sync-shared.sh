#!/usr/bin/env bash
#
# Copia os módulos compartilhados de shared/ para os três apps.
#
# Mesma mecânica de scripts/gen-types.sh, pelo mesmo motivo: ainda não há
# workspace na raiz — cada app tem seu package.json, e Vite e Metro resolvem
# fora do root de formas diferentes. A duplicação é deliberada e o CI é quem
# garante que as cópias não divirjam; tudo isso colapsa num pacote compartilhado
# quando packages/core existir.
#
# Edite sempre o arquivo em shared/, rode este script, e commite as quatro
# versões juntas.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APPS=(web-backoffice web-portal-cliente mobile-operador)

# nome-na-raiz:caminho-dentro-do-app
MODULOS=(
  "statusOs.ts:src/lib/statusOs.ts"
)

for par in "${MODULOS[@]}"; do
  origem="${par%%:*}"
  destino="${par#*:}"
  echo "shared/$origem"
  for app in "${APPS[@]}"; do
    cp "$RAIZ/shared/$origem" "$RAIZ/apps/$app/$destino"
    echo "  → apps/$app/$destino"
  done
done

echo "Pronto. Confira o diff antes de commitar."
