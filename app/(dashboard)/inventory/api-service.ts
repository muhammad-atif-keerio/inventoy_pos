/* eslint-disable @typescript-eslint/no-explicit-any */
import { InventoryTransactionType } from "@prisma/client";
import { toast } from "sonner";

import {
    DyeingProcess,
    FabricProduction,
    InventoryItem,
    InventoryTransaction,
    ThreadPurchase,
} from "./interface";

const handleApiError = (
    error: unknown,
    endpoint: string,
    params?: any,
): {
    message: string;
    status?: number;
    details?: any;
    timestamp: string;
} => {
    console.error(`API Error at ${endpoint}:`, error);

    // Capture comprehensive error data
    const errorData = {
        message:
            error instanceof Error ? error.message : "Unknown error occurred",
        status: error instanceof Response ? error.status : undefined,
        details:
            error instanceof Response
                ? { statusText: error.statusText }
                : undefined,
        timestamp: new Date().toISOString(),
        endpoint,
        params,
    };

    // Log detailed diagnostic information
    console.error("Detailed API Error:", JSON.stringify(errorData, null, 2));

    // For network errors, add connection troubleshooting info
    if (error instanceof TypeError && error.message.includes("fetch")) {
        console.error("Network Error: Possible causes include:");
        console.error("- API server is not running");
        console.error("- CORS issues");
        console.error("- Network connectivity problems");
    }

    return errorData;
};

/**
 * Service layer for inventory API interactions
 */
