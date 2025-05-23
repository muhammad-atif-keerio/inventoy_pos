# Script to run the Next.js application with execution policy bypass
Write-Host "Starting inventory management system..."

# Run npm command with execution policy bypass
try {
    powershell -ExecutionPolicy Bypass -Command "npm run dev"
} 
catch {
    Write-Host "Failed to start application: $_" -ForegroundColor Red
    Write-Host "`nTroubleshooting tips:" -ForegroundColor Yellow
    Write-Host "1. Make sure Node.js is installed correctly" -ForegroundColor Yellow
    Write-Host "2. Try running 'npm install' first with: powershell -ExecutionPolicy Bypass -Command 'npm install'" -ForegroundColor Yellow
    Write-Host "3. Check that the .env file has correct database credentials" -ForegroundColor Yellow
    Write-Host "4. Run check-db.js to verify database connection: powershell -ExecutionPolicy Bypass -Command 'node --experimental-modules check-db.js'" -ForegroundColor Yellow
    
    # Keep window open to read error message
    Read-Host -Prompt "Press Enter to exit"
} 