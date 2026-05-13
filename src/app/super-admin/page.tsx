import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Super-Admin Panel (Phase 9 — multi-tenant SaaS)
 *
 * Gated to the SUPER_ADMIN role. This stub renders a summary table of
 * tenants and their subscriptions. Full management UI (create / suspend /
 * impersonate / billing) is intentionally out of scope for the open-source
 * tier — the multi-tenant SaaS License ($20K) ships the full UI.
 */
export default async function SuperAdminPage() {
  const session = await getServerSession(authOptions);

  // SUPER_ADMIN is a future role; for now require regular ADMIN to access
  // this stub. The real product gates with a separate role/auth namespace.
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/login?callbackUrl=/super-admin");
  }

  const [tenantCount, activeTenants, tenants] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { subscription: true },
    }),
  ]);

  return (
    <div className="container mx-auto py-10 px-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-2">Super-Admin</h1>
      <p className="text-muted-foreground mb-8">
        Multi-tenant SaaS control plane. See{" "}
        <Link
          href="/docs/sales/one-pagers/multi-tenant-saas"
          className="underline"
        >
          the SaaS one-pager
        </Link>{" "}
        for what this tier includes.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold">{tenantCount}</div>
          <div className="text-sm text-muted-foreground">Total tenants</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold">{activeTenants}</div>
          <div className="text-sm text-muted-foreground">Active</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold">
            {tenantCount - activeTenants}
          </div>
          <div className="text-sm text-muted-foreground">Inactive</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold">
            {
              tenants.filter(
                (t) => t.subscription?.status === "active"
              ).length
            }
          </div>
          <div className="text-sm text-muted-foreground">Paying</div>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-2">Slug</th>
              <th className="text-left px-4 py-2">Edition</th>
              <th className="text-left px-4 py-2">Plan</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Owner</th>
              <th className="text-left px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {tenants.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No tenants yet. Use{" "}
                  <code className="bg-muted px-1 rounded">
                    scripts/onboard-tenant.sh
                  </code>{" "}
                  to create one.
                </td>
              </tr>
            ) : (
              tenants.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-2 font-mono">{t.slug}</td>
                  <td className="px-4 py-2">{t.edition}</td>
                  <td className="px-4 py-2">{t.plan}</td>
                  <td className="px-4 py-2">{t.status}</td>
                  <td className="px-4 py-2">{t.ownerEmail}</td>
                  <td className="px-4 py-2">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
