import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Package,
  Store,
  Bell,
  TrendingUp,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";

async function getStats() {
  const [
    userCount,
    productCount,
    storeCount,
    activeAlertCount,
    triggeredAlertCount,
    recentJobs,
    todaySearches,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.store.count({ where: { isActive: true } }),
    prisma.priceAlert.count({ where: { isActive: true, triggered: false } }),
    prisma.priceAlert.count({ where: { triggered: true } }),
    prisma.scrapeJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.searchHistory.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  return {
    userCount,
    productCount,
    storeCount,
    activeAlertCount,
    triggeredAlertCount,
    recentJobs,
    todaySearches,
  };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const statCards = [
    { title: "Total Users", value: stats.userCount, icon: Users, color: "text-blue-500" },
    { title: "Products", value: stats.productCount, icon: Package, color: "text-green-500" },
    { title: "Active Stores", value: stats.storeCount, icon: Store, color: "text-purple-500" },
    { title: "Active Alerts", value: stats.activeAlertCount, icon: Bell, color: "text-orange-500" },
    { title: "Triggered Alerts", value: stats.triggeredAlertCount, icon: TrendingUp, color: "text-emerald-500" },
    { title: "Today's Searches", value: stats.todaySearches, icon: RefreshCw, color: "text-cyan-500" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Scrape Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Recent Scrape Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentJobs.length > 0 ? (
            <div className="space-y-4">
              {stats.recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {job.status === "COMPLETED" ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : job.status === "FAILED" ? (
                      <XCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />
                    )}
                    <div>
                      <p className="font-medium">{job.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {job.itemsProcessed} items processed
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        job.status === "COMPLETED"
                          ? "bg-success/10 text-success"
                          : job.status === "FAILED"
                          ? "bg-destructive/10 text-destructive"
                          : job.status === "RUNNING"
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {job.status}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(job.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No scrape jobs yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
