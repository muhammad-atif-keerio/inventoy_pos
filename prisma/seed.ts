import {
    ChequeStatus,
    ColorStatus,
    Customer,
    DyeingProcess,
    FabricProduction,
    FabricType,
    InventoryTransactionType,
    PaymentMode,
    PaymentStatus,
    Prisma,
    PrismaClient,
    ProductType,
    ProductionStatus,
    ThreadPurchase,
    ThreadType,
    Vendor,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding database...");

    // Clear existing data
    await clearDatabase();

    // Create vendors
    const vendors = await createVendors();

    // Create thread types
    const threadTypes = await createThreadTypes();

    // Create fabric types
    const fabricTypes = await createFabricTypes();

    // Create customers
    const customers = await createCustomers();

    // Create thread purchases and inventory
    const threadPurchases = await createThreadPurchases(vendors, threadTypes);

    // Create dyeing processes
    const dyeingProcesses = await createDyeingProcesses(threadPurchases);

    // Create fabric production
    const fabricProductions = await createFabricProduction(
        threadPurchases,
        dyeingProcesses,
        fabricTypes,
    );

    // Create sales orders and items
    await createSalesOrders(customers, threadPurchases, fabricProductions);

    console.log("Seeding complete!");
}

async function clearDatabase() {
    // Delete data in reverse order of dependencies
    await prisma.chequeTransaction.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.salesOrderItem.deleteMany();
    await prisma.salesOrder.deleteMany();
    await prisma.inventoryTransaction.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.fabricProduction.deleteMany();
    await prisma.dyeingProcess.deleteMany();
    await prisma.threadPurchase.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.fabricType.deleteMany();
    await prisma.threadType.deleteMany();
    await prisma.vendor.deleteMany();
}

async function createVendors(): Promise<Vendor[]> {
    const vendors = [
        {
            name: "Quality Threads Inc.",
            contact: "+92 300 1234567",
            email: "info@qualitythreads.com",
            address: "123 Textile Road",
            city: "Faisalabad",
            notes: "Premium thread supplier",
        },
        {
            name: "Yarn Masters",
            contact: "+92 321 9876543",
            email: "sales@yarnmasters.pk",
            address: "456 Industrial Zone",
            city: "Lahore",
            notes: "Specializes in cotton threads",
        },
        {
            name: "Golden Fibres",
            contact: "+92 333 5554443",
            email: "contact@goldenfibres.com",
            address: "789 Manufacturing Hub",
            city: "Karachi",
            notes: "Large variety of synthetic threads",
        },
    ];

    console.log("Creating vendors...");
    const createdVendors = [];

    for (const vendor of vendors) {
        const createdVendor = await prisma.vendor.create({
            data: vendor,
        });
        createdVendors.push(createdVendor);
    }

    return createdVendors;
}

async function createThreadTypes(): Promise<ThreadType[]> {
    const threadTypes = [
        {
            name: "Cotton 30s",
            description: "Fine cotton thread, 30s count",
            units: "kg",
        },
        {
            name: "Polyester 150D",
            description: "Durable polyester thread, 150 denier",
            units: "kg",
        },
        {
            name: "Silk 20/22",
            description: "Premium silk thread, 20/22 Denier",
            units: "kg",
        },
        {
            name: "Nylon 210D",
            description: "Strong nylon thread, 210 denier",
            units: "kg",
        },
    ];

    console.log("Creating thread types...");
    const createdThreadTypes = [];

    for (const threadType of threadTypes) {
        const createdThreadType = await prisma.threadType.create({
            data: threadType,
        });
        createdThreadTypes.push(createdThreadType);
    }

    return createdThreadTypes;
}

async function createFabricTypes(): Promise<FabricType[]> {
    const fabricTypes = [
        {
            name: "Cotton Poplin",
            description: "Lightweight cotton fabric with fine ribbing",
            units: "meters",
        },
        {
            name: "Polyester Satin",
            description: "Smooth, glossy fabric with a silky feel",
            units: "meters",
        },
        {
            name: "Cotton Lawn",
            description: "Fine, lightweight plain-weave fabric",
            units: "meters",
        },
        {
            name: "Silk Charmeuse",
            description: "Lightweight fabric with a satin weave",
            units: "meters",
        },
    ];

    console.log("Creating fabric types...");
    const createdFabricTypes = [];

    for (const fabricType of fabricTypes) {
        const createdFabricType = await prisma.fabricType.create({
            data: fabricType,
        });
        createdFabricTypes.push(createdFabricType);
    }

    return createdFabricTypes;
}

