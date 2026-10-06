# Airdrop Intelligence Radar v0.1.3 — Snapshot Test Build

> **Source-visible, proprietary software. Not open source.** See `LICENSE`.

This build fixes the GitHub Pages source-ingestion failure observed in v0.1.2.

## What changed

GitHub Pages no longer fetches DeFiLlama or DEX Screener directly from the browser.

```text
DeFiLlama / DEX Screener
          ↓
GitHub Action collector
          ↓
normalized data/*.json snapshots
          ↓
GitHub Pages Radar
          ↓
Search / Watchlist / Qualification / LAB
```

This makes the UI search same-origin data and preserves the last good snapshot if a later source refresh fails.

## First test

1. Upload the complete repository, including `.github/workflows/` and `scripts/`.
2. Open GitHub → **Actions** → **Update Radar Data** → **Run workflow**.
3. Wait for a green run and the automatic `data: refresh radar snapshot` commit.
4. Open the GitHub Pages URL and hard refresh (`Ctrl+Shift+R`).
5. The header should show a real `Last snapshot` timestamp and a non-zero candidate count.
6. Search a protocol/token/chain in **Radar Search**.

The workflow also runs automatically twice per hour.

## Public data in v0.1.3

- DeFiLlama protocol feed
- DEX Screener latest token profiles
- DEX Screener latest boosts

X and CoinGecko remain marked as backend/secret-required and are planned for the v0.2 Insight/Evidence layer.

## QA evidence

The original empty/stuck v0.1.2 debug exports are preserved under `debug/BUG-001/` and are treated as regression fixtures.

## Security

No wallet connection, private keys, signing, or auto-claim functionality is included.
