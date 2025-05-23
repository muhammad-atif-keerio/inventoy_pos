"use client";

import React, { useState } from "react";

import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import { InventoryItem } from "@/app/(dashboard)/inventory/interface";

interface ViewInventoryDialogProps {
    inventoryItem: InventoryItem;
    trigger: React.ReactNode;
}

export function ViewInventoryDialog({
    inventoryItem,
    trigger,
}: ViewInventoryDialogProps) {
    const [open, setOpen] = useState(false);

    const formatDate = (date?: string | Date) => {
        if (!date) return "N/A";
        return format(new Date(date), "PPP");
    };

    const getStockStatus = () => {
        if (inventoryItem.currentQuantity <= 0) {
            return { label: "Out of Stock", variant: "destructive" as const };
        } else if (
            inventoryItem.currentQuantity <= inventoryItem.minStockLevel
        ) {
            return {
                label: "Low Stock",
                variant: "outline" as const,
                className: "bg-yellow-100 text-yellow-800",
            };
        } else {
            return {
                label: "In Stock",
                variant: "outline" as const,
                className: "bg-green-100 text-green-800",
            };
        }
    };

    const stockStatus = getStockStatus();

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Inventory Item Details</DialogTitle>
                    <DialogDescription>
                        Detailed information about inventory item{" "}
                        {inventoryItem.itemCode}
                    </DialogDescription>
                </DialogHeader>

                <Card className="border-0 px-2 shadow-none">
                    <CardHeader className="">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl">
                                    {inventoryItem.itemCode}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    {inventoryItem.description}
                                </CardDescription>
                            </div>
                            <Badge
                                variant={stockStatus.variant}
                                className={stockStatus.className}
                            >
                                {stockStatus.label}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-0">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Item Type</p>
                                <p className="text-sm">
                                    {inventoryItem.productType}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Quantity</p>
                                <p className="text-sm">
                                    {inventoryItem.currentQuantity}{" "}
                                    {inventoryItem.unitOfMeasure}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Location</p>
                                <p className="text-sm">
                                    {inventoryItem.location || "Not specified"}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Supplier</p>
                                <p className="text-sm">
                                    {inventoryItem.threadType?.name ||
                                        inventoryItem.fabricType?.name ||
                                        "Not specified"}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium">
                                    Minimum Stock Level
                                </p>
                                <p className="text-sm">
                                    {inventoryItem.minStockLevel}{" "}
                                    {inventoryItem.unitOfMeasure}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium">
                                    Cost Per Unit
                                </p>
                                <p className="text-sm">
                                    {inventoryItem.costPerUnit
                                        ? `$${inventoryItem.costPerUnit.toFixed(2)}`
                                        : "Not specified"}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium">
                                    Last Restocked
                                </p>
                                <p className="text-sm">
                                    {inventoryItem.lastRestocked
                                        ? formatDate(
                                              inventoryItem.lastRestocked,
                                          )
                                        : "N/A"}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium">
                                    Created At
                                </p>
                                <p className="text-sm">
                                    {formatDate(inventoryItem.createdAt)}
                                </p>
                            </div>
                        </div>

                        {inventoryItem.notes && (
                            <>
                                <Separator />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Notes</p>
                                    <div className="bg-muted rounded p-2 text-sm whitespace-pre-wrap">
                                        {inventoryItem.notes}
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <div className="mt-4 flex justify-end">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
