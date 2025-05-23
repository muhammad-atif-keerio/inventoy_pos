"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AlertTriangle, BarChart3, Package } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InventoryStats {
    summary: {
        totalItems: number;
        totalQuantity: number;
        lowStockItems: number;
        outOfStockItems: number;
    };
    distribution: {
        byProductType: Array<{
            type: string;
            count: number;
            quantity: number;
        }>;
    };
    transactions: {
        byType: Array<{
            type: string;
            count: number;
            quantity: number;
        }>;
        daily: Array<{
            date: string;
            count: number;
            quantity: number;
        }>;
    };
    topItems: {
        threadTypes: Array<{
            id: string;
            itemCode: string;
            description: string;
            quantity: number;
            typeName: string;
        }>;
        fabricTypes: Array<{
            id: string;
            itemCode: string;
            description: string;
            quantity: number;
            typeName: string;
        }>;
    };
}

export default function SimpleDashboardPage() {
    const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(
        null,
    );
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInventoryStats = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(
                    `/api/inventory/stats/?t=${Date.now()}`,
                    {
                        cache: "no-store",
                    },
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setInventoryStats(data.data);
                    } else {
                        setError(
                            data.error || "Failed to load inventory statistics",
                        );
                    }
                } else {
                    setError("Failed to fetch inventory statistics");
                }
            } catch (err) {
                setError(
                    "An error occurred while loading inventory statistics",
                );
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInventoryStats();
    }, []);

    return (
        <div className="flex-1 space-y-4 p-6 pt-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="inventory">Inventory</TabsTrigger>
                    <TabsTrigger value="analytics" disabled>
                        Analytics
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total Inventory
                                </CardTitle>
                                <Package className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">
                                    {isLoading
                                        ? "Loading..."
                                        : inventoryStats?.summary.totalItems ||
                                          0}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    Items in inventory
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Low Stock Items
                                </CardTitle>
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">
                                    {isLoading
                                        ? "Loading..."
                                        : inventoryStats?.summary
                                              .lowStockItems || 0}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    Items below minimum stock level
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Out of Stock
                                </CardTitle>
                                <AlertTriangle className="text-destructive h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">
                                    {isLoading
                                        ? "Loading..."
                                        : inventoryStats?.summary
                                              .outOfStockItems || 0}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    Items that need reordering
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total Quantity
                                </CardTitle>
                                <BarChart3 className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">
                                    {isLoading
                                        ? "Loading..."
                                        : inventoryStats?.summary
                                              .totalQuantity || 0}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    Units in stock
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {error && (
                        <Card className="border-destructive">
                            <CardContent className="pt-6">
                                <p className="text-destructive">{error}</p>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Thread Types</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <p>Loading...</p>
                                ) : (
                                    <div className="space-y-2">
                                        {inventoryStats?.topItems.threadTypes.map(
                                            (item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center justify-between"
                                                >
                                                    <span>
                                                        {item.typeName} (
                                                        {item.itemCode})
                                                    </span>
                                                    <span className="font-medium">
                                                        {item.quantity} units
                                                    </span>
                                                </div>
                                            ),
                                        )}
                                        {!inventoryStats?.topItems.threadTypes
                                            .length && (
                                            <p className="text-muted-foreground text-sm">
                                                No thread types found
                                            </p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Top Fabric Types</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <p>Loading...</p>
                                ) : (
                                    <div className="space-y-2">
                                        {inventoryStats?.topItems.fabricTypes.map(
                                            (item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center justify-between"
                                                >
                                                    <span>
                                                        {item.typeName} (
                                                        {item.itemCode})
                                                    </span>
                                                    <span className="font-medium">
                                                        {item.quantity} units
                                                    </span>
                                                </div>
                                            ),
                                        )}
                                        {!inventoryStats?.topItems.fabricTypes
                                            .length && (
                                            <p className="text-muted-foreground text-sm">
                                                No fabric types found
                                            </p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="inventory">
                    <Card>
                        <CardHeader>
                            <CardTitle>Inventory Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Link
                                href="/inventory"
                                className="text-primary hover:underline"
                            >
                                Go to full inventory
                            </Link>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
