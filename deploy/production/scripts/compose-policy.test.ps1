Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$composeFile = Join-Path $repoRoot 'deploy\production\compose.yaml'
$fixture = Join-Path $env:TEMP ('black-box-compose-policy-' + [guid]::NewGuid().ToString('N'))

function Write-EnvFile {
  param([string]$Path, [string]$Marker)
  [System.IO.File]::WriteAllText(
    $Path,
    "$Marker=1`n",
    [System.Text.UTF8Encoding]::new($false)
  )
}

function Get-Service {
  param([object]$Config, [string]$Name)
  return $Config.services.PSObject.Properties[$Name].Value
}

function Assert-EnvironmentMarkers {
  param(
    [object]$Service,
    [string[]]$Expected,
    [string[]]$Forbidden,
    [string]$Name
  )
  foreach ($marker in $Expected) {
    if (-not $Service.environment.PSObject.Properties[$marker]) {
      throw "$Name is missing env marker $marker"
    }
  }
  foreach ($marker in $Forbidden) {
    if ($Service.environment.PSObject.Properties[$marker]) {
      throw "$Name unexpectedly receives env marker $marker"
    }
  }
}

function Assert-Networks {
  param([object]$Service, [string[]]$Expected, [string]$Name)
  $actual = @($Service.networks.PSObject.Properties.Name | Sort-Object)
  $wanted = @($Expected | Sort-Object)
  if (($actual -join ',') -ne ($wanted -join ',')) {
    throw "$Name networks are '$($actual -join ',')', expected '$($wanted -join ',')'"
  }
}

try {
  New-Item -ItemType Directory -Path $fixture,(Join-Path $fixture 'postgres'),(Join-Path $fixture 'uploads') | Out-Null
  $runtime = Join-Path $fixture 'runtime.env'
  $database = Join-Path $fixture 'database.env'
  $demo = Join-Path $fixture 'demo.env'
  $embedding = Join-Path $fixture 'embedding.env'
  $preflight = Join-Path $fixture 'preflight.env'
  $postgres = Join-Path $fixture 'postgres.env'
  Write-EnvFile $runtime 'RUNTIME_ONLY'
  Write-EnvFile $database 'DATABASE_ONLY'
  Write-EnvFile $demo 'DEMO_ONLY'
  Write-EnvFile $embedding 'EMBEDDING_ONLY'
  Write-EnvFile $preflight 'PREFLIGHT_ONLY'
  Write-EnvFile $postgres 'POSTGRES_ONLY'

  $release = Join-Path $fixture 'release.env'
  $values = @(
    'API_IMAGE=black-box-api:d1-validation',
    'POSTGRES_IMAGE=postgres:16.14-bookworm@sha256:92620daddcd947f8d5ab5ba66e848702fe443d87fed30c4cea8e389fd78dfc55',
    'API_BIND_ADDRESS=127.0.0.1',
    'API_PORT=3000',
    "POSTGRES_DATA_DIR=$((Join-Path $fixture 'postgres').Replace('\','/'))",
    "UPLOADS_DIR=$((Join-Path $fixture 'uploads').Replace('\','/'))",
    "RUNTIME_ENV_FILE=$($runtime.Replace('\','/'))",
    "DATABASE_ENV_FILE=$($database.Replace('\','/'))",
    "DEMO_SEED_ENV_FILE=$($demo.Replace('\','/'))",
    "EMBEDDING_ENV_FILE=$($embedding.Replace('\','/'))",
    "AI_PREFLIGHT_ENV_FILE=$($preflight.Replace('\','/'))",
    "POSTGRES_ENV_FILE=$($postgres.Replace('\','/'))"
  )
  [System.IO.File]::WriteAllLines($release, $values, [System.Text.UTF8Encoding]::new($false))

  $json = docker compose --profile tools --env-file $release -f $composeFile config --format json
  if ($LASTEXITCODE -ne 0) { throw 'docker compose config failed' }
  $config = $json | ConvertFrom-Json
  $allMarkers = @('RUNTIME_ONLY','DATABASE_ONLY','DEMO_ONLY','EMBEDDING_ONLY','PREFLIGHT_ONLY')

  $api = Get-Service $config 'api'
  Assert-EnvironmentMarkers $api @('RUNTIME_ONLY') @('DEMO_ONLY') 'api'
  Assert-Networks $api @('db_net','egress_net') 'api'

  foreach ($name in @('migrate','seed-games','rebuild-tags')) {
    $service = Get-Service $config $name
    Assert-EnvironmentMarkers $service @('DATABASE_ONLY') @('RUNTIME_ONLY','DEMO_ONLY','EMBEDDING_ONLY','PREFLIGHT_ONLY') $name
    Assert-Networks $service @('db_net') $name
  }

  $seedDemo = Get-Service $config 'seed-demo'
  Assert-EnvironmentMarkers $seedDemo @('DATABASE_ONLY','DEMO_ONLY') @('RUNTIME_ONLY','EMBEDDING_ONLY','PREFLIGHT_ONLY') 'seed-demo'
  Assert-Networks $seedDemo @('db_net') 'seed-demo'

  $embeddingService = Get-Service $config 'embedding-backfill'
  Assert-EnvironmentMarkers $embeddingService @('DATABASE_ONLY','EMBEDDING_ONLY') @('RUNTIME_ONLY','DEMO_ONLY','PREFLIGHT_ONLY') 'embedding-backfill'
  Assert-Networks $embeddingService @('db_net','egress_net') 'embedding-backfill'

  $preflightService = Get-Service $config 'ai-preflight'
  Assert-EnvironmentMarkers $preflightService @('PREFLIGHT_ONLY') @('RUNTIME_ONLY','DATABASE_ONLY','DEMO_ONLY','EMBEDDING_ONLY') 'ai-preflight'
  Assert-Networks $preflightService @('egress_net') 'ai-preflight'

  Write-Output 'compose policy tests passed: 7 service policies'
} finally {
  if (Test-Path -LiteralPath $fixture) {
    $resolved = (Resolve-Path -LiteralPath $fixture).Path
    $tempRoot = (Resolve-Path -LiteralPath $env:TEMP).Path
    if (-not $resolved.StartsWith($tempRoot,[System.StringComparison]::OrdinalIgnoreCase)) {
      throw 'Refusing fixture cleanup outside TEMP'
    }
    Remove-Item -LiteralPath $fixture -Recurse -Force
  }
}
