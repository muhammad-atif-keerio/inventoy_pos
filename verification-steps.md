# Sales System Verification Steps

## Changes Made

1. **Schema Update**:

    - Modified the `SalesOrderItem` model to use separate `threadPurchaseId` and `fabricProductionId` fields
    - This allows sales orders to reference both thread and fabric products correctly

2. **API Updates**:

    - Updated the `/api/sales/submit/route.ts` file to handle the new schema
    - Added type assertions to prevent TypeScript errors

3. **Schema Migration Script**:
    - Created `fix-sales-schema.js` script to update the database schema
    - Script handled:
        - Dropping conflicting constraints
        - Adding new columns
        - Migrating existing data
        - Creating proper foreign key constraints and indexes

## Verification Steps

1. **Visual Check**:

    - Open the sales form dialog in the UI
    - Verify that adding both thread and fabric products to the cart works

2. **Create a Test Sale**:

    - Add a thread product to the cart
    - Add a fabric product to the cart
    - Complete the sale with payment info
    - Submit the form

3. **Check Sale Details**:

    - View the newly created sale in the sales list
    - Click to view details
    - Verify that both products appear correctly

4. **Database Verification**:

    - Run a query to check that the `SalesOrderItem` table has correct references:

    ```sql
    SELECT
      id,
      "salesOrderId",
      "productType",
      "productId",
      "threadPurchaseId",
      "fabricProductionId"
    FROM "SalesOrderItem"
    ORDER BY id DESC
    LIMIT 10;
    ```

    - Verify that thread items have `threadPurchaseId` set and `fabricProductionId` null
    - Verify that fabric items have `fabricProductionId` set and `threadPurchaseId` null

5. **API Test**:
    - Use the test script `test-sales-submit.js` to test the API directly
    - The test will verify that both types of products can be added to a sale
    - It checks that the correct IDs are saved in the appropriate fields

## Conclusion

The sales system now correctly handles multi-product sales with proper foreign key relationships. Thread products reference `ThreadPurchase` entities via `threadPurchaseId`, and fabric products reference `FabricProduction` entities via `fabricProductionId`.

This ensures data integrity and prevents the previous conflict where both product types were trying to reference different tables through the same `productId` field.
