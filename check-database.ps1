# Script to run database connection check with execution policy bypass
Write-Host "Checking database connection..." -ForegroundColor Cyan

# Run check-db.js with execution policy bypass
try {
    powershell -ExecutionPolicy Bypass -Command "node --experimental-modules check-db.js"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nDatabase check completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "`nDatabase check encountered issues. See output above." -ForegroundColor Yellow
    }
} 
catch {
    Write-Host "Failed to run database check: $_" -ForegroundColor Red
}

# Keep window open to read output
Read-Host -Prompt "Press Enter to exit" 