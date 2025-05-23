# Script to prepare the application for deployment
Write-Host "Starting deployment preparation..." -ForegroundColor Cyan

# 1. Check environment file
if (Test-Path .env) {
    Write-Host "✓ Found .env file" -ForegroundColor Green
    $envContent = Get-Content .env -Raw
    
    # Check for required variables
    $requiredVars = @(
        "DATABASE_URL", 
        "DIRECT_URL", 
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", 
        "CLERK_SECRET_KEY",
        "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
        "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
        "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL",
        "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL"
    )
    $missingVars = @()
    
    foreach ($var in $requiredVars) {
        if ($envContent -notmatch $var) {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -gt 0) {
        Write-Host "⚠️ Missing required environment variables: $($missingVars -join ', ')" -ForegroundColor Yellow
        Write-Host "Please check ENV_SETUP.md for details on setting up environment variables" -ForegroundColor Yellow
    } else {
        Write-Host "✓ All required environment variables found" -ForegroundColor Green
    }
} else {
    Write-Host "❌ .env file not found! Please create one using ENV_SETUP.md as a guide" -ForegroundColor Red
    $continueProcess = Read-Host "Do you want to continue without .env file? (y/n)"
    if ($continueProcess -ne "y") {
        exit
    }
}

# 2. Check database connection
Write-Host "`nChecking database connection..." -ForegroundColor Cyan
try {
    $output = powershell -ExecutionPolicy Bypass -Command "node --experimental-modules check-db.js" | Out-String
    if ($output -match "Connection successful") {
        Write-Host "✓ Database connection successful" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Database connection issues detected." -ForegroundColor Yellow
        Write-Host $output
        $continueProcess = Read-Host "Do you want to continue despite database connection issues? (y/n)"
        if ($continueProcess -ne "y") {
            exit
        }
    }
}
catch {
    Write-Host "❌ Failed to check database connection: $_" -ForegroundColor Red
    $continueProcess = Read-Host "Do you want to continue despite database issues? (y/n)"
    if ($continueProcess -ne "y") {
        exit
    }
}

# 3. Fix database schema issues
Write-Host "`nFixing sales schema issues if any..." -ForegroundColor Cyan
try {
    $output = powershell -ExecutionPolicy Bypass -Command "node --experimental-modules fix-sales-schema.js" | Out-String
    Write-Host $output
}
catch {
    Write-Host "❌ Failed to run schema fix script: $_" -ForegroundColor Red
}

# 4. Check for Clerk authentication keys
Write-Host "`nChecking Clerk authentication setup..." -ForegroundColor Cyan
if (Test-Path .env) {
    $envContent = Get-Content .env -Raw
    
    if ($envContent -match "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=(pk_test|pk_live)_\w+" -and 
        $envContent -match "CLERK_SECRET_KEY=(sk_test|sk_live)_\w+") {
        Write-Host "✓ Clerk authentication keys found" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Clerk authentication keys missing or invalid" -ForegroundColor Yellow
        Write-Host "Please set up proper authentication keys in your .env file" -ForegroundColor Yellow
    }
}

# 5. Generate Prisma client
Write-Host "`nGenerating Prisma client..." -ForegroundColor Cyan
try {
    $output = powershell -ExecutionPolicy Bypass -Command "npx prisma generate" | Out-String
    if ($output -match "Generated Prisma Client") {
        Write-Host "✓ Prisma client generated successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Issue generating Prisma client" -ForegroundColor Yellow
        Write-Host $output
    }
}
catch {
    Write-Host "❌ Failed to generate Prisma client: $_" -ForegroundColor Red
}

# 6. Run a test build
Write-Host "`nRunning test build..." -ForegroundColor Cyan
try {
    $output = powershell -ExecutionPolicy Bypass -Command "npm run build" | Out-String
    if ($output -match "Successfully generated") {
        Write-Host "✓ Build successful" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Build issues detected" -ForegroundColor Yellow
        Write-Host $output
    }
}
catch {
    Write-Host "❌ Build failed: $_" -ForegroundColor Red
}

Write-Host "`nDeployment preparation complete!" -ForegroundColor Cyan
Write-Host "Please review the DEPLOYMENT_CHECKLIST.md and DEPLOYMENT.md files for additional steps." -ForegroundColor Cyan
Write-Host "For environment variable setup, refer to ENV_SETUP.md" -ForegroundColor Cyan

# Keep the window open
Read-Host -Prompt "Press Enter to exit" 