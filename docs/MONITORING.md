# Price Hunter - Monitoring Guide

This guide covers setting up and using the monitoring stack for Price Hunter.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Prometheus](#prometheus)
- [Grafana](#grafana)
- [Alerting](#alerting)
- [Logging](#logging)
- [Metrics Reference](#metrics-reference)
- [Dashboard Guide](#dashboard-guide)
- [Troubleshooting](#troubleshooting)

## Overview

The monitoring stack includes:
- **Prometheus** - Metrics collection and storage
- **Grafana** - Visualization and dashboards
- **Alertmanager** - Alert routing and notifications
- **Node Exporter** - Host system metrics
- **cAdvisor** - Container metrics
- **Loki** - Log aggregation (optional)

## Quick Start

```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Access dashboards
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001 (admin/admin)
```

## Prometheus

### Accessing Prometheus

- URL: `http://localhost:9090`
- No authentication by default

### Key Queries

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Response time (95th percentile)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Memory usage
process_resident_memory_bytes / 1024 / 1024

# CPU usage
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

### Configuration

Config file: `monitoring/prometheus/prometheus.yml`

```yaml
scrape_configs:
  - job_name: 'price-hunter-app'
    static_configs:
      - targets: ['app:3000']
```

### Retention

Default retention: 30 days

To change:
```yaml
command:
  - '--storage.tsdb.retention.time=90d'
```

## Grafana

### Accessing Grafana

- URL: `http://localhost:3001`
- Default credentials: `admin` / `admin`

### Pre-configured Dashboards

1. **Application Dashboard** - Request rates, response times, errors
2. **Infrastructure Dashboard** - CPU, memory, disk, network
3. **Database Dashboard** - PostgreSQL metrics
4. **Redis Dashboard** - Cache metrics

### Adding Dashboards

1. Go to Dashboards → Import
2. Enter dashboard ID from [grafana.com/dashboards](https://grafana.com/dashboards)
3. Select Prometheus data source

Recommended dashboards:
- Node Exporter: `1860`
- PostgreSQL: `9628`
- Redis: `763`
- Docker: `11467`

### Creating Alerts in Grafana

1. Edit panel → Alert tab
2. Define conditions
3. Configure notification channels

## Alerting

### Alert Rules

Configured in `monitoring/prometheus/alerts.yml`

### Alert Categories

1. **Application Alerts**
   - High error rate (>5%)
   - Slow response time (p95 > 2s)
   - Application down

2. **Database Alerts**
   - PostgreSQL down
   - High connections (>80)
   - Slow queries

3. **Redis Alerts**
   - Redis down
   - High memory usage (>80%)
   - High key eviction

4. **Infrastructure Alerts**
   - High CPU (>80%)
   - High memory (>85%)
   - Low disk space (<20%)
   - Container restarts

### Notification Channels

Configure in `monitoring/alertmanager/alertmanager.yml`:

```yaml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/xxx'
        channel: '#alerts'

  - name: 'email'
    email_configs:
      - to: 'team@example.com'
        from: 'alertmanager@example.com'
        smarthost: 'smtp.example.com:587'
```

## Logging

### Using Loki (Optional)

```bash
# Start with logging profile
docker-compose -f docker-compose.monitoring.yml --profile logs up -d
```

### Querying Logs

In Grafana:
1. Add Loki data source
2. Go to Explore
3. Use LogQL queries:

```logql
# All app logs
{job="price-hunter"}

# Error logs
{job="price-hunter"} |= "error"

# JSON parsing
{job="price-hunter"} | json | level="error"
```

### Log Retention

Default: 7 days

Configure in `monitoring/loki/loki-config.yml`:
```yaml
table_manager:
  retention_deletes_enabled: true
  retention_period: 168h
```

## Metrics Reference

### Application Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | Request duration |
| `http_active_connections` | Gauge | Active connections |
| `app_uptime_seconds` | Counter | Application uptime |
| `process_resident_memory_bytes` | Gauge | Memory usage |
| `process_heap_bytes` | Gauge | Heap size |

### System Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `node_cpu_seconds_total` | Counter | CPU time |
| `node_memory_MemAvailable_bytes` | Gauge | Available memory |
| `node_filesystem_avail_bytes` | Gauge | Available disk space |
| `node_network_receive_bytes_total` | Counter | Network received |

### Database Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `pg_up` | Gauge | PostgreSQL status |
| `pg_stat_activity_count` | Gauge | Active connections |
| `pg_database_size_bytes` | Gauge | Database size |

### Redis Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `redis_up` | Gauge | Redis status |
| `redis_memory_used_bytes` | Gauge | Memory usage |
| `redis_connected_clients` | Gauge | Connected clients |
| `redis_evicted_keys_total` | Counter | Evicted keys |

## Dashboard Guide

### Application Dashboard

**Request Rate Panel**
- Shows requests per second
- Grouped by method and path
- Use to identify traffic patterns

**Response Time Panel**
- 95th and 50th percentile
- Target: p95 < 500ms
- Spikes indicate performance issues

**Error Rate Panel**
- 5xx errors percentage
- Target: < 1%
- Alerts at > 5%

**Status Indicators**
- App, Database, Redis status
- Green = healthy, Red = down

### Infrastructure Dashboard

**CPU Usage**
- Per-core usage
- Average across cores
- Alert at > 80%

**Memory Usage**
- Used vs Available
- Swap usage
- Alert at > 85%

**Disk Usage**
- Per-mount usage
- I/O operations
- Alert at > 80%

## Troubleshooting

### Prometheus Not Scraping

```bash
# Check targets
curl http://localhost:9090/api/v1/targets

# Verify app metrics endpoint
curl http://localhost:3000/api/metrics
```

### Grafana Can't Connect to Prometheus

1. Check Prometheus is running: `docker-compose ps prometheus`
2. Verify network: `docker network ls`
3. Check data source URL: `http://prometheus:9090`

### Missing Metrics

1. Verify exporter is running
2. Check Prometheus config
3. Verify service discovery

### High Cardinality

If Prometheus memory is high:
1. Reduce label cardinality
2. Increase scrape interval
3. Use recording rules

### Alert Fatigue

1. Adjust thresholds
2. Add inhibition rules
3. Use alert grouping

## Best Practices

1. **Set appropriate retention** - Balance storage vs history needs
2. **Use recording rules** - Pre-compute expensive queries
3. **Organize dashboards** - Group by service/function
4. **Test alerts** - Verify notifications work
5. **Monitor the monitors** - Set up meta-monitoring

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Examples](https://prometheus.io/docs/prometheus/latest/querying/examples/)
- [Awesome Prometheus Alerts](https://awesome-prometheus-alerts.grep.to/)
