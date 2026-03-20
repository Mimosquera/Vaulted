import { useEffect, useMemo, useState } from 'react';
import { getPerformanceMetrics, subscribePerformanceMetrics } from '../../utils/performanceMetrics';

function toFixed(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '-';
}

function getRatingColor(rating) {
  if (rating === 'good') return '#5ee27a';
  if (rating === 'needs-improvement') return '#ffd166';
  if (rating === 'poor') return '#ff6b6b';
  return '#d9e3ff';
}

function getImageTimingColor(durationMs) {
  if (durationMs <= 350) return '#5ee27a';
  if (durationMs <= 800) return '#ffd166';
  return '#ff6b6b';
}

function getImageSummaryTone(avgImageMs) {
  if (!avgImageMs) return '#d9e3ff';
  return getImageTimingColor(avgImageMs);
}

function VitalRow({ label, metric }) {
  const color = getRatingColor(metric?.rating);

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
      <span style={{ opacity: 0.92 }}>{label}</span>
      <span style={{ color }}>
        {metric ? `${toFixed(metric.value)} (${metric.rating})` : '-'}
      </span>
    </div>
  );
}

export default function DevPerfPanel() {
  const [metrics, setMetrics] = useState(() => getPerformanceMetrics());
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribePerformanceMetrics((_, snapshot) => {
      setMetrics(snapshot);
    });

    return unsubscribe;
  }, []);

  const summary = useMemo(() => {
    const vitals = {};
    const imageMetrics = [];

    for (const metric of metrics) {
      if (metric.type === 'web-vital') {
        vitals[metric.name] = metric;
      }

      if (metric.type === 'image') {
        imageMetrics.push(metric);
      }
    }

    const recentImages = imageMetrics.slice(-20);
    const avgImageMs = recentImages.length > 0
      ? Math.round(recentImages.reduce((acc, metric) => acc + metric.durationMs, 0) / recentImages.length)
      : 0;

    return {
      vitals,
      recentImages,
      avgImageMs,
      total: metrics.length,
    };
  }, [metrics]);

  return (
    <div style={{
      position: 'fixed',
      left: 12,
      bottom: 12,
      zIndex: 9999,
      width: collapsed ? 180 : 360,
      maxHeight: collapsed ? 42 : '60vh',
      overflow: 'hidden',
      borderRadius: 10,
      background: 'rgba(11, 15, 28, 0.92)',
      border: '1px solid rgba(86, 149, 255, 0.35)',
      color: '#d9e3ff',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 11,
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
      backdropFilter: 'blur(8px)',
    }}>
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 12px',
          border: 'none',
          background: 'rgba(86, 149, 255, 0.15)',
          color: '#d9e3ff',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 11,
          letterSpacing: '0.03em',
        }}
      >
        <span>Perf Metrics</span>
        <span>{collapsed ? 'open' : 'close'}</span>
      </button>

      {!collapsed && (
        <div style={{ padding: 12, overflowY: 'auto', maxHeight: 'calc(60vh - 42px)' }}>
          <div style={{ marginBottom: 10, opacity: 0.9 }}>
            total events: {summary.total}
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ marginBottom: 4, color: '#8ab4ff' }}>web vitals</div>
            <VitalRow label="lcp" metric={summary.vitals.LCP} />
            <VitalRow label="inp" metric={summary.vitals.INP} />
            <VitalRow label="cls" metric={summary.vitals.CLS} />
            <VitalRow label="fcp" metric={summary.vitals.FCP} />
            <VitalRow label="ttfb" metric={summary.vitals.TTFB} />
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ marginBottom: 4, color: '#8ab4ff' }}>images</div>
            <div>
              recent avg:{' '}
              <span style={{ color: getImageSummaryTone(summary.avgImageMs) }}>{summary.avgImageMs}ms</span>
            </div>
            <div>samples: {summary.recentImages.length}</div>
          </div>

          <div>
            <div style={{ marginBottom: 4, color: '#8ab4ff' }}>latest image events</div>
            {summary.recentImages.slice(-6).reverse().map((metric, index) => (
              <div key={`${metric.timestamp}-${index}`} style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: 6,
                marginTop: 6,
              }}>
                <span style={{ opacity: 0.9 }}>{metric.context}</span>
                <span style={{ color: getImageTimingColor(metric.durationMs) }}>{metric.durationMs}ms</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
