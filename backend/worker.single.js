// Airdrop Radar v0.2 Live Test — single-file Cloudflare Worker
// Source-visible proprietary software. See ../LICENSE.

function clampLimit(value, fallback = 100, max = 500) {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

function slugify(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashString(input = '') {
  // FNV-1a 32-bit. Used for change detection only, not security.
  let h = 0x811c9dc5;
  const s = String(input);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function normalizeDefillama(p = {}) {
  const chains = Array.isArray(p.chains) ? p.chains.filter(Boolean).map(String) : [];
  const name = String(p.name || 'Unnamed protocol');
  const sourceId = String(p.id ?? p.slug ?? slugify(name));
  const normalized = {
    id: `defillama:${sourceId}`,
    source: 'defillama',
    source_id: sourceId,
    source_slug: p.slug ? String(p.slug) : slugify(name),
    name,
    symbol: p.symbol ? String(p.symbol) : null,
    category: p.category ? String(p.category) : null,
    chains,
    primary_chain: chains[0] || null,
    tvl: Number.isFinite(Number(p.tvl)) ? Number(p.tvl) : null,
    url: p.url ? String(p.url) : null,
    twitter: p.twitter ? String(p.twitter) : null,
    gecko_id: p.gecko_id ? String(p.gecko_id) : null,
    tokenless_heuristic: !p.gecko_id ? 1 : 0
  };
  normalized.data_hash = hashString(stableStringify(normalized));
  return normalized;
}

function normalizeDexPair(p = {}) {
  const base = p.baseToken || {};
  const quote = p.quoteToken || {};
  return {
    id: `dex:${p.chainId || 'unknown'}:${p.pairAddress || base.address || slugify(base.symbol || base.name || 'pair')}`,
    source: 'dexscreener',
    kind: 'pair',
    name: base.name || base.symbol || 'DEX pair',
    symbol: base.symbol || null,
    chain: p.chainId || null,
    chains: p.chainId ? [p.chainId] : [],
    category: p.dexId || 'DEX pair',
    address: base.address || null,
    pairAddress: p.pairAddress || null,
    quoteSymbol: quote.symbol || null,
    url: p.url || null,
    tokenlessHeuristic: false,
    market: {
      priceUsd: p.priceUsd ?? null,
      liquidityUsd: p.liquidity?.usd ?? null,
      volume24h: p.volume?.h24 ?? null,
      fdv: p.fdv ?? null,
      marketCap: p.marketCap ?? null,
      pairCreatedAt: p.pairCreatedAt ?? null,
      priceChange: p.priceChange ?? null,
      txns: p.txns ?? null,
      boosts: p.boosts ?? null
    }
  };
}

function normalizeDexProfile(p = {}, i = 0) {
  return {
    id: `dex-profile:${p.chainId || 'unknown'}:${p.tokenAddress || i}`,
    source: 'dexscreener-profile',
    kind: 'token-profile',
    name: p.description ? String(p.description).slice(0, 100) : (p.tokenAddress || 'DEX token'),
    symbol: null,
    chain: p.chainId || null,
    chains: p.chainId ? [p.chainId] : [],
    category: 'latest-profile',
    address: p.tokenAddress || null,
    description: p.description || '',
    url: p.url || null,
    tokenlessHeuristic: false
  };
}

function normalizeCoinGecko(data = {}, platform, address) {
  const md = data.market_data || {};
  const pick = (obj) => obj && typeof obj === 'object' ? (obj.usd ?? null) : null;
  return {
    source: 'coingecko',
    platform,
    address,
    id: data.id || null,
    name: data.name || null,
    symbol: data.symbol || null,
    marketCapRank: data.market_cap_rank ?? data.market_cap_rank_with_rehypothecated ?? null,
    priceUsd: pick(md.current_price),
    marketCapUsd: pick(md.market_cap),
    volume24hUsd: pick(md.total_volume),
    priceChange24hPct: md.price_change_percentage_24h ?? null,
    lastUpdated: data.last_updated || null
  };
}

function normalizeXPost(post = {}, usersById = {}) {
  const user = usersById[post.author_id] || {};
  return {
    post_id: String(post.id),
    author_id: post.author_id ? String(post.author_id) : null,
    username: user.username || null,
    display_name: user.name || null,
    text: String(post.text || ''),
    created_at: post.created_at || null,
    lang: post.lang || null,
    metrics_json: JSON.stringify(post.public_metrics || {}),
    raw_json: JSON.stringify(post)
  };
}


const VERSION = '0.2.0-live-test';
const DEFILLAMA_URL = 'https://api.llama.fi/protocols';
const DEX_SEARCH_URL = 'https://api.dexscreener.com/latest/dex/search';
const DEX_PROFILES_URL = 'https://api.dexscreener.com/token-profiles/latest/v1';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const X_RECENT_SEARCH = 'https://api.x.com/2/tweets/search/recent';

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function iso() { return new Date().toISOString(); }

function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return '*';
  const configured = String(env.ALLOWED_ORIGINS || 'https://aipredictionengines.github.io,http://localhost:8787,http://127.0.0.1:5500')
    .split(',').map(x => x.trim()).filter(Boolean);
  return configured.includes(origin) ? origin : 'null';
}

function cors(request, env) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin(request, env),
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(request, env, data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors(request, env), ...extra }
  });
}

