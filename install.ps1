# Installs chatminimap.js into the local Cursor workbench and patches workbench.html.
# Idempotent: a second run only refreshes the script file.
param(
    [string]$WorkbenchDir
)

$ErrorActionPreference = 'Stop'

if (-not $WorkbenchDir) {
    $WorkbenchDir = Join-Path $env:LOCALAPPDATA 'Programs\cursor\resources\app\out\vs\code\electron-sandbox\workbench'
}

$src = Join-Path $PSScriptRoot 'chatminimap.js'
$html = Join-Path $WorkbenchDir 'workbench.html'
$destJs = Join-Path $WorkbenchDir 'chatminimap.js'
$bak = Join-Path $WorkbenchDir 'workbench.html.cmm.bak'
$tag = '<script src="./chatminimap.js" defer></script>'
$anchor = '<script src="./workbench.js"'

if (-not (Test-Path -LiteralPath $src)) {
    throw 'chatminimap.js was not found next to install.ps1.'
}
if (-not (Test-Path -LiteralPath $html)) {
    throw 'workbench.html was not found under %LOCALAPPDATA%\Programs\cursor\resources\app\out\vs\code\electron-sandbox\workbench\.'
}

$utf8 = New-Object System.Text.UTF8Encoding $false
$content = [System.IO.File]::ReadAllText($html, $utf8)

if ($content.Contains($tag)) {
    Copy-Item -LiteralPath $src -Destination $destJs -Force
    Write-Output 'Already installed. Updated chatminimap.js.'
    exit 0
}

$idx = $content.IndexOf($anchor)
if ($idx -lt 0) {
    throw 'Could not find the workbench.js script tag in workbench.html. workbench.html was not modified.'
}

$lineStart = $content.LastIndexOf("`n", $idx)
if ($lineStart -lt 0) {
    $lineStart = 0
} else {
    $lineStart++
}
$indent = $content.Substring($lineStart, $idx - $lineStart)
if ($indent -notmatch '^\s*$') {
    $indent = ''
}

$lineEnd = $content.IndexOf("`n", $idx)
if ($lineEnd -lt 0) {
    throw 'Could not find the end of the workbench.js line. workbench.html was not modified.'
}

$newline = "`n"
if ($lineEnd -gt 0 -and $content[$lineEnd - 1] -eq [char]13) {
    $newline = "`r`n"
}

# Current file has no minimap tag (fresh install or Cursor update). Keep this copy.
Copy-Item -LiteralPath $html -Destination $bak -Force

$updated = $content.Insert($lineEnd + 1, $indent + $tag + $newline)
[System.IO.File]::WriteAllText($html, $updated, $utf8)
Copy-Item -LiteralPath $src -Destination $destJs -Force
Write-Output 'Installed. Restart Cursor.'
