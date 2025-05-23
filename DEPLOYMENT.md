# Deployment Guide for Inventory POS System

This guide will help you deploy the Inventory POS system to production. Follow these steps to ensure a smooth deployment process.

## Prerequisites

- Node.js 18+ installed on your server
- PostgreSQL 14+ database (we recommend using Supabase for easy setup)
- A Clerk account for authentication
- A domain name (optional but recommended)

## Step 1: Set Up Your Database

1. Create a PostgreSQL database. We recommend using [Supabase](https://supabase.com/) for easy setup.
2. Note down your database connection strings (both pooled and direct connections).

## Step 2: Set Up Authentication

1. Create a project on [Clerk](https://clerk.dev/).
2. Configure your authentication settings.
3. Note down your API keys.

## Step 3: Environment Configuration

Create a `.env` file in the root of your project with the following variables:

```env
# Database Connection URLs
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres"

# Authentication - Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Next.js
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

Make sure to replace the placeholder values with your actual credentials.

## Step 4: Database Setup

1. Run the database migrations:

```bash
npx prisma migrate deploy
```

2. (Optional) Seed your database with initial data:

```bash
npx prisma db seed
```

## Step 5: Build the Application

Build the Next.js application:

```bash
npm run build
```

## Step 6: Deployment Options

### Option 1: Vercel (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket).
2. Connect your repository to [Vercel](https://vercel.com/).
3. Configure your environment variables in the Vercel dashboard.
4. Deploy your application.

### Option 2: Self-Hosted

1. Install PM2 for process management:

```bash
npm install -g pm2
```

2. Start your application:

```bash
pm2 start npm --name "inventory-pos" -- start
```

3. Set up a reverse proxy (Nginx or Apache) to forward requests to your application.

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. Set up SSL with Let's Encrypt:

```bash
sudo certbot --nginx -d your-domain.com
```

## Step 7: Post-Deployment Verification

1. Check that your application is running properly by visiting your domain.
2. Verify that you can sign in and access all features.
3. Test the sales and inventory management functionality.
4. Ensure that database operations are working correctly.

## Step 8: Monitoring and Maintenance

1. Set up monitoring for your application (Vercel Analytics, Sentry, etc.).
2. Configure regular database backups.
3. Set up alerts for critical errors.

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues, check:

1. That your database connection strings are correct.
2. That your IP address is allowed in the database firewall settings.
3. Run the database check script:

```bash
node --experimental-modules check-db.js
```

### Authentication Issues

If users cannot sign in:

1. Verify that your Clerk API keys are correct.
2. Check that your authentication endpoints are configured correctly.
3. Ensure that your domain is added to the allowed domains in Clerk.

### Performance Issues

If your application is slow:

1. Check your database query performance.
2. Consider adding indexes to frequently queried fields.
3. Optimize your API routes for better performance.

## Support

For additional support, please contact our team or open an issue on GitHub.
