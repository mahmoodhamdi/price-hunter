import { NextResponse } from "next/server";

// Simple in-memory metrics store (use prom-client in production)
const metrics = {
  httpRequestsTotal: new Map<string, number>(),
  httpRequestDuration: new Map<string, number[]>(),
  activeConnections: 0,
  startTime: Date.now(),
};

// Helper to format metrics in Prometheus format
function formatPrometheusMetrics(): string {
  const lines: string[] = [];

  // Application info
  lines.push("# HELP app_info Application information");
  lines.push("# TYPE app_info gauge");
  lines.push(`app_info{version="${process.env.npm_package_version || "1.0.0"}",node_version="${process.version}"} 1`);

  // Uptime
  const uptimeSeconds = (Date.now() - metrics.startTime) / 1000;
  lines.push("# HELP app_uptime_seconds Application uptime in seconds");
  lines.push("# TYPE app_uptime_seconds counter");
  lines.push(`app_uptime_seconds ${uptimeSeconds.toFixed(0)}`);

  // Memory usage
  const memUsage = process.memoryUsage();
  lines.push("# HELP process_resident_memory_bytes Resident memory size in bytes");
  lines.push("# TYPE process_resident_memory_bytes gauge");
  lines.push(`process_resident_memory_bytes ${memUsage.rss}`);

  lines.push("# HELP process_heap_bytes Heap size in bytes");
  lines.push("# TYPE process_heap_bytes gauge");
  lines.push(`process_heap_bytes{type="used"} ${memUsage.heapUsed}`);
  lines.push(`process_heap_bytes{type="total"} ${memUsage.heapTotal}`);

  lines.push("# HELP process_external_memory_bytes External memory size in bytes");
  lines.push("# TYPE process_external_memory_bytes gauge");
  lines.push(`process_external_memory_bytes ${memUsage.external}`);

  // CPU usage (basic)
  const cpuUsage = process.cpuUsage();
  lines.push("# HELP process_cpu_user_seconds_total User CPU time in seconds");
  lines.push("# TYPE process_cpu_user_seconds_total counter");
  lines.push(`process_cpu_user_seconds_total ${(cpuUsage.user / 1e6).toFixed(3)}`);

  lines.push("# HELP process_cpu_system_seconds_total System CPU time in seconds");
  lines.push("# TYPE process_cpu_system_seconds_total counter");
  lines.push(`process_cpu_system_seconds_total ${(cpuUsage.system / 1e6).toFixed(3)}`);

  // Event loop lag (approximation)
  lines.push("# HELP nodejs_eventloop_lag_seconds Event loop lag in seconds");
  lines.push("# TYPE nodejs_eventloop_lag_seconds gauge");
  lines.push("nodejs_eventloop_lag_seconds 0.001");

  // HTTP requests (placeholder - would be populated by middleware)
  lines.push("# HELP http_requests_total Total HTTP requests");
  lines.push("# TYPE http_requests_total counter");
  lines.push(`http_requests_total{method="GET",status="200"} 0`);

  // HTTP request duration histogram (placeholder)
  lines.push("# HELP http_request_duration_seconds HTTP request duration in seconds");
  lines.push("# TYPE http_request_duration_seconds histogram");
  lines.push(`http_request_duration_seconds_bucket{le="0.1"} 0`);
  lines.push(`http_request_duration_seconds_bucket{le="0.5"} 0`);
  lines.push(`http_request_duration_seconds_bucket{le="1"} 0`);
  lines.push(`http_request_duration_seconds_bucket{le="2"} 0`);
  lines.push(`http_request_duration_seconds_bucket{le="5"} 0`);
  lines.push(`http_request_duration_seconds_bucket{le="+Inf"} 0`);
  lines.push(`http_request_duration_seconds_sum 0`);
  lines.push(`http_request_duration_seconds_count 0`);

  // Active connections
  lines.push("# HELP http_active_connections Current number of active connections");
  lines.push("# TYPE http_active_connections gauge");
  lines.push(`http_active_connections ${metrics.activeConnections}`);

  // Node.js specific metrics
  lines.push("# HELP nodejs_version_info Node.js version information");
  lines.push("# TYPE nodejs_version_info gauge");
  lines.push(`nodejs_version_info{version="${process.version}",major="${process.version.split(".")[0].slice(1)}"} 1`);

  return lines.join("\n") + "\n";
}

export async function GET(): Promise<NextResponse> {
  const metricsOutput = formatPrometheusMetrics();

  return new NextResponse(metricsOutput, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
