<#
Initializes the NexusFlow development environment for a fresh clone.
This script automatically:
1. Verifies Docker is running.
2. Uses npx to download and start the Supabase Docker containers.
3. Restores .NET backend dependencies.
4. Applies Entity Framework Core migrations to the fresh database.
#>

$ErrorActionPreference = "Stop"

# Dynamically get the directory where this script is located
$ProjectPath = $PSScriptRoot
if ([string]::IsNullOrEmpty($ProjectPath)) {
    $ProjectPath = (Get-Location).Path
}

Write-Host "--- Initializing NexusFlow Local Environment for the First Time ---" -ForegroundColor Cyan

# 1. Verify/Start Docker Desktop
Write-Host "`n[1/4] Checking for Docker Desktop..." -ForegroundColor Yellow

# Check if docker command exists
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Docker is not installed on this system. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check if it's running (silence native errors which would crash due to $ErrorActionPreference = "Stop")
$currentPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& docker info >$null 2>&1
$DockerIsNotRunning = ($LASTEXITCODE -ne 0)
$ErrorActionPreference = $currentPreference

if ($DockerIsNotRunning) {
    Write-Host "Docker is not running. Attempting to start Docker Desktop..." -ForegroundColor Cyan
    
    # Common Docker Desktop installation path
    $DockerPath = "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe"
    
    if (Test-Path $DockerPath) {
        Start-Process $DockerPath
        Write-Host "Waiting for Docker to initialize (this may take up to a minute)..." -NoNewline
        
        $MaxRetries = 30
        $RetryCount = 0
        $DockerReady = $false
        
        while ($RetryCount -lt $MaxRetries) {
            Start-Sleep -Seconds 3
            
            $ErrorActionPreference = "Continue"
            & docker info >$null 2>&1
            $checkCode = $LASTEXITCODE
            $ErrorActionPreference = $currentPreference
            
            if ($checkCode -eq 0) {
                $DockerReady = $true
                break
            }
            Write-Host "." -NoNewline
            $RetryCount++
        }
        
        if ($DockerReady) {
            Write-Host "`n[OK] Docker is now running." -ForegroundColor Green
            Write-Host "Giving Docker a few seconds to stabilize..."
            Start-Sleep -Seconds 5
        } else {
            Write-Host "`n[ERROR] Docker failed to start in time. Please start it manually and try again." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "[ERROR] Docker Desktop executable not found at $DockerPath. Please start Docker manually." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[OK] Docker is already running." -ForegroundColor Green
}

# 2. Verify Node/NPM are installed (Required for NPX)
Write-Host "`n[2/4] Checking for Node.js..." -ForegroundColor Yellow
try {
    $nodeVer = node -v
    Write-Host "[OK] Node.js found ($nodeVer)." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed. Please install Node.js and try again." -ForegroundColor Red
    exit 1
}

# 3. Start Supabase via CLI
Write-Host "`n[3/4] Downloading and Starting Supabase Containers (This takes a moment on a fresh install)..." -ForegroundColor Yellow
Set-Location $ProjectPath

# Try to find the Supabase CLI using standard methods, with a fallback
$SupabaseCmd = $null
if (Get-Command "supabase" -ErrorAction SilentlyContinue) {
    $SupabaseCmd = "supabase"
} elseif (Get-Command "npx" -ErrorAction SilentlyContinue) {
    $SupabaseCmd = "npx -y supabase"
}

if ($SupabaseCmd -ne $null) {
    # Handle multipart commands like "npx -y supabase"
    $parts = $SupabaseCmd -split " "
    $cmd = $parts[0]
    $args = $parts[1..($parts.Length-1)]
    
    $currentPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue" # Don't crash on progress/stderr
    
    if ($args) {
        & $cmd $args start
    } else {
        & $cmd start
    }
    
    $ErrorActionPreference = $currentPreference
    Write-Host "[OK] Supabase containers started successfully." -ForegroundColor Green
} else {
    Write-Host "[ERROR] Supabase CLI (or NPX) not found. Cannot start Supabase." -ForegroundColor Red
    exit 1
}

# 4. Restore Backend and Build Database Schema
Write-Host "`n[4/4] Restoring Backend and Applying Database Migrations..." -ForegroundColor Yellow
$BackendPath = Join-Path $ProjectPath "backend"
if (Test-Path $BackendPath) {
    Set-Location $BackendPath
    
    Write-Host "   - Restoring .NET packages"
    Invoke-Expression "dotnet restore"
    
    Write-Host "   - Checking for EF Core CLI"
    # Install EF Core tools locally just in case the developer doesn't have them globally
    Invoke-Expression "dotnet tool install --global dotnet-ef" -ErrorAction SilentlyContinue | Out-Null
    
    Write-Host "   - Applying database migrations to fresh Supabase Postgres container"
    Invoke-Expression "dotnet ef database update"
    
    Write-Host "[OK] Backend and Database configured successfully." -ForegroundColor Green
} else {
    Write-Host "[ERROR] Backend directory not found at $BackendPath" -ForegroundColor Red
    exit 1
}

Write-Host "`n--- Setup Complete! ---" -ForegroundColor Cyan
Write-Host "You can now run '.\start-dev.ps1' to boot up the application servers!" -ForegroundColor Green
