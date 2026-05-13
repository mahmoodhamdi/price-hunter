#!/usr/bin/env bash
set -euo pipefail

# Builds the 12 single-SKU editions (3 countries x 4 verticals).
# To build all 20 SKUs including bundles, set INCLUDE_BUNDLES=1.

COUNTRIES=(ksa eg uae)
VERTICALS=(electronics fashion grocery pharma)

if [[ "${INCLUDE_BUNDLES:-0}" == "1" ]]; then
  COUNTRIES+=(all)
  VERTICALS+=(general)
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

START_TS=$(date +%s)
FAILED=()
SUCCEEDED=()

for c in "${COUNTRIES[@]}"; do
  for v in "${VERTICALS[@]}"; do
    EDITION="${c}-${v}"
    echo ""
    echo "############################################################"
    echo "# Building ${EDITION}"
    echo "############################################################"
    if ./scripts/build-edition.sh "$c" "$v"; then
      SUCCEEDED+=("$EDITION")
    else
      FAILED+=("$EDITION")
    fi
  done
done

END_TS=$(date +%s)
DURATION=$((END_TS - START_TS))

echo ""
echo "==========================================================="
echo "Build matrix complete in ${DURATION}s"
echo "  Succeeded: ${#SUCCEEDED[@]} / $((${#SUCCEEDED[@]} + ${#FAILED[@]}))"
[[ ${#SUCCEEDED[@]} -gt 0 ]] && printf '    + %s\n' "${SUCCEEDED[@]}"
[[ ${#FAILED[@]} -gt 0 ]] && {
  printf '    - %s (FAILED)\n' "${FAILED[@]}"
  exit 1
}
