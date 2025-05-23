# Fixed Database Foreign Key Issues in Sales Module

## Problem

The application has been experiencing foreign key constraint errors when creating sales orders, specifically the following error:

```
Raw query failed. Code: `23503`. Message: `insert or update on table "SalesOrderItem" violates foreign key constraint "ThreadSalesItemFK"`
```

This happens because the original database schema had a problematic design:

1. The `SalesOrderItem` table had a `productId` column that was used to reference both `ThreadPurchase.id` and `FabricProduction.id` depending on the `productType`.
2. This created ambiguous foreign key constraints that were incompatible with certain sales scenarios, especially when selling inventory items without a direct reference to the original production record.

## Solution

We implemented a comprehensive fix by:

1. **Updating the database schema** to add dedicated foreign key columns:

    - Added `threadPurchaseId` for referencing thread purchases
    - Added `fabricProductionId` for referencing fabric productions
    - Made these relationships optional to allow inventory-only sales

2. **Updating the Prisma schema** to reflect these changes:

    - Modified the `SalesOrderItem` model in `schema.prisma`
    - Added proper indexes for improved performance

3. **Fixing the API implementation** to correctly use the new schema:
    - Updated the `sales/submit/route.ts` file to use the new columns
    - Removed the problematic raw SQL queries
    - Added proper handling for inventory-only sales

## How to Apply the Fix

To fix the database and make the sales form fully functional:

1. **Update the Prisma schema**:

    - The `schema.prisma` file has been updated with the new model definition
    - Run `npx prisma generate` to update the Prisma client

2. **Apply the database schema changes**:

    - Run our migration script to modify the database schema:

    ```
    # In Windows PowerShell:
    .\run-fix-sales.ps1

    # Or directly with Node.js:
    node --experimental-modules fix-sales-schema.js
    ```

3. **Test the sales form**:
    - The sales form should now work correctly without foreign key constraint errors
    - You can sell items from inventory even if they don't have a direct source production record

## Technical Details

The fix addresses several key issues:

1. **Schema Design Problem**:

    - Originally: `SalesOrderItem.productId` had constraints to both `ThreadPurchase.id` and `FabricProduction.id`
    - Now: Separate columns `threadPurchaseId` and `fabricProductionId` with optional relationships

2. **API Implementation**:

    - Sales submission now uses the correct schema when creating sales order items
    - Product IDs are properly managed across different product types

3. **Data Integrity**:
    - Existing sales records are migrated to use the new schema
    - All constraints now correctly enforce data integrity

## Next Steps

If you encounter any further issues with foreign key constraints:

1. Check the console for detailed error messages
2. Verify that the fix script ran successfully
3. Look for any other similar constraints in the database that might need fixing
4. Run `npx prisma db pull` to verify that the schema is in sync

---

With these changes, your inventory and sales system is now more robust and will handle a wider variety of sales scenarios without constraint errors.
