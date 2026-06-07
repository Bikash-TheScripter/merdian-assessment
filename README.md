# Meridian Assessment

A repository for the Meridian assessment project.

## Overview

This repository contains notes, code, tests, and challenge evidence for the four-layer HTTP API assessment.

## Setup

Install dependencies:

```bash
npm install
```

Keep assessment credentials out of Git. Provide them through environment variables:

```bash
BASE_URL="..." API_KEY="sa_..." npm run <script>
```

## Progress

Layer 1 fetches all 500 encrypted dataset records, decodes each base64 record to bytes, concatenates the encrypted bytes in API order, and submits the SHA-256 hash as `content_hash`.

```bash
npm run hash:integrity
```

Accepted Layer 1 hash:

```text
50aa0dc1facb0ab9d941c5369b012e2f76d2169f3ff8d2d4f0810863a252310f
```

Layer 2 fetches the RSA private key from `/api/v1/private-key`, decrypts all records with RSA/PKCS#1 v1.5, concatenates the decrypted plaintext records in dataset order, and submits the SHA-256 hash as `decrypted_hash`.

```bash
npm run decrypt:layer
```

Accepted Layer 2 hash:

```text
87676f14a77eda4ac8aff87b9e91c3b79f3a75e2cf46e9990862622d33e9e725
```

Layer 4 analyzes the decrypted request-log dataset and submits a free-form operational finding as `analysis`.

```bash
cat notes/layer4-analysis.md
```

Accepted Layer 4 finding:

```text
Server-side failures are concentrated by user segment: web-dashboard has the highest 5xx rate (18/42 = 42.9%), while latency and request size have near-zero correlation with 5xx outcomes.
```

Optional algorithm challenge is implemented in TypeScript under `challenges/algorithm/`.

```bash
npm run challenge:algorithm
npm run challenge:algorithm:submit
```

Accepted optional algorithm hash:

```text
f6bce69d2e94b8cc386bb9d458835fb4c91589e79ae8d3243d063ecf03a4ea44
```
