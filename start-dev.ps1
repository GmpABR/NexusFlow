<#
.SYNOPSIS
Starts the local development environment for the NexusFlow project.
.DESCRIPTION
This script starts the local Supabase instance, the .NET backend API, and the React frontend.
#>

$ErrorActionPreference = "Stop"

# Dynamically get the directory where this script is located
$ProjectPath = $PSScriptRoot
if ([string]::IsNullOrEmpty($ProjectPath)) {
    $ProjectPath = (Get-Location).Path
}

Write-Host "--- Starting NexusFlow Local Development Environment ---" -ForegroundColor Cyan

# 0. Verify/Start Docker Desktop
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

# 1. Start Supabase (Requires Docker Desktop to be running)
Write-Host "`n[2/4] Checking/Starting Local Supabase containers..." -ForegroundColor Yellow

# Try to find the Supabase CLI using standard methods, with a fallback
$SupabaseCmd = $null
if (Get-Command "supabase" -ErrorAction SilentlyContinue) {
    $SupabaseCmd = "supabase"
} elseif (Get-Command "npx" -ErrorAction SilentlyContinue) {
    # If not globally installed, anyone with Node can run it via npx
    $SupabaseCmd = "npx -y supabase"
} else {
}

if ($SupabaseCmd -ne $null) {
    # Check if it's already running by querying status quietly
    $currentPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue" # Don't crash on stderr output
    $statusOutput = ""
    
    # Handle multipart commands like "npx -y supabase"
    $parts = $SupabaseCmd -split " "
    $cmd = $parts[0]
    $args = $parts[1..($parts.Length-1)]
    
    try {
        if ($args) {
            $statusOutput = & $cmd $args status 2>&1 | Out-String
        } else {
            $statusOutput = & $cmd status 2>&1 | Out-String
        }
    } catch {
        # If the command itself fails to even run
        $statusOutput = "stopped"
    }
    $ErrorActionPreference = $currentPreference

    # Check if the output indicates it's stopped/not running
    if ($statusOutput -match "stopped" -or $statusOutput -match "not running" -or $statusOutput -match "down" -or [string]::IsNullOrWhiteSpace($statusOutput)) {
         Write-Host "Supabase is not running. Starting it now (this may take a moment)..."
         # Start it but allow stderr output without crashing
         $ErrorActionPreference = "Continue"
         if ($args) {
             & $cmd $args start
         } else {
             & $cmd start
         }
         $ErrorActionPreference = $currentPreference
         Write-Host "[OK] Supabase process handled." -ForegroundColor Green
    } else {
         Write-Host "[OK] Supabase is already running." -ForegroundColor Green
    }
} else {
    Write-Host "[WARNING] Supabase CLI could not be found. Skipping Supabase auto-start. Please run 'supabase start' manually." -ForegroundColor Red
}

# 2. Start Backend API 
Write-Host "`n[3/4] Starting .NET Backend API (runs in background window)..." -ForegroundColor Yellow
$BackendPath = Join-Path $ProjectPath "backend"
if (Test-Path $BackendPath) {
    Start-Process -FilePath "dotnet" -ArgumentList "run" -WorkingDirectory $BackendPath -WindowStyle Normal -PassThru | Out-Null
    Write-Host "[OK] Backend started." -ForegroundColor Green
} else {
    Write-Host "[ERROR] Backend directory not found at $BackendPath" -ForegroundColor Red
}

# 3. Start Frontend (Current window)
Write-Host "`n[4/4] Starting React Frontend..." -ForegroundColor Yellow
$FrontendPath = Join-Path $ProjectPath "frontend"
if (Test-Path $FrontendPath) {
    Set-Location $FrontendPath
    Write-Host "Frontend is launching. Press Ctrl+C in this window to stop the frontend." -ForegroundColor Cyan
    npm run dev
} else {
    Write-Host "[ERROR] Frontend directory not found at $FrontendPath" -ForegroundColor Red
}
