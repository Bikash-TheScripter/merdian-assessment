import type { QueryState, SortDirection, SortField, StatusClass } from "../types";

type FiltersProps = {
  state: QueryState;
  segments: string[];
  onChange: (nextState: QueryState) => void;
};

export function Filters({ state, segments, onChange }: FiltersProps) {
  const update = (partial: Partial<QueryState>) => onChange({ ...state, ...partial });

  return (
    <section className="panel filters" aria-label="Request log filters">
      <label>
        Segment
        <select
          value={state.segment}
          onChange={(event) => update({ segment: event.target.value })}
        >
          <option value="all">All segments</option>
          {segments.map((segment) => (
            <option key={segment} value={segment}>
              {segment}
            </option>
          ))}
        </select>
      </label>

      <label>
        Status class
        <select
          value={state.statusClass}
          onChange={(event) => update({ statusClass: event.target.value as QueryState["statusClass"] })}
        >
          <option value="all">All statuses</option>
          {(["2xx", "4xx", "5xx"] satisfies StatusClass[]).map((statusClass) => (
            <option key={statusClass} value={statusClass}>
              {statusClass}
            </option>
          ))}
        </select>
      </label>

      <label>
        Sort by
        <select
          value={state.sortField}
          onChange={(event) => update({ sortField: event.target.value as SortField })}
        >
          <option value="timestamp">Timestamp</option>
          <option value="latency_ms">Latency</option>
        </select>
      </label>

      <label>
        Direction
        <select
          value={state.sortDirection}
          onChange={(event) => update({ sortDirection: event.target.value as SortDirection })}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </label>
    </section>
  );
}
