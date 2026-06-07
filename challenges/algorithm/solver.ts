import 'dotenv/config';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

export type ApiRecord = {
  endpoint: string;
  latency_ms: number;
  method: string;
  request_bytes: number;
  status_code: number;
  timestamp: string;
  user_segment: string;
};

export type CountQuery = {
  op: 'count';
  user_segment: string;
  status_code: number;
};

export type ExistsQuery = {
  op: 'exists';
  endpoint: string;
  method: string;
  status_code: number;
  user_segment: string;
};

export type RangeCountQuery = {
  op: 'range_count';
  field: 'latency_ms' | 'request_bytes';
  min: number;
  max: number;
};

export type Query = CountQuery | ExistsQuery | RangeCountQuery;

type QueryBatch = {
  count: number;
  queries: Query[];
};

type JumboEnvelope = {
  count?: number;
  data?: ApiRecord[];
  records?: ApiRecord[];
};

type BulkRequestResponse = {
  token?: string;
  bulk_token?: string;
  url?: string;
  bulk_url?: string;
  path?: string;
  endpoint?: string;
};

export class QueryEngine {
  private readonly countIndex = new Map<string, number>();
  private readonly existsIndex = new Set<string>();
  private readonly sortedLatency: number[];
  private readonly sortedRequestBytes: number[];

  constructor(records: ApiRecord[]) {
    const latency: number[] = [];
    const requestBytes: number[] = [];

    for (const record of records) {
      const countKey = makeCountKey(record.user_segment, record.status_code);
      this.countIndex.set(countKey, (this.countIndex.get(countKey) ?? 0) + 1);
      this.existsIndex.add(
        makeExistsKey(record.endpoint, record.method, record.status_code, record.user_segment),
      );
      latency.push(record.latency_ms);
      requestBytes.push(record.request_bytes);
    }

    this.sortedLatency = latency.sort((a, b) => a - b);
    this.sortedRequestBytes = requestBytes.sort((a, b) => a - b);
  }

  answer(query: Query): number {
    switch (query.op) {
      case 'count':
        return this.countIndex.get(makeCountKey(query.user_segment, query.status_code)) ?? 0;
      case 'exists':
        return this.existsIndex.has(
          makeExistsKey(query.endpoint, query.method, query.status_code, query.user_segment),
        )
          ? 1
          : 0;
      case 'range_count': {
        const values = query.field === 'latency_ms' ? this.sortedLatency : this.sortedRequestBytes;

        return upperBound(values, query.max) - lowerBound(values, query.min);
      }
    }
  }

  answerAll(queries: Query[]): number[] {
    return queries.map((query) => this.answer(query));
  }
}

export function hashAnswers(answers: number[]): string {
  return createHash('sha256').update(answers.join(','), 'utf8').digest('hex');
}

function makeCountKey(userSegment: string, statusCode: number): string {
  return `${userSegment}\0${statusCode}`;
}

function makeExistsKey(
  endpoint: string,
  method: string,
  statusCode: number,
  userSegment: string,
): string {
  return `${endpoint}\0${method}\0${statusCode}\0${userSegment}`;
}

function lowerBound(values: number[], target: number): number {
  let lo = 0;
  let hi = values.length;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);

    if (values[mid] < target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  return lo;
}

function upperBound(values: number[], target: number): number {
  let lo = 0;
  let hi = values.length;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);

    if (values[mid] <= target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  return lo;
}

async function fetchJson<T>(url: string, init?: RequestInit, attempts = 5): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(url, init);
    const text = await response.text();

    if (response.ok) {
      return JSON.parse(text) as T;
    }

    lastError = new Error(`${init?.method ?? 'GET'} ${url} failed: ${response.status} ${text}`);

    if (attempt === attempts || (response.status !== 429 && response.status < 500)) {
      throw lastError;
    }

    const retryAfter = Number(response.headers.get('retry-after'));
    const delayMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : attempt * 750;

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw lastError ?? new Error(`${init?.method ?? 'GET'} ${url} failed`);
}

function getConfig(): { baseUrl: string; apiKey: string } {
  const { BASE_URL, API_KEY } = process.env;

  if (!BASE_URL || !API_KEY) {
    throw new Error('BASE_URL and API_KEY environment variables are required');
  }

  return {
    baseUrl: BASE_URL.replace(/\/$/, ''),
    apiKey: API_KEY,
  };
}

