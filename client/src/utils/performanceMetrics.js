const metricBuffer = [];
const subscribers = new Set();
let hasInitializedVitals = false;
let firstImageMetricSent = false;

function nowIso() {
  return new Date().toISOString();
}

function pushMetric(metric) {
  const entry = {
    timestamp: nowIso(),
    ...metric,
  };

  metricBuffer.push(entry);

  if (metricBuffer.length > 300) {
    metricBuffer.shift();
  }

  if (import.meta.env.DEV) {
    console.info('[perf]', entry);
  }

  if (typeof window !== 'undefined') {
    window.__vaultedPerfMetrics = metricBuffer;
  }

  for (const subscriber of subscribers) {
    subscriber(entry, [...metricBuffer]);
  }
}

function reportWebVital(metric) {
  pushMetric({
    type: 'web-vital',
    name: metric.name,
    value: Number(metric.value?.toFixed?.(2) ?? metric.value),
    rating: metric.rating,
    id: metric.id,
    navigationType: metric.navigationType,
  });
}

export async function initPerformanceTracking() {
  if (hasInitializedVitals || typeof window === 'undefined') return;
  hasInitializedVitals = true;

  try {
    const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import('web-vitals');
    onCLS(reportWebVital);
    onFCP(reportWebVital);
    onINP(reportWebVital);
    onLCP(reportWebVital);
    onTTFB(reportWebVital);
  } catch {
    // Performance tracking should never break app startup.
  }
}

export function reportImageTiming({
  durationMs,
  context = 'image',
  src,
  loading,
  widthHint,
}) {
  if (!Number.isFinite(durationMs)) return;

  pushMetric({
    type: 'image',
    context,
    durationMs: Math.round(durationMs),
    loading: loading || 'lazy',
    widthHint: widthHint || null,
    srcHost: (() => {
      try {
        return src ? new URL(src).host : null;
      } catch {
        return null;
      }
    })(),
  });

  if (!firstImageMetricSent) {
    firstImageMetricSent = true;
    pushMetric({
      type: 'custom',
      name: 'first-image-loaded-ms',
      value: Math.round(durationMs),
      context,
    });
  }
}

export function getPerformanceMetrics() {
  return [...metricBuffer];
}

export function subscribePerformanceMetrics(subscriber) {
  if (typeof subscriber !== 'function') {
    return () => {};
  }

  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
  };
}
