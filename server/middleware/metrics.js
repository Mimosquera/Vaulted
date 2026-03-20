import { logWarn } from './logger.js';

const LATENCY_BUCKETS = [50, 100, 250, 500, 1000];
const ALERT_WINDOW = Number(process.env.METRICS_ALERT_WINDOW || 200);
const ERROR_RATE_THRESHOLD_PCT = Number(process.env.METRICS_ERROR_RATE_ALERT_PCT || 5);
const AVG_LATENCY_THRESHOLD_MS = Number(process.env.METRICS_LATENCY_ALERT_MS || 800);
const ALERT_COOLDOWN_MS = Number(process.env.METRICS_ALERT_COOLDOWN_MS || 60000);

const state = {
  startedAt: Date.now(),
  totalRequests: 0,
  totalErrors: 0,
  totalLatencyMs: 0,
  latencyBuckets: {
    lte_50ms: 0,
    lte_100ms: 0,
    lte_250ms: 0,
    lte_500ms: 0,
    lte_1000ms: 0,
    gt_1000ms: 0,
  },
  byRoute: {},
  recentRequests: [],
  lastAlertAt: {
    errorRate: 0,
    latency: 0,
  },
};

function pushRecent(durationMs, is5xx) {
  state.recentRequests.push({ durationMs, is5xx });
  if (state.recentRequests.length > ALERT_WINDOW) {
    state.recentRequests.shift();
  }
}

function getRecentSummary() {
  const size = state.recentRequests.length;
  if (size === 0) {
    return { size: 0, errorRatePct: 0, avgLatencyMs: 0 };
  }

  let errorCount = 0;
  let latencyTotal = 0;

  for (const sample of state.recentRequests) {
    if (sample.is5xx) errorCount += 1;
    latencyTotal += sample.durationMs;
  }

  return {
    size,
    errorRatePct: Number(((errorCount / size) * 100).toFixed(2)),
    avgLatencyMs: Math.round(latencyTotal / size),
  };
}

function maybeEmitAlerts() {
  if (state.recentRequests.length < ALERT_WINDOW) return;

  const now = Date.now();
  const summary = getRecentSummary();

  if (
    summary.errorRatePct >= ERROR_RATE_THRESHOLD_PCT
    && now - state.lastAlertAt.errorRate >= ALERT_COOLDOWN_MS
  ) {
    state.lastAlertAt.errorRate = now;
    logWarn('metrics.alert.error_rate', {
      windowSize: summary.size,
      errorRatePct: summary.errorRatePct,
      thresholdPct: ERROR_RATE_THRESHOLD_PCT,
      cooldownMs: ALERT_COOLDOWN_MS,
    });
  }

  if (
    summary.avgLatencyMs >= AVG_LATENCY_THRESHOLD_MS
    && now - state.lastAlertAt.latency >= ALERT_COOLDOWN_MS
  ) {
    state.lastAlertAt.latency = now;
    logWarn('metrics.alert.latency', {
      windowSize: summary.size,
      avgLatencyMs: summary.avgLatencyMs,
      thresholdMs: AVG_LATENCY_THRESHOLD_MS,
      cooldownMs: ALERT_COOLDOWN_MS,
    });
  }
}

function normalizePath(path) {
  if (!path || typeof path !== 'string') return '/unknown';

  return path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, ':uuid')
    .replace(/\b\d{2,}\b/g, ':id')
    .replace(/\b(?:img|cover)-[a-z0-9_-]+\b/gi, ':localId')
    .replace(/\b[a-z0-9_-]{16,}\b/gi, ':tokenLike');
}

function getBucketKey(durationMs) {
  if (durationMs <= LATENCY_BUCKETS[0]) return 'lte_50ms';
  if (durationMs <= LATENCY_BUCKETS[1]) return 'lte_100ms';
  if (durationMs <= LATENCY_BUCKETS[2]) return 'lte_250ms';
  if (durationMs <= LATENCY_BUCKETS[3]) return 'lte_500ms';
  if (durationMs <= LATENCY_BUCKETS[4]) return 'lte_1000ms';
  return 'gt_1000ms';
}

function routeKeyFromRequest(req) {
  const routePath = req.route?.path;
  const baseUrl = req.baseUrl || '';
  const path = routePath ? `${baseUrl}${routePath}` : req.path;
  return `${req.method} ${normalizePath(path)}`;
}

function statusGroup(statusCode) {
  if (statusCode >= 500) return '5xx';
  if (statusCode >= 400) return '4xx';
  if (statusCode >= 300) return '3xx';
  if (statusCode >= 200) return '2xx';
  return 'other';
}

export function metricsMiddleware(req, res, next) {
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const code = res.statusCode;
    const bucketKey = getBucketKey(durationMs);
    const routeKey = routeKeyFromRequest(req);

    state.totalRequests += 1;
    state.totalLatencyMs += durationMs;
    state.latencyBuckets[bucketKey] += 1;

    if (code >= 500) {
      state.totalErrors += 1;
    }

    if (!state.byRoute[routeKey]) {
      state.byRoute[routeKey] = {
        requests: 0,
        errors5xx: 0,
        totalLatencyMs: 0,
        avgLatencyMs: 0,
        statusGroups: {
          '2xx': 0,
          '3xx': 0,
          '4xx': 0,
          '5xx': 0,
          other: 0,
        },
      };
    }

    const routeStats = state.byRoute[routeKey];
    routeStats.requests += 1;
    routeStats.totalLatencyMs += durationMs;
    routeStats.avgLatencyMs = Math.round(routeStats.totalLatencyMs / routeStats.requests);
    routeStats.statusGroups[statusGroup(code)] += 1;

    if (code >= 500) {
      routeStats.errors5xx += 1;
    }

    pushRecent(durationMs, code >= 500);
    maybeEmitAlerts();
  });

  next();
}

export function getMetricsSnapshot() {
  const uptimeSec = Math.floor((Date.now() - state.startedAt) / 1000);
  const avgLatencyMs = state.totalRequests > 0
    ? Math.round(state.totalLatencyMs / state.totalRequests)
    : 0;

  return {
    uptimeSec,
    totalRequests: state.totalRequests,
    totalErrors5xx: state.totalErrors,
    errorRatePct: state.totalRequests > 0
      ? Number(((state.totalErrors / state.totalRequests) * 100).toFixed(2))
      : 0,
    avgLatencyMs,
    alerting: {
      windowSize: ALERT_WINDOW,
      errorRateThresholdPct: ERROR_RATE_THRESHOLD_PCT,
      avgLatencyThresholdMs: AVG_LATENCY_THRESHOLD_MS,
      cooldownMs: ALERT_COOLDOWN_MS,
      recent: getRecentSummary(),
    },
    latencyBuckets: state.latencyBuckets,
    routes: state.byRoute,
  };
}
