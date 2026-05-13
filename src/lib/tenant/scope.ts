import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Tenant scope (Phase 9 — multi-tenant SaaS).
 *
 * Resolve the calling tenant from the request host, then run the rest of
 * the request inside `withTenantScope(tenantId, () => ...)`. Service-layer
 * code reads the current tenant via `getCurrentTenantId()` and adds it to
 * queries where the model is tenant-scoped.
 *
 * Single-tenant deployments simply never enter a scope — `getCurrentTenantId`
 * returns `null` and queries behave exactly as before.
 */

interface TenantContext {
  tenantId: string;
  slug: string;
  edition: string;
}

const storage = new AsyncLocalStorage<TenantContext>();

export function withTenantScope<T>(ctx: TenantContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getCurrentTenantId(): string | null {
  return storage.getStore()?.tenantId ?? null;
}

export function getCurrentTenant(): TenantContext | null {
  return storage.getStore() ?? null;
}

/**
 * Models whose rows belong to a specific tenant. Adding a model here means
 * the Prisma middleware must scope its reads/writes to the current tenant.
 *
 * Initially conservative — only the per-tenant business data. Stores,
 * exchange rates, and shared product catalog are NOT tenant-scoped so they
 * stay shared infrastructure.
 */
export const TENANT_SCOPED_MODELS = new Set([
  "User",
  "Wishlist",
  "PriceAlert",
  "SearchHistory",
  "AffiliateClick",
  "CashbackTransaction",
  "StockNotification",
  "StoreReview",
  "ReviewHelpful",
  "BarcodeScan",
  "ShoppingList",
  "ShoppingListItem",
]);