async function createCustomers(): Promise<Customer[]> {
    const customers = [
        {
            name: "Fashion Forward Ltd.",
            contact: "+92 300 9876543",
            email: "orders@fashionforward.pk",
            address: "101 Retail Plaza",
            city: "Lahore",
            notes: "Regular customer, prefers high-quality fabrics",
        },
        {
            name: "Garment Galaxy",
            contact: "+92 321 1234567",
            email: "purchasing@garmentgalaxy.com",
            address: "202 Industrial Avenue",
            city: "Karachi",
            notes: "Bulk orders, needs consistent quality",
        },
        {
            name: "Style Creations",
            contact: "+92 333 4445556",
            email: "info@stylecreations.pk",
            address: "303 Fashion Street",
            city: "Islamabad",
            notes: "Premium customer, orders specialty fabrics",
        },
    ];

    console.log("Creating customers...");

    const createdCustomers: Customer[] = [];

    for (const customer of customers) {
        const createdCustomer = await prisma.customer.create({
            data: customer,
        });
        createdCustomers.push(createdCustomer);
    }

    return createdCustomers;
}

async function createThreadPurchases(
    vendors: Vendor[],
    threadTypes: ThreadType[],
): Promise<ThreadPurchase[]> {
    console.log("Creating thread purchases...");
    const threadPurchases: ThreadPurchase[] = [];

    const threadOptions = [
        {
            type: "Cotton 30s",
            colorStatus: ColorStatus.RAW,
            price: 650,
            quantity: 500,
        },
        {
            type: "Polyester 150D",
            colorStatus: ColorStatus.RAW,
            price: 450,
            quantity: 750,
        },
        {
            type: "Silk 20/22",
            colorStatus: ColorStatus.RAW,
            price: 1200,
            quantity: 300,
        },
        {
            type: "Cotton 30s",
            colorStatus: ColorStatus.COLORED,
            color: "Navy Blue",
            price: 750,
            quantity: 450,
        },
        {
            type: "Polyester 150D",
            colorStatus: ColorStatus.COLORED,
            color: "Burgundy",
            price: 550,
            quantity: 600,
        },
    ];

    for (let i = 0; i < 8; i++) {
        const vendor = vendors[i % vendors.length];
        const threadOption = threadOptions[i % threadOptions.length];
        const threadType = threadTypes.find(
            (t) => t.name === threadOption.type,
        );

        if (!threadType) continue;

        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 60));

        const quantity = threadOption.quantity;
        const unitPrice = threadOption.price;
        const totalCost = quantity * unitPrice;

        const received = Math.random() > 0.3;
        const receivedAt = received
            ? new Date(
                  orderDate.getTime() +
                      86400000 * Math.floor(Math.random() * 10),
              )
            : null;

        const threadPurchase = await prisma.threadPurchase.create({
            data: {
                vendorId: vendor.id,
                orderDate,
                threadType: threadOption.type,
                color: threadOption.color || null,
                colorStatus: threadOption.colorStatus,
                quantity,
                unitPrice,
                totalCost,
                unitOfMeasure: "kg",
                deliveryDate: new Date(orderDate.getTime() + 86400000 * 7),
                remarks: `Purchase order for ${threadOption.type}`,
                reference: `PO-${Date.now().toString().slice(-6)}`,
                received,
                receivedAt,
                inventoryStatus: received ? "In Stock" : "Ordered",
            },
        });

        threadPurchases.push(threadPurchase);

        // Create payment for the thread purchase
        if (received) {
            await prisma.payment.create({
                data: {
                    threadPurchaseId: threadPurchase.id,
                    transactionDate: receivedAt || new Date(),
                    amount: totalCost,
                    mode: PaymentMode.CASH,
                    description: `Payment for ${threadOption.type} thread purchase`,
                    remarks: "Full payment on delivery",
                },
            });
        }

        // Create inventory item and transaction if received
        if (received) {
            const inventoryItem = await prisma.inventory.create({
                data: {
                    itemCode: `TH-${Date.now().toString().slice(-6)}`,
                    description: `${threadOption.type} ${threadOption.color || "Raw"}`,
                    productType: ProductType.THREAD,
                    threadTypeId: threadType.id,
                    currentQuantity: quantity,
                    unitOfMeasure: "kg",
                    location: "Warehouse A",
                    minStockLevel: Math.floor(quantity * 0.1),
                    costPerUnit: unitPrice,
                    salePrice: unitPrice * 1.3,
                    lastRestocked: receivedAt || new Date(),
                    notes: `Initial stock of ${threadOption.type}`,
                },
            });

            await prisma.inventoryTransaction.create({
                data: {
                    inventoryId: inventoryItem.id,
                    transactionType: InventoryTransactionType.PURCHASE,
                    quantity,
                    remainingQuantity: quantity,
                    unitCost: unitPrice,
                    totalCost,
                    referenceType: "ThreadPurchase",
                    referenceId: threadPurchase.id,
                    threadPurchaseId: threadPurchase.id,
                    notes: `Initial purchase of ${threadOption.type}`,
                },
            });
        }
    }

    return threadPurchases;
}

