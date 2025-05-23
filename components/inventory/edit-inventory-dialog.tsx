"use client";

import React, { useContext, useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { ProductType } from "@prisma/client";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { inventoryService } from "@/app/(dashboard)/inventory/api-service";
import {
    FabricType,
    InventoryItem,
    ThreadType,
} from "@/app/(dashboard)/inventory/interface";
import { InventoryContext } from "@/app/(dashboard)/inventory/inventory-context";

// Define units of measure
const unitOptions = [
    { label: "Meters", value: "meters" },
    { label: "Kilograms", value: "kg" },
    { label: "Yards", value: "yards" },
    { label: "Pieces", value: "pcs" },
    { label: "Liters", value: "liters" },
    { label: "Rolls", value: "rolls" },
    { label: "Boxes", value: "boxes" },
];

// Define locations
const locationOptions = [
    { label: "Main Warehouse", value: "Main Warehouse" },
    { label: "Fabric Warehouse", value: "Fabric Warehouse" },
    { label: "Thread Storage", value: "Thread Storage" },
    { label: "Shop Floor", value: "Shop Floor" },
    { label: "Production Area", value: "Production Area" },
];

// Define the schema for editing inventory
const editInventorySchema = z.object({
    itemCode: z.string().min(3, "Item code must be at least 3 characters"),
    description: z.string().min(3, "Description must be at least 3 characters"),
    productType: z.nativeEnum(ProductType),
    threadTypeId: z.number().optional().nullable(),
    fabricTypeId: z.number().optional().nullable(),
    currentQuantity: z.coerce.number().min(0, "Quantity cannot be negative"),
    unitOfMeasure: z.string().min(1, "Unit of measure is required"),
    location: z.string().optional().nullable(),
    minStockLevel: z.coerce
        .number()
        .min(0, "Minimum stock level cannot be negative"),
    costPerUnit: z.coerce.number().min(0, "Cost per unit cannot be negative"),
    salePrice: z.coerce.number().min(0, "Sale price cannot be negative"),
    notes: z.string().optional().nullable(),
});

type EditInventorySchema = z.infer<typeof editInventorySchema>;

interface EditInventoryDialogProps {
    inventoryItem: InventoryItem;
    trigger: React.ReactNode;
}

export function EditInventoryDialog({
    inventoryItem,
    trigger,
}: EditInventoryDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [threadTypes, setThreadTypes] = useState<ThreadType[]>([]);
    const [fabricTypes, setFabricTypes] = useState<FabricType[]>([]);
    const { addOptimisticAction, refreshInventory } =
        useContext(InventoryContext);

    useEffect(() => {
        // Load thread and fabric types when dialog opens
        if (open) {
            const loadTypes = async () => {
                try {
                    const [threads, fabrics] = await Promise.all([
                        inventoryService.getThreadTypes(),
                        inventoryService.getFabricTypes(),
                    ]);
                    setThreadTypes(threads);
                    setFabricTypes(fabrics);
                } catch (error) {
                    console.error(
                        "Failed to load thread or fabric types:",
                        error,
                    );
                    toast.error("Failed to load type options");
                }
            };

            loadTypes();
        }
    }, [open]);

    const form = useForm<EditInventorySchema>({
        resolver: zodResolver(editInventorySchema),
        defaultValues: {
            itemCode: inventoryItem.itemCode,
            description: inventoryItem.description,
            productType: inventoryItem.productType,
            threadTypeId: inventoryItem.threadTypeId || null,
            fabricTypeId: inventoryItem.fabricTypeId || null,
            currentQuantity: inventoryItem.currentQuantity,
            unitOfMeasure: inventoryItem.unitOfMeasure,
            location: inventoryItem.location || null,
            minStockLevel: inventoryItem.minStockLevel,
            costPerUnit: inventoryItem.costPerUnit,
            salePrice: inventoryItem.salePrice,
            notes: inventoryItem.notes || null,
        },
    });

    // Watch product type to conditionally show thread/fabric type fields
    const watchProductType = form.watch("productType");

    async function onSubmit(data: EditInventorySchema) {
        setIsSubmitting(true);
        try {
            // Apply optimistic update
            addOptimisticAction({
                type: "update",
                item: {
                    id: inventoryItem.id,
                    ...data,
                },
            });

            // Update the inventory item in the database
            await inventoryService.updateInventoryItem(inventoryItem.id, data);

            toast.success("Inventory item updated successfully");
            setOpen(false);

            // Refresh inventory data
            await refreshInventory();
        } catch (error) {
            console.error("Failed to update inventory item:", error);
            toast.error("Failed to update inventory item");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Edit Inventory Item</DialogTitle>
                    <DialogDescription>
                        Update information for {inventoryItem.itemCode} -{" "}
                        {inventoryItem.description}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4 py-4"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="itemCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Item Code</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="productType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Product Type</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select product type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="THREAD">
                                                    Thread
                                                </SelectItem>
                                                <SelectItem value="FABRIC">
                                                    Fabric
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {watchProductType === "THREAD" && (
                            <FormField
                                control={form.control}
                                name="threadTypeId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Thread Type</FormLabel>
                                        <Select
                                            onValueChange={(value) =>
                                                field.onChange(parseInt(value))
                                            }
                                            value={
                                                field.value?.toString() || ""
                                            }
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select thread type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {threadTypes.map((type) => (
                                                    <SelectItem
                                                        key={type.id}
                                                        value={type.id.toString()}
                                                    >
                                                        {type.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {watchProductType === "FABRIC" && (
                            <FormField
                                control={form.control}
                                name="fabricTypeId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fabric Type</FormLabel>
                                        <Select
                                            onValueChange={(value) =>
                                                field.onChange(parseInt(value))
                                            }
                                            value={
                                                field.value?.toString() || ""
                                            }
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select fabric type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {fabricTypes.map((type) => (
                                                    <SelectItem
                                                        key={type.id}
                                                        value={type.id.toString()}
                                                    >
                                                        {type.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="currentQuantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Current Quantity</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="unitOfMeasure"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Unit of Measure</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select unit" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {unitOptions.map((unit) => (
                                                    <SelectItem
                                                        key={unit.value}
                                                        value={unit.value}
                                                    >
                                                        {unit.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="location"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Location</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={
                                                field.value || undefined
                                            }
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select location" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {locationOptions.map(
                                                    (location) => (
                                                        <SelectItem
                                                            key={location.value}
                                                            value={
                                                                location.value
                                                            }
                                                        >
                                                            {location.label}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="minStockLevel"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Minimum Stock Level
                                        </FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="costPerUnit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cost Per Unit</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="salePrice"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sale Price</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            value={field.value || ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Updating..." : "Update Item"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
