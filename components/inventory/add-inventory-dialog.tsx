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
import { InventoryItem } from "@/app/(dashboard)/inventory/interface";
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

// Define the schema for adding inventory
const addInventorySchema = z.object({
    itemCode: z.string().min(3, "Item code must be at least 3 characters"),
    description: z.string().min(3, "Description must be at least 3 characters"),
    productType: z.nativeEnum(ProductType),
    threadTypeId: z.number().optional().nullable(),
    fabricTypeId: z.number().optional().nullable(),
    threadTypeName: z.string().optional(),
    fabricTypeName: z.string().optional(),
    createMissingType: z.boolean().default(false),
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

// Define the props interface
interface AddInventoryDialogProps {
    trigger: React.ReactNode;
}

export function AddInventoryDialog({ trigger }: AddInventoryDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [threadTypes, setThreadTypes] = useState<
        { id: number; name: string }[]
    >([]);
    const [fabricTypes, setFabricTypes] = useState<
        { id: number; name: string }[]
    >([]);
    const { refreshInventory } = useContext(InventoryContext);

    // Initialize form with react-hook-form
    const form = useForm({
        resolver: zodResolver(addInventorySchema),
        defaultValues: {
            itemCode: "",
            description: "",
            productType: ProductType.THREAD,
            threadTypeId: null,
            fabricTypeId: null,
            threadTypeName: "",
            fabricTypeName: "",
            createMissingType: false,
            currentQuantity: 0,
            unitOfMeasure: "meters",
            location: "Main Warehouse",
            minStockLevel: 5,
            costPerUnit: 0,
            salePrice: 0,
            notes: "",
        },
    });

    // Watch product type to conditionally show thread/fabric type fields
    const watchProductType = form.watch("productType");
    const watchCreateMissingType = form.watch("createMissingType");

    // Fetch thread and fabric types when dialog opens
    useEffect(() => {
        if (open) {
            const loadTypes = async () => {
                try {
                    const [threadTypesData, fabricTypesData] =
                        await Promise.all([
                            inventoryService.getThreadTypes(),
                            inventoryService.getFabricTypes(),
                        ]);

                    setThreadTypes(threadTypesData);
                    setFabricTypes(fabricTypesData);
                } catch (error) {
                    console.error("Failed to load types:", error);
                    toast.error("Failed to load item types");
                }
            };

            loadTypes();
        }
    }, [open]);

    // Generate a unique item code when dialog opens
    useEffect(() => {
        if (open) {
            // Generate a unique inventory code
            const generateCode = () => {
                const prefix = "INV";
                const timestamp = Date.now().toString().slice(-6);
                const random = Math.floor(Math.random() * 1000)
                    .toString()
                    .padStart(3, "0");
                return `${prefix}-${timestamp}-${random}`;
            };

            form.setValue("itemCode", generateCode());
        }
    }, [open, form]);

    // Handle form submission
    async function onSubmit(
        data: Partial<InventoryItem> & {
            threadTypeName?: string;
            fabricTypeName?: string;
            createMissingType?: boolean;
            referenceId?: number;
            transactionNotes?: string;
        },
    ) {
        setIsSubmitting(true);
        try {
            // Create new type if needed
            if (
                data.productType === "THREAD" &&
                data.createMissingType &&
                data.threadTypeName
            ) {
                try {
                    const newType = await inventoryService.createThreadType({
                        name: data.threadTypeName,
                        units: data.unitOfMeasure,
                    });

                    // Set the new type ID
                    data.threadTypeId = newType.id;
                    toast.success(
                        `Created new thread type: ${data.threadTypeName}`,
                    );
                } catch (error) {
                    console.error("Failed to create thread type:", error);
                    toast.error("Failed to create thread type");
                    setIsSubmitting(false);
                    return;
                }
            } else if (
                data.productType === "FABRIC" &&
                data.createMissingType &&
                data.fabricTypeName
            ) {
                try {
                    const newType = await inventoryService.createFabricType({
                        name: data.fabricTypeName,
                        units: data.unitOfMeasure,
                    });

                    // Set the new type ID
                    data.fabricTypeId = newType.id;
                    toast.success(
                        `Created new fabric type: ${data.fabricTypeName}`,
                    );
                } catch (error) {
                    console.error("Failed to create fabric type:", error);
                    toast.error("Failed to create fabric type");
                    setIsSubmitting(false);
                    return;
                }
            }

            // Create inventory item
            const newItem = await inventoryService.createInventoryItem(data);

            if (newItem) {
                toast.success("Inventory item added successfully");
                form.reset();
                setOpen(false);
                refreshInventory();
            } else {
                toast.error("Failed to add inventory item");
            }
        } catch (error) {
            console.error("Failed to add inventory item:", error);
            toast.error("Failed to add inventory item");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Add New Inventory Item</DialogTitle>
                    <DialogDescription>
                        Add a new item to your inventory system.
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

                        <FormField
                            control={form.control}
                            name="createMissingType"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                                    <FormControl>
                                        <input
                                            type="checkbox"
                                            checked={field.value}
                                            onChange={field.onChange}
                                            className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Create new type</FormLabel>
                                        <p className="text-muted-foreground text-sm">
                                            Enable to create a new thread or
                                            fabric type
                                        </p>
                                    </div>
                                </FormItem>
                            )}
                        />

                        {watchProductType === "THREAD" &&
                            !watchCreateMissingType && (
                                <FormField
                                    control={form.control}
                                    name="threadTypeId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Thread Type</FormLabel>
                                            <Select
                                                onValueChange={(value) =>
                                                    field.onChange(
                                                        parseInt(value),
                                                    )
                                                }
                                                value={
                                                    field.value?.toString() ||
                                                    ""
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

                        {watchProductType === "THREAD" &&
                            watchCreateMissingType && (
                                <FormField
                                    control={form.control}
                                    name="threadTypeName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                New Thread Type Name
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="Enter new thread type name"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                        {watchProductType === "FABRIC" &&
                            !watchCreateMissingType && (
                                <FormField
                                    control={form.control}
                                    name="fabricTypeId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Fabric Type</FormLabel>
                                            <Select
                                                onValueChange={(value) =>
                                                    field.onChange(
                                                        parseInt(value),
                                                    )
                                                }
                                                value={
                                                    field.value?.toString() ||
                                                    ""
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

                        {watchProductType === "FABRIC" &&
                            watchCreateMissingType && (
                                <FormField
                                    control={form.control}
                                    name="fabricTypeName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                New Fabric Type Name
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="Enter new fabric type name"
                                                />
                                            </FormControl>
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
                                {isSubmitting ? "Adding..." : "Add Item"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
