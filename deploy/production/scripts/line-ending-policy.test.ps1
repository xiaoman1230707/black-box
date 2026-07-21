param(
  [string]$Treeish
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path

if (-not $Treeish) {
  $treeOutput = @(git -C $repoRoot write-tree)
  if ($LASTEXITCODE -ne 0 -or $treeOutput.Count -ne 1) {
    throw 'Unable to create a tree from the current index'
  }
  $Treeish = $treeOutput[0].Trim()
  if (-not $Treeish) {
    throw 'Git returned an empty tree identifier'
  }
}

$shellFiles = @(
  git -C $repoRoot ls-tree -r --name-only $Treeish -- deploy/production |
    Where-Object { $_ -like '*.sh' }
)
if ($LASTEXITCODE -ne 0) {
  throw "Unable to list production shell files from $Treeish"
}
if ($shellFiles.Count -eq 0) {
  throw "No production shell files were found in $Treeish"
}

function Get-GitBlobBytes([string]$Revision, [string]$RelativePath) {
  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = 'git'
  $startInfo.WorkingDirectory = $repoRoot
  $startInfo.Arguments = "cat-file blob `"$Revision`:$RelativePath`""
  $startInfo.UseShellExecute = $false
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true

  $process = [System.Diagnostics.Process]::new()
  $process.StartInfo = $startInfo
  if (-not $process.Start()) {
    throw "Unable to read Git blob for $RelativePath"
  }

  $buffer = [System.IO.MemoryStream]::new()
  try {
    $process.StandardOutput.BaseStream.CopyTo($buffer)
    $errorText = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) {
      throw "Unable to read Git blob for $RelativePath`: $errorText"
    }
    return $buffer.ToArray()
  } finally {
    $buffer.Dispose()
    $process.Dispose()
  }
}

function Get-LineEndingCounts([byte[]]$Bytes) {
  $crlfCount = 0
  $bareCrCount = 0
  for ($index = 0; $index -lt $Bytes.Length; $index++) {
    if ($Bytes[$index] -ne 13) {
      continue
    }
    if ($index + 1 -lt $Bytes.Length -and $Bytes[$index + 1] -eq 10) {
      $crlfCount++
    } else {
      $bareCrCount++
    }
  }
  return @{ crlf = $crlfCount; bareCr = $bareCrCount }
}

function Get-Sha256([byte[]]$Bytes) {
  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($sha256.ComputeHash($Bytes))).Replace('-', '')
  } finally {
    $sha256.Dispose()
  }
}

$failures = [System.Collections.Generic.List[string]]::new()
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("black-box-line-endings-" + [guid]::NewGuid().ToString('N'))
$archivePath = Join-Path $tempRoot 'deployment-bundle.tar'
$extractRoot = Join-Path $tempRoot 'extracted'

try {
  New-Item -ItemType Directory -Path $extractRoot -Force | Out-Null
  git -C $repoRoot archive --format=tar -o $archivePath $Treeish deploy/production
  if ($LASTEXITCODE -ne 0) {
    throw "git archive failed for $Treeish"
  }
  tar -xf $archivePath -C $extractRoot
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to extract the deployment bundle for $Treeish"
  }

  foreach ($relative in $shellFiles) {
    $attributes = @(git -C $repoRoot check-attr --source=$Treeish text eol -- $relative)
    if ($LASTEXITCODE -ne 0) {
      throw "git check-attr failed for $relative"
    }
    if ($attributes -notcontains "$relative`: text: set") {
      $failures.Add("$relative does not resolve text=set")
    }
    if ($attributes -notcontains "$relative`: eol: lf") {
      $failures.Add("$relative does not resolve eol=lf")
    }

    $blobBytes = Get-GitBlobBytes $Treeish $relative
    $bundleBytes = [System.IO.File]::ReadAllBytes((Join-Path $extractRoot $relative))
    $blobCounts = Get-LineEndingCounts $blobBytes
    $bundleCounts = Get-LineEndingCounts $bundleBytes

    if ($blobCounts.crlf -ne 0 -or $blobCounts.bareCr -ne 0) {
      $failures.Add("Git blob $relative contains CRLF=$($blobCounts.crlf) bareCR=$($blobCounts.bareCr)")
    }
    if ($bundleCounts.crlf -ne 0 -or $bundleCounts.bareCr -ne 0) {
      $failures.Add("Bundle file $relative contains CRLF=$($bundleCounts.crlf) bareCR=$($bundleCounts.bareCr)")
    }

    $blobHash = Get-Sha256 $blobBytes
    $bundleHash = Get-Sha256 $bundleBytes
    if ($blobHash -ne $bundleHash) {
      $failures.Add("Bundle file $relative differs from its Git blob")
    }
  }
} finally {
  if (Test-Path -LiteralPath $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
  }
}

if ($failures.Count -ne 0) {
  throw ($failures -join [Environment]::NewLine)
}

Write-Output "line ending policy tests passed: $($shellFiles.Count) shell files from tree $Treeish"
