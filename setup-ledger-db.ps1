# PowerShell script to set up the ledger database connection
Write-Host "Starting ledger database connection setup..." -ForegroundColor Cyan

# Step 1: Set up the Supabase connection
Write-Host "`nStep 1: Setting up Supabase connection..." -ForegroundColor Yellow
node setup-supabase-connection.js

# Prompt user to edit the .env file
Write-Host "`nPlease edit the .env file to add your actual Supabase password." -ForegroundColor Yellow
Write-Host "Press Enter when you have updated the .env file..." -ForegroundColor Yellow
Read-Host

# Step 2: Test the connection
Write-Host "`nStep 2: Testing Supabase connection..." -ForegroundColor Yellow
node test-supabase-connection.js

# Ask if the connection was successful
$connectionSuccess = Read-Host "`nWas the connection successful? (y/n)"
if ($connectionSuccess -ne "y") {
    Write-Host "Please fix the connection issues and run this script again." -ForegroundColor Red
    exit 1
}

# Step 3: Generate Prisma client and push schema
Write-Host "`nStep 3: Setting up ledger schema..." -ForegroundColor Yellow
node setup-ledger-schema.js

# Step 4: Create test data
Write-Host "`nStep 4: Creating test data..." -ForegroundColor Yellow
node create-test-ledger-data.js

# Step 5: Start the application
Write-Host "`nSetup complete! Would you like to start the application now? (y/n)" -ForegroundColor Green
$startApp = Read-Host
if ($startApp -eq "y") {
    Write-Host "`nStarting application..." -ForegroundColor Cyan
    npm run dev
} else {
    Write-Host "`nYou can start the application later by running 'npm run dev'" -ForegroundColor Cyan
}

Write-Host "`nLedger database setup process completed!" -ForegroundColor Green 