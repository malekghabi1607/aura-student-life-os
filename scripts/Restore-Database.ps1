# Restores a dump made by Backup-Database.ps1 into an EMPTY database of a PostgreSQL container.
# Refuses any target whose schema public already contains a relation: it never overwrites data.
# Restore into a new container/volume, check it, then switch the application to it.
param(
    [Parameter(Mandatory = $true)][string]$Container,
    [Parameter(Mandatory = $true)][string]$DumpFile
)
$ErrorActionPreference = 'Stop'
$OutputEncoding = New-Object System.Text.UTF8Encoding $false

function Invoke-Query([string]$Sql) {
    $result = $Sql | docker exec -i $Container sh -c 'psql -X -q -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
    if ($LASTEXITCODE -ne 0) { throw "Query failed on container $Container." }
    return ($result -join "`n").Trim()
}

$dump = (Resolve-Path $DumpFile).Path
$checksumFile = "$dump.sha256"
if (Test-Path $checksumFile) {
    $expected = ((Get-Content -Raw $checksumFile).Trim() -split '\s+')[0].ToLowerInvariant()
    $actual = (Get-FileHash -Algorithm SHA256 $dump).Hash.ToLowerInvariant()
    if ($expected -ne $actual) { throw 'Dump checksum mismatch: file corrupted or modified.' }
} else {
    Write-Warning 'No .sha256 file next to the dump: integrity not verified.'
}

$relations = Invoke-Query "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f','S');"
if ($relations -ne '0') {
    throw "Target database in $Container is not empty ($relations relations): restore refused."
}

$inside = '/tmp/aura-restore-{0}.dump' -f ([guid]::NewGuid().ToString('N'))
try {
    docker cp $dump "${Container}:$inside"
    if ($LASTEXITCODE -ne 0) { throw 'Copying the dump into the container failed.' }
    docker exec -e "DUMP_FILE=$inside" $Container sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges --exit-on-error --single-transaction "$DUMP_FILE"'
    if ($LASTEXITCODE -ne 0) { throw 'pg_restore failed; the single transaction was rolled back.' }
} finally {
    docker exec -e "DUMP_FILE=$inside" $Container sh -c 'rm -f "$DUMP_FILE"' | Out-Null
}

# Exact row counts (not planner estimates) for every restored table.
$counts = Invoke-Query @"
SELECT string_agg(table_name || '=' || (xpath('/row/c/text()',
       query_to_xml(format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text,
       ', ' ORDER BY table_name)
FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
"@
Write-Output "RESTORED into ${Container}: $counts"
Write-Output 'Next: compare these counts with the source, then run scripts/Test-DatabaseBaseline.ps1.'