async function fetchQueries(baseUrl: string, apiKey: string): Promise<Query[]> {
  const batch = await fetchJson<QueryBatch>(`${baseUrl}/api/v1/challenges/algorithm/queries`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (batch.count !== batch.queries.length) {
    throw new Error(`Expected ${batch.count} queries, received ${batch.queries.length}`);
  }

  return batch.queries;
}

async function fetchJumboRecords(baseUrl: string, apiKey: string): Promise<ApiRecord[]> {
  const request = await fetchJson<BulkRequestResponse>(`${baseUrl}/api/v1/dataset/jumbo/bulk-request`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  });
  const bulkUrl = resolveBulkUrl(baseUrl, request);
  const envelope = await fetchJson<JumboEnvelope | ApiRecord[]>(bulkUrl);
  const records = Array.isArray(envelope) ? envelope : envelope.data ?? envelope.records;

  if (!records) {
    throw new Error('Bulk response did not include records/data array');
  }

  if (!Array.isArray(records) || records.length !== 50_000) {
    throw new Error(`Expected 50,000 jumbo records, received ${records.length}`);
  }

  return records;
}

function resolveBulkUrl(baseUrl: string, response: BulkRequestResponse): string {
  const direct = response.url ?? response.bulk_url;

  if (direct) {
    return direct.startsWith('http') ? direct : `${baseUrl}${direct}`;
  }

  const path = response.path ?? response.endpoint;

  if (path) {
    return `${baseUrl}${path}`;
  }

  const token = response.token ?? response.bulk_token;

  if (!token) {
    throw new Error(`Bulk token response shape was not recognized: ${JSON.stringify(response)}`);
  }

  return `${baseUrl}/api/v1/dataset/jumbo/bulk/${encodeURIComponent(token)}`;
}

async function submitAnswer(baseUrl: string, apiKey: string, digest: string, notes: string): Promise<void> {
  const response = await fetchJson<unknown>(`${baseUrl}/api/v1/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'algorithm_answer',
      value: digest,
      notes,
    }),
  });

  console.log('submit response:', JSON.stringify(response));
}

async function readCache<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }

    throw error;
  }
}

async function main(): Promise<void> {
  const { baseUrl, apiKey } = getConfig();
  const shouldSubmit = process.argv.includes('--submit');
  const noCache = process.argv.includes('--no-cache');
  const cacheDir = 'challenges/algorithm/data';
  const recordsPath = `${cacheDir}/jumbo-records.json`;
  const queriesPath = `${cacheDir}/queries.json`;

  await mkdir(cacheDir, { recursive: true });

  const cachedRecords = noCache ? undefined : await readCache<ApiRecord[]>(recordsPath);
  const cachedQueries = noCache ? undefined : await readCache<Query[]>(queriesPath);
  const records = cachedRecords ?? (await fetchJumboRecords(baseUrl, apiKey));
  const queries = cachedQueries ?? (await fetchQueries(baseUrl, apiKey));

  await writeFile(recordsPath, `${JSON.stringify(records)}\n`);
  await writeFile(queriesPath, `${JSON.stringify(queries, null, 2)}\n`);

  const preprocessStart = performance.now();
  const engine = new QueryEngine(records);
  const preprocessMs = performance.now() - preprocessStart;

  const answerStart = performance.now();
  const answers = engine.answerAll(queries);
  const answerMs = performance.now() - answerStart;
  const digest = hashAnswers(answers);

  await writeFile(`${cacheDir}/answers.txt`, `${answers.join(',')}\n`);
  await writeFile(`${cacheDir}/answer-hash.txt`, `${digest}\n`);

  console.log(`records: ${records.length}`);
  console.log(`queries: ${queries.length}`);
  console.log(`preprocess_ms: ${preprocessMs.toFixed(3)}`);
  console.log(`answer_ms: ${answerMs.toFixed(3)}`);
  console.log(`avg_query_us: ${((answerMs * 1000) / queries.length).toFixed(3)}`);
  console.log(`answer_hash: ${digest}`);

  if (shouldSubmit) {
    await submitAnswer(
      baseUrl,
      apiKey,
      digest,
      `TypeScript O(N + K log N) query engine. preprocess=${preprocessMs.toFixed(3)}ms answer=${answerMs.toFixed(3)}ms avg_query=${((answerMs * 1000) / queries.length).toFixed(3)}us`,
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
