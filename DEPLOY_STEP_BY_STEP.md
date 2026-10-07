# Deploy Airdrop Radar Backend — exact order

The frontend already exists. This procedure turns the existing Cloudflare Worker into the live backend.

Current test Worker URL expected by the frontend:

```text
https://bitter-disk-3576weather-edge-worker.digitaldragoworkspace.workers.dev
```

## 1 — Create D1

In Cloudflare Dashboard:

1. **Storage & Databases → D1 SQL Database**.
2. Create database: `airdrop-radar`.
3. Open the database console.
4. Paste and execute the complete contents of:
   `backend/migrations/0001_init.sql`

Expected tables include:

```text
projects
source_runs
source_errors
market_snapshots
x_posts
evidence
decisions
human_overrides
```

## 2 — Bind D1 to the existing Worker

Open:

**Workers & Pages → bitter-disk-3576weather-edge-worker → Settings → Bindings**

Add:

```text
Binding type: D1 database
Variable name: DB
Database: airdrop-radar
```

The variable name must be exactly `DB`.

## 3 — Add Worker variables / secrets

Required immediately:

```text
ADMIN_TOKEN = create a long random value
ALLOWED_ORIGINS = https://aipredictionengines.github.io
ALLOW_PUBLIC_COLLECTORS = false
```

Optional for the first DeFiLlama + DEX test:

```text
COINGECKO_API_KEY = your CoinGecko Demo key
X_BEARER_TOKEN = your X API bearer token
X_QUERY = your monitored recent-search query
```

Do not put CoinGecko or X secrets in GitHub Pages.

A conservative X test query could be configured later around a small curated account list. Keep it empty until you are ready to spend X API usage.

## 4 — Replace the Worker code

### Easiest for the existing Worker

Use `backend/worker.single.js` in the Cloudflare Worker editor and deploy it over the old Weather Edge Worker code.

### Wrangler route

If using a terminal:

```powershell
cd backend
npm install
npx wrangler login
```

Create D1 from CLI instead of Dashboard only if you have not already created it:

```powershell
npx wrangler d1 create airdrop-radar
```

Copy the returned `database_id` into `backend/wrangler.jsonc`, replacing:

```text
REPLACE_WITH_D1_DATABASE_ID
```

Apply migration:

```powershell
npx wrangler d1 migrations apply airdrop-radar --remote
```

Set secrets:

```powershell
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put COINGECKO_API_KEY
npx wrangler secret put X_BEARER_TOKEN
```

Then:

```powershell
npx wrangler deploy
```

The `name` in the included config is intentionally the existing Worker name, so deploying it replaces that Worker.

## 5 — Test `/health`

Open in browser:

```text
https://bitter-disk-3576weather-edge-worker.digitaldragoworkspace.workers.dev/health
```

Expected minimum:

```json
{
  "status": "PASS",
  "database": "PASS",
  "projects": 0
}
```

`projects: 0` is normal before the first collector run.

## 6 — Run the first DeFiLlama collector

PowerShell:

```powershell
$API = "https://bitter-disk-3576weather-edge-worker.digitaldragoworkspace.workers.dev"
$TOKEN = "YOUR_ADMIN_TOKEN"
Invoke-RestMethod -Method Post -Uri "$API/api/collect/defillama" -Headers @{ Authorization = "Bearer $TOKEN" }
```

PASS target:

```text
status          PASS
received        >=100
normalized      >=100
totalProjects   >=100
```

The collector actually requests the complete DeFiLlama `/protocols` dataset; 100 is only our minimum gate.

## 7 — Verify database + search

Open:

```text
.../api/projects?limit=100
.../api/search?q=aave
.../api/debug/runs
```

`/api/search?q=aave` must return at least one real database result.

## 8 — Test DEX Screener

Open:

```text
.../api/dex/search?q=USDC
```

The response should contain one or more normalized pairs and the call should create a `dexscreener` source run.

## 9 — Put the new frontend on GitHub Pages

Replace the test repository `index.html` with:

```text
frontend/index.html
```

It already defaults to the Worker URL above.

Hard refresh:

```text
Ctrl + Shift + R
```

Expected header state after the DeFiLlama collector:

```text
BACKEND PASS
D1 projects >= 100
```

Typing `Aave` should query D1 and show a real DeFiLlama result.

## 10 — Add CoinGecko

Set `COINGECKO_API_KEY` as a Worker secret, then use the frontend cross-check or:

```text
/api/coingecko/contract?platform=ethereum&address=<ERC20_CONTRACT>
```

The key never leaves the Worker.

## 11 — Add X only after the core is green

Set:

```text
X_BEARER_TOKEN
X_QUERY
```

Then run:

```powershell
Invoke-RestMethod -Method Post -Uri "$API/api/collect/x" -Headers @{ Authorization = "Bearer $TOKEN" }
```

And verify:

```text
/api/x/feed
```

Do not enable frequent X polling until the monitored query is curated.

## 12 — Export evidence

Open:

```text
/api/debug/export
```

The frontend Debug Export also includes the most recently loaded backend debug object.