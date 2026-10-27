# Logical backup (pg_dump custom format) of a PostgreSQL container, read-only for the database.
# The dump is written inside the container's /tmp, checked with pg_restore --list, copied out with
# docker cp (no binary data through the PowerShell pipeline), then removed from the container.
# Produces <name>.dump and <name>.dump.sha256. The dump contains personal data: keep it private.
param(
    [string]$Container = 'aura-student-life-os-containers-postgres-1',
    [string]$OutputDirectory = (Join-Path (Split-Path -Parent $PSScriptRoot) 'backups')
)
$ErrorActionPreference = 'Stop'

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$name = 'aura-{0}.dump' -f (Get-Date -Format 'yyyyMMdd-HHmmss')
$inside = "/tmp/$name"
$target = Join-Path (Resolve-Path $OutputDirectory) $name

try {
    docker exec -e "DUMP_FILE=$inside" $Container sh -c 'umask 077 && pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-privileges --file="$DUMP_FILE" && pg_restore --list "$DUMP_FILE" > /dev/null'
    if ($LASTEXITCODE -ne 0) { throw "pg_dump failed on container $Container." }
    docker cp "${Container}:$inside" $target
    if ($LASTEXITCODE -ne 0) { throw 'Copying the dump out of the container failed.' }
} finally {
    docker exec -e "DUMP_FILE=$inside" $Container sh -c 'rm -f "$DUMP_FILE"' | Out-Null
}

$hash = (Get-FileHash -Algorithm SHA256 $target).Hash.ToLowerInvariant()
Set-Content -Encoding ascii -Path "$target.sha256" -Value "$hash  $name"
Write-Output "BACKUP: $target ($((Get-Item $target).Length) bytes, sha256 $hash)"
