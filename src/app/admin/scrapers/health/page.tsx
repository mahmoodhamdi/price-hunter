import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Scraper health dashboard (Phase 5 — operational visibility).
 *
 * For each enabled store: count of scrape jobs in the last 24 hours,
 * success rate, last successful run, and last error. The cron-driven
 * canary scrape (recommended every 1h) populates these rows; absent
 * recent runs, a store is flagged "stale".
 */
export const dynamic = "force-dynamic";

interface StoreHealth {
  storeId: string;
  storeSlug: string;
  storeName: string;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  successRate: number;
  lastSuccess: Date | null;
  lastError: { at: Date; message: string } | null;
  degraded: boolean;
}

const WINDOW_HOURS = 24;

async function loadHealth(): Promise<StoreHealth[]> {
  const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000);
  const stores = await prisma.store.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const rows = await Promise.all(
    stores.map(async (s) => {
      const [total, success, failed, lastSuccess, lastFailedJob] =
        await Promise.all([
          prisma.scrapeJob.count({
            where: { storeId: s.id, createdAt: { gte: since } },
          }),
          prisma.scrapeJob.count({
            where: {
              storeId: s.id,
              createdAt: { gte: since },
              status: "COMPLETED",
            },
          }),
          prisma.scrapeJob.count({
            where: {
              storeId: s.id,
              createdAt: { gte: since },
              status: "FAILED",
            },
          }),
          prisma.scrapeJob.findFirst({
            where: { storeId: s.id, status: "COMPLETED" },
            orderBy: { completedAt: "desc" },
            select: { completedAt: true },
          }),
          prisma.scrapeJob.findFirst({
            where: { storeId: s.id, status: "FAILED" },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true, error: true },
          }),
        ]);

      const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
      return {
        storeId: s.id,
        storeSlug: s.slug,
        storeName: s.name,
        totalRuns: total,
        successRuns: success,
        failedRuns: failed,
        successRate,
        lastSuccess: lastSuccess?.completedAt ?? null,
        lastError: lastFailedJob
          ? {
              at: lastFailedJob.createdAt,
              message: lastFailedJob.error?.slice(0, 200) ?? "(no message)",
            }
          : null,
        degraded: total > 0 && successRate < 50,
      };
    })
  );

  return rows;
}

export default async function ScrapersHealthPage() {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    (session.user as { role?: string }).role !== "ADMIN"
  ) {
    redirect("/login?callbackUrl=/admin/scrapers/health");
  }

  const rows = await loadHealth();
  const degradedCount = rows.filter((r) => r.degraded).length;
  const staleCount = rows.filter((r) => r.totalRuns === 0).length;

  return (
    <div className="container mx-auto py-10 px-4 max-w-6xl">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Scraper Health</h1>
          <p className="text-muted-foreground mt-1">
            Last {WINDOW_HOURS} hours · {rows.length} active stores
          </p>
        </div>
        <Link
          href="/admin/scrape-jobs"
          className="text-sm underline text-muted-foreground hover:text-foreground"
        >
          See raw job log →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat
          label="Active stores"
          value={rows.length}
          tone="default"
        />
        <Stat
          label="Healthy"
          value={rows.length - degradedCount - staleCount}
          tone="ok"
        />
        <Stat
          label="Degraded"
          value={degradedCount}
          tone={degradedCount > 0 ? "warn" : "default"}
        />
        <Stat
          label="No recent runs"
          value={staleCount}
          tone={staleCount > 0 ? "warn" : "default"}
        />
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-2">Store</th>
              <th className="text-right px-4 py-2">Runs ({WINDOW_HOURS}h)</th>
              <th className="text-right px-4 py-2">Success</th>
              <th className="text-right px-4 py-2">Failed</th>
              <th className="text-right px-4 py-2">Success rate</th>
              <th className="text-left px-4 py-2">Last success</th>
              <th className="text-left px-4 py-2">Last error</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.storeId}
                className={`border-t ${r.degraded ? "bg-rose-50/40 dark:bg-rose-950/20" : ""}`}
              >
                <td className="px-4 py-2 font-medium">
                  {r.storeName}
                  <span className="text-xs text-muted-foreground font-mono ml-2">
                    {r.storeSlug}
                  </span>
                  {r.degraded && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-rose-500 text-white">
                      degraded
                    </span>
                  )}
                  {r.totalRuns === 0 && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-muted-foreground/20 text-muted-foreground">
                      stale
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right font-mono">{r.totalRuns}</td>
                <td className="px-4 py-2 text-right font-mono text-emerald-700 dark:text-emerald-400">
                  {r.successRuns}
                </td>
                <td className="px-4 py-2 text-right font-mono text-rose-700 dark:text-rose-400">
                  {r.failedRuns}
                </td>
                <td className="px-4 py-2 text-right font-mono">
                  {r.totalRuns === 0 ? "—" : `${r.successRate}%`}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {r.lastSuccess
                    ? new Date(r.lastSuccess).toLocaleString()
                    : "never"}
                </td>
                <td
                  className="px-4 py-2 text-xs text-muted-foreground max-w-md truncate"
                  title={r.lastError?.message}
                >
                  {r.lastError
                    ? `${new Date(r.lastError.at).toLocaleDateString()} · ${r.lastError.message}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "ok" | "warn";
}) {
  const ring =
    tone === "ok"
      ? "ring-1 ring-emerald-500/40 bg-emerald-500/5"
      : tone === "warn"
        ? "ring-1 ring-amber-500/40 bg-amber-500/5"
        : "";
  return (
    <div className={`border rounded-lg p-4 ${ring}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
