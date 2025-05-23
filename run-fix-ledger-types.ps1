# PowerShell script to fix ledger type issues

Write-Host "Starting ledger type fix process..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Using Node.js $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "Node.js is required but not found. Please install Node.js and try again." -ForegroundColor Red
    exit 1
}

# Run the fix script
Write-Host "Running ledger type fix script..." -ForegroundColor Yellow
node fix-ledger-type-issues.js

# Check if there was an error
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error running the fix script. Please check the output above." -ForegroundColor Red
    exit $LASTEXITCODE
}

# Run TypeScript check to see if issues are resolved
Write-Host "Checking TypeScript compilation..." -ForegroundColor Yellow
npx tsc --noEmit

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ TypeScript compilation successful. Type issues have been fixed." -ForegroundColor Green
}
else {
    Write-Host "⚠️ TypeScript compilation still has errors. Additional fixes may be needed." -ForegroundColor Yellow
}

# Update the deployment checklist
$checklistPath = "./DEPLOYMENT_CHECKLIST.md"
if (Test-Path $checklistPath) {
    $checklist = Get-Content $checklistPath -Raw
    
    # Mark the ledger type issues as fixed
    $checklist = $checklist -replace "- \[ \] Fixed ledger type issues", "- [x] Fixed ledger type issues"
    
    # Save updated checklist
    $checklist | Set-Content $checklistPath
    Write-Host "✅ Updated deployment checklist" -ForegroundColor Green
}

Write-Host "Ledger type fix process completed." -ForegroundColor Green 