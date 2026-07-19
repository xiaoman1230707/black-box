Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$sourceScript = (Resolve-Path (Join-Path $PSScriptRoot 'build-image.ps1')).Path
$fixture = Join-Path $env:TEMP ('black-box-build-image-test-' + [guid]::NewGuid().ToString('N'))
$repo = Join-Path $fixture 'repo'
$scriptDir = Join-Path $repo 'deploy\production\scripts'
$fakeBin = Join-Path $fixture 'bin'
$originalPath = $env:PATH

function Invoke-BuildFixture {
  param(
    [Parameter(Mandatory = $true)]
    [string]$OutputDir,
    [Parameter(Mandatory = $true)]
    [string]$ReleaseSha
  )

  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $log = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File `
      (Join-Path $scriptDir 'build-image.ps1') `
      -ReleaseSha $ReleaseSha `
      -OutputDir $OutputDir 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousPreference
  }
  return [pscustomobject]@{
    ExitCode = $exitCode
    Output = ($log | Out-String)
  }
}

try {
  New-Item -ItemType Directory -Path $scriptDir,$fakeBin,(Join-Path $repo 'backend\backend\posts') | Out-Null
  Copy-Item -LiteralPath $sourceScript -Destination $scriptDir
  Set-Content -Encoding ASCII -LiteralPath (Join-Path $fakeBin 'docker.cmd') -Value '@echo FAKE_DOCKER_CALLED & exit /b 99'

  git -C $repo init --quiet
  git -C $repo config user.name fixture
  git -C $repo config user.email fixture@example.invalid
  git -C $repo add deploy/production/scripts/build-image.ps1
  git -C $repo commit --quiet -m fixture
  $releaseSha = (git -C $repo rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0) { throw 'Unable to create clean Git fixture' }

  $env:PATH = "$fakeBin;$originalPath"

  $rootResult = Invoke-BuildFixture -OutputDir $repo -ReleaseSha $releaseSha
  if ($rootResult.ExitCode -eq 0 -or $rootResult.Output -notmatch 'OutputDir must be outside the repository') {
    throw "Repository root was not rejected before Docker invocation: $($rootResult.Output)"
  }

  $childResult = Invoke-BuildFixture -OutputDir (Join-Path $repo 'artifacts') -ReleaseSha $releaseSha
  if ($childResult.ExitCode -eq 0 -or $childResult.Output -notmatch 'OutputDir must be outside the repository') {
    throw "Repository child was not rejected: $($childResult.Output)"
  }

  Write-Output 'build-image path tests passed: 2'
} finally {
  $env:PATH = $originalPath
  if (Test-Path -LiteralPath $fixture) {
    $resolved = (Resolve-Path -LiteralPath $fixture).Path
    $tempRoot = (Resolve-Path -LiteralPath $env:TEMP).Path
    if (-not $resolved.StartsWith($tempRoot,[System.StringComparison]::OrdinalIgnoreCase)) {
      throw 'Refusing fixture cleanup outside TEMP'
    }
    Remove-Item -LiteralPath $fixture -Recurse -Force
  }
}
