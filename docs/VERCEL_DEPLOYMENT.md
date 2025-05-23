# Vercel Deployment Guide

This guide provides step-by-step instructions for deploying the Inventory POS application to Vercel with Supabase as the database.

## Prerequisites

- A Vercel account: [https://vercel.com/signup](https://vercel.com/signup)
- A GitHub, GitLab, or Bitbucket repository with your code
- A Supabase account with a project set up: [https://supabase.com/](https://supabase.com/)
- A Clerk account for authentication: [https://clerk.com/](https://clerk.com/)

## Step 1: Prepare Your Supabase Database

1. **Get Connection Details**:

    - Go to your Supabase dashboard
    - Select your project
    - Go to Project Settings → Database
    - Copy both connection strings:
        - **Connection Pooling** string for `DATABASE_URL` (with `?pgbouncer=true` at the end)
        - **Direct Connection** string for `DIRECT_URL`

2. **Enable Row Level Security**:
    - In your Supabase dashboard, go to Table Editor
    - Make sure Row Level Security (RLS) is properly configured for your tables

## Step 2: Set Up Clerk Authentication

1. **Create a Clerk Application**:
    - Sign in to your Clerk dashboard
    - Create a new application or select an existing one
    - Go to API Keys
    - Copy your publishable key and secret key

## Step 3: Deploy to Vercel

1. **Connect Your Repository**:

    - Log in to Vercel
    - Click "Import Project"
    - Select your Git provider (GitHub, GitLab, or Bitbucket)
    - Select the repository containing your Inventory POS application

2. **Configure Project**:

    - **Framework Preset**: Select "Next.js"
    - **Build and Output Settings**: Leave as default
    - **Environment Variables**: Add the following environment variables:

        ```
        DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true
        DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=[YOUR-PUBLISHABLE-KEY]
        CLERK_SECRET_KEY=[YOUR-SECRET-KEY]
        NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
        NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
        NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
        NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
        NODE_ENV=production
        ```

3. **Deploy**:
    - Click "Deploy"
    - Wait for the deployment to complete

## Step 4: Verify Deployment

1. **Check Deployment Logs**:

    - In your Vercel dashboard, go to your project
    - Click on the latest deployment
    - Check the build logs for any errors

2. **Test Database Connection**:

    - Visit your deployed application
    - Try to log in and verify that you can access the database
    - Check that all features work correctly

3. **Database Migration**:
    - If needed, you can run database migrations manually from your local machine:
        ```bash
        npx prisma db push
        ```
    - This should be handled automatically by the `vercel-build` script in package.json

## Step 5: Set Up Custom Domain (Optional)

1. In your Vercel dashboard, go to your project settings
2. Click on "Domains"
3. Add your custom domain and follow the instructions

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues:

1. **Check Database URL**:

    - Verify that your connection strings are correct
    - Make sure you're using the pooled connection string for `DATABASE_URL`
    - Make sure you're using the direct connection string for `DIRECT_URL`

2. **IP Allow List**:

    - In Supabase, go to Project Settings → Database
    - In the "Connection Pooling" section, make sure to allow Vercel's IPs
    - You can set it to allow all connections (0.0.0.0/0) for simplicity, but this is less secure

3. **Check Schema**:
    - Make sure your Prisma schema matches your database schema
    - Run `npx prisma db push` from your local machine to update the schema if needed

### Authentication Issues

If authentication isn't working:

1. **Check Clerk Configuration**:

    - Verify that your Clerk API keys are correct
    - Make sure you've added your Vercel deployment URL to the allowed domains in Clerk

2. **Check Environment Variables**:
    - In Vercel, go to your project settings
    - Click on "Environment Variables"
    - Verify that all Clerk-related variables are set correctly

## Ongoing Maintenance

1. **Monitor Performance**:

    - Use Vercel Analytics to monitor your application performance
    - Set up Sentry or another error tracking solution for detailed error reporting

2. **Database Backups**:

    - Set up regular backups for your Supabase database
    - Supabase provides automatic backups, but you may want to set up additional backup procedures

3. **Updates**:
    - When you push updates to your repository, Vercel will automatically redeploy your application
    - Make sure to test changes locally before pushing to production
