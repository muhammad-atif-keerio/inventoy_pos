# Script to fix the sales schema by removing the problematic foreign key constraints
Write-Host "๐ง Starting sales schema fix..." -ForegroundColor Cyan

# Run the fix script with execution policy bypass
try {
    powershell -ExecutionPolicy Bypass -Command "node --experimental-modules fix-sales-schema.js"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n๐ Sales schema fix completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "`nโ Sales schema fix encountered issues. See output above." -ForegroundColor Yellow
    }
} 
catch {
    Write-Host "โ Failed to run the fix script: $_" -ForegroundColor Red
}

# Keep window open to read output
Read-Host -Prompt "Press Enter to exit" 