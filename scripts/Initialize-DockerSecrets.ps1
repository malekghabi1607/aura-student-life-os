$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$secretDirectory = Join-Path $projectDirectory '.secrets'
$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)

New-Item -ItemType Directory -Force -Path $secretDirectory | Out-Null

foreach ($secretName in @('postgres_password', 'jwt_secret')) {
    $secretPath = Join-Path $secretDirectory $secretName
    if (-not (Test-Path -LiteralPath $secretPath)) {
        $randomBytes = New-Object byte[] 48
        $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
        try { $generator.GetBytes($randomBytes) }
        finally { $generator.Dispose() }
        [IO.File]::WriteAllText($secretPath, [Convert]::ToBase64String($randomBytes), $utf8WithoutBom)
    }
}

foreach ($secretName in @('gemini_api_key', 'resend_api_key')) {
    $secretPath = Join-Path $secretDirectory $secretName
    if (-not (Test-Path -LiteralPath $secretPath)) {
        [IO.File]::WriteAllText($secretPath, '', $utf8WithoutBom)
    }
}

$environmentPath = Join-Path $projectDirectory '.env.docker'
if (-not (Test-Path -LiteralPath $environmentPath)) {
    Copy-Item -LiteralPath (Join-Path $projectDirectory '.env.docker.example') -Destination $environmentPath
}

Write-Output 'Docker configuration prepared. Existing files were preserved; no secret values were printed.'
Write-Output 'Optional: fill .secrets/gemini_api_key and .secrets/resend_api_key before starting the stack.'
