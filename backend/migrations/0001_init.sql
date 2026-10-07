PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_id TEXT,
  source_slug TEXT,
  name TEXT NOT NULL,
  symbol TEXT,
  category TEXT,
  chains_json TEXT NOT NULL DEFAULT '[]',
  primary_chain TEXT,
  tvl REAL,
  url TEXT,
  twitter TEXT,
  gecko_id TEXT,
  tokenless_heuristic INTEGER NOT NULL DEFAULT 0,
  data_hash TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_changed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
CREATE INDEX IF NOT EXISTS idx_projects_symbol ON projects(symbol);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_source ON projects(source);
CREATE INDEX IF NOT EXISTS idx_projects_tvl ON projects(tvl DESC);

CREATE TABLE IF NOT EXISTS source_runs (
  run_id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  trigger TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  duration_ms INTEGER DEFAULT 0,
  records_received INTEGER DEFAULT 0,
  records_normalized INTEGER DEFAULT 0,
  records_written INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  detail TEXT
);

CREATE INDEX IF NOT EXISTS idx_source_runs_source_time ON source_runs(source, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_source_runs_status ON source_runs(status);

CREATE TABLE IF NOT EXISTS source_errors (
  error_id TEXT PRIMARY KEY,
  run_id TEXT,
  source TEXT NOT NULL,
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL,
  http_status INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY(run_id) REFERENCES source_runs(run_id)
);

CREATE INDEX IF NOT EXISTS idx_source_errors_time ON source_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_source_errors_source ON source_errors(source);

CREATE TABLE IF NOT EXISTS source_records (
  record_id TEXT PRIMARY KEY,
  run_id TEXT,
  source TEXT NOT NULL,
  entity_id TEXT,
  data_hash TEXT,
  fetched_at TEXT NOT NULL,
  raw_json TEXT,
  FOREIGN KEY(run_id) REFERENCES source_runs(run_id)
);

CREATE TABLE IF NOT EXISTS market_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  chain TEXT,
  token_address TEXT,
  pair_address TEXT,
  captured_at TEXT NOT NULL,
  data_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_market_token_time ON market_snapshots(token_address, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_source_time ON market_snapshots(source, captured_at DESC);

CREATE TABLE IF NOT EXISTS x_posts (
  post_id TEXT PRIMARY KEY,
  author_id TEXT,
  username TEXT,
  display_name TEXT,
  text TEXT NOT NULL,
  created_at TEXT,
  lang TEXT,
  metrics_json TEXT,
  raw_json TEXT,
  first_seen_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_x_posts_created ON x_posts(created_at DESC);

CREATE TABLE IF NOT EXISTS evidence (
  evidence_id TEXT PRIMARY KEY,
  project_id TEXT,
  source TEXT NOT NULL,
  claim TEXT,
  confidence REAL,
  observed_at TEXT NOT NULL,
  payload_json TEXT,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS decisions (
  decision_id TEXT PRIMARY KEY,
  project_id TEXT,
  status TEXT NOT NULL,
  score REAL,
  engine_version TEXT,
  created_at TEXT NOT NULL,
  input_json TEXT,
  output_json TEXT,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS human_overrides (
  override_id TEXT PRIMARY KEY,
  decision_id TEXT,
  from_status TEXT,
  to_status TEXT,
  reason TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(decision_id) REFERENCES decisions(decision_id)
);