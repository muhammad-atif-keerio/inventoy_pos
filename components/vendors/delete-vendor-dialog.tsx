"use client";

import * as React from "react";

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import { VendorItem } from "@/app/(dashboard)/vendors/columns";
import { VendorContext } from "@/app/(dashboard)/vendors/vendor-context";

interface DeleteVendorDialogProps {
    vendor: VendorItem;
    trigger: React.ReactNode;
}

export function DeleteVendorDialog({
    vendor,
    trigger,
}: DeleteVendorDialogProps) {
    const [open, setOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const vendorContext = React.useContext(VendorContext);

    const handleDelete = async () => {
        setIsSubmitting(true);

        const toastId = toast.loading("Deleting vendor...");

        try {
            // Check if the vendor has active orders
            if (vendor.activeOrders && vendor.activeOrders > 0) {
                toast.error("Cannot delete vendor with active orders", {
                    id: toastId,
                    description:
                        "Please complete or cancel all active orders first.",
                });
                setOpen(false);
                return;
            }

            // Call API to delete the vendor
            const response = await fetch(`/api/vendors/${vendor.id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to delete vendor");
            }

            // Apply optimistic update
            vendorContext.addOptimisticAction({
                type: "delete",
                id: vendor.id,
            });

            // Success toast notification
            toast.success("Vendor deleted successfully", {
                id: toastId,
                description: `${vendor.name} has been removed from your vendors list.`,
            });

            // Close dialog
            setOpen(false);

            // Refresh vendor data
            await vendorContext.refreshVendors();
        } catch (error) {
            console.error("Error deleting vendor:", error);
            toast.error("Failed to delete vendor", {
                id: toastId,
                description:
                    error instanceof Error
                        ? error.message
                        : "An unexpected error occurred",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Check if vendor has active orders
    const hasActiveOrders = Boolean(
        vendor.activeOrders && vendor.activeOrders > 0,
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Delete Vendor
                    </DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. Please confirm if you want
                        to proceed.
                    </DialogDescription>
                </DialogHeader>

                {hasActiveOrders ? (
                    <Alert variant="destructive" className="my-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            This vendor has {vendor.activeOrders} active order
                            {vendor.activeOrders !== 1 ? "s" : ""} and cannot be
                            deleted. Please complete or cancel all active orders
                            first.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <Alert className="my-4">
                        <AlertDescription>
                            This will permanently delete the vendor record and
                            remove it from your system.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="space-y-4 py-2">
                    <div className="bg-muted/50 rounded-md border p-3">
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-1">
                                <div className="text-muted-foreground text-sm">
                                    Name:
                                </div>
                                <div className="col-span-2 font-medium">
                                    {vendor.name}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                                <div className="text-muted-foreground text-sm">
                                    Contact:
                                </div>
                                <div className="col-span-2">
                                    {vendor.contact}
                                </div>
                            </div>
                            {vendor.email && (
                                <div className="grid grid-cols-3 gap-1">
                                    <div className="text-muted-foreground text-sm">
                                        Email:
                                    </div>
                                    <div className="col-span-2">
                                        {vendor.email}
                                    </div>
                                </div>
                            )}
                            {vendor.city && (
                                <div className="grid grid-cols-3 gap-1">
                                    <div className="text-muted-foreground text-sm">
                                        City:
                                    </div>
                                    <div className="col-span-2">
                                        {vendor.city}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <Separator />

                <DialogFooter className="pt-4">
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isSubmitting || hasActiveOrders}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Vendor
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
