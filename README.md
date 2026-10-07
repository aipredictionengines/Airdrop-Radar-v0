# Airdrop Radar v0.2 — Live Test Build

**Status:** test build / source-visible proprietary software. See `LICENSE`.

This package finishes the missing live-data foundation behind the existing GitHub Pages frontend.

## Architecture

```text
GitHub Pages frontend
        ↓
Cloudflare Worker API
        ↓
Cloudflare D1
        ↑
DeFiLlama collector

Worker also proxies:
DEX Screener search / profiles
CoinGecko contract cross-check (secret key)

Worker stores:
X recent-search monitored feed (secret bearer token)
Source runs / PASS-FAIL / errors / market snapshots
```

## What is implemented

- `GET /health`
- `POST /api/collect/defillama` — admin protected
- `GET /api/projects`
- `GET /api/search?q=aave`
- `GET /api/dex/search?q=USDC`
- `GET /api/dex/profiles`
- `GET /api/coingecko/contract?platform=ethereum&address=...`
- `POST /api/collect/x` — admin protected
- `GET /api/x/feed`
- `GET /api/debug/runs`
- `GET /api/debug/errors`
- `GET /api/debug/export`
- D1 schema and migrations
- Cron collector hooks
- GitHub Pages frontend already pointed at the Worker URL supplied for testing
- preserved BUG-001 regression evidence in `debug/BUG-001/`

## Folders

```text
backend/
  src/index.js
  src/lib.js
  worker.single.js
  migrations/0001_init.sql
  test/lib.test.js
  wrangler.jsonc
  package.json
frontend/
  index.html
LICENSE
DEPLOY_STEP_BY_STEP.md
TEST_CHECKLIST.md
LIVE_TEST.ps1
```

## First gate

Do not call v0.2 PASS until:

```text
Worker health             PASS
D1                        PASS
DeFiLlama received        >= 100
D1 projects               >= 100
Search "aave"             >= 1 result
DEX search                >= 1 pair
Source runs               recorded
Debug export              contains real backend runs
```

CoinGecko and X become additional PASS gates after their API credentials are configured.

## Local code tests

From `backend/`:

```bash
npm test
```

The included pure-logic test suite currently covers normalization, bounds, change hashes, DEX fields and CoinGecko extraction.

## Safety boundary

No wallet connection, private-key handling, transaction signing or auto-claim is included. `tokenlessHeuristic` is only a heuristic and is never treated as confirmation of an airdrop.