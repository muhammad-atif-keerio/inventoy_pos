// Interface file for inventory-related types
import {
    ChequeStatus,
    ColorStatus,
    InventoryTransactionType,
    PaymentMode,
    PaymentStatus,
    ProductType,
    ProductionStatus,
} from "@prisma/client";

export interface InventoryItem {
    id: number;
    itemCode: string;
    description: string;
    productType: ProductType;
    currentQuantity: number;
    unitOfMeasure: string;
    location?: string | null;
    minStockLevel: number;
    costPerUnit: number;
    salePrice: number;
    lastRestocked?: string | null;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
    threadTypeId?: number | null;
    threadType?: ThreadType | null;
    fabricTypeId?: number | null;
    fabricType?: FabricType | null;
    transactions?: InventoryTransaction[];
}

export interface ThreadType {
    id: number;
    name: string;
    description?: string | null;
    units: string;
}

export interface FabricType {
    id: number;
    name: string;
    description?: string | null;
    units: string;
}

export interface InventoryTransaction {
    id: number;
    inventoryId: number;
    inventory?: InventoryItem;
    transactionDate: string;
    transactionType: InventoryTransactionType;
    quantity: number;
    remainingQuantity: number;
    unitCost?: number | null;
    totalCost?: number | null;
    referenceType?: string | null;
    referenceId?: number | null;
    notes?: string | null;
    threadPurchaseId?: number | null;
    threadPurchase?: ThreadPurchase | null;
    dyeingProcessId?: number | null;
    dyeingProcess?: DyeingProcess | null;
    fabricProductionId?: number | null;
    fabricProduction?: FabricProduction | null;
    salesOrderId?: number | null;
    salesOrder?: SalesOrder | null;
    createdAt: string;
    updatedAt: string;
}

export interface ThreadPurchase {
    id: number;
    vendorId: number;
    vendor?: Vendor | null;
    orderDate: string;
    threadType: string;
    color?: string | null;
    colorStatus: ColorStatus;
    quantity: number;
    unitPrice: number;
    totalCost: number;
    unitOfMeasure: string;
    deliveryDate?: string | null;
    remarks?: string | null;
    reference?: string | null;
    received: boolean;
    receivedAt?: string | null;
    inventoryStatus?: string | null;
    dyeingProcesses?: DyeingProcess[];
    inventoryEntries?: InventoryTransaction[];
    fabricProductions?: FabricProduction[];
    salesOrders?: SalesOrder[];
    paymentTransactions?: Payment[];
}

export interface Vendor {
    id: number;
    name: string;
    contact: string;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface DyeingProcess {
    id: number;
    threadPurchaseId: number;
    threadPurchase?: ThreadPurchase | null;
    dyeDate: string;
    dyeParameters?: Record<string, unknown> | null;
    colorCode?: string | null;
    colorName?: string | null;
    dyeQuantity: number;
    laborCost?: number | null;
    dyeMaterialCost?: number | null;
    totalCost?: number | null;
    resultStatus: string;
    inventoryStatus?: string | null;
    outputQuantity: number;
    completionDate?: string | null;
    remarks?: string | null;
    inventoryEntries?: InventoryTransaction[];
    fabricProductions?: FabricProduction[];
}

export interface FabricProduction {
    id: number;
    sourceThreadId: number;
    threadPurchase?: ThreadPurchase | null;
    dyeingProcessId?: number | null;
    dyeingProcess?: DyeingProcess | null;
    productionDate: string;
    fabricType: string;
    dimensions: string;
    batchNumber: string;
    quantityProduced: number;
    threadUsed: number;
    threadWastage?: number | null;
    unitOfMeasure: string;
    productionCost: number;
    laborCost?: number | null;
    totalCost: number;
    remarks?: string | null;
    status: ProductionStatus;
    inventoryStatus?: string | null;
    completionDate?: string | null;
    inventoryEntries?: InventoryTransaction[];
    salesOrders?: SalesOrder[];
}

export interface Customer {
    id: number;
    name: string;
    contact: string;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface SalesOrder {
    id: number;
    orderNumber: string;
    orderDate: string;
    customerId: number;
    customer: Customer;
    productType: ProductType;
    productId: number;
    quantitySold: number;
    unitPrice: number;
    discount?: number | null;
    tax?: number | null;
    totalSale: number;
    deliveryDate?: string | null;
    deliveryAddress?: string | null;
    remarks?: string | null;
    paymentMode?: PaymentMode | null;
    paymentStatus: PaymentStatus;
    threadPurchase?: ThreadPurchase | null;
    fabricProduction?: FabricProduction | null;
    inventoryEntries?: InventoryTransaction[];
    payments?: Payment[];
}

export interface Payment {
    id: number;
    transactionDate: string;
    amount: number;
    mode: PaymentMode;
    salesOrderId?: number | null;
    salesOrder?: SalesOrder | null;
    threadPurchaseId?: number | null;
    threadPurchase?: ThreadPurchase | null;
    referenceNumber?: string | null;
    description: string;
    remarks?: string | null;
    createdAt: string;
    updatedAt: string;
    chequeTransaction?: ChequeTransaction | null;
}

export interface ChequeTransaction {
    id: number;
    paymentId: number;
    payment: Payment;
    chequeNumber: string;
    bank: string;
    branch?: string | null;
    chequeAmount: number;
    issueDate: string;
    clearanceDate?: string | null;
    chequeStatus: ChequeStatus;
    remarks?: string | null;
    createdAt: string;
    updatedAt: string;
}