async function createDyeingProcesses(
    threadPurchases: ThreadPurchase[],
): Promise<DyeingProcess[]> {
    console.log("Creating dyeing processes...");
    const dyeingProcesses: DyeingProcess[] = [];

    const colors = [
        { code: "NB-001", name: "Navy Blue" },
        { code: "RR-002", name: "Royal Red" },
        { code: "HG-003", name: "Hunter Green" },
        { code: "MB-004", name: "Midnight Black" },
        { code: "GG-005", name: "Golden Yellow" },
    ];

    // Get thread types to use in inventory creation
    const threadTypes = await prisma.threadType.findMany();

    // Only create dyeing processes for RAW threads
    const rawThreads = threadPurchases.filter(
        (tp) => tp.colorStatus === ColorStatus.RAW && tp.received,
    );

    for (let i = 0; i < rawThreads.length; i++) {
        const threadPurchase = rawThreads[i];
        const color = colors[i % colors.length];

        const dyeDate = new Date(
            threadPurchase.receivedAt || threadPurchase.orderDate,
        );
        dyeDate.setDate(dyeDate.getDate() + Math.floor(Math.random() * 5) + 1);

        const dyeQuantity = Math.floor(threadPurchase.quantity * 0.8); // Use 80% of thread for dyeing
        const outputQuantity = Math.floor(dyeQuantity * 0.95); // 5% loss in dyeing process

        const laborCost = new Prisma.Decimal(dyeQuantity * 50); // 50 per kg for labor
        const dyeMaterialCost = new Prisma.Decimal(dyeQuantity * 30); // 30 per kg for dye materials
        const totalCost = laborCost.add(dyeMaterialCost);

        const isCompleted = Math.random() > 0.2;
        const completionDate = isCompleted
            ? new Date(
                  dyeDate.getTime() +
                      86400000 * (Math.floor(Math.random() * 3) + 1),
              )
            : null;

        const dyeingProcess = await prisma.dyeingProcess.create({
            data: {
                threadPurchaseId: threadPurchase.id,
                dyeDate,
                dyeParameters: {
                    temperature: "80°C",
                    duration: "120 minutes",
                    ph: "6.5",
                    additives: ["salt", "soda ash"],
                },
                colorCode: color.code,
                colorName: color.name,
                dyeQuantity,
                laborCost,
                dyeMaterialCost,
                totalCost,
                resultStatus: isCompleted ? "Success" : "In Progress",
                inventoryStatus: isCompleted ? "In Stock" : "In Process",
                outputQuantity,
                completionDate,
                remarks: `Dyeing batch for ${threadPurchase.threadType} in ${color.name}`,
            },
        });

        dyeingProcesses.push(dyeingProcess);

        // Create inventory entry for dyed thread if completed
        if (isCompleted) {
            const inventoryItem = await prisma.inventory.upsert({
                where: {
                    itemCode: `DT-${color.code}`,
                },
                update: {
                    currentQuantity: {
                        increment: outputQuantity,
                    },
                    lastRestocked: completionDate,
                },
                create: {
                    itemCode: `DT-${color.code}`,
                    description: `${threadPurchase.threadType} - ${color.name}`,
                    productType: ProductType.THREAD,
                    threadTypeId: threadTypes.find(
                        (tt: ThreadType) =>
                            tt.name === threadPurchase.threadType,
                    )?.id,
                    currentQuantity: outputQuantity,
                    unitOfMeasure: "kg",
                    location: "Dye Section",
                    minStockLevel: Math.floor(outputQuantity * 0.2),
                    costPerUnit: new Prisma.Decimal(
                        Number(threadPurchase.unitPrice) +
                            Number(totalCost) / outputQuantity,
                    ),
                    salePrice: new Prisma.Decimal(
                        (Number(threadPurchase.unitPrice) +
                            Number(totalCost) / outputQuantity) *
                            1.4,
                    ),
                    lastRestocked: completionDate,
                    notes: `Dyed ${threadPurchase.threadType} in ${color.name}`,
                },
            });

            await prisma.inventoryTransaction.create({
                data: {
                    inventoryId: inventoryItem.id,
                    transactionType: InventoryTransactionType.PRODUCTION,
                    quantity: outputQuantity,
                    remainingQuantity: outputQuantity,
                    unitCost: new Prisma.Decimal(
                        Number(threadPurchase.unitPrice) +
                            Number(totalCost) / outputQuantity,
                    ),
                    totalCost: new Prisma.Decimal(
                        (Number(threadPurchase.unitPrice) +
                            Number(totalCost) / outputQuantity) *
                            outputQuantity,
                    ),
                    referenceType: "DyeingProcess",
                    referenceId: dyeingProcess.id,
                    dyeingProcessId: dyeingProcess.id,
                    notes: `Production of ${color.name} dyed thread`,
                },
            });
        }
    }

    return dyeingProcesses;
}

