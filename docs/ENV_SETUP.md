# Environment Variables Setup Guide

This guide explains how to set up the necessary environment variables for the Inventory POS application to function correctly. These environment variables are crucial for database connectivity and authentication.

## Required Environment Variables

Create a `.env` file in the root directory of your project with the following variables:

```
# DATABASE CONNECTION
DATABASE_URL="postgresql://postgres:your_password@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:your_password@db.your_project_id.supabase.co:5432/postgres"

# CLERK AUTHENTICATION
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key
CLERK_SECRET_KEY=sk_test_your_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# APPLICATION SETTINGS
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## Setting Up Database Connection

1. **Obtain Database Credentials:**

    - If using Supabase (recommended):
        1. Go to [Supabase Dashboard](https://app.supabase.io)
        2. Select your project
        3. Go to Settings → Database
        4. Find "Connection Pooling" section for `DATABASE_URL`
        5. Find "Connection String" section for `DIRECT_URL`
    - If using another PostgreSQL provider, obtain the connection strings from your provider's dashboard

2. **Replace Placeholders:**
    - Replace `your_password` with your actual database password
    - Replace `your_project_id` with your Supabase project ID

## Setting Up Clerk Authentication

1. **Create a Clerk Account:**

    - Go to [Clerk Dashboard](https://dashboard.clerk.dev)
    - Create a new application

2. **Get API Keys:**

    - Go to API Keys section in your Clerk dashboard
    - Copy the "Publishable Key" and paste it as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
    - Copy the "Secret Key" and paste it as `CLERK_SECRET_KEY`

3. **Configure Authentication Routes:**
    - The default configuration uses the following routes:
        - Sign In: `/sign-in`
        - Sign Up: `/sign-up`
        - After Sign In: `/dashboard`
        - After Sign Up: `/dashboard`
    - You can modify these paths if your application uses different routes

## Environment-Specific Configuration

### Development

For local development, use:

```
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production

For production deployment, use:

```
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Testing Your Configuration

After setting up your environment variables:

1. Run the database connection check:

    ```
    node --experimental-modules check-db.js
    ```

2. Start the development server:

    ```
    npm run dev
    ```

3. Visit http://localhost:3000 and verify that authentication works correctly

## Troubleshooting

### Database Connection Issues

If you encounter database connection problems:

1. Check that your IP address is allowed in the Supabase firewall settings
2. Verify that the connection strings are correct
3. If using connection pooling, try the direct connection first to troubleshoot

### Authentication Issues

If you experience authentication issues:

1. Verify that the Clerk API keys are correct
2. Check if the environment variables are being loaded properly
3. Ensure that the ClerkProvider component is correctly wrapping your application
4. Clear browser cookies and try again

## Deployment Configuration

When deploying to platforms like Vercel or Netlify, add these environment variables in your deployment platform's dashboard rather than relying on the `.env` file.

For more detailed deployment instructions, see the `DEPLOYMENT.md` file.
