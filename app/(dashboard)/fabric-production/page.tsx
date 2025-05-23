"use client";

import React, { useEffect, useState } from "react";

import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { columns } from "./columns";
import { DataTable } from "./data-table";
import { ProductionAnalytics } from "./production-analytics";
import { ProductionFormDialog } from "./production-form-dialog";

// Define the FabricProduction type based on the Prisma schema
export type FabricProduction = {
    id: number;
    sourceThreadId: number;
    threadPurchase?: {
        id: number;
        threadType: string;
        color?: string;
        colorStatus: string;
        vendor: {
            id: number;
            name: string;
        };
    };
    threadInfo?: {
        id: number;
        threadType: string;
        color?: string | null;
        colorStatus: string;
        vendorId: number;
    } | null;
    dyeingProcessId?: number | null;
    dyeingProcess?: {
        id: number;
        colorCode?: string;
        colorName?: string;
    } | null;
    dyeingInfo?: {
        id: number;
        colorCode?: string | null;
        colorName?: string | null;
        resultStatus: string;
    } | null;
    productionDate: Date | string;
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
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    completionDate?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    inventoryStatus?: "UPDATED" | "PENDING";
    salesStatus?: "SOLD" | "AVAILABLE";
};

export default function FabricProductionPage() {
    const [fabricProductions, setFabricProductions] = useState<
        FabricProduction[]
    >([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchFabricProductions = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/fabric/production");

            if (!response.ok) {
                throw new Error(
                    `Failed to fetch fabric productions: ${response.status}`,
                );
            }

            const responseData = await response.json();

            // Extract the data array from the response
            // The API returns { data: [...], meta: {...} }
            const fabricProductionsData = responseData.data || [];
            setFabricProductions(fabricProductionsData);
        } catch (error) {
            console.error("Error fetching fabric productions:", error);
            toast.error("Failed to load fabric productions");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFabricProductions();
    }, []);

    const handleRefresh = () => {
        fetchFabricProductions();
        toast.success("Fabric production data refreshed");
    };

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col gap-6">
                {/* Page header */}
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <Heading
                        title="Fabric Production"
                        description="Manage fabric production processes and batches"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            onClick={handleRefresh}
                            variant="outline"
                            size="sm"
                            className="h-9"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>

                        <ProductionFormDialog
                            triggerButton={
                                <Button size="sm" className="h-9">
                                    <Plus className="mr-2 h-4 w-4" />
                                    New Production
                                </Button>
                            }
                            onProductionCreated={fetchFabricProductions}
                        />
                    </div>
                </div>

                <Tabs defaultValue="productions" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="productions">
                            Production Batches
                        </TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="productions" className="space-y-4">
                        <Separator />

                        <DataTable
                            columns={columns}
                            data={fabricProductions}
                            isLoading={isLoading}
                            onDataChange={fetchFabricProductions}
                        />
                    </TabsContent>

                    <TabsContent value="analytics" className="space-y-4">
                        <ProductionAnalytics />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
