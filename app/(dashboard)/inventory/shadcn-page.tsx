"use client";

import React, { useEffect, useState } from "react";

import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";

import { inventoryService } from "./api-service";
import { DataTable } from "./data-table";
import { InventoryItem, shadcnColumns } from "./shadcn-columns";

export default function ShadcnInventoryPage() {
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchInventory = async () => {
        setIsLoading(true);
        try {
            // Use the integrated inventory service to fetch comprehensive data
            const integratedData =
                await inventoryService.fetchIntegratedInventory();

            console.log("[DEBUG] Integrated inventory data:", {
                inventoryItems: integratedData.inventoryItems.length,
                threadPurchases: integratedData.threadPurchases.length,
                dyedThreads: integratedData.dyedThreads.length,
                fabricProductions: integratedData.fabricProductions.length,
                pendingItems: integratedData.pendingItems.length,
            });

            // Set the main inventory items, cast to consistent type
            setInventoryItems(
                integratedData.inventoryItems as unknown as InventoryItem[],
            );
        } catch (error) {
            console.error("[DEBUG] Failed to fetch inventory items:", error);
            toast.error("Failed to load inventory items");
            setInventoryItems([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    // Handle refresh button click
    const handleRefresh = () => {
        fetchInventory();
        toast.success("Inventory refreshed");
    };

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col gap-6">
                {/* Page header */}
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <Heading
                        title="Inventory Management"
                        description="Manage your inventory of fabrics, threads, and other materials"
                    />
                    <Button
                        onClick={handleRefresh}
                        variant="outline"
                        size="sm"
                        className="h-9"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                </div>

                <Separator />

                {/* DataTable with shadcn columns */}
                <DataTable
                    columns={shadcnColumns}
                    data={inventoryItems}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
}
