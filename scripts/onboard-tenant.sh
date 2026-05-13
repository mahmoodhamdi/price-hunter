#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<EOF
Usage: $0 <slug> <edition> <owner-email>

Onboards a new tenant in multi-tenant SaaS mode.

  slug         Unique tenant identifier (e.g. "acme-corp")
  edition      Edition slug to provision (e.g. "ksa-electronics")
  owner-email  Email of the tenant owner (becomes their admin account)

Example: $0 acme-corp ksa-electronics admin@acme-corp.com
EOF
  exit 1
}

[[ $# -eq 3 ]] || usage

SLUG="$1"
EDITION="$2"
EMAIL="$3"

# Validate slug
[[ "$SLUG" =~ ^[a-z][a-z0-9-]{1,32}$ ]] || { echo "Invalid slug (must be lowercase alphanumeric with hyphens, 2-33 chars)"; exit 1; }
[[ "$EMAIL" =~ ^[^@]+@[^@]+\.[^@]+$ ]] || { echo "Invalid email"; exit 1; }

DATABASE_URL="${DATABASE_URL:?DATABASE_URL must be set}"
BASE_DOMAIN="${NEXT_PUBLIC_TENANT_BASE_DOMAIN:-pricehunter.app}"

echo "==> Creating tenant ${SLUG} on edition ${EDITION} for ${EMAIL}"

npx tsx <<TSEOF
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

(async () => {
  const tenant = await prisma.tenant.create({
    data: {
      slug: "${SLUG}",
      edition: "${EDITION}",
      ownerEmail: "${EMAIL}",
      plan: "TRIAL",
      status: "ACTIVE",
    },
  });
  console.log("Tenant id:", tenant.id);
  await prisma.\$disconnect();
})();
TSEOF

echo ""
echo "==> DNS instructions:"
echo "   Add a CNAME for ${SLUG}.${BASE_DOMAIN} → (your load balancer hostname)"
echo "   Or, if using a custom domain, ask the tenant to add a CNAME for"
echo "   their domain pointing at the load balancer, then run:"
echo "   psql \$DATABASE_URL -c \"UPDATE tenants SET \\\"customDomain\\\" = '<their-domain>' WHERE slug = '${SLUG}';\""
echo ""
echo "==> Owner credentials:"
echo "   Email: ${EMAIL}"
echo "   The owner uses the standard /login flow. Send them a password-reset"
echo "   link via the admin UI or:"
echo "   curl -X POST https://${SLUG}.${BASE_DOMAIN}/api/auth/forgot-password \\"
echo "        -d '{\"email\":\"${EMAIL}\"}' -H 'Content-Type: application/json'"
