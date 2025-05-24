"use client";

import { useState, useEffect } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { SalesAnalytics } from "./analytics";
import { SalesDetailsDialog, SalesEditDialog, columns } from "./columns";
import { SalesDataTable } from "./data-table";
import { PaymentHistory } from "./payment-history";
import { SalesFormDialog } from "./sales-form-dialog";

export default function SalesPage() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [globalFilter, setGlobalFilter] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Handler for when a new sale is created
    const handleSaleCreated = () => {
        setRefreshTrigger((prev) => prev + 1);
        setIsFormOpen(false);
    };

    // Add event listener to refresh data when sales are updated
    useEffect(() => {
        const handleSalesDataUpdated = () => {
            console.log("Sales data updated event received in page component");
            setRefreshTrigger((prev) => prev + 1);
        };

        window.addEventListener("salesDataUpdated", handleSalesDataUpdated);
        window.addEventListener("refreshSalesData", handleSalesDataUpdated);

        return () => {
            window.removeEventListener("salesDataUpdated", handleSalesDataUpdated);
            window.removeEventListener("refreshSalesData", handleSalesDataUpdated);
        };
    }, []);

    return (
        <>
            <div className="mx-auto">
                <div className="mx-auto max-w-[1600px] space-y-6 p-6 pt-4">
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1">
                            <Heading
                                title="Sales & Payments"
                                description="Manage sales orders and track payments"
                            />
                        </div>
                        <div className="flex items-center justify-between py-4">
                            <Input
                                placeholder="Filter sales orders..."
                                value={globalFilter ?? ""}
                                onChange={(e) =>
                                    setGlobalFilter(e.target.value)
                                }
                                className="max-w-sm"
                            />
                            <div className="flex gap-2">
                                <Button onClick={() => setIsFormOpen(true)}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Sale
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Analytics Cards - Top row on larger screens */}
                        <div className="col-span-1 lg:col-span-3">
                            <SalesAnalytics />
                        </div>

                        {/* Main content - takes up more space */}
                        <div className="col-span-1 lg:col-span-3">
                            <Card className="overflow-hidden rounded-lg border shadow">
                                <CardHeader className="bg-muted/30 pb-4">
                                    <CardTitle className="text-lg font-medium">
                                        Sales Management
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Tabs
                                        defaultValue="sales"
                                        className="w-full"
                                    >
                                        <div className="px-6 pt-4">
                                            <TabsList className="grid w-full max-w-md grid-cols-2">
                                                <TabsTrigger value="sales">
                                                    Sales Orders
                                                </TabsTrigger>
                                                <TabsTrigger value="payments">
                                                    Payment History
                                                </TabsTrigger>
                                            </TabsList>
                                        </div>

                                        <TabsContent
                                            value="sales"
                                            className="mt-0"
                                        >
                                            <SalesDataTable
                                                columns={columns}
                                                refreshTrigger={refreshTrigger}
                                            />
                                        </TabsContent>

                                        <TabsContent
                                            value="payments"
                                            className="mt-0 p-6"
                                        >
                                            <PaymentHistory />
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sales Details Dialog */}
            <SalesDetailsDialog />

            {/* Sales Edit Dialog */}
            <SalesEditDialog />

            {/* Sales Form Dialog - Open state is controlled by the dialog trigger */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[800px]">
                    <DialogTitle className="sr-only">Add New Sale</DialogTitle>
                    <SalesFormDialog onSaleCreated={handleSaleCreated} />
                </DialogContent>
            </Dialog>
        </>
    );
}
