# PowerShell script to prepare for Vercel deployment

Write-Host "🚀 Preparing application for Vercel deployment..." -ForegroundColor Cyan

# Check Node.js installation
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js before proceeding." -ForegroundColor Red
    exit 1
}

# Check for .env file
if (Test-Path .env) {
    Write-Host "✅ .env file found." -ForegroundColor Green
} else {
    Write-Host "⚠️ No .env file found." -ForegroundColor Yellow
    Write-Host "Would you like to create a sample .env file? (Y/N)" -ForegroundColor Yellow
    $createEnv = Read-Host
    
    if ($createEnv -eq "Y" -or $createEnv -eq "y") {
        $envContent = @"
# DATABASE CONNECTION
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres"

# CLERK AUTHENTICATION
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=[YOUR-PUBLISHABLE-KEY]
CLERK_SECRET_KEY=[YOUR-SECRET-KEY]
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# APPLICATION SETTINGS
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
"@
        Set-Content -Path .env -Value $envContent
        Write-Host "✅ Sample .env file created. Please edit it with your actual credentials." -ForegroundColor Green
    } else {
        Write-Host "⚠️ Continuing without .env file. Make sure to set environment variables in Vercel dashboard." -ForegroundColor Yellow
    }
}

# Run npm install if node_modules doesn't exist
if (-not (Test-Path node_modules)) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dependencies installed." -ForegroundColor Green
}

# Generate Prisma client
Write-Host "🔄 Generating Prisma client..." -ForegroundColor Cyan
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma client." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Prisma client generated." -ForegroundColor Green

# Run the database check script
Write-Host "🔍 Checking database connection..." -ForegroundColor Cyan
node --experimental-modules prepare-vercel-deploy.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Database check failed. Please fix the issues before deploying." -ForegroundColor Red
    exit 1
}

# Test build
Write-Host "🏗️ Testing build process..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Please fix the issues before deploying." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build successful." -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Your application is ready for deployment to Vercel!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Commit all your changes to your repository" -ForegroundColor White
Write-Host "2. Push your changes to GitHub/GitLab/Bitbucket" -ForegroundColor White
Write-Host "3. Import your project in the Vercel dashboard" -ForegroundColor White
Write-Host "4. Set up environment variables in the Vercel dashboard" -ForegroundColor White
Write-Host "5. Deploy your application" -ForegroundColor White
Write-Host ""
Write-Host "For detailed deployment instructions, see VERCEL_DEPLOYMENT.md" -ForegroundColor Cyan 