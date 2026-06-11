import type { HistogramBucket } from "../types";

type LatencyHistogramProps = {
  buckets: HistogramBucket[];
};

export function LatencyHistogram({ buckets }: LatencyHistogramProps) {
  const visibleBuckets = buckets.slice(0, 24);
  const maxCount = Math.max(1, ...visibleBuckets.map((bucket) => bucket.count));

  return (
    <section className="panel chart-panel" aria-labelledby="histogram-title">
      <div>
        <p className="eyebrow">Aggregate visualization</p>
        <h2 id="histogram-title">Latency histogram by segment</h2>
      </div>

      {visibleBuckets.length === 0 ? (
        <p className="empty">No matching records to visualize.</p>
      ) : (
        <div className="histogram" role="list" aria-label="Latency buckets by user segment">
          {visibleBuckets.map((bucket) => (
            <div className="histogram-row" key={`${bucket.segment}-${bucket.bucket}`} role="listitem">
              <span className="histogram-label">
                <strong>{bucket.segment}</strong>
                <small>{bucket.bucket}</small>
              </span>
              <span className="histogram-track" aria-hidden="true">
                <span
                  className="histogram-bar"
                  style={{ inlineSize: `${Math.max(6, (bucket.count / maxCount) * 100)}%` }}
                />
              </span>
              <span className="histogram-count" aria-label={`${bucket.count} requests`}>
                {bucket.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
