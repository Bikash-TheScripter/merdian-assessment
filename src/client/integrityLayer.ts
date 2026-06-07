import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

type DatasetPayload = {
  total_unique_entries?: number;
  data: string[];
};

export function calculateDatasetHash(records: string[]): string {
  const encryptedBytes = Buffer.concat(records.map((record) => Buffer.from(record, 'base64')));

  return createHash('sha256').update(encryptedBytes).digest('hex');
}

function validateDataset(payload: DatasetPayload): void {
  if (!Array.isArray(payload.data)) {
    throw new Error('Dataset JSON must include a data array');
  }

  const uniqueCount = new Set(payload.data).size;

  if (
    typeof payload.total_unique_entries === 'number' &&
    payload.data.length !== payload.total_unique_entries
  ) {
    throw new Error(
      `Expected ${payload.total_unique_entries} records, found ${payload.data.length}`,
    );
  }

  if (
    typeof payload.total_unique_entries === 'number' &&
    payload.total_unique_entries !== uniqueCount
  ) {
    throw new Error(
      `Expected ${payload.total_unique_entries} unique entries, found ${uniqueCount}`,
    );
  }

  const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
  const invalidIndex = payload.data.findIndex(
    (record) => typeof record !== 'string' || !base64Pattern.test(record),
  );

  if (invalidIndex !== -1) {
    throw new Error(`Record at index ${invalidIndex} is not encrypted base64 content`);
  }
}

async function main(): Promise<void> {
  const datasetPath = process.argv[2];

  if (!datasetPath) {
    throw new Error('Usage: tsx src/client/integrityLayer.ts <dataset-json-path>');
  }

  const payload = JSON.parse(await readFile(datasetPath, 'utf8')) as DatasetPayload;

  validateDataset(payload);

  console.log(calculateDatasetHash(payload.data));
}

await main();
