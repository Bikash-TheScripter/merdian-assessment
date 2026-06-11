import type { QueryState, SortDirection, SortField, StatusClass } from "../types";

export const DEFAULT_QUERY_STATE: QueryState = {
  segment: "all",
  statusClass: "all",
  sortField: "timestamp",
  sortDirection: "desc"
};

const statusClasses = new Set<StatusClass>(["2xx", "4xx", "5xx"]);
const sortFields = new Set<SortField>(["latency_ms", "timestamp"]);
const sortDirections = new Set<SortDirection>(["asc", "desc"]);

export function readQueryState(search: string): QueryState {
  const params = new URLSearchParams(search);
  const statusClass = params.get("status");
  const sortField = params.get("sort");
  const sortDirection = params.get("dir");

  return {
    segment: params.get("segment") || DEFAULT_QUERY_STATE.segment,
    statusClass: statusClass && statusClasses.has(statusClass as StatusClass)
      ? (statusClass as StatusClass)
      : DEFAULT_QUERY_STATE.statusClass,
    sortField: sortField && sortFields.has(sortField as SortField)
      ? (sortField as SortField)
      : DEFAULT_QUERY_STATE.sortField,
    sortDirection: sortDirection && sortDirections.has(sortDirection as SortDirection)
      ? (sortDirection as SortDirection)
      : DEFAULT_QUERY_STATE.sortDirection
  };
}

export function writeQueryState(state: QueryState): string {
  const params = new URLSearchParams();

  if (state.segment !== DEFAULT_QUERY_STATE.segment) {
    params.set("segment", state.segment);
  }

  if (state.statusClass !== DEFAULT_QUERY_STATE.statusClass) {
    params.set("status", state.statusClass);
  }

  if (state.sortField !== DEFAULT_QUERY_STATE.sortField) {
    params.set("sort", state.sortField);
  }

  if (state.sortDirection !== DEFAULT_QUERY_STATE.sortDirection) {
    params.set("dir", state.sortDirection);
  }

  const value = params.toString();
  return value ? `?${value}` : "";
}
