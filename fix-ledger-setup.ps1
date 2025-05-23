# PowerShell script to run the ledger setup fix

Write-Host "Starting ledger system setup..." -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js and try again." -ForegroundColor Red
    exit 1
}

# Run the fix-ledger-setup.js script
Write-Host "Running ledger setup fix script..." -ForegroundColor Cyan
node fix-ledger-setup.js

# Check the exit code
if ($LASTEXITCODE -eq 0) {
    Write-Host "Ledger setup completed successfully." -ForegroundColor Green
    
    # Offer to run the development server
    $runServer = Read-Host "Would you like to start the development server now? (y/n)"
    if ($runServer -eq "y" -or $runServer -eq "Y") {
        Write-Host "Starting development server..." -ForegroundColor Cyan
        npm run dev
    } else {
        Write-Host "You can start the server manually with 'npm run dev'" -ForegroundColor Yellow
    }
} else {
    Write-Host "There were issues with the ledger setup. See the logs above for details." -ForegroundColor Yellow
    Write-Host "You can still run the application, but the ledger functionality may be limited to mock data." -ForegroundColor Yellow
    
    $runServer = Read-Host "Would you like to start the development server anyway? (y/n)"
    if ($runServer -eq "y" -or $runServer -eq "Y") {
        Write-Host "Starting development server..." -ForegroundColor Cyan
        npm run dev
    }
} 