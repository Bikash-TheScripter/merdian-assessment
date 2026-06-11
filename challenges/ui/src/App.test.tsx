import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { applyRecordState } from "./lib/records";
import type { UsageRecord } from "./types";

let mockRecords: UsageRecord[];

const baseRecords: UsageRecord[] = [
  {
    endpoint: "/api/v1/ok",
    method: "GET",
    status_code: 200,
    latency_ms: 90,
    timestamp: "2026-01-01T00:00:00+00:00",
    user_segment: "free-tier",
    request_bytes: 1200
  },
  {
    endpoint: "/api/v1/slow",
    method: "POST",
    status_code: 503,
    latency_ms: 900,
    timestamp: "2026-01-01T01:00:00+00:00",
    user_segment: "enterprise",
    request_bytes: 4300
  },
  {
    endpoint: "/api/v1/fast-error",
    method: "GET",
    status_code: 500,
    latency_ms: 120,
    timestamp: "2026-01-01T02:00:00+00:00",
    user_segment: "enterprise",
    request_bytes: 2100
  }
];

describe("request log investigator", () => {
  beforeEach(() => {
    mockRecords = baseRecords;
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ records: mockRecords, count: mockRecords.length })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, "", "/");
  });

  it("filters by URL state and sorts matching rows by latency", async () => {
    window.history.replaceState(null, "", "/?segment=enterprise&status=5xx&sort=latency_ms&dir=asc");

    render(<App />);

    expect(await screen.findByText("/api/v1/fast-error")).toBeInTheDocument();
    expect(screen.getByText("/api/v1/slow")).toBeInTheDocument();
    expect(screen.queryByText("/api/v1/ok")).not.toBeInTheDocument();

    const bodyRows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(bodyRows[0]).toHaveTextContent("/api/v1/fast-error");
    expect(bodyRows[1]).toHaveTextContent("/api/v1/slow");
    expect(screen.getByLabelText("Segment")).toHaveValue("enterprise");
    expect(screen.getByLabelText("Status class")).toHaveValue("5xx");
  });

  it("paginates rows and opens a clicked row in a popup", async () => {
    const user = userEvent.setup();
    mockRecords = Array.from({ length: 30 }, (_, index) => ({
      endpoint: `/api/v1/event-${index}`,
      method: "GET",
      status_code: index % 2 === 0 ? 200 : 500,
      latency_ms: 100 + index,
      timestamp: `2026-01-01T00:${String(index).padStart(2, "0")}:00+00:00`,
      user_segment: "enterprise",
      request_bytes: 1000 + index
    }));
    window.history.replaceState(null, "", "/?dir=asc");

    render(<App />);

    expect(await screen.findByText("/api/v1/event-0")).toBeInTheDocument();
    expect(screen.queryByText("/api/v1/event-25")).not.toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("/api/v1/event-25")).toBeInTheDocument();
    expect(screen.queryByText("/api/v1/event-0")).not.toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();

    await user.click(screen.getByText("/api/v1/event-25"));

    const dialog = screen.getByRole("dialog", { name: "GET /api/v1/event-25" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Raw event JSON")).toHaveTextContent("\"request_bytes\": 1025");
  });

  it("applies filter and sort logic without mutating source records", () => {
    const result = applyRecordState(baseRecords, {
      segment: "enterprise",
      statusClass: "5xx",
      sortField: "latency_ms",
      sortDirection: "asc"
    });

    expect(result.map((record) => record.endpoint)).toEqual(["/api/v1/fast-error", "/api/v1/slow"]);
    expect(baseRecords.map((record) => record.endpoint)).toEqual(["/api/v1/ok", "/api/v1/slow", "/api/v1/fast-error"]);
  });
});
