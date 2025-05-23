"use client";

import { createContext } from "react";

import { InventoryItem } from "./columns";

// Inventory action type definition
export type InventoryAction = {
    type: "add" | "update" | "delete" | "restock";
    item: Partial<InventoryItem> & { id: number };
    payload?: {
        quantity?: number;
        [key: string]: unknown;
    };
};

// Define the pending item interface
export interface PendingItem {
    source: string;
    id: number;
    name: string;
    type: string;
    quantity: number;
    unitOfMeasure: string;
    sourceType: string;
    selected?: boolean;
}

// Create inventory context for sharing data with dialogs
export const InventoryContext = createContext<{
    // eslint-disable-next-line no-unused-vars
    addOptimisticAction: (action: InventoryAction) => void;
    refreshInventory: () => Promise<void>;
    inventoryItems: InventoryItem[];
    isLoading: boolean;
    pendingItems: PendingItem[];
    // eslint-disable-next-line no-unused-vars
    importPendingItems: (selectedItems: PendingItem[]) => Promise<void>;
}>({
    addOptimisticAction: () => {},
    refreshInventory: async () => {},
    inventoryItems: [],
    isLoading: false,
    pendingItems: [],
    importPendingItems: async () => {},
});

// Helper function to remove duplicate pending items
export const removeDuplicatePendingItems = (
    items: PendingItem[],
): PendingItem[] => {
    // Check for existing transactions in inventory first
    const uniqueItems = new Map<string, PendingItem>();

    // Use a map to track unique items by their source-id combination
    items.forEach((item) => {
        const key = `${item.source}-${item.id}`;
        if (!uniqueItems.has(key)) {
            uniqueItems.set(key, item);
        }
    });

    const filteredItems = Array.from(uniqueItems.values());

    console.log(
        `[Inventory] Filtered pending items from ${items.length} to ${filteredItems.length}`,
    );

    return filteredItems;
};
