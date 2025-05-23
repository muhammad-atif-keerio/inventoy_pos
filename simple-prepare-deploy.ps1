# Simple deployment preparation script
Write-Host "Starting deployment preparation..." -ForegroundColor Cyan

# Run the ledger schema fix script
Write-Host "Running ledger schema fix script..."
try {
    node --experimental-modules fix-ledger-schema.js
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Ledger schema fixes applied" -ForegroundColor Green
    } else {
        Write-Host "Issue with ledger schema fix" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Run the ledger type issues fix
Write-Host "Running ledger type fix script..."
try {
    node fix-ledger-type-issues.js
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Ledger type fixes applied" -ForegroundColor Green
    } else {
        Write-Host "Issue with ledger type fix" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Generate Prisma client
Write-Host "Generating Prisma client..."
try {
    npx prisma generate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Prisma client generated successfully" -ForegroundColor Green
    } else {
        Write-Host "Issue generating Prisma client" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Push database schema
Write-Host "Pushing database schema..."
try {
    npx prisma db push
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Schema pushed successfully" -ForegroundColor Green
    } else {
        Write-Host "Issue pushing schema" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Run build to check for errors
Write-Host "Running build check..."
try {
    npm run build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Build completed successfully" -ForegroundColor Green
    } else {
        Write-Host "Build has issues" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "Deployment preparation completed!" -ForegroundColor Cyan
Write-Host "Please review remaining items in DEPLOYMENT_CHECKLIST.md before proceeding."

# Keep window open
Read-Host -Prompt "Press Enter to exit" 