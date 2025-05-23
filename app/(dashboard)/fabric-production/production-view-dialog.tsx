"use client";

import React, { useEffect, useState } from "react";

import { format } from "date-fns";
import {
    AlignLeft,
    Box,
    Calendar,
    File,
    Hash,
    Layers,
    Ruler,
    Tag,
} from "lucide-react";
import { toast } from "sonner";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { FabricProduction } from "./page";

interface ProductionViewDialogProps {
    production: FabricProduction;
    triggerButton?: React.ReactNode;
    onProductionUpdated?: () => void;
}

interface InventoryEntry {
    id: number;
    quantity: number;
    transactionType: string;
    transactionDate: string;
    unitCost: number | null;
    totalCost: number | null;
}

interface DetailedProduction extends FabricProduction {
    inventoryEntries?: InventoryEntry[];
    threadInfo?: {
        id: number;
        threadType: string;
        vendorId: number;
        color: string | null;
        colorStatus: string;
    } | null;
    dyeingInfo?: {
        id: number;
        colorCode: string | null;
        colorName: string | null;
        resultStatus: string;
    } | null;
    inventoryStatus?: "UPDATED" | "PENDING";
    salesStatus?: "SOLD" | "AVAILABLE";
    availableInInventory?: boolean;
    inventoryItemId?: number;
    sourceThreadType?: string;
}

