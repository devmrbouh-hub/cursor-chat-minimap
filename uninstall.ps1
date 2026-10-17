# Removes the chat minimap and restores workbench.html from the install backup.
# Idempotent. Does not restore a backup over a workbench.html that Cursor has already replaced.
param(
    [string]$WorkbenchDir
)

$ErrorActionPreference = 'Stop'

if (-not $WorkbenchDir) {
    $WorkbenchDir = Join-Path $env:LOCALAPPDATA 'Programs\cursor\resources\app\out\vs\code\electron-sandbox\workbench'
}

$html = Join-Path $WorkbenchDir 'workbench.html'
$destJs = Join-Path $WorkbenchDir 'chatminimap.js'
$bak = Join-Path $WorkbenchDir 'workbench.html.cmm.bak'
$tag = '<script src="./chatminimap.js" defer></script>'

$did = $false

if (Test-Path -LiteralPath $destJs) {
    Remove-Item -LiteralPath $destJs -Force
    Write-Output 'Removed chatminimap.js.'
    $did = $true
}

if (-not (Test-Path -LiteralPath $html)) {
    if (Test-Path -LiteralPath $bak) {
        Remove-Item -LiteralPath $bak -Force
        Write-Output 'Removed stale backup.'
        $did = $true
    }
    if (-not $did) {
        Write-Output 'Nothing to uninstall.'
    }
    exit 0
}

$utf8 = New-Object System.Text.UTF8Encoding $false
$content = [System.IO.File]::ReadAllText($html, $utf8)

if ($content.Contains($tag)) {
    if (Test-Path -LiteralPath $bak) {
        Copy-Item -LiteralPath $bak -Destination $html -Force
        Remove-Item -LiteralPath $bak -Force
        Write-Output 'Restored workbench.html from backup.'
    } else {
        $updated = [regex]::Replace($content, '(?m)^[ \t]*' + [regex]::Escape($tag) + '[ \t]*\r?\n', '', 1)
        if ($updated -eq $content) {
            $updated = $content.Replace($tag, '')
        }
        if ($updated -eq $content) {
            throw 'The minimap tag is present, but it could not be removed and no backup exists.'
        }
        [System.IO.File]::WriteAllText($html, $updated, $utf8)
        Write-Output 'Removed the minimap script tag from workbench.html.'
    }
    $did = $true
} elseif (Test-Path -LiteralPath $bak) {
    Remove-Item -LiteralPath $bak -Force
    Write-Output 'workbench.html has no minimap tag. Removed stale backup without restoring it.'
    $did = $true
}

if (-not $did) {
    Write-Output 'Already uninstalled.'
}
