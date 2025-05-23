"use client";

import { createContext } from "react";

import { VendorItem } from "./columns";

// Define the action types for optimistic updates
export type OptimisticAction =
    | { type: "add"; item: VendorItem }
    | { type: "update"; item: VendorItem }
    | { type: "delete"; id: number };

// Define the context type
export interface VendorContextType {
    vendors: VendorItem[];
    // eslint-disable-next-line no-unused-vars
    addOptimisticAction: (action: OptimisticAction) => void;
    refreshVendors: () => Promise<void>;
}

// Create the context with a default value
export const VendorContext = createContext<VendorContextType>({
    vendors: [],
    addOptimisticAction: () => {},
    refreshVendors: async () => {},
});
