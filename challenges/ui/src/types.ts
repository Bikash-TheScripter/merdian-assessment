export type UsageRecord = {
  endpoint: string;
  method: string;
  status_code: number;
  latency_ms: number;
  timestamp: string;
  user_segment: string;
  request_bytes: number;
};

export type StatusClass = "2xx" | "4xx" | "5xx";
export type SortField = "latency_ms" | "timestamp";
export type SortDirection = "asc" | "desc";

export type QueryState = {
  segment: string;
  statusClass: StatusClass | "all";
  sortField: SortField;
  sortDirection: SortDirection;
};

export type HistogramBucket = {
  segment: string;
  bucket: string;
  count: number;
};
