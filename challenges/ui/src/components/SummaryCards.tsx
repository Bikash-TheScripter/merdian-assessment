import type { summarize } from "../lib/records";

type Summary = ReturnType<typeof summarize>;

export function SummaryCards({ summary }: { summary: Summary }) {
  return (
    <section className="summary-grid" aria-label="Filtered request summary">
      <article className="metric-card">
        <span>Total requests</span>
        <strong>{summary.total.toLocaleString()}</strong>
      </article>
      <article className="metric-card">
        <span>5xx errors</span>
        <strong>{summary.errors.toLocaleString()}</strong>
      </article>
      <article className="metric-card">
        <span>Error rate</span>
        <strong>{summary.errorRate}%</strong>
      </article>
      <article className="metric-card">
        <span>P95 latency</span>
        <strong>{summary.p95Latency.toLocaleString()}ms</strong>
      </article>
    </section>
  );
}
