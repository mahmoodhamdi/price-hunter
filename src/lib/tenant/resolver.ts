import { prisma } from "@/lib/prisma";

/**
 * Resolve a tenant from an incoming request's host header.
 *
 * Resolution order:
 *   1. Exact match on `Tenant.customDomain` (e.g. `compare.acme-corp.com`)
 *   2. Match on `<slug>.<base-domain>` where the slug equals `Tenant.slug`
 *   3. null (single-tenant fallback)
 *
 * The base domain is read from `NEXT_PUBLIC_TENANT_BASE_DOMAIN`. If unset,
 * subdomain routing is disabled and only custom domains resolve.
 */
export interface ResolvedTenant {
  id: string;
  slug: string;
  edition: string;
  status: string;
}

export async function resolveTenantFromHost(
  host: string
): Promise<ResolvedTenant | null> {
  if (!host) return null;
  const normalized = host.toLowerCase().split(":")[0];

  // 1. Custom domain
  const byDomain = await prisma.tenant.findUnique({
    where: { customDomain: normalized },
    select: { id: true, slug: true, edition: true, status: true },
  });
  if (byDomain && byDomain.status !== "DELETED") return byDomain;

  // 2. Subdomain on the configured base domain
  const baseDomain = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN;
  if (baseDomain && normalized.endsWith(`.${baseDomain}`)) {
    const slug = normalized.slice(0, -1 * (`.${baseDomain}`.length));
    if (slug && !slug.includes(".")) {
      const bySlug = await prisma.tenant.findUnique({
        where: { slug },
        select: { id: true, slug: true, edition: true, status: true },
      });
      if (bySlug && bySlug.status !== "DELETED") return bySlug;
    }
  }

  return null;
}
