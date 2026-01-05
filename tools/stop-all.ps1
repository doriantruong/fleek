# Stop Mercur dev services by closing processes listening on the common ports.
# Ports: 9000 (backend), 5173 (admin), 5174 (vendor), 3000 (storefront).
# Note: This will stop any process bound to these ports. Make sure you don't have other apps on them.

$ErrorActionPreference = 'Continue'
$ports = 9000,5173,5174,3000

foreach ($port in $ports) {
  Write-Host "Stopping processes on port $($port)..."
  try {
    $conns = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
    if (-not $conns) { Write-Host "  No listener on $($port)"; continue }
    $processIds = $conns | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processIds) {
      try {
        $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($proc) {
          Write-Host "  Killing PID $($processId) ($($proc.ProcessName))"
          Stop-Process -Id $processId -Force
        }
      } catch { Write-Warning "  Failed to kill PID $($processId): $($_.Exception.Message)" }
    }
  } catch { Write-Warning "  Error checking port $($port): $($_.Exception.Message)" }
}

Write-Host "Done." -ForegroundColor Green
