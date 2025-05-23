# Supabase Connection Guide

Follow these steps to fix your database connection issues:

## 1. Get your Supabase credentials

1. Go to your [Supabase project dashboard](https://app.supabase.io/)
2. Click on "Settings" in the sidebar
3. Click on "Database"
4. Find the "Connection Pooling" section
5. Copy the connection string (it should look like `postgresql://postgres:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`)

## 2. Update your .env file

Open your `.env` file and update the following variables:

```env
# Connection pooling URL (for regular queries)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true"

# Direct connection URL (for migrations/schema changes)
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres"
```

Replace:

- `[YOUR-PASSWORD]` with your actual Supabase database password
- `[YOUR-PROJECT-ID]` with your Supabase project ID (found in the connection string or project settings)

## 3. Update your schema.prisma file

Ensure your `prisma/schema.prisma` file has both `url` and `directUrl` properties:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## 4. Generate Prisma Client

Run this command to update your Prisma client:

```bash
npx prisma generate
```

## 5. Push your schema to the database

```bash
npx prisma db push
```

## 6. Test the connection

```bash
node check-db.js
```

## Common Issues & Solutions

### 1. IP Allow List

If you're still getting connection errors, make sure your IP address is allowed in Supabase:

1. Go to Supabase Dashboard → Project Settings → Database
2. Find "Connection Pooling" settings
3. Click "Edit" next to "IP Allow List"
4. Add your current IP address

### 2. Correct Port

Make sure you're using port 5432, not 6543 (which might be shown in some places).

### 3. SSL Requirements

Supabase requires SSL. If you're having connection issues, try adding `?sslmode=require` to your connection strings.

### 4. Password Special Characters

If your password contains special characters, make sure to properly encode them in the URL.
