"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

import { format } from "date-fns";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { formatCurrency } from "@/app/(dashboard)/inventory/columns";
import {
    InventoryItem,
    InventoryTransaction,
} from "@/app/(dashboard)/inventory/interface";

interface ViewInventoryTransactionsDialogProps {
    inventoryItem: InventoryItem;
    trigger: React.ReactNode;
}

export function ViewInventoryTransactionsDialog({
    inventoryItem,
    trigger,
}: ViewInventoryTransactionsDialogProps) {
    const [open, setOpen] = useState(false);
    const [transactions, setTransactions] = useState<InventoryTransaction[]>(
        [],
    );
    const [isLoading, setIsLoading] = useState(false);

    // Fetch transaction data when dialog opens
    useEffect(() => {
        if (open && inventoryItem?.id) {
            fetchTransactions();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, inventoryItem?.id]);

    const fetchTransactions = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(
                `/api/inventory/${inventoryItem.id}/transactions?includeRelations=true`,
            );

            if (!response.ok) {
                throw new Error("Failed to load transaction history");
            }

            const data = await response.json();
            setTransactions(data.items || []);
        } catch (error) {
            console.error("Error fetching transactions:", error);
            toast.error("Failed to load transaction history");
        } finally {
            setIsLoading(false);
        }
    };

    // Helper function to get badge styling based on transaction type
    const getTransactionTypeBadge = (type: string) => {
        switch (type) {
            case "PURCHASE":
                return (
                    <Badge
                        variant="outline"
                        className="bg-green-100 text-green-800"
                    >
                        Purchase
                    </Badge>
                );
            case "PRODUCTION":
                return (
                    <Badge
                        variant="outline"
                        className="bg-blue-100 text-blue-800"
                    >
                        Production
                    </Badge>
                );
            case "SALES":
                return (
                    <Badge
                        variant="outline"
                        className="bg-amber-100 text-amber-800"
                    >
                        Sales
                    </Badge>
                );
            case "ADJUSTMENT":
                return (
                    <Badge
                        variant="outline"
                        className="bg-purple-100 text-purple-800"
                    >
                        Adjustment
                    </Badge>
                );
            case "TRANSFER":
                return (
                    <Badge
                        variant="outline"
                        className="bg-cyan-100 text-cyan-800"
                    >
                        Transfer
                    </Badge>
                );
            default:
                return <Badge variant="outline">{type}</Badge>;
        }
    };

    // Helper function to display source details based on transaction type
    const getSourceDetails = (transaction: InventoryTransaction) => {
        if (transaction.threadPurchaseId && transaction.threadPurchase) {
            return (
                <div className="flex flex-col">
                    <Link
                        href={`/thread-orders/${transaction.threadPurchaseId}`}
                        className="text-blue-600 hover:underline"
                    >
                        Thread Purchase #{transaction.threadPurchaseId}
                    </Link>
                    <span className="text-muted-foreground text-xs">
                        {transaction.threadPurchase.vendor?.name} -{" "}
                        {transaction.threadPurchase.threadType}
                    </span>
                </div>
            );
        }

        if (transaction.dyeingProcessId && transaction.dyeingProcess) {
            return (
                <div className="flex flex-col">
                    <Link
                        href={`/dyeing-process?id=${transaction.dyeingProcessId}`}
                        className="text-blue-600 hover:underline"
                    >
                        Dyeing Process #{transaction.dyeingProcessId}
                    </Link>
                    <span className="text-muted-foreground text-xs">
                        {transaction.dyeingProcess.colorName ||
                            transaction.dyeingProcess.colorCode ||
                            "No color"}{" "}
                        - Thread Purchase #
                        {transaction.dyeingProcess.threadPurchaseId}
                    </span>
                </div>
            );
        }

        if (transaction.fabricProductionId && transaction.fabricProduction) {
            return (
                <div className="flex flex-col">
                    <Link
                        href={`/fabric-production?id=${transaction.fabricProductionId}`}
                        className="text-blue-600 hover:underline"
                    >
                        Fabric Prod. #{transaction.fabricProductionId}
                    </Link>
                    <span className="text-muted-foreground text-xs">
                        {transaction.fabricProduction.fabricType} - Batch{" "}
                        {transaction.fabricProduction.batchNumber}
                    </span>
                </div>
            );
        }

        if (transaction.salesOrderId) {
            return (
                <div className="flex flex-col">
                    <Link
                        href={`/sales?id=${transaction.salesOrderId}`}
                        className="text-blue-600 hover:underline"
                    >
                        Sales Order #{transaction.salesOrderId}
                    </Link>
                </div>
            );
        }

        return "—";
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[85vh] sm:max-w-[900px]">
                <DialogHeader>
                    <DialogTitle>Transaction History</DialogTitle>
                    <DialogDescription>
                        View all transactions for {inventoryItem.itemCode} -{" "}
                        {inventoryItem.description}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center space-x-4 py-4">
                    <div>
                        <p className="text-sm font-medium">Current Quantity:</p>
                        <p className="text-2xl font-bold">
                            {inventoryItem.currentQuantity.toLocaleString()}{" "}
                            {inventoryItem.unitOfMeasure}
                        </p>
                    </div>

                    <div className="flex-1"></div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchTransactions}
                        disabled={isLoading}
                    >
                        Refresh
                    </Button>
                </div>

                {/* Transactions Table */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">
                                    Quantity
                                </TableHead>
                                <TableHead className="text-right">
                                    Remaining
                                </TableHead>
                                <TableHead className="text-right">
                                    Unit Cost
                                </TableHead>
                                <TableHead>Source Details</TableHead>
                                <TableHead>Notes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                // Loading state
                                Array.from({ length: 3 }).map((_, index) => (
                                    <TableRow key={`loading-${index}`}>
                                        {Array.from({ length: 7 }).map(
                                            (_, cellIndex) => (
                                                <TableCell
                                                    key={`cell-${index}-${cellIndex}`}
                                                >
                                                    <Skeleton className="h-5 w-full" />
                                                </TableCell>
                                            ),
                                        )}
                                    </TableRow>
                                ))
                            ) : transactions.length === 0 ? (
                                // Empty state
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="h-24 text-center"
                                    >
                                        No transaction history found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                // Data rows
                                transactions.map((transaction) => (
                                    <TableRow key={transaction.id}>
                                        <TableCell>
                                            {format(
                                                new Date(
                                                    transaction.transactionDate,
                                                ),
                                                "PPP",
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {getTransactionTypeBadge(
                                                transaction.transactionType,
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {transaction.quantity.toLocaleString()}{" "}
                                            {inventoryItem.unitOfMeasure}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {transaction.remainingQuantity.toLocaleString()}{" "}
                                            {inventoryItem.unitOfMeasure}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {transaction.unitCost
                                                ? formatCurrency(
                                                      transaction.unitCost,
                                                  )
                                                : "—"}
                                        </TableCell>
                                        <TableCell>
                                            {getSourceDetails(transaction)}
                                        </TableCell>
                                        <TableCell>
                                            <div
                                                className="max-w-[200px] truncate"
                                                title={transaction.notes || ""}
                                            >
                                                {transaction.notes || "—"}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
