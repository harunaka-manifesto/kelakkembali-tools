<#
    Kelak Kembali — local static server.

    The app has to be served over http://, not opened as a file: Supabase
    stores its auth session in localStorage (which a file:// page cannot keep
    reliably) and the logo PNGs would taint the export canvas.

    This needs nothing installed — it is stock .NET via PowerShell. If you
    would rather use Node, `npx serve -l 4173 .` does the same job.

        powershell -ExecutionPolicy Bypass -File serve.ps1

    Ctrl+C to stop.
#>

param(
  [int]$Port = 4173
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.sql'  = 'text/plain; charset=utf-8'
  '.md'   = 'text/plain; charset=utf-8'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.svg'  = 'image/svg+xml'
  '.woff2' = 'font/woff2'
  '.ico'  = 'image/x-icon'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
  $listener.Start()
} catch {
  Write-Host "Could not listen on port $Port. Is something already using it?" -ForegroundColor Red
  throw
}

Write-Host ""
Write-Host "  Kelak Kembali serving $root" -ForegroundColor DarkGray
Write-Host "  http://localhost:$Port" -ForegroundColor Green
Write-Host "  Ctrl+C to stop" -ForegroundColor DarkGray
Write-Host ""

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response

    # One malformed request must never take the server down with it.
    try {
      $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/')
      if ($rel -eq '') { $rel = 'index.html' }

      $path = Join-Path $root $rel

      # Never serve anything outside the project directory, whatever the URL says.
      $full = [IO.Path]::GetFullPath($path)
      $rootFull = [IO.Path]::GetFullPath($root)
      $inside = $full.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)

      if ($inside -and (Test-Path -LiteralPath $full -PathType Leaf)) {
        $bytes = [IO.File]::ReadAllBytes($full)
        $ext = [IO.Path]::GetExtension($full).ToLower()
        $type = $mime[$ext]
        if (-not $type) { $type = 'application/octet-stream' }

        $res.StatusCode = 200
        $res.ContentType = $type
        # No caching: an edited file should show up on the next reload, always.
        $res.Headers.Add('Cache-Control', 'no-store')
        Write-Host ("  200  /" + $rel) -ForegroundColor DarkGray
      } else {
        $bytes = [Text.Encoding]::UTF8.GetBytes('Not found')
        $res.StatusCode = 404
        $res.ContentType = 'text/plain; charset=utf-8'
        Write-Host ("  404  /" + $rel) -ForegroundColor DarkYellow
      }

      # Close(bytes, willBlock) sets Content-Length itself and flushes. Setting
      # ContentLength64 by hand does not survive a later Headers.Add, which
      # leaves the header shorter than the body and aborts the write.
      $res.Close($bytes, $true)
    } catch {
      Write-Host ("  500  " + $_.Exception.Message) -ForegroundColor Red
      try { $res.Abort() } catch { }
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
