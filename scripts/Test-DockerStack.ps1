param([string]$BaseUrl = 'http://localhost:8088')
$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$composeArguments = @('compose', '--env-file', (Join-Path $projectDirectory '.env.docker'),
    '-f', (Join-Path $projectDirectory 'docker-compose.yml'))

$stateJson = & docker @composeArguments ps --all --format json
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose is not accessible.' }
$states = @($stateJson | ForEach-Object { $_ | ConvertFrom-Json })
foreach ($service in @('postgres', 'backend', 'frontend')) {
    $state = @($states | Where-Object Service -eq $service)
    if ($state.Count -ne 1 -or $state[0].State -ne 'running' -or $state[0].Health -ne 'healthy') {
        throw "Service $service is not running and healthy."
    }
}

& docker @composeArguments exec -T frontend nginx -t
if ($LASTEXITCODE -ne 0) { throw 'Nginx configuration test failed.' }
$readinessJson = & docker @composeArguments exec -T backend curl --fail --silent --max-time 5 http://127.0.0.1:8081/actuator/health/readiness
if ($LASTEXITCODE -ne 0 -or ($readinessJson | ConvertFrom-Json).status -ne 'UP') {
    throw 'Backend/database readiness failed.'
}

Add-Type -AssemblyName System.Net.Http
$httpClient = New-Object System.Net.Http.HttpClient
$httpClient.Timeout = [TimeSpan]::FromSeconds(15)
function Test-HttpResponse([string]$Path, [int]$Expected, [string]$Payload = '') {
    $url = $BaseUrl.TrimEnd('/') + $Path
    if ($Payload) {
        $body = New-Object System.Net.Http.StringContent($Payload, [Text.Encoding]::UTF8, 'application/json')
        try { $response = $httpClient.PostAsync($url, $body).GetAwaiter().GetResult() }
        finally { $body.Dispose() }
    } else {
        $response = $httpClient.GetAsync($url).GetAwaiter().GetResult()
    }
    try {
        if ([int]$response.StatusCode -ne $Expected) {
            throw "Unexpected HTTP status for $Path (expected $Expected, received $([int]$response.StatusCode))."
        }
        return $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    } finally { $response.Dispose() }
}

try {
    $homeHtml = Test-HttpResponse '/' 200
    $deepLink = Test-HttpResponse '/dashboard' 200
    if (-not $homeHtml.Contains('id="root"') -or $homeHtml -ne $deepLink) {
        throw 'React SPA deep-link fallback did not return index.html.'
    }
    $null = Test-HttpResponse '/healthz' 200
    $null = Test-HttpResponse '/api/categories' 403
    # A deliberately nonexistent account performs a real authentication/database lookup,
    # without registering users, changing passwords or sending emails.
    $login = Test-HttpResponse '/api/auth/login' 401 '{"email":"container-check@example.invalid","password":"not-a-real-password"}'
    $null = $login | ConvertFrom-Json
    $null = Test-HttpResponse '/actuator/health/readiness' 404
    $null = Test-HttpResponse '/.env' 404
    $null = Test-HttpResponse '/assets/not-a-real-asset.js' 404
} finally { $httpClient.Dispose() }

# Compare in memory; never put secret values in command arguments or print them.
$configurationJson = & docker @composeArguments config --format json
if ($LASTEXITCODE -ne 0) { throw 'Compose configuration could not be inspected.' }
$configuration = $configurationJson | ConvertFrom-Json
$imageMetadata = ''
foreach ($image in @('aura-backend:local', 'aura-frontend:local')) {
    $inspection = & docker image inspect $image
    if ($LASTEXITCODE -ne 0) { throw 'Image inspection failed.' }
    $history = & docker history --no-trunc --format '{{.CreatedBy}}' $image
    if ($LASTEXITCODE -ne 0) { throw 'Image history inspection failed.' }
    $imageMetadata += ($inspection -join "`n") + ($history -join "`n")
}
foreach ($secret in $configuration.secrets.PSObject.Properties) {
    $value = [IO.File]::ReadAllText($secret.Value.file).Trim()
    if ($value.Length -gt 0 -and (($configurationJson -join "`n").Contains($value) -or $imageMetadata.Contains($value))) {
        throw 'A secret value was found in Compose output or image metadata.'
    }
}

Write-Output 'PASS: three healthy services; Nginx syntax and routing; SPA; API/database lookup; private health endpoint.'
Write-Output 'PASS: no configured secret value in Compose output or image metadata/history.'
