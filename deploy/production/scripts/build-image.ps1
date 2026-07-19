param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-f]{40}$')]
  [string]$ReleaseSha,

  [Parameter(Mandatory = $true)]
  [string]$OutputDir,

  [string]$ImageName = 'black-box-api'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$status = git -C $repoRoot status --porcelain
if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect Git worktree' }
if ($status) { throw 'Release worktree must be clean' }

$head = (git -C $repoRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $head -ne $ReleaseSha) {
  throw 'ReleaseSha must match the clean worktree HEAD'
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDir)
$repoPrefix = $repoRoot.TrimEnd('\') + '\'
if (
  $resolvedOutput.Equals($repoRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
  $resolvedOutput.StartsWith($repoPrefix, [System.StringComparison]::OrdinalIgnoreCase)
) {
  throw 'OutputDir must be outside the repository'
}
[System.IO.Directory]::CreateDirectory($resolvedOutput) | Out-Null

$tag = "$ImageName`:$ReleaseSha"
$archivePath = Join-Path $resolvedOutput "$ImageName-$ReleaseSha-linux-amd64.tar"
$manifestPath = Join-Path $resolvedOutput "$ImageName-$ReleaseSha-manifest.json"
if ((Test-Path $archivePath) -or (Test-Path $manifestPath)) {
  throw 'Release artifacts already exist; refusing to overwrite'
}

docker buildx build `
  --platform linux/amd64 `
  --load `
  --build-arg "RELEASE_SHA=$ReleaseSha" `
  --tag $tag `
  (Join-Path $repoRoot 'backend\backend\posts')
if ($LASTEXITCODE -ne 0) { throw 'Docker image build failed' }

$inspect = docker image inspect $tag | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $inspect.Count -ne 1) {
  throw 'Unable to inspect built image'
}
$image = $inspect[0]
if ($image.Architecture -ne 'amd64') { throw 'Built image architecture is not amd64' }
if ($image.Config.User -ne '10001:10001') { throw 'Built image user is not 10001:10001' }
if ($image.Config.WorkingDir -ne '/app') { throw 'Built image workdir is not /app' }
if (-not $image.Config.Healthcheck) { throw 'Built image has no healthcheck' }
if (($image.Config.Cmd -join ' ') -ne 'node dist/src/main.js') {
  throw 'Built image command does not match the compiled Nest entrypoint'
}
if ($image.Config.Labels.'org.opencontainers.image.revision' -ne $ReleaseSha) {
  throw 'Built image revision label does not match ReleaseSha'
}
$nodeIndexDigest = 'sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d'
$nodeAmd64Digest = 'sha256:d45d78e7929b46875bbd4e29bea672d5bc48186c6c3588306521c815e78352d6'
if ($image.Config.Labels.'org.opencontainers.image.base.digest.index' -ne $nodeIndexDigest) {
  throw 'Built image Node index digest label does not match the reviewed value'
}
if ($image.Config.Labels.'org.opencontainers.image.base.digest.linux-amd64' -ne $nodeAmd64Digest) {
  throw 'Built image Node linux/amd64 manifest label does not match the reviewed value'
}

docker run --rm --entrypoint node $tag -e @'
const fs = require('node:fs');
require('bcrypt');
require('sharp');
require('@prisma/client');
const required = [
  '/app/dist/src/main.js',
  '/app/dist/src/scripts/seed-games.js',
  '/app/dist/src/scripts/rebuild-tags.js',
  '/app/dist/src/scripts/seed-demo-posts.js',
  '/app/dist/src/scripts/backfill-embeddings.js',
];
if (!required.every((path) => fs.existsSync(path))) process.exit(1);
if (fs.readdirSync('/app/dist/src/scripts/fixtures/phase4-demo-images').length !== 10) process.exit(1);
if (fs.readdirSync('/app/prisma/migrations').filter((name) => !name.startsWith('.')).length === 0) process.exit(1);
'@
if ($LASTEXITCODE -ne 0) { throw 'Built image content validation failed' }

docker save --output $archivePath $tag
if ($LASTEXITCODE -ne 0) { throw 'Docker image export failed' }
$archiveSha256 = (Get-FileHash -Algorithm SHA256 $archivePath).Hash.ToLowerInvariant()

$manifest = [ordered]@{
  releaseSha = $ReleaseSha
  image = $tag
  imageId = $image.Id
  architecture = $image.Architecture
  user = $image.Config.User
  workingDir = $image.Config.WorkingDir
  archive = [System.IO.Path]::GetFileName($archivePath)
  archiveSha256 = $archiveSha256
  nodeBase = [ordered]@{
    indexDigest = $nodeIndexDigest
    linuxAmd64ManifestDigest = $nodeAmd64Digest
  }
}
$manifestJson = $manifest | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText(
  $manifestPath,
  $manifestJson + [Environment]::NewLine,
  [System.Text.UTF8Encoding]::new($false)
)

Write-Output "Image: $tag"
Write-Output "Architecture: $($image.Architecture)"
Write-Output "User: $($image.Config.User)"
Write-Output "Archive SHA-256: $archiveSha256"
