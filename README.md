# Airdrop Intelligence Radar

**Current test build:** `v0.1.1 — Observability Test Build`

Airdrop Intelligence Radar is a proprietary research system for discovering, qualifying, monitoring, and auditing potential airdrop and token-launch signals.

> **Source-visible, not open source.** Public access to this repository does not grant permission to use, copy, fork, modify, self-host, deploy, redistribute, or commercialize the software. See [`LICENSE`](./LICENSE).

## Purpose

The project is being developed as a quality-first intelligence system rather than a high-volume airdrop directory.

The working pipeline is:

```text
Discovery
   ↓
Evidence
   ↓
Qualification
   ↓
Watchlist
   ↓
TGE / Token Event
   ↓
Token Quant
   ↓
Outcome Tracking
   ↓
Calibration
```

A separate operational layer records what the system did so that decisions can later be inspected and reproduced:

```text
Source Calls
   ↓
Run Log
   ↓
Decision Audit
   ↓
Errors / Overrides
   ↓
Mistake Registry
   ↓
Replay
```

## Current build: v0.1.1

This version is intended for controlled testing of the foundation and observability layer before the larger Airdrop Radar 50 evaluation.

Included in the current build:

- discovery and qualification workflow;
- watchlist and post-detection workflow;
- market-data adapters;
- immutable decision inputs for replay;
- persistent run and source logs;
- decision audit trail;
- error logging;
- human override records;
- mistake registry;
- replay of saved decision inputs;
- exportable debug pack;
- offline Demo Radar Run for testing the logging pipeline.

The proprietary scoring implementation, internal thresholds, future calibration logic, and production decision policies are not part of the public product specification.

## LAB / Observability

The `LAB` screen is designed to answer:

- What did the Radar run?
- Which sources were queried?
- Which source failed or returned incomplete data?
- What decision was made?
- What saved input produced that decision?
- Was the decision overridden by a human?
- Was a mistake later identified?
- Can the same decision be reproduced from the frozen input?

Local data is written into the `data/` directory as JSONL records:

```text
runs.jsonl
sources.jsonl
decisions.jsonl
errors.jsonl
overrides.jsonl
mistakes.jsonl
```

> Do not commit private research logs, API keys, or sensitive notes.

## Safety boundary

Airdrop Radar is intentionally separated from wallet execution.

The current design does **not** provide:

- private-key storage;
- seed-phrase storage;
- automatic wallet signing;
- automatic claims;
- automatic token purchases;
- automatic fund transfers.

A detected claim, token, or opportunity should not be treated as safe merely because it appears in the Radar.

## Authorized local testing

The commands below are for the copyright holder and users who have received explicit authorization to run the Software.

Requirements: Node.js 18+.

```bash
cp .env.example .env
npm test
npm start
```

Open:

```text
http://localhost:8787
```

## Test sequence

### 1. Demo observability test

Open `LAB` and run **Demo Radar Test**.

The demo is designed to create controlled decisions plus an intentional low-severity error so that the error pipeline can be inspected.

Check that the following are recorded:

- run;
- source activity;
- decisions;
- intentional demo error;
- replay result.

### 2. Replay

Replay a saved decision.

With the same frozen input and same engine version, the result should remain unchanged. This provides a baseline for later regression testing.

### 3. Human override

Record an override against a decision and include a reason. The original decision must remain available; an override must not silently rewrite history.

### 4. Mistake registry

Record a known system mistake with its category and root cause. This registry will later be used to identify whether errors are concentrated in source handling, entity resolution, evidence classification, timing, scoring, or another component.

### 5. Debug pack

Export the Debug Pack and inspect the captured run, decisions, errors, overrides, and mistake records.

## External data sources

The build is designed to support data from sources such as:

- X;
- DeFiLlama;
- DEX Screener;
- CoinGecko;
- additional official/project sources in later versions.

Third-party APIs and data remain subject to their own terms, licenses, pricing, attribution requirements, and rate limits. Airdrop Radar does not grant rights to third-party data.

## Development roadmap

```text
v0.1   Foundation
   ↓
v0.1.1 Observability / Audit / Replay
   ↓
v0.2   Insight / Evidence
   ↓
v0.3   Quant / Calibration
   ↓
AIRDROP RADAR 50
   ↓
PASS / FAIL
   ↓
v1.0 decision
```

The objective of `AIRDROP RADAR 50` is to evaluate the system on real cases with frozen evidence, recorded decisions, outcome tracking, errors, missed opportunities, and reproducible logs.

## Licensing

**Airdrop Radar is proprietary software. It is not open source and is not free for general use.**

Unless you have prior written authorization, repository visibility does **not** give you permission to:

- clone and use the Software for your own operations;
- compile or execute the Software;
- modify or fork it;
- self-host it;
- deploy it to a server or cloud environment;
- use it for airdrop, trading, investment, research, monitoring, or business operations;
- integrate it into another product or agent;
- provide it to customers;
- sell, sublicense, redistribute, white-label, or commercialize it;
- create derivative products from the proprietary implementation.

You may view publicly visible source code solely for review, security inspection, technical evaluation, or consideration of a commercial relationship, subject to the full [`LICENSE`](./LICENSE).

Commercial, production, hosted, integration, partnership, and other usage rights require a separate written license.

## Disclaimer

Airdrop Radar is experimental research software. It may produce incomplete, delayed, or incorrect information, including false positives and false negatives. It does not guarantee airdrop eligibility, token issuance, token value, market performance, or financial return.

Nothing in this repository constitutes financial, investment, legal, tax, or trading advice.

---

**Copyright © 2026 Digital Drago. All Rights Reserved.**
