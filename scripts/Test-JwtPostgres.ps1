# Opt-in JWT/Flyway validation. Creates and removes only its own tmpfs container.
# The dump is restored into a new database; no existing container is changed.
param(
    [Parameter(Mandatory = $true)][string]$DumpFile,
    [string]$ResultsDirectory = '.validation-tools/jwt-p0/postgres'
)
$ErrorActionPreference = 'Stop'
$OutputEncoding = New-Object System.Text.UTF8Encoding $false
$projectDirectory = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectDirectory
$dump = (Resolve-Path -LiteralPath $DumpFile).Path
$checksumPath = "$dump.sha256"
if (-not (Test-Path -LiteralPath $checksumPath)) { throw 'A verified dump with its .sha256 file is required.' }
$expected = ((Get-Content -Raw -LiteralPath $checksumPath).Trim() -split '\s+')[0]
if ((Get-FileHash -LiteralPath $dump -Algorithm SHA256).Hash -ne $expected) { throw 'Dump checksum mismatch.' }
if (@(git diff --name-only -- backend/src/main/resources/db/migration/V1__baseline_schema.sql).Count) {
    throw 'Refusing validation with a modified V1 migration.'
}
$results = [IO.Path]::GetFullPath((Join-Path $projectDirectory $ResultsDirectory))
$allowedRoot = [IO.Path]::GetFullPath((Join-Path $projectDirectory '.validation-tools')) + [IO.Path]::DirectorySeparatorChar
if (-not $results.StartsWith($allowedRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Results must remain under .validation-tools (ignored by Git).'
}
New-Item -ItemType Directory -Force -Path $results | Out-Null
$passwordPath = Join-Path $results 'test-db-password'
$bytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
[IO.File]::WriteAllText($passwordPath, [Convert]::ToBase64String($bytes))
$container = 'aura-jwt-validation-' + [guid]::NewGuid().ToString('N')
$containerId = $null
$oldPassword = [Environment]::GetEnvironmentVariable('AURA_JWT_TEST_DB_PASSWORD')
$oldMavenHome = [Environment]::GetEnvironmentVariable('MAVEN_USER_HOME')
try {
    $containerId = docker run -d --name $container --label aura.jwt.validation=true `
        --tmpfs /var/lib/postgresql/data:rw,size=512m `
        --mount "type=bind,source=$passwordPath,target=/run/secrets/password,readonly" `
        -e POSTGRES_PASSWORD_FILE=/run/secrets/password -e POSTGRES_USER=aura_jwt_validation `
        -e POSTGRES_DB=aura_jwt_empty_current -p 127.0.0.1::5432 postgres:16-alpine
    if ($LASTEXITCODE -ne 0) { throw 'Temporary PostgreSQL creation failed.' }
    $containerId = ($containerId -join '').Trim()
    $inspection = docker inspect $container | ConvertFrom-Json
    if (@($inspection.Mounts | Where-Object Type -eq 'volume').Count) { throw 'Persistent volume unexpectedly attached.' }
    $ready = $false
    for ($attempt = 0; $attempt -lt 80; $attempt++) {
        # initdb briefly runs a socket-only server; wait for the final TCP server.
        $null = docker exec $container pg_isready -h 127.0.0.1 -U aura_jwt_validation -d aura_jwt_empty_current -q
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Milliseconds 250
    }
    if (-not $ready) { throw 'Temporary PostgreSQL did not become ready.' }
    docker exec $container createdb -U aura_jwt_validation aura_jwt_copy_current
    if ($LASTEXITCODE -ne 0) { throw 'Creating empty restore target failed.' }
    docker cp $dump "${container}:/tmp/source.dump"
    if ($LASTEXITCODE -ne 0) { throw 'Copying verified dump failed.' }
    $restoreLog = docker exec $container pg_restore -U aura_jwt_validation -d aura_jwt_copy_current `
        --no-owner --no-privileges --single-transaction --exit-on-error /tmp/source.dump 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'Restore failed; validation stopped.' }
    $port = (docker port $container 5432/tcp).Trim().Split(':')[-1]
    $env:AURA_JWT_TEST_DB_PASSWORD = [IO.File]::ReadAllText($passwordPath)
    $env:MAVEN_USER_HOME = Join-Path $projectDirectory 'backend/.maven-cache'
    $repository = Join-Path $projectDirectory 'backend/.maven-cache/repository'
    $log = Join-Path $results 'clean-verify.log'
    $ErrorActionPreference = 'Continue'
    & ./backend/mvnw.cmd -f backend/pom.xml -B -ntp "-Dmaven.repo.local=$repository" `
        '-Daudit.postgres=true' "-Daudit.pg.url=jdbc:postgresql://127.0.0.1:$port/aura_jwt_empty_current" `
        "-Daudit.pg.copy-url=jdbc:postgresql://127.0.0.1:$port/aura_jwt_copy_current" clean verify *> $log
    $mavenExit = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    # Logs must not reveal JWTs, production credentials or even this temporary DB password.
    $logText = [IO.File]::ReadAllText($log)
    if ($logText -match '\beyJ[A-Za-z0-9_-]+\.' `
            -or $logText.Contains($env:AURA_JWT_TEST_DB_PASSWORD)) {
        throw 'Sensitive value detected in validation logs; refusing to print them.'
    }
    $secretDirectory = Join-Path $projectDirectory '.secrets'
    if (Test-Path -LiteralPath $secretDirectory) {
        foreach ($file in Get-ChildItem -LiteralPath $secretDirectory -File) {
            $value = [IO.File]::ReadAllText($file.FullName).Trim()
            if ($value -and $logText.Contains($value)) { throw 'Configured secret detected in validation logs.' }
        }
    }
    if ($mavenExit -ne 0) { throw "Maven validation failed (exit $mavenExit); inspect the ignored log privately." }
    Select-String -LiteralPath $log -Pattern '^JWT_PG |^\[INFO\] Tests run: [0-9]+, Failures:|BUILD SUCCESS' | ForEach-Object Line
    Write-Output 'PASS: Maven, JWT sequence, Flyway empty/copy, data fingerprints and log checks.'
} finally {
    [Environment]::SetEnvironmentVariable('AURA_JWT_TEST_DB_PASSWORD', $oldPassword, 'Process')
    [Environment]::SetEnvironmentVariable('MAVEN_USER_HOME', $oldMavenHome, 'Process')
    if ($containerId) {
        $owned = docker inspect $container 2>$null | ConvertFrom-Json
        if ($owned.Id -eq $containerId -and $owned.Config.Labels.'aura.jwt.validation' -eq 'true') {
            $null = docker rm -f $container # Only the container created above; never remove volumes.
            if ($LASTEXITCODE -ne 0) { Write-Warning 'Temporary container cleanup failed.' }
        } else { Write-Warning 'Container ownership could not be confirmed; nothing was removed.' }
    }
    if (Test-Path -LiteralPath $passwordPath) { Remove-Item -LiteralPath $passwordPath -Force }
}