async function createFabricProduction(
    threadPurchases: ThreadPurchase[],
    dyeingProcesses: DyeingProcess[],
    fabricTypes: FabricType[],
): Promise<FabricProduction[]> {
    console.log("Creating fabric production...");
    const fabricProductions: FabricProduction[] = [];

    const fabricSpecs = [
        {
            type: "Cotton Poplin",
            dimensions: "44 inches width",
            threadUsage: 3,
        },
        {
            type: "Polyester Satin",
            dimensions: "60 inches width",
            threadUsage: 2.5,
        },
        { type: "Cotton Lawn", dimensions: "52 inches width", threadUsage: 2 },
        {
            type: "Silk Charmeuse",
            dimensions: "42 inches width",
            threadUsage: 4,
        },
    ];

    // Create some fabric production from colored threads and some from dyed threads
    const coloredThreads = threadPurchases.filter(
        (tp) => tp.colorStatus === ColorStatus.COLORED && tp.received,
    );
    const dyedThreadsProcesses = dyeingProcesses.filter(
        (dp) => dp.completionDate !== null,
    );

    // From colored threads
    for (let i = 0; i < coloredThreads.length; i++) {
        const thread = coloredThreads[i];
        const fabricSpec = fabricSpecs[i % fabricSpecs.length];
        const fabricType = fabricTypes.find(
            (ft) => ft.name === fabricSpec.type,
        );

        if (!fabricType) continue;

        const productionDate = new Date(thread.receivedAt || thread.orderDate);
        productionDate.setDate(
            productionDate.getDate() + Math.floor(Math.random() * 10) + 5,
        );

        const threadUsed = Math.floor(thread.quantity * 0.6); // Use 60% of thread
        const quantityProduced = Math.floor(
            threadUsed * fabricSpec.threadUsage,
        ); // Thread to fabric conversion
        const threadWastage = Math.floor(threadUsed * 0.1); // 10% wastage

        const productionCost = new Prisma.Decimal(threadUsed).mul(
            thread.unitPrice,
        );
        const laborCost = new Prisma.Decimal(quantityProduced * 20); // 20 per meter for labor
        const totalCost = productionCost.add(laborCost);

        const isCompleted = Math.random() > 0.3;
        const status = isCompleted
            ? ProductionStatus.COMPLETED
            : ProductionStatus.IN_PROGRESS;
        const completionDate = isCompleted
            ? new Date(
                  productionDate.getTime() +
                      86400000 * (Math.floor(Math.random() * 5) + 3),
              )
            : null;

        const fabricProduction = await prisma.fabricProduction.create({
            data: {
                sourceThreadId: thread.id,
                productionDate,
                fabricType: fabricSpec.type,
                dimensions: fabricSpec.dimensions,
                batchNumber: `B-${Date.now().toString().slice(-6)}`,
                quantityProduced,
                threadUsed,
                threadWastage,
                unitOfMeasure: "meters",
                productionCost,
                laborCost,
                totalCost,
                remarks: `Production of ${fabricSpec.type} from ${thread.color} thread`,
                status,
                inventoryStatus: isCompleted ? "In Stock" : "In Production",
                completionDate,
            },
        });

        fabricProductions.push(fabricProduction);

        // Create inventory entry for produced fabric if completed
        if (isCompleted) {
            const inventoryItem = await prisma.inventory.upsert({
                where: {
                    itemCode: `FB-${fabricType.id}-${thread.color}`,
                },
                update: {
                    currentQuantity: {
                        increment: quantityProduced,
                    },
                    lastRestocked: completionDate,
                },
                create: {
                    itemCode: `FB-${fabricType.id}-${thread.color}`,
                    description: `${fabricSpec.type} - ${thread.color}`,
                    productType: ProductType.FABRIC,
                    fabricTypeId: fabricType.id,
                    currentQuantity: quantityProduced,
                    unitOfMeasure: "meters",
                    location: "Warehouse B",
                    minStockLevel: Math.floor(quantityProduced * 0.15),
                    costPerUnit: totalCost.div(quantityProduced),
                    salePrice: totalCost.div(quantityProduced).mul(1.5),
                    lastRestocked: completionDate,
                    notes: `${fabricSpec.type} fabric produced from ${thread.color} thread`,
                },
            });

            await prisma.inventoryTransaction.create({
                data: {
                    inventoryId: inventoryItem.id,
                    transactionType: InventoryTransactionType.PRODUCTION,
                    quantity: quantityProduced,
                    remainingQuantity: quantityProduced,
                    unitCost: totalCost.div(quantityProduced),
                    totalCost,
                    referenceType: "FabricProduction",
                    referenceId: fabricProduction.id,
                    fabricProductionId: fabricProduction.id,
                    notes: `Production of ${fabricSpec.type} from colored thread`,
                },
            });
        }
    }

    // From dyed threads
    for (let i = 0; i < dyedThreadsProcesses.length; i++) {
        const dyeProcess = dyedThreadsProcesses[i];
        const thread = threadPurchases.find(
            (tp) => tp.id === dyeProcess.threadPurchaseId,
        );
        const fabricSpec = fabricSpecs[(i + 2) % fabricSpecs.length];
        const fabricType = fabricTypes.find(
            (ft) => ft.name === fabricSpec.type,
        );

        if (!fabricType || !thread) continue;

        const productionDate = new Date(
            dyeProcess.completionDate || dyeProcess.dyeDate,
        );
        productionDate.setDate(
            productionDate.getDate() + Math.floor(Math.random() * 7) + 3,
        );

        const threadUsed = Math.floor(dyeProcess.outputQuantity * 0.7); // Use 70% of dyed thread
        const quantityProduced = Math.floor(
            threadUsed * fabricSpec.threadUsage,
        ); // Thread to fabric conversion
        const threadWastage = Math.floor(threadUsed * 0.08); // 8% wastage

        const threadCost = thread.unitPrice.mul(new Prisma.Decimal(threadUsed));
        const dyeCost = (dyeProcess.totalCost || new Prisma.Decimal(0)).mul(
            new Prisma.Decimal(threadUsed / dyeProcess.outputQuantity),
        );
        const productionCost = threadCost.add(dyeCost);
        const laborCost = new Prisma.Decimal(quantityProduced * 25); // 25 per meter for labor
        const totalCost = productionCost.add(laborCost);

        const isCompleted = Math.random() > 0.2;
        const status = isCompleted
            ? ProductionStatus.COMPLETED
            : ProductionStatus.IN_PROGRESS;
        const completionDate = isCompleted
            ? new Date(
                  productionDate.getTime() +
                      86400000 * (Math.floor(Math.random() * 6) + 2),
              )
            : null;

        const fabricProduction = await prisma.fabricProduction.create({
            data: {
                sourceThreadId: thread.id,
                dyeingProcessId: dyeProcess.id,
                productionDate,
                fabricType: fabricSpec.type,
                dimensions: fabricSpec.dimensions,
                batchNumber: `BD-${Date.now().toString().slice(-6)}`,
                quantityProduced,
                threadUsed,
                threadWastage,
                unitOfMeasure: "meters",
                productionCost,
                laborCost,
                totalCost,
                remarks: `Production of ${fabricSpec.type} from ${dyeProcess.colorName} dyed thread`,
                status,
                inventoryStatus: isCompleted ? "In Stock" : "In Production",
                completionDate,
            },
        });

        fabricProductions.push(fabricProduction);

        // Create inventory entry for produced fabric if completed
        if (isCompleted) {
            const inventoryItem = await prisma.inventory.upsert({
                where: {
                    itemCode: `FB-${fabricType.id}-${dyeProcess.colorCode}`,
                },
                update: {
                    currentQuantity: {
                        increment: quantityProduced,
                    },
                    lastRestocked: completionDate,
                },
                create: {
                    itemCode: `FB-${fabricType.id}-${dyeProcess.colorCode}`,
                    description: `${fabricSpec.type} - ${dyeProcess.colorName}`,
                    productType: ProductType.FABRIC,
                    fabricTypeId: fabricType.id,
                    currentQuantity: quantityProduced,
                    unitOfMeasure: "meters",
                    location: "Warehouse B",
                    minStockLevel: Math.floor(quantityProduced * 0.15),
                    costPerUnit: totalCost.div(quantityProduced),
                    salePrice: totalCost.div(quantityProduced).mul(1.6),
                    lastRestocked: completionDate,
                    notes: `${fabricSpec.type} fabric produced from ${dyeProcess.colorName} dyed thread`,
                },
            });

            await prisma.inventoryTransaction.create({
                data: {
                    inventoryId: inventoryItem.id,
                    transactionType: InventoryTransactionType.PRODUCTION,
                    quantity: quantityProduced,
                    remainingQuantity: quantityProduced,
                    unitCost: totalCost.div(quantityProduced),
                    totalCost,
                    referenceType: "FabricProduction",
                    referenceId: fabricProduction.id,
                    fabricProductionId: fabricProduction.id,
                    notes: `Production of ${fabricSpec.type} from dyed thread`,
                },
            });
        }
    }

    return fabricProductions;
}

