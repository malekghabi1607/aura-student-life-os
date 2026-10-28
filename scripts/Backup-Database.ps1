# Logical backup (pg_dump custom format) of a PostgreSQL container, read-only for the database.
# Works without `docker cp`, which Docker Desktop refuses on a container whose bind-mount source
# no longer exists (the pre-Flyway postgres container still mounts the removed docker-init.sql).
#   1. pg_dump into the container's /tmp, checked with pg_restore --list, SHA-256 computed inside.
#   2. Binary transfer through `docker exec cat` read as a raw byte stream (never the PowerShell
#      pipeline, which re-encodes text), into <name>.dump.partial.
#   3. SHA-256 recomputed on the host and compared; the host copy is streamed back to
#      `pg_restore --list` to prove it is readable; only then renamed to <name>.dump.
# The temporary dump is always removed from the container; a partial host file is never kept.
# No password is handled (local socket as POSTGRES_USER). The dump contains personal data.
param(
    [string]$Container = 'aura-student-life-os-containers-postgres-1',
    [string]$OutputDirectory = (Join-Path (Split-Path -Parent $PSScriptRoot) 'backups')
)
$ErrorActionPreference = 'Stop'

function Invoke-DockerToFile([string[]]$Arguments, [string]$Path) {
    $info = New-Object System.Diagnostics.ProcessStartInfo 'docker'
    $info.Arguments = $Arguments -join ' '
    $info.UseShellExecute = $false
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $process = [System.Diagnostics.Process]::Start($info)
    $errorTask = $process.StandardError.ReadToEndAsync()
    $file = [System.IO.File]::Open($Path, [System.IO.FileMode]::CreateNew)
    try { $process.StandardOutput.BaseStream.CopyTo($file) } finally { $file.Dispose() }
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) { throw "docker $($Arguments[0]) failed: $($errorTask.Result.Trim())" }
}

function Invoke-DockerFromFile([string[]]$Arguments, [string]$Path) {
    $info = New-Object System.Diagnostics.ProcessStartInfo 'docker'
    $info.Arguments = $Arguments -join ' '
    $info.UseShellExecute = $false
    $info.RedirectStandardInput = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    # The redirected stdin writer uses the console input encoding; a UTF-8 console with BOM
    # would prefix EF BB BF to the binary dump. Start the process with a BOM-less encoding.
    $consoleEncoding = [Console]::InputEncoding
    try {
        [Console]::InputEncoding = New-Object System.Text.UTF8Encoding $false
        $process = [System.Diagnostics.Process]::Start($info)
    } finally { [Console]::InputEncoding = $consoleEncoding }
    $outputTask = $process.StandardOutput.ReadToEndAsync()
    $errorTask = $process.StandardError.ReadToEndAsync()
    $file = [System.IO.File]::OpenRead($Path)
    try { $file.CopyTo($process.StandardInput.BaseStream) }
    catch [System.IO.IOException] {
        # pg_restore --list stops reading after the table of contents and closes its input;
        # the exit code and the listed entries below decide whether the dump is readable.
    } finally {
        $file.Dispose()
        try { $process.StandardInput.Close() } catch [System.IO.IOException] { }
    }
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) { throw "docker $($Arguments[0]) failed: $($errorTask.Result.Trim())" }
    return $outputTask.Result
}

if ($Container -notmatch '^[A-Za-z0-9][A-Za-z0-9_.-]*$') { throw 'Invalid container name.' }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$name = 'aura-{0}.dump' -f (Get-Date -Format 'yyyyMMdd-HHmmss')
$inside = '/tmp/aura-backup-{0}.dump' -f ([guid]::NewGuid().ToString('N'))
$target = Join-Path (Resolve-Path $OutputDirectory) $name
$partial = "$target.partial"
if (Test-Path $target) { throw "Backup $target already exists." }

$completed = $false
try {
    docker exec -e "DUMP_FILE=$inside" $Container sh -c 'umask 077 && pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-privileges --file="$DUMP_FILE" && pg_restore --list "$DUMP_FILE" > /dev/null'
    if ($LASTEXITCODE -ne 0) { throw "pg_dump or pg_restore --list failed on container $Container." }
    $insideHash = ((docker exec $Container sha256sum $inside) -split '\s+')[0].ToLowerInvariant()
    if ($LASTEXITCODE -ne 0 -or $insideHash -notmatch '^[0-9a-f]{64}$') { throw 'SHA-256 inside the container failed.' }

    Invoke-DockerToFile @('exec', $Container, 'cat', $inside) $partial
    $hostHash = (Get-FileHash -Algorithm SHA256 $partial).Hash.ToLowerInvariant()
    if ($hostHash -ne $insideHash) { throw "SHA-256 mismatch after transfer (container $insideHash, host $hostHash)." }

    $toc = Invoke-DockerFromFile @('exec', '-i', $Container, 'pg_restore', '--list') $partial
    $entries = @($toc -split "`n" | Where-Object { $_ -match '^\d+;' }).Count
    if ($entries -eq 0) { throw 'pg_restore --list found no entry in the transferred dump.' }

    # System.IO handles 8.3 short paths (e.g. C:\Users\ABCDEF~1) that the *-Item cmdlets reject.
    [System.IO.File]::Move($partial, $target)
    [System.IO.File]::WriteAllText("$target.sha256", "$hostHash  $name`r`n", [System.Text.Encoding]::ASCII)
    $completed = $true
} finally {
    # Cleanup must never hide the original error.
    try { docker exec $Container rm -f $inside 2>$null | Out-Null } catch { }
    if (-not $completed) { try { [System.IO.File]::Delete($partial) } catch { } }
}

Write-Output "BACKUP: $target ($((Get-Item $target).Length) bytes, $entries TOC entries)"
Write-Output "SHA-256 container = host: $hostHash"
