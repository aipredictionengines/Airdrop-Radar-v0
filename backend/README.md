# Airdrop Radar Backend

Cloudflare Worker + D1 backend for the GitHub Pages frontend.

## First live gate

1. Create D1 database named `airdrop-radar`.
2. Add GitHub repository secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_D1_DATABASE_ID`
   - `ADMIN_TOKEN`
   - optional: `COINGECKO_API_KEY`
   - optional: `X_BEARER_TOKEN`
3. Run **Actions → Deploy Airdrop Radar Worker → Run workflow**.
4. Open the Worker `/health` endpoint.
5. PASS requires database=PASS and projects >= 100 after seeding.

Do not commit API tokens or private keys.
