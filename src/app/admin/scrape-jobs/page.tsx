"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  AlertTriangle,
} from "lucide-react";

interface ScrapeJob {
  id: string;
  type: string;
  status: string;
  storeId: string | null;
  productId: string | null;
  itemsProcessed: number;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export default function AdminScrapeJobsPage() {
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    fetchJobs();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch("/api/admin/scrape-jobs");
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const triggerScrape = async (type: string) => {
    setTriggering(true);
    try {
      await fetch("/api/admin/scrape-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      fetchJobs();
    } catch (error) {
      console.error("Failed to trigger scrape:", error);
    } finally {
      setTriggering(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-5 w-5 text-success" />;
      case "FAILED":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "RUNNING":
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-success/10 text-success";
      case "FAILED":
        return "bg-destructive/10 text-destructive";
      case "RUNNING":
        return "bg-blue-500/10 text-blue-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const stats = {
    total: jobs.length,
    running: jobs.filter((j) => j.status === "RUNNING").length,
    completed: jobs.filter((j) => j.status === "COMPLETED").length,
    failed: jobs.filter((j) => j.status === "FAILED").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <RefreshCw className="h-8 w-8" />
          Scrape Jobs
        </h1>
        <div className="flex gap-2">
          <Button onClick={fetchJobs} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => triggerScrape("PRICE_CHECK")} disabled={triggering}>
            <Play className="h-4 w-4 mr-2" />
            Run Price Check
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-500">{stats.running}</div>
            <p className="text-sm text-muted-foreground">Running</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">{stats.completed}</div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
            <p className="text-sm text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(job.status)}
                    <div>
                      <p className="font-medium">{job.type.replace(/_/g, " ")}</p>
                      <p className="text-sm text-muted-foreground">
                        {job.itemsProcessed} items processed
                      </p>
                      {job.error && (
                        <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3" />
                          {job.error}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(job.createdAt).toLocaleString()}
                    </p>
                    {job.completedAt && (
                      <p className="text-xs text-muted-foreground">
                        Duration: {Math.round((new Date(job.completedAt).getTime() - new Date(job.startedAt!).getTime()) / 1000)}s
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No scrape jobs found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
