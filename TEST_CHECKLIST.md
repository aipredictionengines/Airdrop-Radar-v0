# Airdrop Radar v0.2 — 10-point live test

Record PASS / FAIL and keep every failed debug export.

| # | Test | PASS condition |
|---|---|---|
| 1 | Collector starts | `POST /api/collect/defillama` creates a completed run |
| 2 | DeFiLlama data | `received >= 100` |
| 3 | Database | `/health` shows `projects >= 100` |
| 4 | Frontend | GitHub Pages shows real backend projects |
| 5 | Search | `Aave` returns at least one D1 result |
| 6 | DEX | `/api/dex/search?q=USDC` returns at least one pair |
| 7 | CoinGecko | configured contract cross-check returns `status: PASS` |
| 8 | X | configured collector stores >=1 post and `/api/x/feed` returns it |
| 9 | Source logs | DeFiLlama / DEX / CoinGecko / X have explicit run status |
| 10 | Debug export | `/api/debug/export` contains real `runs` and counts |

## Phase gates

### FOUNDATION PASS
Tests 1–6 + 9–10 pass.

### FULL SOURCE PASS
Tests 1–10 pass.

### Do not proceed to Evidence/Scoring v0.2 until FOUNDATION PASS

The qualification UI may continue to be used for regression testing, but it is not evidence that the live collector works.