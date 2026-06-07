# Algorithm Challenge Rationale

## Result

Submitted `algorithm_answer` successfully.

- Answer hash: `f6bce69d2e94b8cc386bb9d458835fb4c91589e79ae8d3243d063ecf03a4ea44`
- Platform response: `{"correct":true,"layer":null,"message":"Correct!"}`

## Approach

The solver fetches the 50,000-record jumbo dataset through the bulk-token endpoint and fetches the candidate-specific 10,000-query batch. It then builds indexes once:

- `count`: `Map<user_segment,status_code,count>` for O(1) answers.
- `exists`: `Set<endpoint,method,status_code,user_segment>` for O(1) membership.
- `range_count`: sorted numeric arrays for `latency_ms` and `request_bytes`, answered with lower/upper-bound binary searches in O(log N).

This keeps the solution in the intended O(N + K log N) shape instead of scanning all 50,000 records for each query.

## Benchmark

Measured locally with `npm run challenge:algorithm:submit` on the accepted run:

- Records: 50,000
- Queries: 10,000
- Preprocessing: 43.038 ms
- Answering: 4.186 ms
- Average query time: 0.419 microseconds

The script caches fetched jumbo records and queries under `challenges/algorithm/data/`, which is ignored by Git.
