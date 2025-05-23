"use client";

import React, { useState } from "react";

import { format } from "date-fns";
import { CalendarIcon, Edit, Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { DyeingProcessItem } from "./columns";
import { DyeingFormDialog } from "./dyeing-form-dialog";

// Define types matching the data structure used in the component
interface InventoryEntry {
    id: number;
    quantity: number;
    transactionType: string;
    transactionDate: string;
    unitCost: number;
}

interface FabricProduction {
    id: number;
    fabricType: string;
    quantityProduced: number;
    status: string;
    totalCost: number;
}

// Update DyeingProcessItem interface to include the optional properties
interface DyeingDetailsProps extends DyeingProcessItem {
    inventoryEntries?: InventoryEntry[];
    fabricProductions?: FabricProduction[];
}

interface DyeingDetailsDialogProps {
    dyeingProcess: DyeingDetailsProps;
    trigger?: React.ReactNode;
    onUpdate?: () => void;
}

export function DyeingDetailsDialog({
    dyeingProcess,
    trigger,
    onUpdate,
}: DyeingDetailsDialogProps) {
    const [open, setOpen] = useState(false);

    // Format currency helper function
    const formatCurrency = (amount: number | null | undefined): string => {
        if (amount == null) return "N/A";
        return new Intl.NumberFormat("en-PK", {
            style: "currency",
            currency: "PKR",
        }).format(amount);
    };

    // Function to render the proper status badge
    const getStatusBadge = (status: string) => {
        switch (status.toUpperCase()) {
            case "COMPLETED":
                return (
                    <Badge className="bg-green-100 text-green-800">
                        Completed
                    </Badge>
                );
            case "PARTIAL":
                return (
                    <Badge className="bg-yellow-100 text-yellow-800">
                        Partial
                    </Badge>
                );
            case "FAILED":
                return (
                    <Badge className="bg-red-100 text-red-800">Failed</Badge>
                );
            case "PENDING":
                return (
                    <Badge className="bg-blue-100 text-blue-800">Pending</Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const defaultTrigger = (
        <Button variant="ghost" size="icon" className="h-8 w-8">
            <Eye className="h-4 w-4" />
            <span className="sr-only">View details</span>
        </Button>
    );

    // Handle edit process completion
    const handleEditComplete = () => {
        if (onUpdate) {
            onUpdate();
        }
        setOpen(false);
    };

    // Create edit button for the dyeing process
    const editButton = (
        <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Edit className="h-3.5 w-3.5" />
            Edit Process
        </Button>
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
                <DialogHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <DialogTitle>
                                Dyeing Process #{dyeingProcess.id}
                            </DialogTitle>
                            <DialogDescription>
                                Thread Order #{dyeingProcess.threadPurchaseId} -{" "}
                                {dyeingProcess.threadPurchase?.threadType}
                            </DialogDescription>
                        </div>
                        <DyeingFormDialog
                            triggerButton={editButton}
                            onDyeingProcessCreated={handleEditComplete}
                            editMode
                            dyeingProcessData={dyeingProcess}
                        />
                    </div>
                </DialogHeader>

                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="inventory">Inventory</TabsTrigger>
                        <TabsTrigger value="production">Production</TabsTrigger>
                    </TabsList>

                    {/* Details Tab */}
                    <TabsContent value="details" className="space-y-4 pt-4">
                        {/* Status and Dates */}
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <Card>
                                <CardHeader className="px-4 pt-4 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Status
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 pt-0 pb-3">
                                    {getStatusBadge(dyeingProcess.resultStatus)}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="px-4 pt-4 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Dye Date
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex items-center px-4 pt-0 pb-3">
                                    <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                                    {format(
                                        new Date(dyeingProcess.dyeDate),
                                        "PPP",
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="px-4 pt-4 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Completion Date
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex items-center px-4 pt-0 pb-3">
                                    {dyeingProcess.completionDate ? (
                                        <>
                                            <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                                            {format(
                                                new Date(
                                                    dyeingProcess.completionDate,
                                                ),
                                                "PPP",
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            Not completed
                                        </span>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Thread and Color Details */}
                        <Card>
                            <CardHeader className="px-4 pt-4 pb-2">
                                <CardTitle className="text-base font-medium">
                                    Thread & Color Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pt-0 pb-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-muted-foreground text-sm">
                                            Thread Type
                                        </p>
                                        <p className="font-medium">
                                            {dyeingProcess.threadPurchase
                                                ?.threadType || "N/A"}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-muted-foreground text-sm">
                                            Original Color
                                        </p>
                                        <p className="font-medium">
                                            {dyeingProcess.threadPurchase
                                                ?.color || "Raw/Uncolored"}
                                        </p>
                                    </div>

                                    <div className="col-span-2">
                                        <p className="text-muted-foreground text-sm">
                                            Dyed Color
                                        </p>
                                        <div className="mt-1 flex items-center gap-2">
                                            {dyeingProcess.colorCode && (
                                                <div
                                                    className="h-6 w-6 rounded-full border border-gray-200"
                                                    style={{
                                                        backgroundColor:
                                                            dyeingProcess.colorCode,
                                                    }}
                                                />
                                            )}
                                            <span className="font-medium">
                                                {dyeingProcess.colorName ||
                                                    dyeingProcess.colorCode ||
                                                    "Not specified"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quantity and Cost Details */}
                        <Card>
                            <CardHeader className="px-4 pt-4 pb-2">
                                <CardTitle className="text-base font-medium">
                                    Quantity & Costs
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pt-0 pb-4">
                                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                                    <div>
                                        <p className="text-muted-foreground text-sm">
                                            Input Quantity
                                        </p>
                                        <p className="font-medium">
                                            {dyeingProcess.dyeQuantity.toLocaleString()}
                                            <span className="text-muted-foreground ml-1 text-xs">
                                                {dyeingProcess.threadPurchase
                                                    ?.unitOfMeasure || "meters"}
                                            </span>
                                            {dyeingProcess.dyeQuantity <
                                                (dyeingProcess.threadPurchase
                                                    ?.quantity || 0) && (
                                                <span className="ml-2 text-xs text-amber-600">
                                                    (Partial:{" "}
                                                    {dyeingProcess.dyeQuantity.toLocaleString()}{" "}
                                                    of{" "}
                                                    {dyeingProcess.threadPurchase?.quantity.toLocaleString()}{" "}
                                                    total)
                                                </span>
                                            )}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-muted-foreground text-sm">
                                            Output Quantity
                                        </p>
                                        <p className="font-medium">
                                            {dyeingProcess.outputQuantity.toLocaleString()}
                                            <span className="text-muted-foreground ml-1 text-xs">
                                                {dyeingProcess.threadPurchase
                                                    ?.unitOfMeasure || "meters"}
                                            </span>
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-muted-foreground text-sm">
                                            Wastage
                                        </p>
                                        <p className="font-medium">
                                            {(
                                                dyeingProcess.dyeQuantity -
                                                dyeingProcess.outputQuantity
                                            ).toLocaleString()}
                                            <span className="text-muted-foreground ml-1 text-xs">
                                                (
                                                {Math.round(
                                                    (1 -
                                                        dyeingProcess.outputQuantity /
                                                            dyeingProcess.dyeQuantity) *
                                                        100,
                                                )}
                                                %)
                                            </span>
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-muted-foreground text-sm">
                                            Labor Cost
                                        </p>
                                        <p className="font-medium">
                                            {formatCurrency(
                                                dyeingProcess.laborCost,
                                            )}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-muted-foreground text-sm">
                                            Material Cost
                                        </p>
                                        <p className="font-medium">
                                            {formatCurrency(
                                                dyeingProcess.dyeMaterialCost,
                                            )}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-muted-foreground text-sm">
                                            Total Cost
                                        </p>
                                        <p className="font-medium">
                                            {formatCurrency(
                                                dyeingProcess.totalCost,
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Remarks */}
                        {dyeingProcess.remarks && (
                            <Card>
                                <CardHeader className="px-4 pt-4 pb-2">
                                    <CardTitle className="text-base font-medium">
                                        Remarks
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 pt-0 pb-4">
                                    <p className="whitespace-pre-line">
                                        {dyeingProcess.remarks}
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Inventory Tab */}
                    <TabsContent value="inventory" className="space-y-4 pt-4">
                        {dyeingProcess.inventoryEntries &&
                        dyeingProcess.inventoryEntries.length > 0 ? (
                            <div className="space-y-4">
                                <h3 className="text-base font-medium">
                                    Inventory Transactions
                                </h3>
                                {dyeingProcess.inventoryEntries.map((entry) => (
                                    <Card key={entry.id}>
                                        <CardContent className="pt-4 pb-4">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <Badge
                                                        className="mb-2"
                                                        variant={
                                                            entry.transactionType ===
                                                            "PRODUCTION"
                                                                ? "default"
                                                                : "outline"
                                                        }
                                                    >
                                                        {entry.transactionType}
                                                    </Badge>
                                                    <p className="text-muted-foreground text-sm">
                                                        {format(
                                                            new Date(
                                                                entry.transactionDate,
                                                            ),
                                                            "PPP",
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium">
                                                        {entry.quantity.toLocaleString()}{" "}
                                                        units
                                                    </p>
                                                    <p className="text-muted-foreground text-sm">
                                                        Unit Cost:{" "}
                                                        {formatCurrency(
                                                            entry.unitCost,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <p className="text-muted-foreground">
                                    No inventory entries found.
                                </p>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    This thread has not been added to inventory
                                    yet.
                                </p>
                            </div>
                        )}
                    </TabsContent>

                    {/* Production Tab */}
                    <TabsContent value="production" className="space-y-4 pt-4">
                        {dyeingProcess.fabricProductions &&
                        dyeingProcess.fabricProductions.length > 0 ? (
                            <div className="space-y-4">
                                <h3 className="text-base font-medium">
                                    Fabric Production Records
                                </h3>
                                {dyeingProcess.fabricProductions.map(
                                    (production) => (
                                        <Card key={production.id}>
                                            <CardHeader className="px-4 pt-4 pb-2">
                                                <CardTitle className="flex justify-between text-sm font-medium">
                                                    <span>
                                                        Fabric #{production.id}:{" "}
                                                        {production.fabricType}
                                                    </span>
                                                    <Badge>
                                                        {production.status}
                                                    </Badge>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="px-4 pt-0 pb-4">
                                                <div className="mt-2 grid grid-cols-2 gap-3">
                                                    <div>
                                                        <p className="text-muted-foreground text-sm">
                                                            Quantity Produced
                                                        </p>
                                                        <p className="font-medium">
                                                            {production.quantityProduced.toLocaleString()}{" "}
                                                            meters
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground text-sm">
                                                            Total Cost
                                                        </p>
                                                        <p className="font-medium">
                                                            {formatCurrency(
                                                                production.totalCost,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ),
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <p className="text-muted-foreground">
                                    No fabric production records found.
                                </p>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    This thread has not been used in fabric
                                    production yet.
                                </p>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
