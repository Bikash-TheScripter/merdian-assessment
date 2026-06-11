import { fallbackRecords } from "./fallbackRecords";
import type { UsageRecord } from "../types";

type DatasetResponse = {
  records: UsageRecord[];
  count: number;
  note?: string;
};

const BASE_URL = import.meta.env.VITE_BASE_URL ?? "http://localhost:3001";

export async function fetchDataset(): Promise<{
  records: UsageRecord[];
  source: "api" | "fallback";
  warning?: string;
}> {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/challenges/ui/dataset`);

    if (!response.ok) {
      throw new Error(`dataset fetch failed: ${response.status}`);
    }

    const body = (await response.json()) as DatasetResponse;

    if (!Array.isArray(body.records)) {
      throw new Error("dataset response did not include records");
    }

    return { records: body.records, source: "api" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown fetch error";
    return {
      records: fallbackRecords,
      source: "fallback",
      warning: `Using decrypted local data because the API request failed: ${message}`
    };
  }
}
