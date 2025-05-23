// Test script for the sales submission API
import {
    PaymentMode,
    PaymentStatus,
    PrismaClient,
    ProductType,
} from "@prisma/client";

const prisma = new PrismaClient();

async function testSalesSubmission() {
    try {
        console.log("Testing sales submission API with updated schema...");

        // Get existing thread and fabric items from the database
        const threadPurchases = await prisma.threadPurchase.findMany({
            take: 1,
            orderBy: { id: "desc" },
        });

        const fabricProductions = await prisma.fabricProduction.findMany({
            take: 1,
            orderBy: { id: "desc" },
        });

        if (threadPurchases.length === 0 || fabricProductions.length === 0) {
            console.error(
                "No thread purchases or fabric productions found. Cannot run test.",
            );
            return;
        }

        const threadPurchase = threadPurchases[0];
        const fabricProduction = fabricProductions[0];

        console.log(`Using thread purchase ID: ${threadPurchase.id}`);
        console.log(`Using fabric production ID: ${fabricProduction.id}`);

        // Get an existing customer or create one
        let customer = await prisma.customer.findFirst();
        if (!customer) {
            customer = await prisma.customer.create({
                data: {
                    name: "Test Customer",
                    contact: "123456789",
                    updatedAt: new Date(),
                },
            });
        }

        // Create a sales submission payload with explicit threadPurchaseId and fabricProductionId
        const salesData = {
            customerName: customer.name,
            customerId: customer.id,
            orderDate: new Date(),
            paymentMode: PaymentMode.CASH,
            paymentStatus: PaymentStatus.PAID,
            totalSale: 200,
            discount: 0,
            tax: 0,
            updateInventory: false, // Set to false for testing purposes
            orderNumber: `TEST-${Date.now()}`,
            paymentAmount: 200,
            items: [
                {
                    productType: ProductType.THREAD,
                    productId: threadPurchase.id,
                    threadPurchaseId: threadPurchase.id, // Explicitly set threadPurchaseId
                    fabricProductionId: null, // Set null for non-fabric items
                    quantitySold: 2,
                    unitPrice: 50,
                    discount: 0,
                    tax: 0,
                    subtotal: 100,
                },
                {
                    productType: ProductType.FABRIC,
                    productId: fabricProduction.id,
                    threadPurchaseId: null, // Set null for non-thread items
                    fabricProductionId: fabricProduction.id, // Explicitly set fabricProductionId
                    quantitySold: 1,
                    unitPrice: 100,
                    discount: 0,
                    tax: 0,
                    subtotal: 100,
                },
            ],
        };

        // Make a fetch request to the sales API
        console.log("Sending request to sales API...");
        const response = await fetch("http://localhost:3000/api/sales/submit", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(salesData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(
                `API request failed with status ${response.status}: ${errorText}`,
            );
            return;
        }

        const result = await response.json();
        console.log("Sales API response:", JSON.stringify(result, null, 2));

        // Verify the created sales items have the correct IDs
        if (result.salesOrder && result.salesOrder.items) {
            const items = result.salesOrder.items;
            console.log("\nVerifying sales order items:");

            for (const item of items) {
                if (item.productType === "THREAD") {
                    console.log(
                        `Thread item: productId=${item.productId}, threadPurchaseId=${item.threadPurchaseId}, fabricProductionId=${item.fabricProductionId}`,
                    );

                    // Verify threadPurchaseId is set correctly
                    if (item.threadPurchaseId !== threadPurchase.id) {
                        console.error(
                            `❌ Thread item has incorrect threadPurchaseId. Expected ${threadPurchase.id}, got ${item.threadPurchaseId}`,
                        );
                    } else {
                        console.log(
                            `✅ Thread item has correct threadPurchaseId: ${item.threadPurchaseId}`,
                        );
                    }
                } else if (item.productType === "FABRIC") {
                    console.log(
                        `Fabric item: productId=${item.productId}, threadPurchaseId=${item.threadPurchaseId}, fabricProductionId=${item.fabricProductionId}`,
                    );

                    // Verify fabricProductionId is set correctly
                    if (item.fabricProductionId !== fabricProduction.id) {
                        console.error(
                            `❌ Fabric item has incorrect fabricProductionId. Expected ${fabricProduction.id}, got ${item.fabricProductionId}`,
                        );
                    } else {
                        console.log(
                            `✅ Fabric item has correct fabricProductionId: ${item.fabricProductionId}`,
                        );
                    }
                }
            }
        }

        console.log("\nTest completed successfully!");
    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test
testSalesSubmission();