export const inventoryService = {
    /**
     * Get all inventory items with optional filtering
     */
    async getInventoryItems(filters?: {
        search?: string;
        type?: "THREAD" | "FABRIC";
        inStock?: boolean;
        lowStock?: boolean;
        includeRelations?: boolean;
        includeTransactions?: boolean;
    }): Promise<InventoryItem[]> {
        try {
            // Build query parameters
            const params = new URLSearchParams();
            if (filters?.search) params.append("search", filters.search);
            if (filters?.type) params.append("type", filters.type);
            if (filters?.inStock !== undefined)
                params.append("inStock", String(filters.inStock));
            if (filters?.lowStock !== undefined)
                params.append("lowStock", String(filters.lowStock));
            if (filters?.includeRelations !== undefined)
                params.append(
                    "includeRelations",
                    String(filters.includeRelations),
                );
            if (filters?.includeTransactions !== undefined)
                params.append(
                    "includeTransactions",
                    String(filters.includeTransactions),
                );

            // Always include relations
            params.append("includeRelations", "true");

            const url = `/api/inventory${params.toString() ? `?${params.toString()}` : ""}`;
            console.log("[DEBUG] Fetching inventory from URL:", url);

            // Simple fetch without any extra processing
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Error fetching inventory: ${response.status}`);
            }

            // Get the raw JSON response
            const jsonData = await response.json();
            console.log(
                "[DEBUG] API response structure:",
                Object.keys(jsonData),
            );

            // Check if the response has a data property
            if (jsonData && jsonData.data && Array.isArray(jsonData.data)) {
                console.log(
                    `[DEBUG] Found ${jsonData.data.length} inventory items in the response`,
                );

                // Process numeric fields to ensure proper types
                return jsonData.data.map((item: any) => ({
                    ...item,
                    currentQuantity: Number(item.currentQuantity),
                    minStockLevel: item.minStockLevel
                        ? Number(item.minStockLevel)
                        : 0,
                    costPerUnit: item.costPerUnit
                        ? Number(item.costPerUnit)
                        : 0,
                    salePrice: item.salePrice ? Number(item.salePrice) : 0,
                }));
            } else if (Array.isArray(jsonData)) {
                console.log(
                    `[DEBUG] Response is directly an array with ${jsonData.length} items`,
                );

                // Process numeric fields to ensure proper types
                return jsonData.map((item: any) => ({
                    ...item,
                    currentQuantity: Number(item.currentQuantity),
                    minStockLevel: item.minStockLevel
                        ? Number(item.minStockLevel)
                        : 0,
                    costPerUnit: item.costPerUnit
                        ? Number(item.costPerUnit)
                        : 0,
                    salePrice: item.salePrice ? Number(item.salePrice) : 0,
                }));
            } else {
                console.error(
                    "[DEBUG] Unexpected API response structure:",
                    jsonData,
                );
                return [];
            }
        } catch (error) {
            const errorInfo = handleApiError(error, "/api/inventory", filters);
            toast.error(`Failed to load inventory items: ${errorInfo.message}`);
            return [];
        }
    },

    /**
     * Get a single inventory item by ID with optional relations
     */
    async getInventoryItem(
        id: number,
        includeRelations = false,
    ): Promise<InventoryItem | null> {
        try {
            const url = `/api/inventory/${id}${includeRelations ? "?includeRelations=true" : ""}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(
                    `Error fetching inventory item: ${response.status}`,
                );
            }

            const item = await response.json();

            // Convert decimal strings to numbers
            return {
                ...item,
                currentQuantity: Number(item.currentQuantity),
                minStockLevel: item.minStockLevel
                    ? Number(item.minStockLevel)
                    : 0,
                costPerUnit: item.costPerUnit ? Number(item.costPerUnit) : 0,
                salePrice: item.salePrice ? Number(item.salePrice) : 0,
            };
        } catch (error) {
            console.error(`Failed to fetch inventory item #${id}:`, error);
            toast.error("Failed to load inventory item details");
            return null;
        }
    },

    /**
     * Create a new inventory item
     */
    async createInventoryItem(
        item: Partial<InventoryItem> & {
            threadTypeName?: string;
            fabricTypeName?: string;
            createMissingType?: boolean;
            referenceId?: number;
            transactionNotes?: string;
        },
    ): Promise<InventoryItem | null> {
        try {
            const response = await fetch("/api/inventory", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(item),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error ||
                        `Error creating inventory item: ${response.status}`,
                );
            }

            const result = await response.json();
            toast.success("Inventory item created successfully");
            return result.inventoryItem;
        } catch (error) {
            console.error("Failed to create inventory item:", error);
            toast.error(
                `Failed to create inventory item: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
            return null;
        }
    },

    /**
     * Update an existing inventory item
     */
    async updateInventoryItem(
        id: number,
        data: Partial<InventoryItem>,
    ): Promise<InventoryItem | null> {
        try {
            const response = await fetch(`/api/inventory/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error ||
                        `Error updating inventory item: ${response.status}`,
                );
            }

            const updatedItem = await response.json();
            toast.success("Inventory item updated successfully");
            return updatedItem;
        } catch (error) {
            console.error(`Failed to update inventory item #${id}:`, error);
            toast.error(
                `Failed to update inventory item: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
            return null;
        }
    },

    /**
     * Delete an inventory item
     */
    async deleteInventoryItem(id: number): Promise<boolean> {
        try {
            const response = await fetch(`/api/inventory/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error ||
                        `Error deleting inventory item: ${response.status}`,
                );
            }

            toast.success("Inventory item deleted successfully");
            return true;
        } catch (error) {
            console.error(`Failed to delete inventory item #${id}:`, error);
            toast.error(
                `Failed to delete inventory item: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
            return false;
        }
    },

    /**
     * Get transactions for an inventory item
     */
    async getInventoryTransactions(
        inventoryId: number,
        options?: {
            limit?: number;
            offset?: number;
            type?: string;
            includeRelations?: boolean;
        },
    ): Promise<{
        items: InventoryTransaction[];
        total: number;
        limit: number;
        offset: number;
    }> {
        try {
            const params = new URLSearchParams();
            if (options?.limit)
                params.append("limit", options.limit.toString());
            if (options?.offset)
                params.append("offset", options.offset.toString());
            if (options?.type) params.append("type", options.type);
            if (options?.includeRelations)
                params.append("includeRelations", "true");

            const response = await fetch(
                `/api/inventory/${inventoryId}/transactions${params.toString() ? `?${params.toString()}` : ""}`,
            );

            if (!response.ok) {
                throw new Error(
                    `Error fetching transactions: ${response.status}`,
                );
            }

            return await response.json();
        } catch (error) {
            console.error(
                `Failed to fetch transactions for inventory #${inventoryId}:`,
                error,
            );
            toast.error("Failed to load transaction history");
            return { items: [], total: 0, limit: 10, offset: 0 };
        }
    },

    /**
     * Create a new transaction for an inventory item (like restocking)
     */
    async createTransaction(
        inventoryId: number,
        transaction: {
            transactionType: InventoryTransactionType;
            quantity: number;
            unitCost?: number;
            totalCost?: number;
            notes?: string;
            referenceType?: string;
            referenceId?: number;
            threadPurchaseId?: number;
            dyeingProcessId?: number;
            fabricProductionId?: number;
            salesOrderId?: number;
            transactionDate?: string;
        },
    ): Promise<{
        transaction: InventoryTransaction;
        inventory: InventoryItem;
    } | null> {
        try {
            // Ensure numeric values are properly converted to prevent string type errors
            const payload = {
                ...transaction,
                unitCost: transaction.unitCost
                    ? Number(transaction.unitCost)
                    : undefined,
                totalCost: transaction.totalCost
                    ? Number(transaction.totalCost)
                    : undefined,
            };

            const response = await fetch(
                `/api/inventory/${inventoryId}/transactions`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                },
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error ||
                        `Error creating transaction: ${response.status}`,
                );
            }

            const result = await response.json();

            const transactionTypeLabels = {
                PURCHASE: "Purchase",
                PRODUCTION: "Production",
                SALES: "Sales",
                ADJUSTMENT: "Adjustment",
                TRANSFER: "Transfer",
            };

            toast.success(
                `${transactionTypeLabels[transaction.transactionType] || "Transaction"} recorded successfully`,
            );
            return result;
        } catch (error) {
            console.error(
                `Failed to create transaction for inventory #${inventoryId}:`,
                error,
            );
            toast.error(
                `Transaction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
            return null;
        }
    },

    /**
     * Add fabric production to inventory
     */
    async addFabricProductionToInventory(
        fabricProductionId: number,
        options?: {
            location?: string;
            notes?: string;
            description?: string;
            updateProductionStatus?: boolean;
            minStockLevel?: number;
            markup?: number;
            updateInventoryStatus?: boolean;
        },
    ): Promise<{
        inventoryItem: InventoryItem;
        transaction: InventoryTransaction;
    } | null> {
        try {
            const response = await fetch(
                "/api/inventory/add-fabric-production",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        fabricProductionId,
                        ...options,
                        // Ensure numeric values are converted appropriately
                        minStockLevel: options?.minStockLevel
                            ? Number(options.minStockLevel)
                            : undefined,
                        markup: options?.markup
                            ? Number(options.markup)
                            : undefined,
                        updateInventoryStatus: options?.updateInventoryStatus
                            ? Boolean(options.updateInventoryStatus)
                            : undefined,
                    }),
                },
            );

            if (!response.ok) {
                // First check if it's JSON before trying to parse
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const errorData = await response.json();
                    throw new Error(
                        errorData.error ||
                            `Error adding fabric production: ${response.status}`,
                    );
                } else {
                    throw new Error(
                        `Error adding fabric production: ${response.status}`,
                    );
                }
            }

            const result = await response.json();
            toast.success("Fabric production added to inventory successfully");
            return result;
        } catch (error) {
            console.error(
                "Failed to add fabric production to inventory:",
                error,
            );
            toast.error(
                `Failed to add fabric production: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
            return null;
        }
    },

    /**
     * Add dyed thread to inventory
     */
    async addDyedThreadToInventory(
        dyeingProcessId: number,
        options?: {
            quantity?: number;
            location?: string;
            notes?: string;
            description?: string;
            minStockLevel?: number;
            createMissingType?: boolean;
            markup?: number;
            updateInventoryStatus?: boolean;
        },
    ): Promise<{
        inventoryItem: InventoryItem;
        transaction: InventoryTransaction;
    } | null> {
        try {
            const response = await fetch("/api/inventory/add-dyeing-thread", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    dyeingProcessId,
                    ...options,
                    // Ensure numeric values are converted appropriately
                    quantity: options?.quantity
                        ? Number(options.quantity)
                        : undefined,
                    minStockLevel: options?.minStockLevel
                        ? Number(options.minStockLevel)
                        : undefined,
                    markup: options?.markup
                        ? Number(options.markup)
                        : undefined,
                    updateInventoryStatus: options?.updateInventoryStatus
                        ? Boolean(options.updateInventoryStatus)
                        : undefined,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error ||
                        `Error adding dyed thread: ${response.status}`,
                );
            }

            const result = await response.json();
            toast.success("Dyed thread added to inventory successfully");
            return result;
        } catch (error) {
            console.error("Failed to add dyed thread to inventory:", error);
            toast.error(
                `Failed to add dyed thread: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
            return null;
        }
    },

    /**
     * Get inventory statistics
     */
    async getInventoryStats(): Promise<{
        totalItems: number;
        totalThreads: number;
        totalFabrics: number;
        lowStockItems: number;
        outOfStockItems: number;
        totalValue: number;
    }> {
        try {
            const response = await fetch("/api/inventory/stats", {
                method: "GET",
                headers: {
                    "Cache-Control": "no-cache",
                },
            });

            if (!response.ok) {
                throw new Error(
                    `Error fetching inventory stats: ${response.status}`,
                );
            }

            const result = await response.json();
            const data = result.data;

            // Calculate total threads and fabrics from the distribution
            let totalThreads = 0;
            let totalFabrics = 0;
            const totalValue = 0;

            if (data.distribution && data.distribution.byProductType) {
                data.distribution.byProductType.forEach(
                    (item: { type: string; count: number }) => {
                        if (item.type === "THREAD") {
                            totalThreads = item.count;
                        } else if (item.type === "FABRIC") {
                            totalFabrics = item.count;
                        }
                    },
                );
            }

            // Calculate total inventory value (would need to be provided by the API or
            // estimated based on available data)

            return {
                totalItems: data.summary?.totalItems || 0,
                totalThreads,
                totalFabrics,
                lowStockItems: data.summary?.lowStockItems || 0,
                outOfStockItems: data.summary?.outOfStockItems || 0,
                totalValue: totalValue,
            };
        } catch (error) {
            console.error("Failed to fetch inventory statistics:", error);
            toast.error("Failed to load inventory statistics");
            return {
                totalItems: 0,
                totalThreads: 0,
                totalFabrics: 0,
                lowStockItems: 0,
                outOfStockItems: 0,
                totalValue: 0,
            };
        }
    },

    /**
     * Add raw thread from purchase to inventory
     */
    async addThreadPurchaseToInventory(
        threadPurchaseId: number,
        options?: {
            quantity?: number;
            location?: string;
            notes?: string;
            description?: string;
            minStockLevel?: number;
            createMissingType?: boolean;
            markup?: number;
            updateInventoryStatus?: boolean;
        },
    ): Promise<{
        inventoryItem: InventoryItem;
        transaction: InventoryTransaction;
    } | null> {
        try {
            const response = await fetch("/api/inventory/thread-purchase", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    threadPurchaseId,
                    ...options,
                    // Ensure numeric values are converted appropriately
                    quantity: options?.quantity
                        ? Number(options.quantity)
                        : undefined,
                    minStockLevel: options?.minStockLevel
                        ? Number(options.minStockLevel)
                        : undefined,
                    markup: options?.markup
                        ? Number(options.markup)
                        : undefined,
                    updateInventoryStatus: options?.updateInventoryStatus
                        ? Boolean(options.updateInventoryStatus)
                        : undefined,
                }),
            });

            if (!response.ok) {
                // First check if it's JSON before trying to parse
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const errorData = await response.json();
                    throw new Error(
                        errorData.error ||
                            `Error adding thread purchase: ${response.status}`,
                    );
                } else {
                    throw new Error(
                        `Error adding thread purchase: ${response.status}`,
                    );
                }
            }

            const result = await response.json();
            toast.success("Thread purchase added to inventory successfully");
            return result;
        } catch (error) {
            console.error("Failed to add thread purchase to inventory:", error);
            toast.error(
                `Failed to add thread purchase: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
            return null;
        }
    },

    /**
     * Get thread types for inventory classification
     */
    async getThreadTypes(): Promise<
        { id: number; name: string; description?: string; units: string }[]
    > {
        try {
            const response = await fetch("/api/thread-types");

            if (!response.ok) {
                throw new Error(
                    `Error fetching thread types: ${response.status}`,
                );
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to fetch thread types:", error);
            toast.error("Failed to load thread types");
            return [];
        }
    },

    /**
     * Get fabric types for inventory classification
     */
    async getFabricTypes(): Promise<
        { id: number; name: string; description?: string; units: string }[]
    > {
        try {
            const response = await fetch("/api/fabric-types");

            if (!response.ok) {
                throw new Error(
                    `Error fetching fabric types: ${response.status}`,
                );
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to fetch fabric types:", error);
            toast.error("Failed to load fabric types");
            return [];
        }
    },

    /**
     * Add a new thread type
     */
    async createThreadType(data: {
        name: string;
        description?: string;
        units?: string;
    }): Promise<any> {
        try {
            const response = await fetch("/api/thread-types", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error ||
                        `Error creating thread type: ${response.status}`,
                );
            }

            const result = await response.json();
            toast.success("Thread type created successfully");
            return result;
        } catch (error) {
            console.error("Failed to create thread type:", error);
            toast.error(
                `Failed to create thread type: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
            return null;
        }
    },

    /**
     * Add a new fabric type
     */
    async createFabricType(data: {
        name: string;
        description?: string;
        units?: string;
    }): Promise<any> {
        try {
            const response = await fetch("/api/fabric-types", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error ||
                        `Error creating fabric type: ${response.status}`,
                );
            }

            const result = await response.json();
            toast.success("Fabric type created successfully");
            return result;
        } catch (error) {
            console.error("Failed to create fabric type:", error);
            toast.error(
                `Failed to create fabric type: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
            return null;
        }
    },

    /**
     * Get available thread purchases that need to be added to inventory
     */
    async getAvailableThreadPurchases(): Promise<ThreadPurchase[]> {
        try {
            const response = await fetch(
                "/api/thread?received=true&includeInventory=true&includeVendor=true",
            );

            if (!response.ok) {
                throw new Error(
                    `Error fetching thread purchases: ${response.status}`,
                );
            }

            const result = await response.json();

            // Filter only received thread purchases that don't have inventory yet
            const availablePurchases = result.data.filter(
                (purchase: any) =>
                    purchase.received && !purchase.inventoryStatus,
            );

            return availablePurchases;
        } catch (error) {
            console.error("Failed to fetch available thread purchases:", error);
            toast.error("Failed to load available thread purchases");
            return [];
        }
    },

    /**
     * Get available dyed threads that need to be added to inventory
     */
    async getAvailableDyedThreads(): Promise<DyeingProcess[]> {
        try {
            const response = await fetch("/api/dyeing/available", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const data = await response.json();
                console.error("Failed to fetch available dyed threads:", data);
                toast.error(
                    data.message || "Failed to fetch available dyed threads",
                );
                return [];
            }

            const data = await response.json();

            // Ensure we return the vendor information with the dyed threads
            return data.map((item: any) => ({
                ...item,
                threadPurchase: item.threadPurchase
                    ? {
                          ...item.threadPurchase,
                          vendor: item.threadPurchase.vendor || null,
                      }
                    : null,
            }));
        } catch (error) {
            console.error("Error fetching available dyed threads:", error);
            toast.error("Failed to fetch available dyed threads");
            return [];
        }
    },

    /**
     * Get available fabric productions that need to be added to inventory
     */
    async getAvailableFabricProductions(): Promise<FabricProduction[]> {
        try {
            const response = await fetch(
                "/api/fabric/production?status=COMPLETED&includeInventory=true",
            );

            if (!response.ok) {
                throw new Error(
                    `Error fetching fabric productions: ${response.status}`,
                );
            }

            const result = await response.json();

            // Filter only completed productions that don't have inventory yet
            const availableProductions = result.data.filter(
                (production: any) =>
                    production.status === "COMPLETED" &&
                    production.inventoryStatus !== "ADDED",
            );

            return availableProductions;
        } catch (error) {
            console.error(
                "Failed to fetch available fabric productions:",
                error,
            );
            toast.error("Failed to load available fabric productions");
            return [];
        }
    },

    /**
     * Export inventory data to CSV
     */
    async exportInventoryToCSV(): Promise<string | null> {
        try {
            const response = await fetch("/api/inventory/export", {
                method: "GET",
            });

            if (!response.ok) {
                throw new Error(
                    `Error exporting inventory: ${response.status}`,
                );
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            // Create a link to download the file
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = `inventory-export-${new Date().toISOString().split("T")[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success("Inventory data exported successfully");
            return url;
        } catch (error) {
            console.error("Failed to export inventory data:", error);
            toast.error(
                `Failed to export inventory: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
            return null;
        }
    },

    /**
     * Get low stock inventory items
     */
    async getLowStockItems(): Promise<InventoryItem[]> {
        try {
            const params = new URLSearchParams();
            params.append("lowStock", "true");

            const response = await fetch(`/api/inventory?${params.toString()}`);

            if (!response.ok) {
                throw new Error(
                    `Error fetching low stock items: ${response.status}`,
                );
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Failed to fetch low stock items:", error);
            toast.error("Failed to load low stock items");
            return [];
        }
    },

    /**
     * Get out of stock inventory items
     */
    async getOutOfStockItems(): Promise<InventoryItem[]> {
        try {
            const params = new URLSearchParams();
            params.append("inStock", "false");

            const response = await fetch(`/api/inventory?${params.toString()}`);

            if (!response.ok) {
                throw new Error(
                    `Error fetching out of stock items: ${response.status}`,
                );
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Failed to fetch out of stock items:", error);
            toast.error("Failed to load out of stock items");
            return [];
        }
    },

    /**
     * Create a new inventory item with initial transaction
     */
    async createInventoryWithTransaction(payload: {
        itemCode: string;
        description: string;
        type: string;
        quantity: number;
        unit: string;
        unitCost: number;
        totalCost: number;
        transactionType: InventoryTransactionType;
        threadPurchaseId?: number;
        dyeingProcessId?: number;
        fabricProductionId?: number;
        notes?: string;
        source?: string;
        minStockLevel?: number;
        location?: string;
        threadTypeId?: number;
        fabricTypeId?: number;
    }): Promise<InventoryItem | null> {
        try {
            // Ensure numeric values are properly converted
            const data = {
                ...payload,
                unitCost: Number(payload.unitCost),
                totalCost: Number(payload.totalCost),
                quantity: Number(payload.quantity),
                minStockLevel: payload.minStockLevel
                    ? Number(payload.minStockLevel)
                    : undefined,
            };

            const response = await fetch("/api/inventory/transactions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error ||
                        `Error creating inventory item: ${response.status}`,
                );
            }

            const result = await response.json();
            toast.success("Inventory item created successfully");
            return result.inventory;
        } catch (error) {
            console.error("Failed to create inventory item:", error);
            toast.error(
                `Failed to create inventory item: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
            return null;
        }
    },

    /**
     * Direct fetch for inventory items - debugging function to fix the issue
     */
    async fetchInventoryItemsDirect(
        type?: "THREAD" | "FABRIC",
    ): Promise<any[]> {
        try {
            // Build simple URL
            const url = type
                ? `/api/inventory?type=${type}&includeRelations=true&includeTransactions=true`
                : "/api/inventory?includeRelations=true&includeTransactions=true";

            console.log("Direct fetch URL:", url);

            // Use a simple fetch with no extra headers or caching
            const response = await fetch(url, {
                cache: "no-store", // Ensure fresh data every time
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "Cache-Control": "no-cache",
                },
            });

            if (!response.ok) {
                throw new Error(
                    `Error fetching inventory: ${response.status} ${response.statusText}`,
                );
            }

            // Get the raw text first to debug
            const text = await response.text();
            console.log(
                "Raw API response text (first 200 chars):",
                text.substring(0, 200),
            );

            try {
                // Try to parse as JSON
                const data = JSON.parse(text);
                console.log("Parsed JSON structure:", Object.keys(data));

                if (data.items && Array.isArray(data.items)) {
                    console.log(
                        "Found items array with length:",
                        data.items.length,
                    );
                    return data.items;
                } else if (data.data && Array.isArray(data.data)) {
                    console.log(
                        "Found data array with length:",
                        data.data.length,
                    );
                    return data.data;
                } else if (Array.isArray(data)) {
                    console.log(
                        "Response is directly an array with length:",
                        data.length,
                    );
                    return data;
                } else {
                    console.error(
                        "Unexpected response structure:",
                        typeof data,
                    );
                    return [];
                }
            } catch (parseError) {
                console.error("Error parsing JSON response:", parseError);
                return [];
            }
        } catch (error) {
            const errorInfo = handleApiError(error, "/api/inventory (direct)", {
                type,
            });
            toast.error(`Failed to load inventory: ${errorInfo.message}`);

            // For debugging purposes, make a second attempt with basic fetch
            try {
                console.log("Attempting fallback fetch...");
                const fallbackResponse = await fetch(`/api/inventory`);
                const fallbackText = await fallbackResponse.text();
                console.log(
                    "Fallback response (first 100 chars):",
                    fallbackText.substring(0, 100),
                );
            } catch (fallbackError) {
                console.error("Fallback fetch also failed:", fallbackError);
            }

            return [];
        }
    },

    /**
     * Fetch integrated inventory including all sources (thread purchases, dyed threads, fabrics)
     * Provides a unified view of all inventory items
     */
    async fetchIntegratedInventory(): Promise<{
        inventoryItems: InventoryItem[];
        threadPurchases: ThreadPurchase[];
        dyedThreads: DyeingProcess[];
        fabricProductions: FabricProduction[];
        pendingItems: any[];
    }> {
        try {
            // Fetch all data in parallel for efficiency
            const [
                inventoryItems,
                threadPurchases,
                dyedThreads,
                fabricProductions,
                existingTransactions,
            ] = await Promise.all([
                this.fetchInventoryItemsDirect(),
                this.getAvailableThreadPurchases(),
                this.getAvailableDyedThreads(),
                this.getAvailableFabricProductions(),
                this.fetchAllInventoryTransactions(), // Get all transactions to identify already imported items
            ]);

            console.log(`[IntegratedInventory] Fetched:
        - ${inventoryItems?.length || 0} inventory items
        - ${threadPurchases?.length || 0} thread purchases
        - ${dyedThreads?.length || 0} dyed threads
        - ${fabricProductions?.length || 0} fabric productions
        - ${existingTransactions?.length || 0} transactions`);

            // Create sets of IDs for quick lookup to check if item is already imported
            const importedThreadPurchaseIds = new Set(
                existingTransactions
                    .filter((t) => t.threadPurchaseId)
                    .map((t) => t.threadPurchaseId),
            );

            const importedDyeingProcessIds = new Set(
                existingTransactions
                    .filter((t) => t.dyeingProcessId)
                    .map((t) => t.dyeingProcessId),
            );

            const importedFabricProductionIds = new Set(
                existingTransactions
                    .filter((t) => t.fabricProductionId)
                    .map((t) => t.fabricProductionId),
            );

            // Find pending items that exist in source but not yet in inventory
            const pendingItems = [
                ...threadPurchases
                    .filter(
                        (tp) =>
                            tp.received &&
                            (!tp.inventoryStatus ||
                                tp.inventoryStatus !== "ADDED") &&
                            !importedThreadPurchaseIds.has(tp.id),
                    )
                    .map((tp) => ({
                        source: "thread_purchase",
                        id: tp.id,
                        name: `${tp.threadType} ${tp.colorStatus === "COLORED" ? tp.color || "" : "Raw"}`,
                        type: "THREAD",
                        quantity: tp.quantity,
                        unitOfMeasure: tp.unitOfMeasure,
                        sourceType: "Thread Purchase",
                    })),

                ...dyedThreads
                    .filter(
                        (dt) =>
                            dt.resultStatus === "SUCCESS" &&
                            (!dt.inventoryStatus ||
                                dt.inventoryStatus !== "ADDED") &&
                            !importedDyeingProcessIds.has(dt.id),
                    )
                    .map((dt) => ({
                        source: "dyeing_process",
                        id: dt.id,
                        name: `Dyed Thread ${dt.colorName || dt.colorCode || ""}`,
                        type: "THREAD",
                        quantity: dt.outputQuantity,
                        unitOfMeasure: "meters",
                        sourceType: "Dyed Thread",
                    })),

                ...fabricProductions
                    .filter(
                        (fp) =>
                            fp.status === "COMPLETED" &&
                            (!fp.inventoryStatus ||
                                fp.inventoryStatus !== "ADDED") &&
                            !importedFabricProductionIds.has(fp.id),
                    )
                    .map((fp) => ({
                        source: "fabric_production",
                        id: fp.id,
                        name: `${fp.fabricType} ${fp.dimensions}`,
                        type: "FABRIC",
                        quantity: fp.quantityProduced,
                        unitOfMeasure: fp.unitOfMeasure,
                        sourceType: "Fabric Production",
                    })),
            ];

            console.log(
                `[IntegratedInventory] Filtered pending items: ${pendingItems.length}`,
            );

            return {
                inventoryItems,
                threadPurchases,
                dyedThreads,
                fabricProductions,
                pendingItems,
            };
        } catch (error) {
            const errorInfo = handleApiError(error, "fetchIntegratedInventory");

            // Log specific data state to help with debugging
            console.error(
                "Integrated inventory fetch failed with specific details:",
                {
                    errorInfo,
                    timestamp: new Date().toISOString(),
                },
            );

            // Create a more specific error message
            let errorMessage = "Failed to load integrated inventory data";
            if (error instanceof Error) {
                errorMessage += `: ${error.message}`;
            }

            toast.error(errorMessage, {
                description:
                    "Please try refreshing the page or contact support if the issue persists.",
                action: {
                    label: "Refresh",
                    onClick: () => window.location.reload(),
                },
                duration: 5000,
            });

            // Return empty data structure
            return {
                inventoryItems: [],
                threadPurchases: [],
                dyedThreads: [],
                fabricProductions: [],
                pendingItems: [],
            };
        }
    },

    /**
     * Fetch all inventory transactions (for checking if items are already in inventory)
     */
    async fetchAllInventoryTransactions(): Promise<any[]> {
        try {
            const response = await fetch("/api/inventory/transactions/all");
            if (!response.ok) {
                // If the endpoint doesn't exist, use a fallback approach
                console.warn(
                    "Failed to fetch all transactions. Using fallback method.",
                );
                const items = await this.fetchInventoryItemsDirect();

                // Collect all transactions from inventory items
                const transactions: any[] = [];
                items.forEach((item) => {
                    if (item.transactions && Array.isArray(item.transactions)) {
                        transactions.push(...item.transactions);
                    }
                });

                return transactions;
            }

            const result = await response.json();
            return Array.isArray(result) ? result : result.transactions || [];
        } catch (error) {
            console.error("Error fetching all transactions:", error);
            return []; // Return empty array to avoid breaking the chain
        }
    },

    /**
     * Import pending items from source systems into inventory
     */
    async importPendingItemsToInventory(
        pendingItems: {
            source: string;
            id: number;
            name: string;
            type: string;
            quantity: number;
            unitOfMeasure: string;
        }[],
    ): Promise<InventoryItem[]> {
        if (!pendingItems || pendingItems.length === 0) {
            return [];
        }

        const results: InventoryItem[] = [];
        const errors: string[] = [];

        for (const item of pendingItems) {
            try {
                let result = null;

                switch (item.source) {
                    case "thread_purchase":
                        result = await this.addThreadPurchaseToInventory(
                            item.id,
                            {
                                quantity: item.quantity,
                                description: item.name,
                                minStockLevel: Math.ceil(item.quantity * 0.1), // Set default min stock level to 10% of quantity
                                createMissingType: true,
                                updateInventoryStatus: true, // Update the status flag
                            },
                        );
                        break;

                    case "dyeing_process":
                        result = await this.addDyedThreadToInventory(item.id, {
                            quantity: item.quantity,
                            description: item.name,
                            minStockLevel: Math.ceil(item.quantity * 0.1),
                            createMissingType: true,
                            updateInventoryStatus: true, // Update the status flag
                        });
                        break;

                    case "fabric_production":
                        result = await this.addFabricProductionToInventory(
                            item.id,
                            {
                                description: item.name,
                                minStockLevel: Math.ceil(item.quantity * 0.1),
                                updateProductionStatus: true, // Update the status flag
                                updateInventoryStatus: true,
                            },
                        );
                        break;
                }

                if (result && result.inventoryItem) {
                    results.push(result.inventoryItem);
                }
            } catch (error) {
                console.error(
                    `Failed to import ${item.source} item #${item.id}:`,
                    error,
                );
                errors.push(
                    `Failed to import ${item.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
                );
            }
        }

        if (errors.length > 0) {
            toast.error(
                `${errors.length} items failed to import. Check console for details.`,
            );
            console.error("Import errors:", errors);
        }

        if (results.length > 0) {
            toast.success(
                `Successfully imported ${results.length} items to inventory`,
            );
        }

        return results;
    },
};
