# Comprehensive deployment preparation script
Write-Host "Starting comprehensive deployment preparation..." -ForegroundColor Cyan

# Check for Node.js
try {
    $nodeVersion = node -v
    Write-Host "✓ Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ before proceeding." -ForegroundColor Red
    exit 1
}

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

# 2. Run the ledger schema fix script
Write-Host "`nFixing Ledger schema issues..." -ForegroundColor Cyan
try {
    Write-Host "Running ledger schema fix script..."
    node --experimental-modules fix-ledger-schema.js
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Issue with ledger schema fix, but continuing..." -ForegroundColor Yellow
    } else {
        Write-Host "✓ Ledger schema fixes applied" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Error running ledger schema fix: $_" -ForegroundColor Yellow
    Write-Host "Continuing with deployment preparation..." -ForegroundColor Yellow
}

# 2b. Run the ledger type issues fix
Write-Host "`nFixing Ledger type issues..." -ForegroundColor Cyan
try {
    Write-Host "Running ledger type fix script..."
    node fix-ledger-type-issues.js
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Issue with ledger type fix, but continuing..." -ForegroundColor Yellow
    } else {
        Write-Host "✓ Ledger type fixes applied" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Error running ledger type fix: $_" -ForegroundColor Yellow
    Write-Host "Continuing with deployment preparation..." -ForegroundColor Yellow
}

# 3. Run sales schema fix
Write-Host "`nFixing sales schema issues..." -ForegroundColor Cyan
try {
    Write-Host "Running sales schema fix script..."
    node --experimental-modules fix-sales-schema.js
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Issue with sales schema fix, but continuing..." -ForegroundColor Yellow
    } else {
        Write-Host "✓ Sales schema fixes applied" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Error running sales schema fix: $_" -ForegroundColor Yellow
    Write-Host "Continuing with deployment preparation..." -ForegroundColor Yellow
}

# 4. Check database connection
Write-Host "`nChecking database connection..." -ForegroundColor Cyan
try {
    Write-Host "Running database connection check..."
    node --experimental-modules check-db.js
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Database connection issues detected." -ForegroundColor Yellow
        $continueProcess = Read-Host "Do you want to continue despite database connection issues? (y/n)"
        if ($continueProcess -ne "y") {
            exit
        }
    } else {
        Write-Host "✓ Database connection successful" -ForegroundColor Green
    }
}
catch {
    Write-Host "❌ Failed to check database connection: $_" -ForegroundColor Red
    $continueProcess = Read-Host "Do you want to continue despite database issues? (y/n)"
    if ($continueProcess -ne "y") {
        exit
    }
}

# 5. Install dependencies if node_modules doesn't exist or is outdated
Write-Host "`nChecking dependencies..." -ForegroundColor Cyan
if (!(Test-Path node_modules) -or ((Get-ChildItem package.json).LastWriteTime -gt (Get-ChildItem node_modules -ErrorAction SilentlyContinue).LastWriteTime)) {
    Write-Host "Installing dependencies..."
    npm ci
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Issue installing dependencies" -ForegroundColor Yellow
        $continueProcess = Read-Host "Do you want to continue despite dependency issues? (y/n)"
        if ($continueProcess -ne "y") {
            exit
        }
    } else {
        Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
    }
} else {
    Write-Host "✓ Dependencies already installed" -ForegroundColor Green
}

# 6. Generate Prisma client
Write-Host "`nGenerating Prisma client..." -ForegroundColor Cyan
try {
    npx prisma generate
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Issue generating Prisma client" -ForegroundColor Yellow
        $continueProcess = Read-Host "Do you want to continue despite Prisma client issues? (y/n)"
        if ($continueProcess -ne "y") {
            exit
        }
    } else {
        Write-Host "✓ Prisma client generated successfully" -ForegroundColor Green
    }
}
catch {
    Write-Host "❌ Failed to generate Prisma client: $_" -ForegroundColor Red
    $continueProcess = Read-Host "Do you want to continue despite Prisma client issues? (y/n)"
    if ($continueProcess -ne "y") {
        exit
    }
}

# 7. Push schema changes to database
Write-Host "`nPushing schema changes to database..." -ForegroundColor Cyan
try {
    npx prisma db push
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Issue pushing schema changes" -ForegroundColor Yellow
        
        # Ask if user wants to force push with potential data loss
        $forcePush = Read-Host "Do you want to force push schema changes (may cause data loss)? (y/n)"
        if ($forcePush -eq "y") {
            Write-Host "Force pushing schema changes..."
            npx prisma db push --accept-data-loss
            
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ Failed to force push schema changes" -ForegroundColor Red
            } else {
                Write-Host "✓ Schema changes force pushed" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "✓ Schema changes pushed successfully" -ForegroundColor Green
    }
}
catch {
    Write-Host "❌ Failed to push schema changes: $_" -ForegroundColor Red
    $continueProcess = Read-Host "Do you want to continue despite schema push issues? (y/n)"
    if ($continueProcess -ne "y") {
        exit
    }
}

# 8. Run a lint check
Write-Host "`nRunning lint check..." -ForegroundColor Cyan
try {
    npm run lint
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Lint issues detected" -ForegroundColor Yellow
        $continueProcess = Read-Host "Do you want to continue despite lint issues? (y/n)"
        if ($continueProcess -ne "y") {
            exit
        }
    } else {
        Write-Host "✓ Lint check passed" -ForegroundColor Green
    }
}
catch {
    Write-Host "❌ Failed to run lint check: $_" -ForegroundColor Red
}

# 9. Run a test build
Write-Host "`nRunning test build..." -ForegroundColor Cyan
try {
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Build issues detected" -ForegroundColor Yellow
        $continueProcess = Read-Host "Do you want to continue despite build issues? (y/n)"
        if ($continueProcess -ne "y") {
            exit
        }
    } else {
        Write-Host "✓ Build successful" -ForegroundColor Green
    }
}
catch {
    Write-Host "❌ Build failed: $_" -ForegroundColor Red
    $continueProcess = Read-Host "Do you want to continue despite build failure? (y/n)"
    if ($continueProcess -ne "y") {
        exit
    }
}

# 10. Final check - run the start command to ensure app starts correctly
Write-Host "`nFinal check - Testing app startup..." -ForegroundColor Cyan
try {
    $job = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        npm run start
    }
    
    # Wait a bit for the app to start
    Start-Sleep -Seconds 5
    
    # Check if the job is still running
    $jobStatus = Get-Job -Id $job.Id | Select-Object -ExpandProperty State
    
    if ($jobStatus -eq "Running") {
        Write-Host "✓ App started successfully" -ForegroundColor Green
        
        # Stop the job since we've verified it starts
        Stop-Job -Id $job.Id
        Remove-Job -Id $job.Id -Force
    } else {
        Write-Host "❌ App failed to start" -ForegroundColor Red
        $jobOutput = Receive-Job -Id $job.Id
        Write-Host "Job output: $jobOutput" -ForegroundColor Red
        
        $continueProcess = Read-Host "Do you want to continue despite app startup issues? (y/n)"
        if ($continueProcess -ne "y") {
            exit
        }
    }
}
catch {
    Write-Host "❌ Failed to test app startup: $_" -ForegroundColor Red
}

Write-Host "`nDeployment preparation complete!" -ForegroundColor Cyan
Write-Host "Please review the DEPLOYMENT_CHECKLIST.md and DEPLOYMENT.md files for additional steps." -ForegroundColor Cyan
Write-Host "For environment variable setup, refer to ENV_SETUP.md" -ForegroundColor Cyan

# Keep the window open
Read-Host -Prompt "Press Enter to exit" 