export function ProductionViewDialog({
    production,
    triggerButton,
    onProductionUpdated,
}: ProductionViewDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [detailedProduction, setDetailedProduction] =
        useState<DetailedProduction | null>(null);

    // Fetch detailed production info when dialog opens
    useEffect(() => {
        async function fetchDetails() {
            if (!open) return;

            setLoading(true);
            try {
                const response = await fetch(
                    `/api/fabric/production/${production.id}?includeInventory=true`,
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch production details");
                }

                const data = await response.json();
                setDetailedProduction({ ...production, ...data });
            } catch (error) {
                console.error("Error fetching production details:", error);
                toast.error("Failed to load production details");
            } finally {
                setLoading(false);
            }
        }

        fetchDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, production.id, toast]);

    // Format the date for display
    const formattedDate = (dateString?: string | Date | null) => {
        if (!dateString) return "Not specified";
        return format(new Date(dateString), "PPP");
    };

    // Format currency
    const formatCurrency = (value?: number | null) => {
        if (value === undefined || value === null) return "N/A";
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "PKR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Get the status badge style
    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case "COMPLETED":
                return "bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800";
            case "IN_PROGRESS":
                return "bg-blue-100 text-blue-800 hover:bg-blue-100 hover:text-blue-800";
            case "CANCELLED":
                return "bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800";
            default:
                return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 hover:text-yellow-800";
        }
    };

    // Get the inventory status badge
    const getInventoryBadge = () => {
        if (!detailedProduction) return null;

        const status =
            detailedProduction.inventoryStatus ||
            (detailedProduction.availableInInventory ? "UPDATED" : "PENDING");

        return (
            <Badge
                variant="outline"
                className={
                    status === "UPDATED"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                }
            >
                {status === "UPDATED" ? "In Inventory" : "Not in Inventory"}
            </Badge>
        );
    };

    // Handle completion and inventory addition
    const handleAddToInventory = async () => {
        if (!detailedProduction || !detailedProduction.id) return;

        setLoading(true);
        try {
            // Update the production status to COMPLETED if it's not already
            const updateData = {
                ...detailedProduction,
                status: "COMPLETED",
                completionDate: new Date().toISOString(),
            };

            const response = await fetch(
                `/api/fabric/production/${detailedProduction.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(updateData),
                },
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error ||
                        errorData.details ||
                        "Failed to update production",
                );
            }

            // Successfully updated in the database
            await response.json();

            toast.success("Production completed and added to inventory");

            // Update the local state
            setDetailedProduction({
                ...detailedProduction,
                status: "COMPLETED",
                completionDate: new Date().toISOString(),
                inventoryStatus: "UPDATED",
                availableInInventory: true,
            });

            if (onProductionUpdated) {
                onProductionUpdated();
            }
        } catch (error) {
            console.error("Error adding to inventory:", error);
            toast.error("Failed to add to inventory");
        } finally {
            setLoading(false);
        }
    };

    // Determine if Add to Inventory button should be shown
    const showAddToInventoryButton =
        detailedProduction &&
        detailedProduction.status === "COMPLETED" &&
        !detailedProduction.availableInInventory;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {triggerButton || (
                    <Button variant="outline" size="sm">
                        View Details
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span>Production Details</span>
                        <Badge
                            variant="outline"
                            className={getStatusBadgeClass(production.status)}
                        >
                            {production.status.replace("_", " ")}
                        </Badge>
                        {detailedProduction && getInventoryBadge()}
                    </DialogTitle>
                    <DialogDescription>
                        Viewing production record #{production.id}
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
                    </div>
                ) : (
                    <Tabs defaultValue="details">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="materials">
                                Materials & Costs
                            </TabsTrigger>
                            <TabsTrigger value="inventory">
                                Inventory
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="py-4">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                                            <Hash className="text-muted-foreground h-4 w-4" />{" "}
                                            Batch Number
                                        </h3>
                                        <p className="text-lg font-semibold">
                                            {production.batchNumber}
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                                            <Calendar className="text-muted-foreground h-4 w-4" />{" "}
                                            Production Date
                                        </h3>
                                        <p>
                                            {formattedDate(
                                                production.productionDate,
                                            )}
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                                            <Tag className="text-muted-foreground h-4 w-4" />{" "}
                                            Fabric Type
                                        </h3>
                                        <p>{production.fabricType}</p>
                                    </div>

                                    <div>
                                        <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                                            <Ruler className="text-muted-foreground h-4 w-4" />{" "}
                                            Dimensions
                                        </h3>
                                        <p>{production.dimensions}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                                            <Box className="text-muted-foreground h-4 w-4" />{" "}
                                            Quantity Produced
                                        </h3>
                                        <p className="text-lg font-semibold">
                                            {new Intl.NumberFormat(
                                                "en-US",
                                            ).format(
                                                production.quantityProduced,
                                            )}{" "}
                                            {production.unitOfMeasure}
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                                            <File className="text-muted-foreground h-4 w-4" />{" "}
                                            Thread Source
                                        </h3>
                                        <p className="flex flex-col">
                                            <span className="font-medium">
                                                #{production.sourceThreadId}
                                            </span>
                                            <span className="text-muted-foreground text-sm">
                                                {detailedProduction?.threadInfo
                                                    ?.threadType ||
                                                    detailedProduction?.sourceThreadType ||
                                                    "Unknown thread"}
                                            </span>
                                            {(detailedProduction?.threadInfo
                                                ?.color ||
                                                detailedProduction?.dyeingInfo
                                                    ?.colorName) && (
                                                <span className="text-muted-foreground text-sm">
                                                    {detailedProduction
                                                        ?.dyeingInfo
                                                        ?.colorName ||
                                                        detailedProduction
                                                            ?.threadInfo?.color}
                                                </span>
                                            )}
                                        </p>
                                    </div>

                                    {production.completionDate && (
                                        <div>
                                            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                                                <Calendar className="text-muted-foreground h-4 w-4" />{" "}
                                                Completion Date
                                            </h3>
                                            <p>
                                                {formattedDate(
                                                    production.completionDate,
                                                )}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Separator className="my-4" />

                            <div>
                                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                                    <AlignLeft className="text-muted-foreground h-4 w-4" />{" "}
                                    Remarks
                                </h3>
                                <p className="bg-muted/50 min-h-[60px] rounded-md p-3 text-sm">
                                    {production.remarks ||
                                        "No remarks provided"}
                                </p>
                            </div>
                        </TabsContent>

                        <TabsContent value="materials" className="py-4">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-md">
                                            Material Usage
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <dl className="space-y-2">
                                            <div className="flex justify-between">
                                                <dt className="text-muted-foreground text-sm">
                                                    Thread Used:
                                                </dt>
                                                <dd className="text-sm font-medium">
                                                    {new Intl.NumberFormat(
                                                        "en-US",
                                                    ).format(
                                                        production.threadUsed,
                                                    )}{" "}
                                                    {production.unitOfMeasure}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-muted-foreground text-sm">
                                                    Thread Wastage:
                                                </dt>
                                                <dd className="text-sm font-medium">
                                                    {new Intl.NumberFormat(
                                                        "en-US",
                                                    ).format(
                                                        production.threadWastage ||
                                                            0,
                                                    )}{" "}
                                                    {production.unitOfMeasure}
                                                </dd>
                                            </div>
                                            <Separator className="my-2" />
                                            <div className="flex justify-between font-medium">
                                                <dt>Efficiency Ratio:</dt>
                                                <dd>
                                                    {production.threadUsed &&
                                                    production.quantityProduced
                                                        ? (
                                                              production.quantityProduced /
                                                              production.threadUsed
                                                          ).toFixed(2)
                                                        : "N/A"}
                                                </dd>
                                            </div>
                                        </dl>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-md">
                                            Cost Breakdown
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <dl className="space-y-2">
                                            <div className="flex justify-between">
                                                <dt className="text-muted-foreground text-sm">
                                                    Production Cost:
                                                </dt>
                                                <dd className="text-sm font-medium">
                                                    {formatCurrency(
                                                        production.productionCost,
                                                    )}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-muted-foreground text-sm">
                                                    Labor Cost:
                                                </dt>
                                                <dd className="text-sm font-medium">
                                                    {formatCurrency(
                                                        production.laborCost,
                                                    )}
                                                </dd>
                                            </div>
                                            <Separator className="my-2" />
                                            <div className="text-primary flex justify-between font-medium">
                                                <dt>Total Cost:</dt>
                                                <dd>
                                                    {formatCurrency(
                                                        production.totalCost,
                                                    )}
                                                </dd>
                                            </div>
                                            <div className="text-muted-foreground flex justify-between text-sm">
                                                <dt>Cost Per Unit:</dt>
                                                <dd>
                                                    {production.totalCost &&
                                                    production.quantityProduced
                                                        ? formatCurrency(
                                                              production.totalCost /
                                                                  production.quantityProduced,
                                                          )
                                                        : "N/A"}
                                                    /{production.unitOfMeasure}
                                                </dd>
                                            </div>
                                        </dl>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="inventory" className="py-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <span>Inventory Status</span>
                                        {getInventoryBadge()}
                                    </CardTitle>
                                    <CardDescription>
                                        {detailedProduction?.availableInInventory
                                            ? "This production has been added to inventory"
                                            : "This production has not been added to inventory yet"}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {detailedProduction?.availableInInventory ? (
                                        <div className="space-y-4">
                                            <div className="bg-muted rounded-md p-4">
                                                <h4 className="mb-2 font-medium">
                                                    Inventory Item Details
                                                </h4>
                                                <dl className="space-y-2">
                                                    <div className="flex justify-between">
                                                        <dt className="text-muted-foreground text-sm">
                                                            Item ID:
                                                        </dt>
                                                        <dd className="text-sm font-medium">
                                                            #
                                                            {
                                                                detailedProduction.inventoryItemId
                                                            }
                                                        </dd>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <dt className="text-muted-foreground text-sm">
                                                            Added Quantity:
                                                        </dt>
                                                        <dd className="text-sm font-medium">
                                                            {new Intl.NumberFormat(
                                                                "en-US",
                                                            ).format(
                                                                production.quantityProduced,
                                                            )}
                                                        </dd>
                                                    </div>
                                                </dl>
                                            </div>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <a
                                                    href="/inventory"
                                                    target="_blank"
                                                >
                                                    View in Inventory
                                                </a>
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <p className="text-muted-foreground text-sm">
                                                {production.status ===
                                                "COMPLETED"
                                                    ? "This completed production has not been added to inventory yet. You can add it now."
                                                    : "Production must be completed before it can be added to inventory."}
                                            </p>

                                            {showAddToInventoryButton && (
                                                <Button
                                                    onClick={
                                                        handleAddToInventory
                                                    }
                                                    disabled={loading}
                                                    className="w-full"
                                                >
                                                    <Layers className="mr-2 h-4 w-4" />
                                                    Add to Inventory
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                )}

                <div className="text-muted-foreground mt-4 text-xs">
                    Created on {formattedDate(production.createdAt)}
                </div>
            </DialogContent>
        </Dialog>
    );
}
