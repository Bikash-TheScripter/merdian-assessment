import { useEffect, useMemo, useState } from "react";
import { DetailPanel } from "./components/DetailPanel";
import { Filters } from "./components/Filters";
import { LatencyHistogram } from "./components/LatencyHistogram";
import { RecordsTable } from "./components/RecordsTable";
import { SummaryCards } from "./components/SummaryCards";
import { fetchDataset } from "./lib/dataset";
import { readQueryState, writeQueryState } from "./lib/queryState";
import { applyRecordState, buildLatencyHistogram, getSegments, summarize } from "./lib/records";
import type { QueryState, UsageRecord } from "./types";

export function App() {
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"api" | "fallback">("api");
  // State is kept at page level because filters, table, cards, and chart all derive from one URL-backed query model.
  const [queryState, setQueryState] = useState<QueryState>(() => readQueryState(window.location.search));
  const [selectedRecord, setSelectedRecord] = useState<UsageRecord | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchDataset()
      .then(({ records: nextRecords, source, warning }) => {
        if (!isMounted) return;
        setRecords(nextRecords);
        setDataSource(source);
        setErrorMessage(warning ?? null);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to load records.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const onPopState = () => setQueryState(readQueryState(window.location.search));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const nextSearch = writeQueryState(queryState);
    const current = `${window.location.pathname}${window.location.search}`;
    const next = `${window.location.pathname}${nextSearch}`;

    if (current !== next) {
      window.history.replaceState(null, "", next);
    }
  }, [queryState]);

  const segments = useMemo(() => getSegments(records), [records]);
  const filteredRecords = useMemo(() => applyRecordState(records, queryState), [records, queryState]);
  const summary = useMemo(() => summarize(filteredRecords), [filteredRecords]);
  const histogramBuckets = useMemo(() => buildLatencyHistogram(filteredRecords), [filteredRecords]);

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">On-call console</p>
          <h1>Request Log Investigator</h1>
          <p>
            Filter incidents by customer segment and status class, then inspect latency-heavy events without losing the URL state.
          </p>
        </div>
        <span className={`source-pill source-${dataSource}`}>
          Data source: {dataSource === "api" ? "API" : "local fallback"}
        </span>
      </header>

      {errorMessage ? (
        <div className="notice" role="status">
          {errorMessage}
        </div>
      ) : null}

      <Filters state={queryState} segments={segments} onChange={setQueryState} />

      {isLoading ? (
        <section className="panel empty" aria-live="polite">
          Loading request logs...
        </section>
      ) : (
        <>
          <SummaryCards summary={summary} />
          <div className="content-grid">
            <LatencyHistogram buckets={histogramBuckets} />
          </div>
          <RecordsTable records={filteredRecords} onSelect={setSelectedRecord} />
          <DetailPanel record={selectedRecord} onClose={() => setSelectedRecord(null)} />
        </>
      )}
    </main>
  );
}
