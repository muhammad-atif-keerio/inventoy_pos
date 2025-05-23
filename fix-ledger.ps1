# PowerShell script to diagnose and fix ledger functionality issues
Write-Host "Starting ledger system fix..." -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found! Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Install pg package if needed for database connections
try {
    Write-Host "Checking for required npm packages..." -ForegroundColor Cyan
    $packageJson = Get-Content -Path "package.json" -Raw | ConvertFrom-Json
    $hasPg = $false

    if ($packageJson.dependencies.pg) {
        $hasPg = $true
        Write-Host "✓ pg package found in dependencies" -ForegroundColor Green
    } elseif ($packageJson.devDependencies.pg) {
        $hasPg = $true
        Write-Host "✓ pg package found in devDependencies" -ForegroundColor Green
    }

    if (-not $hasPg) {
        Write-Host "Installing pg package for database operations..." -ForegroundColor Yellow
        npm install --save pg
        Write-Host "✓ pg package installed" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Error checking package.json: $_" -ForegroundColor Yellow
    Write-Host "Will proceed without package check" -ForegroundColor Yellow
}

# Run the fix-ledger-connection.js script
try {
    Write-Host "Running ledger connection fix script..." -ForegroundColor Cyan
    node fix-ledger-connection.js
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Connection fix script completed with warnings." -ForegroundColor Yellow
    } else {
        Write-Host "✓ Connection fix script completed successfully" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error running connection fix script: $_" -ForegroundColor Red
}

# Run the ledger entry sync script
Write-Host "Do you want to run the sync-ledger-entries.js script to add khata references? (y/n)" -ForegroundColor Cyan
$runSync = Read-Host

if ($runSync -eq "y" -or $runSync -eq "Y") {
    try {
        Write-Host "Running ledger entry sync script..." -ForegroundColor Cyan
        node sync-ledger-entries.js
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️ Sync script completed with warnings." -ForegroundColor Yellow
        } else {
            Write-Host "✓ Sync script completed successfully" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ Error running sync script: $_" -ForegroundColor Red
    }
} else {
    Write-Host "Skipping ledger entry sync" -ForegroundColor Yellow
}

# Check if Prisma clients need to be generated
Write-Host "Do you want to generate Prisma clients? (y/n)" -ForegroundColor Cyan
$generatePrisma = Read-Host

if ($generatePrisma -eq "y" -or $generatePrisma -eq "Y") {
    try {
        Write-Host "Generating Prisma client..." -ForegroundColor Cyan
        npx prisma generate
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Error generating Prisma client." -ForegroundColor Red
        } else {
            Write-Host "✓ Prisma client generated successfully" -ForegroundColor Green
        }
        
        # Check if ledger schema exists and generate its client
        if (Test-Path -Path "prisma/schema-ledger.prisma") {
            Write-Host "Generating ledger-specific Prisma client..." -ForegroundColor Cyan
            npx prisma generate --schema=prisma/schema-ledger.prisma
            
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ Error generating ledger Prisma client." -ForegroundColor Red
            } else {
                Write-Host "✓ Ledger Prisma client generated successfully" -ForegroundColor Green
            }
        } else {
            Write-Host "⚠️ schema-ledger.prisma not found. Skipping ledger client generation." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Error generating Prisma clients: $_" -ForegroundColor Red
    }
} else {
    Write-Host "Skipping Prisma client generation" -ForegroundColor Yellow
}

# Verify database connection and push schema if needed
Write-Host "Do you want to push the Prisma schema to the database? This may create/modify tables. (y/n)" -ForegroundColor Cyan
$pushSchema = Read-Host

if ($pushSchema -eq "y" -or $pushSchema -eq "Y") {
    try {
        # Push main schema
        Write-Host "Pushing main Prisma schema to database..." -ForegroundColor Cyan
        npx prisma db push --accept-data-loss
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️ Warning pushing schema." -ForegroundColor Yellow
        } else {
            Write-Host "✓ Main schema pushed successfully" -ForegroundColor Green
        }
        
        # Push ledger schema if it exists
        if (Test-Path -Path "prisma/schema-ledger.prisma") {
            Write-Host "Pushing ledger schema to database..." -ForegroundColor Cyan
            npx prisma db push --schema=prisma/schema-ledger.prisma --accept-data-loss
            
            if ($LASTEXITCODE -ne 0) {
                Write-Host "⚠️ Warning pushing ledger schema." -ForegroundColor Yellow
            } else {
                Write-Host "✓ Ledger schema pushed successfully" -ForegroundColor Green
            }
        }
    } catch {
        Write-Host "❌ Error pushing schema: $_" -ForegroundColor Red
    }
} else {
    Write-Host "Skipping schema push" -ForegroundColor Yellow
}

Write-Host "`nLedger system fix process completed!" -ForegroundColor Cyan
Write-Host "You can now restart your Next.js application." -ForegroundColor Cyan

# Ask if user wants to start the development server
Write-Host "Do you want to start the Next.js development server now? (y/n)" -ForegroundColor Cyan
$startServer = Read-Host

if ($startServer -eq "y" -or $startServer -eq "Y") {
    Write-Host "Starting Next.js development server..." -ForegroundColor Cyan
    npm run dev
} else {
    Write-Host "You can start the server later with 'npm run dev'" -ForegroundColor Yellow
}

Write-Host "`nPress Enter to exit" -ForegroundColor Cyan
Read-Host 