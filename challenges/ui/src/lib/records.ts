import type { HistogramBucket, QueryState, StatusClass, UsageRecord } from "../types";

export function getStatusClass(statusCode: number): StatusClass | "other" {
  if (statusCode >= 200 && statusCode < 300) return "2xx";
  if (statusCode >= 400 && statusCode < 500) return "4xx";
  if (statusCode >= 500 && statusCode < 600) return "5xx";
  return "other";
}

export function applyRecordState(records: UsageRecord[], state: QueryState): UsageRecord[] {
  const direction = state.sortDirection === "asc" ? 1 : -1;

  return records
    .filter((record) => state.segment === "all" || record.user_segment === state.segment)
    .filter((record) => state.statusClass === "all" || getStatusClass(record.status_code) === state.statusClass)
    .sort((left, right) => {
      const leftValue = state.sortField === "latency_ms"
        ? left.latency_ms
        : Date.parse(left.timestamp);
      const rightValue = state.sortField === "latency_ms"
        ? right.latency_ms
        : Date.parse(right.timestamp);

      return (leftValue - rightValue) * direction;
    });
}

export function getSegments(records: UsageRecord[]): string[] {
  return Array.from(new Set(records.map((record) => record.user_segment))).sort((a, b) => a.localeCompare(b));
}

export function buildLatencyHistogram(records: UsageRecord[]): HistogramBucket[] {
  const bucketSize = 500;
  const counts = new Map<string, number>();

  for (const record of records) {
    const bucketStart = Math.floor(record.latency_ms / bucketSize) * bucketSize;
    const bucket = `${bucketStart}-${bucketStart + bucketSize - 1}ms`;
    const key = `${record.user_segment}|${bucket}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([key, count]) => {
      const [segment, bucket] = key.split("|");
      return { segment, bucket, count };
    })
    .sort((left, right) => {
      const segmentOrder = left.segment.localeCompare(right.segment);
      if (segmentOrder !== 0) return segmentOrder;
      return parseInt(left.bucket, 10) - parseInt(right.bucket, 10);
    });
}

export function summarize(records: UsageRecord[]) {
  const total = records.length;
  const errors = records.filter((record) => record.status_code >= 500).length;
  const averageLatency = total
    ? Math.round(records.reduce((sum, record) => sum + record.latency_ms, 0) / total)
    : 0;
  const p95Latency = percentile(records.map((record) => record.latency_ms), 0.95);

  return {
    total,
    errors,
    errorRate: total ? Math.round((errors / total) * 1000) / 10 : 0,
    averageLatency,
    p95Latency
  };
}

function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * percentileValue) - 1);
  return sorted[index];
}
