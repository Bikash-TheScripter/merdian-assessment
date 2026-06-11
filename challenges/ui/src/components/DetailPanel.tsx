import { getStatusClass } from "../lib/records";
import type { UsageRecord } from "../types";
import { useEffect } from "react";

type DetailPanelProps = {
  record: UsageRecord | null;
  onClose: () => void;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "full",
  timeStyle: "long"
});

export function DetailPanel({ record, onClose }: DetailPanelProps) {
  useEffect(() => {
    if (!record) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [record, onClose]);

  if (!record) return null;

  const statusClass = getStatusClass(record.status_code);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="detail-header">
          <div>
            <p className="eyebrow">Selected event</p>
            <h2 id="detail-title">{record.method} {record.endpoint}</h2>
          </div>
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
        </div>

        <dl className="detail-list">
          <div>
            <dt>Status class</dt>
            <dd>{statusClass}</dd>
          </div>
          <div>
            <dt>Status code</dt>
            <dd>{record.status_code}</dd>
          </div>
          <div>
            <dt>Latency</dt>
            <dd>{record.latency_ms.toLocaleString()}ms</dd>
          </div>
          <div>
            <dt>Timestamp</dt>
            <dd>{dateFormatter.format(new Date(record.timestamp))}</dd>
          </div>
          <div>
            <dt>User segment</dt>
            <dd>{record.user_segment}</dd>
          </div>
          <div>
            <dt>Request bytes</dt>
            <dd>{record.request_bytes.toLocaleString()}</dd>
          </div>
        </dl>

        <pre aria-label="Raw event JSON">{JSON.stringify(record, null, 2)}</pre>
      </section>
    </div>
  );
}
