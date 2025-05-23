# PowerShell script to set up the ledger database

Write-Host "🔄 Setting up the ledger database in Supabase..." -ForegroundColor Cyan

# Check if the .env file exists
if (-not (Test-Path .env)) {
    Write-Host "❌ No .env file found. Please create an .env file with your database credentials first." -ForegroundColor Red
    exit 1
}

try {
    # Step 1: Generate the ledger Prisma client
    Write-Host "📝 Generating ledger-specific Prisma client..." -ForegroundColor Cyan
    node generate-ledger-client.js
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to generate ledger client"
    }
    
    # Step 2: Push the ledger schema to the database
    Write-Host "🚀 Pushing the ledger schema to the database..." -ForegroundColor Cyan
    npx prisma db push --schema=prisma/schema-ledger.prisma
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to push ledger schema"
    }
    
    # Step 3: Verify the schema was pushed correctly
    Write-Host "✅ Checking ledger schema..." -ForegroundColor Cyan
    npx prisma db pull --schema=prisma/schema-ledger.prisma --print
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to verify ledger schema"
    }
    
    Write-Host "`n✨ Ledger database setup complete!" -ForegroundColor Green
    Write-Host "`nYou can now run the application and use the ledger functionality:"
    Write-Host "npm run dev" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Failed to set up ledger database: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 