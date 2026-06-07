import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hashAnswers, QueryEngine, type ApiRecord } from './solver.js';

const records: ApiRecord[] = [
  {
    endpoint: '/api/v1/orders',
    latency_ms: 100,
    method: 'POST',
    request_bytes: 1_000,
    status_code: 500,
    timestamp: '2026-01-01T00:00:00+00:00',
    user_segment: 'trial',
  },
  {
    endpoint: '/api/v1/orders',
    latency_ms: 250,
    method: 'GET',
    request_bytes: 2_000,
    status_code: 404,
    timestamp: '2026-01-01T00:01:00+00:00',
    user_segment: 'trial',
  },
  {
    endpoint: '/api/v1/users',
    latency_ms: 900,
    method: 'POST',
    request_bytes: 3_000,
    status_code: 500,
    timestamp: '2026-01-01T00:02:00+00:00',
    user_segment: 'enterprise',
  },
  {
    endpoint: '/api/v1/orders',
    latency_ms: 1_200,
    method: 'POST',
    request_bytes: 4_000,
    status_code: 500,
    timestamp: '2026-01-01T00:03:00+00:00',
    user_segment: 'trial',
  },
];

describe('QueryEngine', () => {
  const engine = new QueryEngine(records);

  it('answers count queries from a precomputed index', () => {
    assert.equal(engine.answer({ op: 'count', status_code: 500, user_segment: 'trial' }), 2);
    assert.equal(engine.answer({ op: 'count', status_code: 201, user_segment: 'trial' }), 0);
  });

  it('answers exists queries from a tuple set', () => {
    assert.equal(
      engine.answer({
        endpoint: '/api/v1/orders',
        method: 'POST',
        op: 'exists',
        status_code: 500,
        user_segment: 'trial',
      }),
      1,
    );
    assert.equal(
      engine.answer({
        endpoint: '/api/v1/orders',
        method: 'PATCH',
        op: 'exists',
        status_code: 500,
        user_segment: 'trial',
      }),
      0,
    );
  });

  it('answers inclusive range_count queries with binary search', () => {
    assert.equal(engine.answer({ field: 'latency_ms', max: 900, min: 100, op: 'range_count' }), 3);
    assert.equal(engine.answer({ field: 'request_bytes', max: 4_000, min: 2_000, op: 'range_count' }), 3);
    assert.equal(engine.answer({ field: 'latency_ms', max: 99, min: 0, op: 'range_count' }), 0);
  });
});

describe('hashAnswers', () => {
  it('hashes comma-joined decimal answers', () => {
    assert.equal(hashAnswers([1, 0, 42]), 'd53b64a9c09b2ba6f7ea5db5d2a8c94a0123d54a4bc57ae9638c8b47f9ca4c96');
  });
});
