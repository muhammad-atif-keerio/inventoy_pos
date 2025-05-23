# Script to fix the sales schema by removing the problematic foreign key constraints
Write-Host "🚀 Starting sales schema fix..." -ForegroundColor Cyan

# Run the fix script with execution policy bypass
try {
    # First check if dotenv is installed
    $env:NODE_PATH = "node_modules"
    $dotenvCheck = npm list dotenv --depth=0 2>$null
    if (-not $dotenvCheck.Contains("dotenv")) {
        Write-Host "Installing dotenv package..." -ForegroundColor Yellow
        npm install dotenv --save
    }
    
    powershell -ExecutionPolicy Bypass -Command "node fix-sales-schema.js"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Sales schema fix completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️ Sales schema fix encountered issues. See output above." -ForegroundColor Yellow
    }
} 
catch {
    Write-Host "❌ Failed to run the fix script: $_" -ForegroundColor Red
}

# Keep window open to read output
Read-Host -Prompt "Press Enter to exit" 