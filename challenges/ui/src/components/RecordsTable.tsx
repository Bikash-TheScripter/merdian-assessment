import { getStatusClass } from "../lib/records";
import type { UsageRecord } from "../types";
import { useEffect, useMemo, useState } from "react";

type RecordsTableProps = {
  records: UsageRecord[];
  onSelect: (record: UsageRecord) => void;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "medium"
});

const PAGE_SIZE = 25;

export function RecordsTable({ records, onSelect }: RecordsTableProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRecords = useMemo(
    () => records.slice(startIndex, startIndex + PAGE_SIZE),
    [records, startIndex]
  );

  useEffect(() => {
    setPage(1);
  }, [records]);

  return (
    <section className="panel table-panel" aria-labelledby="table-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Request logs</p>
          <h2 id="table-title">{records.length.toLocaleString()} matching events</h2>
        </div>
        <p>Click a row for the full event payload.</p>
      </div>

      {records.length === 0 ? (
        <p className="empty">No records match the current filters.</p>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Endpoint</th>
                  <th scope="col">Method</th>
                  <th scope="col">Status</th>
                  <th scope="col">Latency</th>
                  <th scope="col">Timestamp</th>
                  <th scope="col">Segment</th>
                  <th scope="col">Bytes</th>
                </tr>
              </thead>
              <tbody>
                {visibleRecords.map((record, index) => (
                  <tr
                    className="clickable-row"
                    key={`${record.timestamp}-${record.endpoint}-${record.method}-${startIndex + index}`}
                    tabIndex={0}
                    onClick={() => onSelect(record)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") onSelect(record);
                    }}
                  >
                    <td data-label="Endpoint">{record.endpoint}</td>
                    <td data-label="Method">{record.method}</td>
                    <td data-label="Status">
                      <span className={`status status-${getStatusClass(record.status_code)}`}>
                        {record.status_code}
                      </span>
                    </td>
                    <td data-label="Latency">{record.latency_ms.toLocaleString()}ms</td>
                    <td data-label="Timestamp">{dateFormatter.format(new Date(record.timestamp))}</td>
                    <td data-label="Segment">{record.user_segment}</td>
                    <td data-label="Bytes">{record.request_bytes.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="pagination" aria-label="Request log pagination">
            <p>
              Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, records.length)} of{" "}
              {records.length.toLocaleString()}
            </p>
            <div className="pagination-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Previous
              </button>
              <span aria-live="polite">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="secondary-button"
                disabled={currentPage === totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                Next
              </button>
            </div>
          </nav>
        </>
      )}
    </section>
  );
}
