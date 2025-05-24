// app/inventory/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";

import {
    AlertTriangle,
    DownloadCloud,
    ImportIcon,
    Plus,
    RefreshCw,
    UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Heading } from "@/components/ui/heading";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AddInventoryDialog } from "./add-inventory-dialog";
import { inventoryService } from "./api-service";
import { InventoryItem, columns } from "./columns";
import { formatCurrency } from "./columns";
import { DataTable } from "./data-table";
import {
    InventoryAction,
    InventoryContext,
    PendingItem,
    removeDuplicatePendingItems,
} from "./inventory-context";

// app/inventory/page.tsx

// app/inventory/page.tsx

// app/inventory/page.tsx

// Simple Progress component implementation
const Progress: React.FC<{ value?: number; className?: string }> = ({
    value = 0,
    className = "",
}) => (
    <div
        className={`h-2 w-full overflow-hidden rounded-full bg-gray-200 ${className}`}
    >
        <div
            className="bg-primary h-full transition-all duration-500"
            style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
        />
    </div>
);

// Wrap the main component in this function
function InventoryContent() {
    const searchParams = useSearchParams();
    const typeFilter = searchParams?.get("type");
    const sourceFilter = searchParams?.get("source");

    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentView, setCurrentView] = useState<string>(
        sourceFilter || "all",
    );
    const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
    const [showPendingItemsDialog, setShowPendingItemsDialog] = useState(false);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [selectedPendingItems, setSelectedPendingItems] = useState<
        PendingItem[]
    >([]);
    const [importProgress, setImportProgress] = useState(0);
    const [isImporting, setIsImporting] = useState(false);
    const [preventAutoShowDialog, setPreventAutoShowDialog] = useState(false);

    const [inventoryStats, setInventoryStats] = useState<{
        totalItems: number;
        totalThreads: number;
        totalFabrics: number;
        lowStockItems: number;
        outOfStockItems: number;
        totalValue: number;
    }>({
        totalItems: 0,
        totalThreads: 0,
        totalFabrics: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        totalValue: 0,
    });

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

            // Set pending items with selected flag and filter out any that may be duplicates
            const uniquePendingItems = removeDuplicatePendingItems(
                integratedData.pendingItems,
            );
            setPendingItems(
                uniquePendingItems.map((item) => ({
                    ...item,
                    selected: false,
                })),
            );

            // Only automatically show pending items dialog if there are new items and we haven't just imported
            if (uniquePendingItems.length > 0 && !preventAutoShowDialog) {
                setShowPendingItemsDialog(true);
            } else if (
                uniquePendingItems.length === 0 &&
                showPendingItemsDialog
            ) {
                // Close the dialog if there are no pending items
                setShowPendingItemsDialog(false);
            }

            // Reset the auto-show prevention flag after we've used it
            if (preventAutoShowDialog) {
                setPreventAutoShowDialog(false);
            }

            // Also fetch inventory statistics
            try {
                const stats = await inventoryService.getInventoryStats();
                setInventoryStats(stats);
            } catch (statsError) {
                console.error(
                    "[DEBUG] Failed to fetch inventory statistics:",
                    statsError,
                );
                toast.error("Failed to load inventory statistics");
            }
        } catch (error) {
            console.error("[DEBUG] Failed to fetch inventory items:", error);
            toast.error("Failed to load inventory items");
            setInventoryItems([]);
            setPendingItems([]);
        } finally {
            setIsLoading(false);
        }
    };

    const importPendingItems = async (selectedItems: PendingItem[]) => {
        if (!selectedItems || selectedItems.length === 0) {
            toast.info("No items selected for import");
            return;
        }

        setIsImporting(true);
        setImportProgress(0);

        try {
            // Start with a small progress indication to show activity
            setImportProgress(5);

            const importedItems =
                await inventoryService.importPendingItemsToInventory(
                    selectedItems,
                );

            // Set progress to 90% after import completes
            setImportProgress(90);

            if (importedItems && importedItems.length > 0) {
                // Update the inventory items list with the new items, with proper type casting
                setInventoryItems((prevItems) => {
                    // Create a map of existing items by ID to avoid duplicates
                    const existingItemsMap = new Map(
                        prevItems.map((item) => [item.id, item]),
                    );

                    // Add new items, avoiding duplicates
                    for (const item of importedItems) {
                        if (
                            item &&
                            typeof item === "object" &&
                            "id" in item &&
                            item.id
                        ) {
                            const itemId = Number(item.id);
                            if (!existingItemsMap.has(itemId)) {
                                existingItemsMap.set(
                                    itemId,
                                    item as unknown as InventoryItem,
                                );
                            }
                        }
                    }

                    return Array.from(existingItemsMap.values());
                });

                // Remove imported items from pending items
                const importedIds = new Set(
                    selectedItems.map((item) => `${item.source}-${item.id}`),
                );
                setPendingItems((prevItems) =>
                    prevItems.filter(
                        (item) => !importedIds.has(`${item.source}-${item.id}`),
                    ),
                );

                toast.success(
                    `Successfully imported ${importedItems.length} items to inventory`,
                );

                // Set flag to prevent auto-showing dialog on next refresh
                setPreventAutoShowDialog(true);

                // Set progress to 100% before refreshing data
                setImportProgress(100);

                // Refresh inventory data to ensure pending items count is accurate
                await fetchInventory();

                // Close the dialog after successful import and refresh
                setImportDialogOpen(false);
            } else {
                toast.warning(
                    "No items were imported. This may be because they were already in inventory.",
                );
            }
        } catch (error) {
            console.error("Failed to import pending items:", error);
            toast.error(
                "Failed to import items to inventory. Please try again.",
            );
        } finally {
            setIsImporting(false);
            setImportDialogOpen(false);
        }
    };

    useEffect(() => {
        fetchInventory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [typeFilter]);

    // Handle refresh button click
    const handleRefresh = () => {
        fetchInventory();
        toast.success("Inventory refreshed");
    };

    // Handle pending items selection
    const togglePendingItemSelection = (index: number) => {
        setPendingItems((prevItems) =>
            prevItems.map((item, i) =>
                i === index ? { ...item, selected: !item.selected } : item,
            ),
        );
    };

    // Handle import button click
    const handleImportButtonClick = () => {
        const selected = pendingItems.filter((item) => item.selected);
        if (selected.length === 0) {
            toast.warning("Please select at least one item to import");
            return;
        }

        setSelectedPendingItems(selected);
        setImportProgress(0);
        setImportDialogOpen(true);
    };

    // Implementation of optimistic updates
    const addOptimisticAction = async (action: InventoryAction) => {
        switch (action.type) {
            case "restock":
                // Update the UI immediately (optimistically)
                setInventoryItems(
                    (prev) =>
                        prev.map((item) =>
                            item.id === action.item.id
                                ? {
                                      ...item,
                                      currentQuantity:
                                          item.currentQuantity +
                                          (action.payload?.quantity || 0),
                                      lastRestocked: new Date().toISOString(),
                                  }
                                : item,
                        ) as InventoryItem[],
                );

                // Call the API
                if (action.payload?.quantity) {
                    await inventoryService.createTransaction(action.item.id, {
                        transactionType: "ADJUSTMENT",
                        quantity: action.payload.quantity,
                        notes:
                            (action.payload.notes as string) ||
                            "Restocked inventory item",
                    });
                }
                break;

            case "update":
                // Update the UI immediately
                setInventoryItems(
                    (prev) =>
                        prev.map((item) =>
                            item.id === action.item.id
                                ? { ...item, ...action.item }
                                : item,
                        ) as InventoryItem[],
                );

                // Call the API to update the item
                await inventoryService.updateInventoryItem(
                    action.item.id,
                    // Import and use the InventoryItem from interface.ts to ensure types match
                    action.item as unknown as import("./interface").InventoryItem,
                );
                break;

            case "add":
                if (action.item && "id" in action.item) {
                    // Add to UI immediately
                    setInventoryItems(
                        (prev) =>
                            [
                                ...prev,
                                {
                                    ...(action.item as unknown as InventoryItem),
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString(),
                                },
                            ] as InventoryItem[],
                    );
                }
                break;

            case "delete":
                // Remove from UI immediately
                setInventoryItems((prev) =>
                    prev.filter((item) => item.id !== action.item.id),
                );

                // Call the API to delete the item
                await inventoryService.deleteInventoryItem(action.item.id);
                break;
        }
    };

    // Filter inventory items based on their source
    const getItemsBySource = (source: string) => {
        if (source === "all") return inventoryItems;

        // Handle empty inventory or items without transactions gracefully
        if (!inventoryItems || inventoryItems.length === 0) return [];

        switch (source) {
            case "thread_purchase":
                return inventoryItems.filter((item) =>
                    item.transactions?.some(
                        (t) =>
                            t.threadPurchaseId &&
                            !t.dyeingProcessId &&
                            !t.fabricProductionId,
                    ),
                );
            case "dyeing_process":
                return inventoryItems.filter((item) =>
                    item.transactions?.some((t) => t.dyeingProcessId),
                );
            case "fabric_production":
                return inventoryItems.filter((item) =>
                    item.transactions?.some((t) => t.fabricProductionId),
                );
            case "manual_entry":
                return inventoryItems.filter(
                    (item) =>
                        !item.transactions?.length ||
                        !item.transactions.some(
                            (t) =>
                                t.threadPurchaseId ||
                                t.dyeingProcessId ||
                                t.fabricProductionId ||
                                t.salesOrderId,
                        ),
                );
            default:
                return inventoryItems;
        }
    };

    // Combine context value here for the provider
    const contextValue = {
        addOptimisticAction,
        refreshInventory: fetchInventory,
        inventoryItems,
        isLoading,
        pendingItems,
        importPendingItems,
    };

    return (
        <InventoryContext.Provider value={contextValue}>
            <div className="container mx-auto px-4 py-6">
                <div className="flex flex-col gap-6">
                    {/* Page header */}
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <Heading
                            title="Inventory Management"
                            description="Manage your inventory of fabrics, threads, and other materials"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                            {pendingItems.length > 0 && (
                                <Button
                                    onClick={() =>
                                        setShowPendingItemsDialog(true)
                                    }
                                    variant="default"
                                    size="sm"
                                    className="h-9 bg-amber-500 hover:bg-amber-600"
                                >
                                    <AlertTriangle className="mr-2 h-4 w-4" />
                                    {pendingItems.length} Pending Items
                                </Button>
                            )}

                            <Button
                                onClick={handleRefresh}
                                variant="outline"
                                size="sm"
                                className="h-9"
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Refresh
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add to Inventory
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-[220px]"
                                >
                                    <DropdownMenuLabel>
                                        Add Items to Inventory
                                    </DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={async () => {
                                            const threadPurchases =
                                                await inventoryService.getAvailableThreadPurchases();
                                            if (threadPurchases.length === 0) {
                                                toast.info(
                                                    "No available thread purchases to add to inventory",
                                                );
                                                return;
                                            }
                                            // Navigate to thread purchase integration page
                                            window.location.href =
                                                "/inventory/add-thread-purchase";
                                        }}
                                    >
                                        Add Thread Purchase
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={async () => {
                                            const dyedThreads =
                                                await inventoryService.getAvailableDyedThreads();
                                            if (dyedThreads.length === 0) {
                                                toast.info(
                                                    "No available dyed threads to add to inventory",
                                                );
                                                return;
                                            }
                                            // Navigate to dyed thread integration page
                                            window.location.href =
                                                "/inventory/add-dyeing-thread";
                                        }}
                                    >
                                        Add Dyed Thread
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={async () => {
                                            const fabricProductions =
                                                await inventoryService.getAvailableFabricProductions();
                                            if (
                                                fabricProductions.length === 0
                                            ) {
                                                toast.info(
                                                    "No available fabric productions to add to inventory",
                                                );
                                                return;
                                            }
                                            // Navigate to fabric production integration page
                                            window.location.href =
                                                "/inventory/add-fabric-production";
                                        }}
                                    >
                                        Add Fabric Production
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>
                                        <AddInventoryDialog
                                            trigger={
                                                <span className="flex w-full items-center">
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Add Manual Entry
                                                </span>
                                            }
                                        />
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Pending Items Dialog */}
                    <Dialog
                        open={showPendingItemsDialog}
                        onOpenChange={(open) => {
                            // Only allow closing if there are no pending items or we're not importing
                            if (
                                !open &&
                                (!pendingItems.length || !isImporting)
                            ) {
                                setShowPendingItemsDialog(false);
                            } else if (!open && isImporting) {
                                // Prevent closing during import
                                toast.info(
                                    "Please wait until the import process completes",
                                );
                            }
                        }}
                    >
                        <DialogContent className="max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>
                                    Pending Items for Inventory
                                </DialogTitle>
                                <DialogDescription>
                                    The following items are available to be
                                    added to inventory from your production
                                    processes.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="py-4">
                                {pendingItems.length === 0 ? (
                                    <div className="p-4 text-center">
                                        <p>
                                            No pending items available to
                                            import.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-2 flex justify-between">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setPendingItems((prev) =>
                                                        prev.map((item) => ({
                                                            ...item,
                                                            selected: true,
                                                        })),
                                                    );
                                                }}
                                            >
                                                Select All
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setPendingItems((prev) =>
                                                        prev.map((item) => ({
                                                            ...item,
                                                            selected: false,
                                                        })),
                                                    );
                                                }}
                                            >
                                                Deselect All
                                            </Button>
                                        </div>
                                        <ScrollArea className="h-[300px] rounded-md border p-4">
                                            <div className="mb-2 grid grid-cols-[25px_2fr_1fr_1fr_1fr] gap-4 border-b pb-2 font-medium">
                                                <div></div>
                                                <div>Item</div>
                                                <div>Type</div>
                                                <div>Quantity</div>
                                                <div>Source</div>
                                            </div>
                                            {pendingItems.map((item, index) => (
                                                <div
                                                    key={`${item.source}-${item.id}`}
                                                    className="grid grid-cols-[25px_2fr_1fr_1fr_1fr] items-center gap-4 border-b py-2"
                                                >
                                                    <div>
                                                        <Checkbox
                                                            checked={
                                                                item.selected
                                                            }
                                                            onCheckedChange={() =>
                                                                togglePendingItemSelection(
                                                                    index,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div className="font-medium">
                                                        {item.name}
                                                    </div>
                                                    <div>
                                                        <Badge
                                                            variant={
                                                                item.type ===
                                                                "THREAD"
                                                                    ? "default"
                                                                    : "secondary"
                                                            }
                                                        >
                                                            {item.type ===
                                                            "THREAD"
                                                                ? "Thread"
                                                                : "Fabric"}
                                                        </Badge>
                                                    </div>
                                                    <div>
                                                        {item.quantity}{" "}
                                                        {item.unitOfMeasure}
                                                    </div>
                                                    <div className="text-muted-foreground text-sm">
                                                        {item.sourceType}
                                                    </div>
                                                </div>
                                            ))}
                                        </ScrollArea>
                                    </>
                                )}
                            </div>

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        setShowPendingItemsDialog(false)
                                    }
                                    disabled={isImporting}
                                >
                                    Close
                                </Button>
                                <Button
                                    onClick={handleImportButtonClick}
                                    disabled={
                                        !pendingItems.some(
                                            (item) => item.selected,
                                        ) || isImporting
                                    }
                                >
                                    <ImportIcon className="mr-2 h-4 w-4" />
                                    Import Selected{" "}
                                    {pendingItems.filter(
                                        (item) => item.selected,
                                    ).length > 0 &&
                                        `(${pendingItems.filter((item) => item.selected).length})`}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Import Confirmation Dialog */}
                    <AlertDialog
                        open={importDialogOpen}
                        onOpenChange={(open) => {
                            // Only allow closing if not currently importing
                            if (!open && !isImporting) {
                                setImportDialogOpen(false);
                            } else if (!open && isImporting) {
                                toast.info(
                                    "Please wait until import completes",
                                );
                            }
                        }}
                    >
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    Import Items to Inventory
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    You are about to import{" "}
                                    {selectedPendingItems.length} items to your
                                    inventory. This will create inventory
                                    records and transactions.
                                </AlertDialogDescription>
                            </AlertDialogHeader>

                            {isImporting && (
                                <div className="py-4">
                                    <Progress
                                        value={importProgress}
                                        className="w-full"
                                    />
                                    <p className="pt-2 text-center text-sm">
                                        {importProgress < 100
                                            ? "Importing items..."
                                            : "Refreshing inventory data..."}
                                    </p>
                                </div>
                            )}

                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isImporting}>
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    disabled={isImporting}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        importPendingItems(
                                            selectedPendingItems,
                                        );
                                    }}
                                >
                                    <ImportIcon className="mr-2 h-4 w-4" />
                                    Import Now
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <Tabs defaultValue="inventory" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="inventory">
                                Inventory Items
                            </TabsTrigger>
                            <TabsTrigger value="analytics">
                                Inventory Analytics
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="inventory" className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant={
                                        currentView === "all"
                                            ? "default"
                                            : "outline"
                                    }
                                    size="sm"
                                    onClick={() => setCurrentView("all")}
                                >
                                    All Items
                                </Button>
                                <Button
                                    variant={
                                        currentView === "thread_purchase"
                                            ? "default"
                                            : "outline"
                                    }
                                    size="sm"
                                    onClick={() =>
                                        setCurrentView("thread_purchase")
                                    }
                                >
                                    Thread Purchases
                                </Button>
                                <Button
                                    variant={
                                        currentView === "dyeing_process"
                                            ? "default"
                                            : "outline"
                                    }
                                    size="sm"
                                    onClick={() =>
                                        setCurrentView("dyeing_process")
                                    }
                                >
                                    Dyed Threads
                                </Button>
                                <Button
                                    variant={
                                        currentView === "fabric_production"
                                            ? "default"
                                            : "outline"
                                    }
                                    size="sm"
                                    onClick={() =>
                                        setCurrentView("fabric_production")
                                    }
                                >
                                    Fabric Production
                                </Button>
                                <Button
                                    variant={
                                        currentView === "manual_entry"
                                            ? "default"
                                            : "outline"
                                    }
                                    size="sm"
                                    onClick={() =>
                                        setCurrentView("manual_entry")
                                    }
                                >
                                    Manual Entries
                                </Button>
                            </div>

                            <Separator />

                            {currentView === "all" && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            All Inventory Items
                                        </CardTitle>
                                        <CardDescription>
                                            Complete list of all items in
                                            inventory
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <DataTable
                                            columns={columns}
                                            data={inventoryItems}
                                            isLoading={isLoading}
                                        />
                                    </CardContent>
                                    {!isLoading &&
                                        inventoryItems.length === 0 && (
                                            <CardFooter className="justify-center border-t py-4">
                                                <div className="flex flex-col items-center space-y-2">
                                                    <p className="text-muted-foreground">
                                                        No inventory items found
                                                    </p>
                                                    <p className="text-muted-foreground text-sm">
                                                        Add items to inventory
                                                        from Thread Purchases,
                                                        Dyeing Process, or
                                                        Fabric Production
                                                    </p>
                                                    {pendingItems.length >
                                                        0 && (
                                                        <Button
                                                            onClick={() =>
                                                                setShowPendingItemsDialog(
                                                                    true,
                                                                )
                                                            }
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            <ImportIcon className="mr-2 h-4 w-4" />
                                                            Import{" "}
                                                            {
                                                                pendingItems.length
                                                            }{" "}
                                                            Pending Items
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardFooter>
                                        )}
                                </Card>
                            )}

                            {currentView === "thread_purchase" && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            Thread Purchase Inventory
                                        </CardTitle>
                                        <CardDescription>
                                            Raw threads added directly from
                                            purchase orders
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <DataTable
                                            columns={columns}
                                            data={getItemsBySource(
                                                "thread_purchase",
                                            )}
                                            isLoading={isLoading}
                                        />
                                    </CardContent>
                                </Card>
                            )}

                            {currentView === "dyeing_process" && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            Dyed Thread Inventory
                                        </CardTitle>
                                        <CardDescription>
                                            Threads that have been processed
                                            through dyeing
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <DataTable
                                            columns={columns}
                                            data={getItemsBySource(
                                                "dyeing_process",
                                            )}
                                            isLoading={isLoading}
                                        />
                                    </CardContent>
                                </Card>
                            )}

                            {currentView === "fabric_production" && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            Fabric Production Inventory
                                        </CardTitle>
                                        <CardDescription>
                                            Fabrics manufactured from threads
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <DataTable
                                            columns={columns}
                                            data={getItemsBySource(
                                                "fabric_production",
                                            )}
                                            isLoading={isLoading}
                                        />
                                    </CardContent>
                                </Card>
                            )}

                            {currentView === "manual_entry" && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            Manual Inventory Entries
                                        </CardTitle>
                                        <CardDescription>
                                            Items added manually to inventory
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <DataTable
                                            columns={columns}
                                            data={getItemsBySource(
                                                "manual_entry",
                                            )}
                                            isLoading={isLoading}
                                        />
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="analytics" className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                {/* Total Items Card */}
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            Total Inventory Items
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {isLoading ? (
                                            <Skeleton className="h-7 w-24" />
                                        ) : (
                                            <div className="text-2xl font-bold">
                                                {inventoryStats.totalItems}
                                            </div>
                                        )}
                                        <p className="text-muted-foreground text-xs">
                                            {isLoading ? (
                                                <Skeleton className="mt-1 h-4 w-36" />
                                            ) : (
                                                `${inventoryStats.totalThreads} threads, ${inventoryStats.totalFabrics} fabrics`
                                            )}
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* Stock Status Card */}
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            Stock Status
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {isLoading ? (
                                            <Skeleton className="h-7 w-24" />
                                        ) : (
                                            <div className="text-2xl font-bold text-amber-500">
                                                {inventoryStats.lowStockItems}
                                            </div>
                                        )}
                                        <p className="text-muted-foreground text-xs">
                                            {isLoading ? (
                                                <Skeleton className="mt-1 h-4 w-36" />
                                            ) : (
                                                `Low stock items (${inventoryStats.outOfStockItems} out of stock)`
                                            )}
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* Total Value Card */}
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            Total Inventory Value
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {isLoading ? (
                                            <Skeleton className="h-7 w-24" />
                                        ) : (
                                            <div className="text-2xl font-bold">
                                                {formatCurrency(
                                                    inventoryStats.totalValue,
                                                )}
                                            </div>
                                        )}
                                        <p className="text-muted-foreground text-xs">
                                            Based on current cost per unit
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Inventory Actions</CardTitle>
                                        <CardDescription>
                                            Quick tools for inventory management
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <Button
                                                variant="outline"
                                                className="w-full justify-start"
                                                onClick={() =>
                                                    inventoryService.exportInventoryToCSV()
                                                }
                                            >
                                                <DownloadCloud className="mr-2 h-4 w-4" />
                                                Export Inventory Report
                                            </Button>

                                            {pendingItems.length > 0 && (
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-start"
                                                    onClick={() =>
                                                        setShowPendingItemsDialog(
                                                            true,
                                                        )
                                                    }
                                                >
                                                    <ImportIcon className="mr-2 h-4 w-4" />
                                                    Import Pending Items (
                                                    {pendingItems.length})
                                                </Button>
                                            )}

                                            <Button
                                                variant="outline"
                                                className="w-full justify-start"
                                                disabled
                                            >
                                                <UploadCloud className="mr-2 h-4 w-4" />
                                                Import Inventory Data
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            Inventory Insights
                                        </CardTitle>
                                        <CardDescription>
                                            Key metrics and trends
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm">
                                                Thread inventory utilization:
                                            </span>
                                            <span className="font-medium">
                                                {inventoryStats.totalThreads > 0
                                                    ? Math.round(
                                                          ((inventoryStats.totalThreads -
                                                              inventoryStats.outOfStockItems) /
                                                              inventoryStats.totalThreads) *
                                                              100,
                                                      )
                                                    : 0}
                                                %
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">
                                                Fabric inventory utilization:
                                            </span>
                                            <span className="font-medium">
                                                {inventoryStats.totalFabrics > 0
                                                    ? Math.round(
                                                          ((inventoryStats.totalFabrics -
                                                              inventoryStats.outOfStockItems /
                                                                  2) /
                                                              inventoryStats.totalFabrics) *
                                                              100,
                                                      )
                                                    : 0}
                                                %
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">
                                                Low stock percentage:
                                            </span>
                                            <span className="font-medium">
                                                {inventoryStats.totalItems > 0
                                                    ? Math.round(
                                                          (inventoryStats.lowStockItems /
                                                              inventoryStats.totalItems) *
                                                              100,
                                                      )
                                                    : 0}
                                                %
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">
                                                Items requiring restock:
                                            </span>
                                            <span className="font-medium">
                                                {inventoryStats.lowStockItems +
                                                    inventoryStats.outOfStockItems}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">
                                                Average item value:
                                            </span>
                                            <span className="font-medium">
                                                {inventoryStats.totalItems > 0
                                                    ? formatCurrency(
                                                          inventoryStats.totalValue /
                                                              inventoryStats.totalItems,
                                                      )
                                                    : formatCurrency(0)}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Source Distribution */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Inventory by Source</CardTitle>
                                    <CardDescription>
                                        Distribution of inventory items by
                                        source
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <h3 className="mb-2 text-sm font-medium">
                                                    Thread Purchase Items
                                                </h3>
                                                {isLoading ? (
                                                    <Skeleton className="h-7 w-16" />
                                                ) : (
                                                    <div className="text-2xl font-bold">
                                                        {
                                                            getItemsBySource(
                                                                "thread_purchase",
                                                            ).length
                                                        }
                                                    </div>
                                                )}
                                                <p className="text-muted-foreground text-xs">
                                                    {inventoryItems.length
                                                        ? (
                                                              (getItemsBySource(
                                                                  "thread_purchase",
                                                              ).length /
                                                                  inventoryItems.length) *
                                                              100
                                                          ).toFixed(1)
                                                        : "0"}
                                                    % of total inventory
                                                </p>
                                            </div>
                                            <div>
                                                <h3 className="mb-2 text-sm font-medium">
                                                    Dyed Thread Items
                                                </h3>
                                                {isLoading ? (
                                                    <Skeleton className="h-7 w-16" />
                                                ) : (
                                                    <div className="text-2xl font-bold">
                                                        {
                                                            getItemsBySource(
                                                                "dyeing_process",
                                                            ).length
                                                        }
                                                    </div>
                                                )}
                                                <p className="text-muted-foreground text-xs">
                                                    {inventoryItems.length
                                                        ? (
                                                              (getItemsBySource(
                                                                  "dyeing_process",
                                                              ).length /
                                                                  inventoryItems.length) *
                                                              100
                                                          ).toFixed(1)
                                                        : "0"}
                                                    % of total inventory
                                                </p>
                                            </div>
                                            <div>
                                                <h3 className="mb-2 text-sm font-medium">
                                                    Fabric Production Items
                                                </h3>
                                                {isLoading ? (
                                                    <Skeleton className="h-7 w-16" />
                                                ) : (
                                                    <div className="text-2xl font-bold">
                                                        {
                                                            getItemsBySource(
                                                                "fabric_production",
                                                            ).length
                                                        }
                                                    </div>
                                                )}
                                                <p className="text-muted-foreground text-xs">
                                                    {inventoryItems.length
                                                        ? (
                                                              (getItemsBySource(
                                                                  "fabric_production",
                                                              ).length /
                                                                  inventoryItems.length) *
                                                              100
                                                          ).toFixed(1)
                                                        : "0"}
                                                    % of total inventory
                                                </p>
                                            </div>
                                            <div>
                                                <h3 className="mb-2 text-sm font-medium">
                                                    Manual Entry Items
                                                </h3>
                                                {isLoading ? (
                                                    <Skeleton className="h-7 w-16" />
                                                ) : (
                                                    <div className="text-2xl font-bold">
                                                        {
                                                            getItemsBySource(
                                                                "manual_entry",
                                                            ).length
                                                        }
                                                    </div>
                                                )}
                                                <p className="text-muted-foreground text-xs">
                                                    {inventoryItems.length
                                                        ? (
                                                              (getItemsBySource(
                                                                  "manual_entry",
                                                              ).length /
                                                                  inventoryItems.length) *
                                                              100
                                                          ).toFixed(1)
                                                        : "0"}
                                                    % of total inventory
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Pending Items Overview */}
                            {pendingItems.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Pending Items</CardTitle>
                                        <CardDescription>
                                            Items from production that can be
                                            added to inventory
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <h3 className="mb-2 text-sm font-medium">
                                                        Thread Purchases
                                                    </h3>
                                                    <div className="text-2xl font-bold">
                                                        {
                                                            pendingItems.filter(
                                                                (item) =>
                                                                    item.source ===
                                                                    "thread_purchase",
                                                            ).length
                                                        }
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 className="mb-2 text-sm font-medium">
                                                        Dyed Threads
                                                    </h3>
                                                    <div className="text-2xl font-bold">
                                                        {
                                                            pendingItems.filter(
                                                                (item) =>
                                                                    item.source ===
                                                                    "dyeing_process",
                                                            ).length
                                                        }
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 className="mb-2 text-sm font-medium">
                                                        Fabric Productions
                                                    </h3>
                                                    <div className="text-2xl font-bold">
                                                        {
                                                            pendingItems.filter(
                                                                (item) =>
                                                                    item.source ===
                                                                    "fabric_production",
                                                            ).length
                                                        }
                                                    </div>
                                                </div>
                                            </div>

                                            <Button
                                                onClick={() =>
                                                    setShowPendingItemsDialog(
                                                        true,
                                                    )
                                                }
                                                className="w-full"
                                            >
                                                <ImportIcon className="mr-2 h-4 w-4" />
                                                Import Pending Items
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </InventoryContext.Provider>
    );
}

// Export the component wrapped in Suspense
export default function InventoryPage() {
    return (
        <Suspense
            fallback={
                <div className="p-8">
                    <Skeleton className="h-[500px] w-full" />
                </div>
            }
        >
            <InventoryContent />
        </Suspense>
    );
}
