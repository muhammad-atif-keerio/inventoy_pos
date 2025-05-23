# Script to fix ledger schema issues and run migrations
Write-Host "Starting ledger schema fix..." -ForegroundColor Cyan

# Run the schema fix script
try {
    Write-Host "Running ledger schema fix script..."
    node --experimental-modules fix-ledger-schema.js
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error running schema fix script!" -ForegroundColor Red
        exit 1
    } else {
        Write-Host "✓ Schema fix script completed successfully" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}

# Generate Prisma client
try {
    Write-Host "Generating Prisma client..."
    npx prisma generate
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error generating Prisma client!" -ForegroundColor Red
    } else {
        Write-Host "✓ Prisma client generated successfully" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# Push schema to database
try {
    Write-Host "Pushing schema changes to database..."
    npx prisma db push --accept-data-loss
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error pushing schema changes!" -ForegroundColor Red
    } else {
        Write-Host "✓ Schema changes pushed successfully" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`nLedger schema fix process completed!" -ForegroundColor Cyan
Write-Host "You can now restart your application." -ForegroundColor Cyan

Read-Host -Prompt "Press Enter to exit" 