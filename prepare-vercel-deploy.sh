#!/bin/bash

# Shell script to prepare for Vercel deployment

# Color codes
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}🚀 Preparing application for Vercel deployment...${NC}"

# Check Node.js installation
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js is installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js before proceeding.${NC}"
    exit 1
fi

# Check for .env file
if [ -f .env ]; then
    echo -e "${GREEN}✅ .env file found.${NC}"
else
    echo -e "${YELLOW}⚠️ No .env file found.${NC}"
    read -p "Would you like to create a sample .env file? (Y/N) " CREATE_ENV
    
    if [[ $CREATE_ENV == "Y" || $CREATE_ENV == "y" ]]; then
        cat > .env << EOL
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
EOL
        echo -e "${GREEN}✅ Sample .env file created. Please edit it with your actual credentials.${NC}"
    else
        echo -e "${YELLOW}⚠️ Continuing without .env file. Make sure to set environment variables in Vercel dashboard.${NC}"
    fi
fi

# Run npm install if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${CYAN}📦 Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install dependencies.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Dependencies installed.${NC}"
fi

# Generate Prisma client
echo -e "${CYAN}🔄 Generating Prisma client...${NC}"
npx prisma generate
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to generate Prisma client.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Prisma client generated.${NC}"

# Run the database check script
echo -e "${CYAN}🔍 Checking database connection...${NC}"
node --experimental-modules prepare-vercel-deploy.js
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Database check failed. Please fix the issues before deploying.${NC}"
    exit 1
fi

# Test build
echo -e "${CYAN}🏗️ Testing build process...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed. Please fix the issues before deploying.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build successful.${NC}"

echo ""
echo -e "${GREEN}🎉 Your application is ready for deployment to Vercel!${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "1. Commit all your changes to your repository"
echo "2. Push your changes to GitHub/GitLab/Bitbucket"
echo "3. Import your project in the Vercel dashboard"
echo "4. Set up environment variables in the Vercel dashboard"
echo "5. Deploy your application"
echo ""
echo -e "${CYAN}For detailed deployment instructions, see VERCEL_DEPLOYMENT.md${NC}" 