function text(request, env, body, status = 200) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...cors(request, env) } });
}

async function fetchJson(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal, headers: { Accept: 'application/json', ...(options.headers || {}) } });
    const bodyText = await response.text();
    let data = null;
    try { data = bodyText ? JSON.parse(bodyText) : null; } catch { /* keep null */ }
    if (!response.ok) {
      const err = new Error(`HTTP ${response.status}`);
      err.status = response.status;
      err.body = bodyText.slice(0, 1000);
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function dbPing(env) {
  const row = await env.DB.prepare('SELECT 1 AS ok').first();
  return row?.ok === 1;
}

async function startRun(env, source, trigger = 'manual') {
  const runId = uid('RUN');
  const startedAt = iso();
  await env.DB.prepare(`INSERT INTO source_runs
    (run_id, source, trigger, status, started_at, records_received, records_normalized, records_written, errors_count)
    VALUES (?, ?, ?, 'RUNNING', ?, 0, 0, 0, 0)`)
    .bind(runId, source, trigger, startedAt).run();
  return { runId, startedAt };
}

async function finishRun(env, runId, status, stats = {}) {
  const finishedAt = iso();
  await env.DB.prepare(`UPDATE source_runs SET status=?, finished_at=?, duration_ms=?, records_received=?, records_normalized=?, records_written=?, errors_count=?, detail=? WHERE run_id=?`)
    .bind(
      status,
      finishedAt,
      Number(stats.durationMs || 0),
      Number(stats.received || 0),
      Number(stats.normalized || 0),
      Number(stats.written || 0),
      Number(stats.errors || 0),
      stats.detail ? String(stats.detail).slice(0, 1000) : null,
      runId
    ).run();
}

async function recordError(env, { runId = null, source, code, message, severity = 'HIGH', httpStatus = null }) {
  await env.DB.prepare(`INSERT INTO source_errors
    (error_id, run_id, source, code, message, severity, http_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(uid('ERR'), runId, source, code, String(message).slice(0, 4000), severity, httpStatus, iso()).run();
}

function isAdmin(request, env) {
  if (String(env.ALLOW_PUBLIC_COLLECTORS || '').toLowerCase() === 'true') return true;
  if (!env.ADMIN_TOKEN) return false;
  return request.headers.get('Authorization') === `Bearer ${env.ADMIN_TOKEN}`;
}

function requireAdmin(request, env) {
  if (!env.ADMIN_TOKEN && String(env.ALLOW_PUBLIC_COLLECTORS || '').toLowerCase() !== 'true') {
    return json(request, env, { ok: false, error: 'ADMIN_TOKEN_NOT_CONFIGURED', hint: 'Set ADMIN_TOKEN as a Cloudflare Worker secret.' }, 503);
  }
  if (!isAdmin(request, env)) return json(request, env, { ok: false, error: 'UNAUTHORIZED' }, 401);
  return null;
}

async function collectDefillama(env, trigger = 'manual') {
  const started = Date.now();
  const { runId } = await startRun(env, 'defillama', trigger);
  try {
    const raw = await fetchJson(DEFILLAMA_URL, {}, 20000);
    if (!Array.isArray(raw)) throw new Error('Unexpected DeFiLlama payload: expected array');
    const items = raw.map(normalizeDefillama).filter(x => x.name && x.id);
    let written = 0;
    const nowAt = iso();
    const sql = `INSERT INTO projects
      (id, source, source_id, source_slug, name, symbol, category, chains_json, primary_chain, tvl, url, twitter, gecko_id, tokenless_heuristic, data_hash, first_seen_at, last_changed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        source=excluded.source, source_id=excluded.source_id, source_slug=excluded.source_slug,
        name=excluded.name, symbol=excluded.symbol, category=excluded.category,
        chains_json=excluded.chains_json, primary_chain=excluded.primary_chain, tvl=excluded.tvl,
        url=excluded.url, twitter=excluded.twitter, gecko_id=excluded.gecko_id,
        tokenless_heuristic=excluded.tokenless_heuristic, data_hash=excluded.data_hash,
        last_changed_at=excluded.last_changed_at
      WHERE projects.data_hash <> excluded.data_hash`;

    for (let i = 0; i < items.length; i += 75) {
      const statements = items.slice(i, i + 75).map(p => env.DB.prepare(sql).bind(
        p.id, p.source, p.source_id, p.source_slug, p.name, p.symbol, p.category,
        JSON.stringify(p.chains), p.primary_chain, p.tvl, p.url, p.twitter, p.gecko_id,
        p.tokenless_heuristic, p.data_hash, nowAt, nowAt
      ));
      const results = await env.DB.batch(statements);
      written += results.reduce((sum, r) => sum + Number(r?.meta?.changes || 0), 0);
    }

    const totalRow = await env.DB.prepare(`SELECT COUNT(*) AS n FROM projects WHERE source='defillama'`).first();
    const total = Number(totalRow?.n || 0);
    const status = items.length >= 100 && total >= 100 ? 'PASS' : (items.length > 0 ? 'PARTIAL_PASS' : 'FAIL');
    const durationMs = Date.now() - started;
    await finishRun(env, runId, status, {
      durationMs, received: raw.length, normalized: items.length, written, errors: 0,
      detail: `Stored ${total} DeFiLlama projects; ${written} rows changed in this run.`
    });
    return { ok: status !== 'FAIL', runId, source: 'defillama', status, received: raw.length, normalized: items.length, written, totalProjects: total, durationMs };
  } catch (error) {
    const durationMs = Date.now() - started;
    const code = error?.name === 'AbortError' ? 'TIMEOUT' : 'FETCH_OR_STORE_FAILED';
    await recordError(env, { runId, source: 'defillama', code, message: error?.message || String(error), httpStatus: error?.status || null });
    await finishRun(env, runId, 'FAIL', { durationMs, errors: 1, detail: error?.message || String(error) });
    return { ok: false, runId, source: 'defillama', status: 'FAIL', error: error?.message || String(error), durationMs };
  }
}

async function collectX(env, trigger = 'manual') {
  const started = Date.now();
  const { runId } = await startRun(env, 'x', trigger);
  if (!env.X_BEARER_TOKEN || !env.X_QUERY) {
    const detail = 'X_BEARER_TOKEN and X_QUERY are required.';
    await finishRun(env, runId, 'NOT_CONFIGURED', { durationMs: Date.now() - started, detail });
    return { ok: false, runId, source: 'x', status: 'NOT_CONFIGURED', error: detail };
  }
  try {
    const url = new URL(X_RECENT_SEARCH);
    url.searchParams.set('query', env.X_QUERY);
    url.searchParams.set('max_results', '10');
    url.searchParams.set('tweet.fields', 'created_at,author_id,public_metrics,lang');
    url.searchParams.set('expansions', 'author_id');
    url.searchParams.set('user.fields', 'username,name,verified');
    const raw = await fetchJson(url.toString(), { headers: { Authorization: `Bearer ${env.X_BEARER_TOKEN}` } }, 15000);
    const users = Object.fromEntries((raw?.includes?.users || []).map(u => [String(u.id), u]));
    const posts = (raw?.data || []).map(p => normalizeXPost(p, users));
    let written = 0;
    for (const p of posts) {
      const result = await env.DB.prepare(`INSERT INTO x_posts
        (post_id, author_id, username, display_name, text, created_at, lang, metrics_json, raw_json, first_seen_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(post_id) DO NOTHING`)
        .bind(p.post_id, p.author_id, p.username, p.display_name, p.text, p.created_at, p.lang, p.metrics_json, p.raw_json, iso()).run();
      written += Number(result?.meta?.changes || 0);
    }
    const durationMs = Date.now() - started;
    await finishRun(env, runId, 'PASS', { durationMs, received: posts.length, normalized: posts.length, written, detail: `Query returned ${posts.length} posts.` });
    return { ok: true, runId, source: 'x', status: 'PASS', received: posts.length, written, durationMs };
  } catch (error) {
    const durationMs = Date.now() - started;
    await recordError(env, { runId, source: 'x', code: 'X_FETCH_FAILED', message: error?.message || String(error), httpStatus: error?.status || null });
    await finishRun(env, runId, 'FAIL', { durationMs, errors: 1, detail: error?.message || String(error) });
    return { ok: false, runId, source: 'x', status: 'FAIL', error: error?.message || String(error), durationMs };
  }
}

function projectRow(row) {
  let chains = [];
  try { chains = JSON.parse(row.chains_json || '[]'); } catch { chains = []; }
  return {
    id: row.id,
    source: row.source,
    kind: 'protocol',
    name: row.name,
    symbol: row.symbol,
    chain: row.primary_chain,
    chains,
    category: row.category,
    address: null,
    description: null,
    url: row.url,
    twitter: row.twitter,
    tvl: row.tvl,
    gecko_id: row.gecko_id,
    tokenlessHeuristic: Boolean(row.tokenless_heuristic),
    firstSeenAt: row.first_seen_at,
    lastChangedAt: row.last_changed_at,
    isDemo: false
  };
}

async function listProjects(env, url) {
  const limit = clampLimit(url.searchParams.get('limit'), 200, 500);
  const offset = Math.max(0, Number.parseInt(url.searchParams.get('offset') || '0', 10) || 0);
  const rows = await env.DB.prepare(`SELECT * FROM projects ORDER BY COALESCE(tvl,0) DESC, name ASC LIMIT ? OFFSET ?`).bind(limit, offset).all();
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM projects').first();
  return { items: (rows.results || []).map(projectRow), total: Number(count?.n || 0), limit, offset };
}

async function searchProjects(env, url) {
  const q = String(url.searchParams.get('q') || '').trim();
  if (!q) return { items: [], total: 0, q };
  const limit = clampLimit(url.searchParams.get('limit'), 50, 100);
  const needle = `%${q.toLowerCase()}%`;
  const rows = await env.DB.prepare(`SELECT * FROM projects
    WHERE lower(name) LIKE ? OR lower(COALESCE(symbol,'')) LIKE ? OR lower(COALESCE(category,'')) LIKE ?
       OR lower(COALESCE(chains_json,'')) LIKE ? OR lower(COALESCE(source_slug,'')) LIKE ?
    ORDER BY COALESCE(tvl,0) DESC, name ASC LIMIT ?`)
    .bind(needle, needle, needle, needle, needle, limit).all();
  return { items: (rows.results || []).map(projectRow), total: (rows.results || []).length, q, limit };
}

async function dexSearch(env, url) {
  const q = String(url.searchParams.get('q') || '').trim();
  if (!q) return { items: [], total: 0, q };
  const run = await startRun(env, 'dexscreener', 'user-search');
  const started = Date.now();
  try {
    const endpoint = `${DEX_SEARCH_URL}?q=${encodeURIComponent(q)}`;
    const raw = await fetchJson(endpoint, {}, 12000);
    const items = (Array.isArray(raw?.pairs) ? raw.pairs : []).slice(0, 50).map(normalizeDexPair);
    let written = 0;
    for (const item of items.slice(0, 20)) {
      const r = await env.DB.prepare(`INSERT INTO market_snapshots
        (snapshot_id, source, chain, token_address, pair_address, captured_at, data_json)
        VALUES (?, 'dexscreener', ?, ?, ?, ?, ?)`)
        .bind(uid('MKT'), item.chain, item.address, item.pairAddress, iso(), JSON.stringify(item)).run();
      written += Number(r?.meta?.changes || 0);
    }
    await finishRun(env, run.runId, 'PASS', { durationMs: Date.now() - started, received: items.length, normalized: items.length, written, detail: `DEX query: ${q}` });
    return { items, total: items.length, q, runId: run.runId, status: 'PASS' };
  } catch (error) {
    await recordError(env, { runId: run.runId, source: 'dexscreener', code: 'DEX_SEARCH_FAILED', message: error?.message || String(error), httpStatus: error?.status || null });
    await finishRun(env, run.runId, 'FAIL', { durationMs: Date.now() - started, errors: 1, detail: error?.message || String(error) });
    throw error;
  }
}

async function dexProfiles(env) {
  const run = await startRun(env, 'dexscreener', 'latest-profiles');
  const started = Date.now();
  try {
    const raw = await fetchJson(DEX_PROFILES_URL, {}, 12000);
    const arr = Array.isArray(raw) ? raw : [];
    const items = arr.map(normalizeDexProfile);
    await finishRun(env, run.runId, 'PASS', { durationMs: Date.now() - started, received: items.length, normalized: items.length, detail: 'Latest token profiles.' });
    return { items, total: items.length, runId: run.runId, status: 'PASS' };
  } catch (error) {
    await recordError(env, { runId: run.runId, source: 'dexscreener', code: 'DEX_PROFILES_FAILED', message: error?.message || String(error), httpStatus: error?.status || null });
    await finishRun(env, run.runId, 'FAIL', { durationMs: Date.now() - started, errors: 1, detail: error?.message || String(error) });
    throw error;
  }
}

async function coinGeckoContract(env, url) {
  const platform = String(url.searchParams.get('platform') || '').trim();
  const address = String(url.searchParams.get('address') || '').trim();
  if (!platform || !address) return { statusCode: 400, body: { ok: false, error: 'platform and address are required' } };
  if (!env.COINGECKO_API_KEY) return { statusCode: 503, body: { ok: false, source: 'coingecko', status: 'NOT_CONFIGURED', error: 'COINGECKO_API_KEY is not configured.' } };
  const run = await startRun(env, 'coingecko', 'cross-check');
  const started = Date.now();
  try {
    const endpoint = `${COINGECKO_BASE}/coins/${encodeURIComponent(platform)}/contract/${encodeURIComponent(address)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
    const raw = await fetchJson(endpoint, { headers: { 'x-cg-demo-api-key': env.COINGECKO_API_KEY } }, 12000);
    const item = normalizeCoinGecko(raw, platform, address);
    await env.DB.prepare(`INSERT INTO market_snapshots
      (snapshot_id, source, chain, token_address, pair_address, captured_at, data_json)
      VALUES (?, 'coingecko', ?, ?, NULL, ?, ?)`)
      .bind(uid('MKT'), platform, address, iso(), JSON.stringify(item)).run();
    await finishRun(env, run.runId, 'PASS', { durationMs: Date.now() - started, received: 1, normalized: 1, written: 1, detail: `${platform}:${address}` });
    return { statusCode: 200, body: { ok: true, status: 'PASS', runId: run.runId, item } };
  } catch (error) {
    await recordError(env, { runId: run.runId, source: 'coingecko', code: 'COINGECKO_FAILED', message: error?.message || String(error), httpStatus: error?.status || null });
    await finishRun(env, run.runId, 'FAIL', { durationMs: Date.now() - started, errors: 1, detail: error?.message || String(error) });
    return { statusCode: error?.status || 502, body: { ok: false, source: 'coingecko', status: 'FAIL', runId: run.runId, error: error?.message || String(error) } };
  }
}

async function latestRuns(env) {
  const rows = await env.DB.prepare(`SELECT r.* FROM source_runs r
    INNER JOIN (SELECT source, MAX(started_at) AS max_started FROM source_runs GROUP BY source) latest
    ON r.source=latest.source AND r.started_at=latest.max_started
    ORDER BY r.source`).all();
  return rows.results || [];
}

async function debugExport(env) {
  const [runs, errors, projectCount, marketCount, xCount] = await Promise.all([
    env.DB.prepare('SELECT * FROM source_runs ORDER BY started_at DESC LIMIT 100').all(),
    env.DB.prepare('SELECT * FROM source_errors ORDER BY created_at DESC LIMIT 100').all(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM projects').first(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM market_snapshots').first(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM x_posts').first()
  ]);
  return {
    meta: { product: 'Airdrop Intelligence Radar', version: VERSION, exportedAt: iso(), mode: 'cloudflare-worker-d1' },
    counts: { projects: Number(projectCount?.n || 0), marketSnapshots: Number(marketCount?.n || 0), xPosts: Number(xCount?.n || 0) },
    latestSources: await latestRuns(env),
    runs: runs.results || [],
    errors: errors.results || []
  };
}

async function health(env) {
  const database = await dbPing(env);
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM projects').first();
  return {
    ok: database,
    product: 'Airdrop Intelligence Radar API',
    version: VERSION,
    status: database ? 'PASS' : 'FAIL',
    database: database ? 'PASS' : 'FAIL',
    projects: Number(count?.n || 0),
    configured: {
      defillama: true,
      dexscreener: true,
      coingecko: Boolean(env.COINGECKO_API_KEY),
      x: Boolean(env.X_BEARER_TOKEN && env.X_QUERY)
    },
    latestRuns: await latestRuns(env),
    now: iso()
  };
}

async function route(request, env) {
  const url = new URL(request.url);
  const p = url.pathname.replace(/\/+$/, '') || '/';

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(request, env) });
  if (p === '/') return text(request, env, `Airdrop Radar API ${VERSION}\nGET /health\n`);

  if (p === '/health' && request.method === 'GET') return json(request, env, await health(env));
  if (p === '/api/projects' && request.method === 'GET') return json(request, env, await listProjects(env, url));
  if (p === '/api/search' && request.method === 'GET') return json(request, env, await searchProjects(env, url));
  if (p === '/api/dex/search' && request.method === 'GET') return json(request, env, await dexSearch(env, url));
  if (p === '/api/dex/profiles' && request.method === 'GET') return json(request, env, await dexProfiles(env));

  if (p === '/api/coingecko/contract' && request.method === 'GET') {
    const result = await coinGeckoContract(env, url);
    return json(request, env, result.body, result.statusCode);
  }

  if (p === '/api/x/feed' && request.method === 'GET') {
    const limit = clampLimit(url.searchParams.get('limit'), 30, 100);
    const rows = await env.DB.prepare('SELECT post_id, author_id, username, display_name, text, created_at, lang, metrics_json FROM x_posts ORDER BY created_at DESC LIMIT ?').bind(limit).all();
    const items = (rows.results || []).map(r => ({ ...r, metrics: (() => { try { return JSON.parse(r.metrics_json || '{}'); } catch { return {}; } })() }));
    return json(request, env, { items, total: items.length, configured: Boolean(env.X_BEARER_TOKEN && env.X_QUERY) });
  }

  if (p === '/api/debug/runs' && request.method === 'GET') {
    const limit = clampLimit(url.searchParams.get('limit'), 50, 200);
    const rows = await env.DB.prepare('SELECT * FROM source_runs ORDER BY started_at DESC LIMIT ?').bind(limit).all();
    return json(request, env, { items: rows.results || [] });
  }
  if (p === '/api/debug/errors' && request.method === 'GET') {
    const limit = clampLimit(url.searchParams.get('limit'), 50, 200);
    const rows = await env.DB.prepare('SELECT * FROM source_errors ORDER BY created_at DESC LIMIT ?').bind(limit).all();
    return json(request, env, { items: rows.results || [] });
  }
  if (p === '/api/debug/export' && request.method === 'GET') return json(request, env, await debugExport(env));

  if (p === '/api/collect/defillama' && request.method === 'POST') {
    const denied = requireAdmin(request, env); if (denied) return denied;
    const out = await collectDefillama(env, 'manual');
    return json(request, env, out, out.ok ? 200 : 502);
  }
  if (p === '/api/collect/x' && request.method === 'POST') {
    const denied = requireAdmin(request, env); if (denied) return denied;
    const out = await collectX(env, 'manual');
    return json(request, env, out, out.ok ? 200 : (out.status === 'NOT_CONFIGURED' ? 503 : 502));
  }

  return json(request, env, { ok: false, error: 'NOT_FOUND', path: p }, 404);
}

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (error) {
      try { await recordError(env, { source: 'worker', code: 'UNHANDLED', message: error?.stack || error?.message || String(error), severity: 'CRITICAL' }); } catch { /* DB may itself be unavailable */ }
      return json(request, env, { ok: false, error: 'INTERNAL_ERROR', message: error?.message || String(error), version: VERSION }, 500);
    }
  },

  async scheduled(controller, env, ctx) {
    if (controller.cron === '15 */6 * * *') {
      ctx.waitUntil(collectDefillama(env, 'cron'));
      return;
    }
    if (controller.cron === '45 * * * *') {
      if (env.X_BEARER_TOKEN && env.X_QUERY) ctx.waitUntil(collectX(env, 'cron'));
      return;
    }
    ctx.waitUntil(collectDefillama(env, `cron:${controller.cron}`));
  }
};

export { collectDefillama, collectX, projectRow };