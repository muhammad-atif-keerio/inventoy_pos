"use client";

import React, { useContext, useState } from "react";

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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { inventoryService } from "@/app/(dashboard)/inventory/api-service";
import { InventoryItem } from "@/app/(dashboard)/inventory/columns";
import { InventoryContext } from "@/app/(dashboard)/inventory/inventory-context";

interface DeleteInventoryDialogProps {
    inventoryItem: InventoryItem;
    trigger: React.ReactNode;
}

export function DeleteInventoryDialog({
    inventoryItem,
    trigger,
}: DeleteInventoryDialogProps) {
    const [open, setOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { addOptimisticAction, refreshInventory } =
        useContext(InventoryContext);

    async function handleDelete() {
        setIsDeleting(true);
        try {
            // Apply optimistic update
            addOptimisticAction({
                type: "delete",
                item: { id: inventoryItem.id },
            });

            // Delete the inventory item
            await inventoryService.deleteInventoryItem(inventoryItem.id);

            toast.success("Inventory item deleted successfully");
            setOpen(false);

            // Refresh inventory data
            await refreshInventory();
        } catch (error) {
            console.error("Failed to delete inventory item:", error);
            toast.error("Failed to delete inventory item");

            // Refresh inventory to revert optimistic update
            await refreshInventory();
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the inventory item{" "}
                        <strong>{inventoryItem.itemCode}</strong>:{" "}
                        {inventoryItem.description}.
                        <br />
                        <br />
                        This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleDelete();
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isDeleting}
                    >
                        {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
