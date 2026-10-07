param(
  [string]$Api = "https://bitter-disk-3576weather-edge-worker.digitaldragoworkspace.workers.dev",
  [Parameter(Mandatory=$true)][string]$AdminToken,
  [string]$CoinGeckoPlatform = "",
  [string]$CoinGeckoAddress = ""
)

$ErrorActionPreference = "Stop"
$headers = @{ Authorization = "Bearer $AdminToken" }

Write-Host "[1] Health" -ForegroundColor Cyan
$health = Invoke-RestMethod "$Api/health"
$health | ConvertTo-Json -Depth 6
if ($health.database -ne "PASS") { throw "D1 database is not PASS" }

Write-Host "[2] DeFiLlama collector" -ForegroundColor Cyan
$collect = Invoke-RestMethod -Method Post -Uri "$Api/api/collect/defillama" -Headers $headers
$collect | ConvertTo-Json -Depth 6
if ($collect.received -lt 100 -or $collect.totalProjects -lt 100) { throw "DeFiLlama >=100 gate failed" }

Write-Host "[3] Projects" -ForegroundColor Cyan
$projects = Invoke-RestMethod "$Api/api/projects?limit=100"
Write-Host "D1 total: $($projects.total)"
if ($projects.total -lt 100) { throw "D1 project count gate failed" }

Write-Host "[4] Search Aave" -ForegroundColor Cyan
$search = Invoke-RestMethod "$Api/api/search?q=aave"
$search | ConvertTo-Json -Depth 5
if ($search.total -lt 1) { throw "Search gate failed" }

Write-Host "[5] DEX search" -ForegroundColor Cyan
$dex = Invoke-RestMethod "$Api/api/dex/search?q=USDC"
Write-Host "DEX pairs: $($dex.total)"
if ($dex.total -lt 1) { throw "DEX gate failed" }

if ($CoinGeckoPlatform -and $CoinGeckoAddress) {
  Write-Host "[6] CoinGecko cross-check" -ForegroundColor Cyan
  $cg = Invoke-RestMethod "$Api/api/coingecko/contract?platform=$([uri]::EscapeDataString($CoinGeckoPlatform))&address=$([uri]::EscapeDataString($CoinGeckoAddress))"
  $cg | ConvertTo-Json -Depth 6
} else {
  Write-Host "[6] CoinGecko skipped: provide -CoinGeckoPlatform and -CoinGeckoAddress" -ForegroundColor Yellow
}

Write-Host "[7] X stored feed" -ForegroundColor Cyan
$x = Invoke-RestMethod "$Api/api/x/feed?limit=10"
Write-Host "X configured: $($x.configured); stored posts: $($x.total)"

Write-Host "[8] Backend debug export" -ForegroundColor Cyan
$debug = Invoke-RestMethod "$Api/api/debug/export"
$out = Join-Path $PWD ("airdrop-radar-backend-debug-" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + ".json")
$debug | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 $out
Write-Host "Saved: $out" -ForegroundColor Green

Write-Host "FOUNDATION TEST PASS" -ForegroundColor Green