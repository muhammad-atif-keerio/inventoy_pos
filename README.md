# Inventory and Point of Sale (POS) System

A comprehensive inventory management and point of sale system for textile manufacturers. This application helps manage the entire textile production workflow, from thread purchases to fabric production, as well as sales management.

## Features

- **Thread Purchase Management**: Track thread purchases, inventory, and dyeing processes
- **Fabric Production**: Monitor fabric production from raw or dyed threads
- **Inventory Control**: Keep track of all inventory items with detailed tracking
- **Sales Management**: Create and manage sales orders with support for different payment methods
- **Dashboard**: Get a quick overview of your business operations
- **Reporting**: Generate various reports for better decision-making

## Technical Features

- **Data Integrity**: Transactions ensure all operations succeed or fail together
- **Error Handling**: Robust error management throughout the application
- **Request Logging**: Middleware logs all API requests for monitoring
- **Type Safety**: Strong TypeScript typing for reliable code
- **API Security**: Proper validation and error responses for all API endpoints

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

1. Clone the repository
    ```
    git clone https://github.com/yourusername/inventory_pos.git
    cd inventory_pos
    ```

```

2. Install dependencies
```

npm install

```

3. Set up environment variables
   Create a `.env` file in the root directory with the following:
```

DATABASE_URL="postgresql://username:password@localhost:5432/inventory_pos"
DIRECT_URL="postgresql://username:password@localhost:5432/inventory_pos"

```

4. Set up the database
```

npx prisma migrate dev
npx prisma db seed

```

5. Start the development server
```

npm run dev

```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Managing Thread Purchases

1. Navigate to the Thread Purchases section to create new purchases
2. Fill in the vendor, thread type, quantity, price, and other details
3. Manage received purchases and update inventory

### Dyeing Processes

1. Select raw threads for dyeing
2. Enter dyeing parameters, colors, and other process information
3. Complete the dyeing process and update inventory

### Fabric Production

1. Select source threads (raw or dyed)
2. Enter production details like fabric type, quantity, and dimensions
3. Monitor production status and update inventory

### Sales Management

1. Create new sales orders
2. Add items to the order from available inventory
3. Process payments and generate invoices

## Deployment

### Deploying to Vercel

This application is optimized for deployment on Vercel with a Supabase PostgreSQL database.

1. **Prepare for deployment**:
```

# Windows

powershell -ExecutionPolicy Bypass -File .\prepare-vercel-deploy.ps1

# Unix/Linux/Mac

bash ./prepare-vercel-deploy.sh

```

2. **Set up environment variables in Vercel**:
- `DATABASE_URL`: Your Supabase pooled connection string
- `DIRECT_URL`: Your Supabase direct connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key
- `CLERK_SECRET_KEY`: Your Clerk secret key
- Other environment variables as needed

3. **Deploy to Vercel**:
- Connect your GitHub/GitLab/Bitbucket repository to Vercel
- Follow the deployment steps in the Vercel dashboard

For detailed deployment instructions, see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md).

## Support

For support, contact us at support@example.com or open an issue on GitHub.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
```