async function createSalesOrders(
    customers: Customer[],
    threadPurchases: ThreadPurchase[],
    fabricProductions: FabricProduction[],
): Promise<void> {
    console.log("Creating sales orders...");

    // Only use completed fabric productions
    const availableFabrics = fabricProductions.filter(
        (fp) => fp.status === ProductionStatus.COMPLETED,
    );
    // Only use received thread purchases
    const availableThreads = threadPurchases.filter((tp) => tp.received);

    // Create sales orders
    for (let i = 0; i < 5; i++) {
        const customer = customers[i % customers.length];
        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 30));

        // Choose random payment mode and status
        const paymentModeOptions = [
            PaymentMode.CASH,
            PaymentMode.CHEQUE,
            PaymentMode.ONLINE,
        ];
        const paymentStatusOptions = [
            PaymentStatus.PAID,
            PaymentStatus.PARTIAL,
            PaymentStatus.PENDING,
        ];
        const selectedPaymentMode =
            paymentModeOptions[
                Math.floor(Math.random() * paymentModeOptions.length)
            ];
        const selectedPaymentStatus =
            paymentStatusOptions[
                Math.floor(Math.random() * paymentStatusOptions.length)
            ];

        // Calculate total sale value later
        const salesOrder = await prisma.salesOrder.create({
            data: {
                orderNumber: `SO-${Date.now().toString().slice(-6)}`,
                orderDate,
                customerId: customer.id,
                paymentMode: selectedPaymentMode,
                paymentStatus: selectedPaymentStatus,
                deliveryDate: new Date(
                    orderDate.getTime() +
                        86400000 * (Math.floor(Math.random() * 7) + 3),
                ),
                deliveryAddress: customer.address,
                remarks: `Order for ${customer.name}`,
                discount: new Prisma.Decimal(Math.floor(Math.random() * 500)),
                tax: new Prisma.Decimal(Math.floor(Math.random() * 1000)),
                totalSale: new Prisma.Decimal(0), // Will update after adding items
            },
        });

        // Create 1-3 sales order items for each order
        const numItems = Math.floor(Math.random() * 3) + 1;
        let totalSaleAmount = new Prisma.Decimal(0);

        for (let j = 0; j < numItems; j++) {
            // Randomly choose between thread and fabric
            const isThread = Math.random() > 0.6;

            if (isThread && availableThreads.length > 0) {
                // Create thread sales item
                const threadProduct =
                    availableThreads[
                        Math.floor(Math.random() * availableThreads.length)
                    ];
                const quantity = Math.floor(Math.random() * 50) + 10;
                const unitPrice = Number(threadProduct.unitPrice) * 1.3; // 30% markup
                const subtotal = quantity * unitPrice;

                await prisma.salesOrderItem.create({
                    data: {
                        salesOrderId: salesOrder.id,
                        productType: ProductType.THREAD,
                        productId: threadProduct.id,
                        quantitySold: quantity,
                        unitPrice: new Prisma.Decimal(unitPrice),
                        discount: new Prisma.Decimal(
                            Math.floor(Math.random() * 100),
                        ),
                        tax: new Prisma.Decimal(subtotal * 0.05), // 5% tax
                        subtotal: new Prisma.Decimal(subtotal),
                        inventoryItemId: null, // We'd need to look up actual inventory ID
                    },
                });

                totalSaleAmount = totalSaleAmount.add(
                    new Prisma.Decimal(subtotal),
                );

                // Create inventory transaction for the sale
                const inventoryItem = await prisma.inventory.findFirst({
                    where: {
                        description: {
                            contains: threadProduct.threadType,
                        },
                        productType: ProductType.THREAD,
                    },
                });

                if (inventoryItem) {
                    // Update inventory quantity
                    await prisma.inventory.update({
                        where: { id: inventoryItem.id },
                        data: {
                            currentQuantity: {
                                decrement: quantity,
                            },
                        },
                    });

                    // Create inventory transaction
                    await prisma.inventoryTransaction.create({
                        data: {
                            inventoryId: inventoryItem.id,
                            transactionType: InventoryTransactionType.SALES,
                            quantity: quantity,
                            remainingQuantity: Math.max(
                                0,
                                inventoryItem.currentQuantity - quantity,
                            ),
                            unitCost: inventoryItem.costPerUnit,
                            totalCost: new Prisma.Decimal(quantity).mul(
                                inventoryItem.costPerUnit,
                            ),
                            referenceType: "SalesOrder",
                            referenceId: salesOrder.id,
                            salesOrderId: salesOrder.id,
                            notes: `Sale of ${threadProduct.threadType} thread`,
                        },
                    });
                }
            } else if (availableFabrics.length > 0) {
                // Create fabric sales item
                const fabricProduct =
                    availableFabrics[
                        Math.floor(Math.random() * availableFabrics.length)
                    ];
                const quantity = Math.floor(Math.random() * 30) + 5;
                const unitPrice =
                    (Number(fabricProduct.totalCost) /
                        fabricProduct.quantityProduced) *
                    1.5; // 50% markup
                const subtotal = quantity * unitPrice;

                await prisma.salesOrderItem.create({
                    data: {
                        salesOrderId: salesOrder.id,
                        productType: ProductType.FABRIC,
                        productId: fabricProduct.id,
                        quantitySold: quantity,
                        unitPrice: new Prisma.Decimal(unitPrice),
                        discount: new Prisma.Decimal(
                            Math.floor(Math.random() * 200),
                        ),
                        tax: new Prisma.Decimal(subtotal * 0.05), // 5% tax
                        subtotal: new Prisma.Decimal(subtotal),
                        inventoryItemId: null, // We'd need to look up actual inventory ID
                    },
                });

                totalSaleAmount = totalSaleAmount.add(
                    new Prisma.Decimal(subtotal),
                );

                // Create inventory transaction for the sale
                const inventoryItem = await prisma.inventory.findFirst({
                    where: {
                        description: {
                            contains: fabricProduct.fabricType,
                        },
                        productType: ProductType.FABRIC,
                    },
                });

                if (inventoryItem) {
                    // Update inventory quantity
                    await prisma.inventory.update({
                        where: { id: inventoryItem.id },
                        data: {
                            currentQuantity: {
                                decrement: quantity,
                            },
                        },
                    });

                    // Create inventory transaction
                    await prisma.inventoryTransaction.create({
                        data: {
                            inventoryId: inventoryItem.id,
                            transactionType: InventoryTransactionType.SALES,
                            quantity: quantity,
                            remainingQuantity: Math.max(
                                0,
                                inventoryItem.currentQuantity - quantity,
                            ),
                            unitCost: inventoryItem.costPerUnit,
                            totalCost: new Prisma.Decimal(quantity).mul(
                                inventoryItem.costPerUnit,
                            ),
                            referenceType: "SalesOrder",
                            referenceId: salesOrder.id,
                            salesOrderId: salesOrder.id,
                            notes: `Sale of ${fabricProduct.fabricType} fabric`,
                        },
                    });
                }
            }
        }

        // Update the total sale amount
        await prisma.salesOrder.update({
            where: { id: salesOrder.id },
            data: {
                totalSale: totalSaleAmount
                    .sub(salesOrder.discount || 0)
                    .add(salesOrder.tax || 0),
            },
        });

        // Create payment for the sale
        if (
            selectedPaymentStatus === PaymentStatus.PAID ||
            selectedPaymentStatus === PaymentStatus.PARTIAL
        ) {
            const paymentAmount =
                selectedPaymentStatus === PaymentStatus.PAID
                    ? totalSaleAmount
                    : totalSaleAmount.mul(
                          new Prisma.Decimal(Math.random() * 0.7 + 0.1),
                      ); // 10-80% payment

            const payment = await prisma.payment.create({
                data: {
                    salesOrderId: salesOrder.id,
                    transactionDate: new Date(
                        orderDate.getTime() +
                            86400000 * Math.floor(Math.random() * 3),
                    ),
                    amount: paymentAmount,
                    mode: selectedPaymentMode || PaymentMode.CASH,
                    referenceNumber: `REF-${Date.now().toString().slice(-6)}`,
                    description: `Payment for order ${salesOrder.orderNumber}`,
                    remarks:
                        selectedPaymentStatus === PaymentStatus.PARTIAL
                            ? "Partial payment"
                            : "Full payment",
                },
            });

            // Create cheque transaction if payment mode is CHEQUE
            if (selectedPaymentMode === PaymentMode.CHEQUE) {
                // Choose random cheque status
                const chequeStatusOptions = [
                    ChequeStatus.PENDING,
                    ChequeStatus.CLEARED,
                    ChequeStatus.BOUNCED,
                ];
                const selectedChequeStatus =
                    chequeStatusOptions[
                        Math.random() > 0.8 ? 0 : Math.random() > 0.5 ? 1 : 2
                    ];

                const clearanceDate =
                    selectedChequeStatus === ChequeStatus.CLEARED
                        ? new Date(
                              payment.transactionDate.getTime() +
                                  86400000 *
                                      (Math.floor(Math.random() * 7) + 1),
                          )
                        : null;

                await prisma.chequeTransaction.create({
                    data: {
                        paymentId: payment.id,
                        chequeNumber: `CHQ-${Math.floor(Math.random() * 1000000)}`,
                        bank: [
                            "HBL",
                            "UBL",
                            "MCB",
                            "Bank Alfalah",
                            "Meezan Bank",
                        ][Math.floor(Math.random() * 5)],
                        branch: [
                            "Main Branch",
                            "City Branch",
                            "Industrial Zone",
                            "Commercial Area",
                        ][Math.floor(Math.random() * 4)],
                        chequeAmount: payment.amount,
                        issueDate: payment.transactionDate,
                        clearanceDate,
                        chequeStatus: selectedChequeStatus,
                        remarks:
                            selectedChequeStatus === ChequeStatus.BOUNCED
                                ? "Insufficient funds"
                                : selectedChequeStatus === ChequeStatus.CLEARED
                                  ? "Cleared successfully"
                                  : "Awaiting clearance",
                    },
                });
            }
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
