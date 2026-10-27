# Read-only dry run of the Flyway adoption guard (beforeBaseline.sql) on a PostgreSQL container.
# Tells whether the database is already managed by Flyway, empty, or safely adoptable at version 1.
# Uses the container's local socket and its POSTGRES_USER/POSTGRES_DB; no password is handled.
param(
    [string]$Container = 'aura-student-life-os-containers-postgres-1'
)
$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$guard = Join-Path $projectDirectory 'backend/src/main/resources/db/migration/beforeBaseline.sql'
$OutputEncoding = New-Object System.Text.UTF8Encoding $false

function Invoke-ReadOnlyQuery([string]$Sql) {
    $result = $Sql | docker exec -i -e PGOPTIONS='-c default_transaction_read_only=on' $Container `
        sh -c 'psql -X -q -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
    if ($LASTEXITCODE -ne 0) { throw "Query failed on container $Container." }
    return ($result -join "`n").Trim()
}

$history = Invoke-ReadOnlyQuery "SELECT to_regclass('public.flyway_schema_history') IS NOT NULL;"
if ($history -eq 't') {
    $rows = Invoke-ReadOnlyQuery "SELECT string_agg(version || ' ' || type || ' ' || success, ', ' ORDER BY installed_rank) FROM public.flyway_schema_history;"
    Write-Output "MANAGED: Flyway history already present ($rows). No adoption needed."
    exit 0
}
$tables = Invoke-ReadOnlyQuery "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f');"
if ($tables -eq '0') {
    Write-Output 'EMPTY: no relation in schema public. Flyway will create it with V1; no adoption needed.'
    exit 0
}

$output = Get-Content -Raw $guard | docker exec -i -e PGOPTIONS='-c default_transaction_read_only=on' $Container `
    sh -c 'psql -X -q -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" 2>&1'
$exitCode = $LASTEXITCODE
$output | ForEach-Object { Write-Output $_ }
if ($exitCode -ne 0) {
    Write-Output 'NOT ADOPTABLE: schema public differs from V1. Do not enable FLYWAY_BASELINE_ON_MIGRATE.'
    exit 1
}
Write-Output 'ADOPTABLE: schema public matches V1 and has no Flyway history. Back it up, then baseline once.'
