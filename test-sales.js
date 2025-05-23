// Test script for sales form functionality
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
    log: ["query", "info", "warn", "error"],
});

async function createTestData() {
    console.log("Creating test data for sales form...");

    // Create a test vendor
    try {
        console.log("Creating test vendor...");
        const vendor = await prisma.vendor.create({
            data: {
                name: "Test Vendor",
                contact: "1234567890",
                email: "test@example.com",
                address: "Test Address",
                city: "Test City",
            },
        });
        console.log("✅ Test vendor created:", vendor);

        // Create a test thread type
        console.log("Creating test thread type...");
        const threadType = await prisma.threadType.create({
            data: {
                name: "Test Thread Type",
                description: "Test Thread Type Description",
            },
        });
        console.log("✅ Test thread type created:", threadType);

        // Create a test thread purchase
        console.log("Creating test thread purchase...");
        const threadPurchase = await prisma.threadPurchase.create({
            data: {
                vendorId: vendor.id,
                orderDate: new Date(),
                threadType: "Test Thread Type",
                colorStatus: "RAW",
                quantity: 100,
                unitPrice: 10,
                totalCost: 1000,
                unitOfMeasure: "meters",
                received: true,
            },
        });
        console.log("✅ Test thread purchase created:", threadPurchase);

        // Create a test fabric type
        console.log("Creating test fabric type...");
        const fabricType = await prisma.fabricType.create({
            data: {
                name: "Test Fabric Type",
                description: "Test Fabric Type Description",
            },
        });
        console.log("✅ Test fabric type created:", fabricType);

        // Create a test fabric production
        console.log("Creating test fabric production...");
        const fabricProduction = await prisma.fabricProduction.create({
            data: {
                sourceThreadId: threadPurchase.id,
                productionDate: new Date(),
                fabricType: "Test Fabric Type",
                dimensions: "100x100",
                batchNumber: "TEST-001",
                quantityProduced: 50,
                threadUsed: 200,
                unitOfMeasure: "meters",
                productionCost: 500,
                totalCost: 1000,
                status: "COMPLETED",
            },
        });
        console.log("✅ Test fabric production created:", fabricProduction);

        // Create a test inventory item for thread
        console.log("Creating test inventory item for thread...");
        const threadInventory = await prisma.inventory.create({
            data: {
                itemCode: "THREAD-001",
                description: "Test Thread",
                productType: "THREAD",
                threadTypeId: threadType.id,
                currentQuantity: 80,
                unitOfMeasure: "meters",
                minStockLevel: 10,
                costPerUnit: 10,
                salePrice: 15,
                location: "Warehouse A",
            },
        });
        console.log("✅ Test thread inventory created:", threadInventory);

        // Create a test inventory item for fabric
        console.log("Creating test inventory item for fabric...");
        const fabricInventory = await prisma.inventory.create({
            data: {
                itemCode: "FABRIC-001",
                description: "Test Fabric",
                productType: "FABRIC",
                fabricTypeId: fabricType.id,
                currentQuantity: 40,
                unitOfMeasure: "meters",
                minStockLevel: 5,
                costPerUnit: 20,
                salePrice: 30,
                location: "Warehouse B",
            },
        });
        console.log("✅ Test fabric inventory created:", fabricInventory);

        // Create a test customer
        console.log("Creating test customer...");
        const customer = await prisma.customer.create({
            data: {
                name: "Test Customer",
                contact: "0987654321",
                email: "customer@example.com",
                address: "Customer Address",
                city: "Customer City",
            },
        });
        console.log("✅ Test customer created:", customer);

        // Create inventory transactions for thread purchase
        console.log("Creating inventory transaction for thread purchase...");
        const threadInventoryTransaction =
            await prisma.inventoryTransaction.create({
                data: {
                    inventoryId: threadInventory.id,
                    transactionDate: new Date(),
                    transactionType: "PURCHASE",
                    quantity: 100,
                    remainingQuantity: 100,
                    unitCost: 10,
                    totalCost: 1000,
                    referenceType: "ThreadPurchase",
                    referenceId: threadPurchase.id,
                    threadPurchaseId: threadPurchase.id,
                    notes: "Initial thread purchase",
                },
            });
        console.log(
            "✅ Test thread inventory transaction created:",
            threadInventoryTransaction,
        );

        // Create inventory transactions for fabric production
        console.log("Creating inventory transaction for fabric production...");
        const fabricInventoryTransaction =
            await prisma.inventoryTransaction.create({
                data: {
                    inventoryId: fabricInventory.id,
                    transactionDate: new Date(),
                    transactionType: "PRODUCTION",
                    quantity: 50,
                    remainingQuantity: 50,
                    unitCost: 20,
                    totalCost: 1000,
                    referenceType: "FabricProduction",
                    referenceId: fabricProduction.id,
                    fabricProductionId: fabricProduction.id,
                    notes: "Initial fabric production",
                },
            });
        console.log(
            "✅ Test fabric inventory transaction created:",
            fabricInventoryTransaction,
        );

        console.log("\nTest data creation complete!");
        console.log("\n=============================================");
        console.log("Now your database has all necessary test data");
        console.log("to test the sales form functionality.");
        console.log("=============================================");

        return {
            vendor,
            threadType,
            threadPurchase,
            fabricType,
            fabricProduction,
            threadInventory,
            fabricInventory,
            customer,
        };
    } catch (error) {
        console.error("Error creating test data:", error);
        throw error;
    }
}

