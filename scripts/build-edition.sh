#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<EOF
Usage: $0 <country> <vertical>
  country: ksa | eg | uae | all
  vertical: electronics | fashion | grocery | pharma | general

Example: $0 ksa electronics
Output: .next-builds/<country>-<vertical>/
EOF
  exit 1
}

[[ $# -eq 2 ]] || usage

COUNTRY="$1"
VERTICAL="$2"
EDITION="${COUNTRY}-${VERTICAL}"

VALID_COUNTRIES=(ksa eg uae all)
VALID_VERTICALS=(electronics fashion grocery pharma general)

contains() {
  local needle="$1"
  shift
  for x in "$@"; do [[ "$x" == "$needle" ]] && return 0; done
  return 1
}

contains "$COUNTRY" "${VALID_COUNTRIES[@]}" || { echo "Invalid country: $COUNTRY"; usage; }
contains "$VERTICAL" "${VALID_VERTICALS[@]}" || { echo "Invalid vertical: $VERTICAL"; usage; }

OUT_DIR=".next-builds/${EDITION}"
mkdir -p "$OUT_DIR"

echo "==> Building edition: ${EDITION}"
echo "==> Output: ${OUT_DIR}"

NEXT_PUBLIC_EDITION="$EDITION" \
NEXT_PUBLIC_DEFAULT_COUNTRY="$COUNTRY" \
NEXT_PUBLIC_DEFAULT_VERTICAL="$VERTICAL" \
  npx next build

# Copy build output to edition-specific folder so multiple builds coexist
rm -rf "$OUT_DIR/.next"
cp -R .next "$OUT_DIR/.next"

echo "==> Built ${EDITION} -> ${OUT_DIR}/.next"
