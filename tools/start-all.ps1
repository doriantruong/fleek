# Run all services for Mercur monorepo
# Requirements: Postgres/Redis running, ports free (9000, 5173, 5174, 3000).

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$commands = @(
  @{ Name = 'backend';   Dir = Join-Path $root '..\mercur-main\apps\backend'; Command = 'cmd /c "yarn dev"' },
  @{ Name = 'admin';     Dir = Join-Path $root '..\admin-panel-main';           Command = 'cmd /c "yarn dev --host --port 5173"' },
  @{ Name = 'vendor';    Dir = Join-Path $root '..\vendor-panel-main';          Command = 'cmd /c "node .yarn\releases\yarn-3.2.1.cjs dev --host --port 5174"' },
  @{ Name = 'storefront';Dir = Join-Path $root '..\b2c-marketplace-storefront-main'; Command = 'cmd /c "npm run dev -- --hostname 0.0.0.0 --port 3000"' }
)

foreach ($c in $commands) {
  Write-Host "Starting $($c.Name)..."
  Start-Process -FilePath powershell -ArgumentList "-NoExit", "-Command", "cd `"$($c.Dir)`"; $($c.Command)" -WorkingDirectory $c.Dir
}

Write-Host "All processes launched. Check new PowerShell windows for logs." -ForegroundColor Green