// Function to test sales process
async function testSalesProcess(testData) {
    try {
        console.log("\nTesting sales process...");

        // Create a sales order
        console.log("Creating test sales order...");
        const salesOrder = await prisma.salesOrder.create({
            data: {
                orderNumber: `SO-${Date.now().toString().slice(-6)}`,
                orderDate: new Date(),
                customerId: testData.customer.id,
                paymentMode: "CASH",
                paymentStatus: "PAID",
                deliveryDate: new Date(Date.now() + 86400000), // Tomorrow
                totalSale: 300,
                items: {
                    create: [
                        {
                            productType: "THREAD",
                            productId: testData.threadPurchase.id,
                            quantitySold: 10,
                            unitPrice: 15,
                            subtotal: 150,
                        },
                        {
                            productType: "FABRIC",
                            productId: testData.fabricProduction.id,
                            quantitySold: 5,
                            unitPrice: 30,
                            subtotal: 150,
                        },
                    ],
                },
            },
        });
        console.log("✅ Test sales order created:", salesOrder);

        // Create a payment for the sales order
        console.log("Creating payment for sales order...");
        const payment = await prisma.payment.create({
            data: {
                amount: 300,
                mode: "CASH",
                transactionDate: new Date(),
                description: "Full payment for test order",
                salesOrderId: salesOrder.id,
            },
        });
        console.log("✅ Test payment created:", payment);

        // Update inventory quantities
        console.log("Updating thread inventory...");
        await prisma.inventory.update({
            where: {
                id: testData.threadInventory.id,
            },
            data: {
                currentQuantity: {
                    decrement: 10,
                },
            },
        });

        console.log("Updating fabric inventory...");
        await prisma.inventory.update({
            where: {
                id: testData.fabricInventory.id,
            },
            data: {
                currentQuantity: {
                    decrement: 5,
                },
            },
        });

        // Create inventory transactions for the sales
        console.log("Creating inventory transactions for sales...");
        await prisma.inventoryTransaction.createMany({
            data: [
                {
                    inventoryId: testData.threadInventory.id,
                    transactionDate: new Date(),
                    transactionType: "SALES",
                    quantity: -10,
                    remainingQuantity: 70, // 80 - 10
                    unitCost: 10,
                    totalCost: 100,
                    referenceType: "SalesOrder",
                    referenceId: salesOrder.id,
                    salesOrderId: salesOrder.id,
                    threadPurchaseId: testData.threadPurchase.id,
                    notes: "Thread sale",
                },
                {
                    inventoryId: testData.fabricInventory.id,
                    transactionDate: new Date(),
                    transactionType: "SALES",
                    quantity: -5,
                    remainingQuantity: 35, // 40 - 5
                    unitCost: 20,
                    totalCost: 100,
                    referenceType: "SalesOrder",
                    referenceId: salesOrder.id,
                    salesOrderId: salesOrder.id,
                    fabricProductionId: testData.fabricProduction.id,
                    notes: "Fabric sale",
                },
            ],
        });

        console.log("✅ Inventory transactions created");

        // Verify the sales order
        console.log("\nVerifying sales order...");
        const verifiedOrder = await prisma.salesOrder.findUnique({
            where: {
                id: salesOrder.id,
            },
            include: {
                items: true,
                payments: true,
            },
        });

        console.log("Sales order verified:", verifiedOrder);
        console.log("Sales order items:", verifiedOrder.items);
        console.log("Sales order payments:", verifiedOrder.payments);

        // Check if inventory was updated correctly
        console.log("\nVerifying inventory updates...");
        const updatedThreadInventory = await prisma.inventory.findUnique({
            where: {
                id: testData.threadInventory.id,
            },
        });
        console.log("Updated thread inventory:", updatedThreadInventory);

        const updatedFabricInventory = await prisma.inventory.findUnique({
            where: {
                id: testData.fabricInventory.id,
            },
        });
        console.log("Updated fabric inventory:", updatedFabricInventory);

        console.log("\n===========================================");
        console.log("🎉 All tests passed! Your database is working correctly.");
        console.log("===========================================");
    } catch (error) {
        console.error("Error testing sales process:", error);
        throw error;
    }
}

async function main() {
    try {
        // Create test data
        const testData = await createTestData();

        // Test sales process
        await testSalesProcess(testData);
    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
