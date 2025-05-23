"use client";

import React, { useContext, useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { inventoryService } from "./api-service";
import { DyeingProcess, FabricProduction, ThreadPurchase } from "./interface";
import { InventoryContext } from "./inventory-context";

// Define thread types and fabric types as options
type TypeOption = {
    id?: number;
    name: string;
    description?: string;
    units?: string;
};

// Inventory item schema for validation
const inventorySchema = z
    .object({
        itemCode: z.string().min(3, "Item code must be at least 3 characters"),
        description: z.string().min(3, "Description is required"),
        productType: z.enum(["THREAD", "FABRIC"]),
        threadTypeId: z.number().optional(),
        fabricTypeId: z.number().optional(),
        threadTypeName: z.string().optional(),
        fabricTypeName: z.string().optional(),
        currentQuantity: z.coerce
            .number()
            .min(0, "Quantity must be a positive number"),
        unitOfMeasure: z.string().min(1, "Unit of measure is required"),
        location: z.string().optional(),
        minStockLevel: z.coerce
            .number()
            .min(0, "Min stock must be a positive number"),
        costPerUnit: z.coerce.number().min(0, "Cost must be a positive number"),
        salePrice: z.coerce.number().min(0, "Price must be a positive number"),
        notes: z.string().optional(),
        color: z.string().optional(),
        dimensions: z.string().optional(),
        createMissingType: z.boolean(),
        sourceType: z
            .enum(["MANUAL", "THREAD_PURCHASE", "DYEING", "FABRIC_PRODUCTION"])
            .optional(),
        threadPurchaseId: z.number().optional(),
        dyeingProcessId: z.number().optional(),
        fabricProductionId: z.number().optional(),
    })
    .refine(
        (data) => {
            // If product type is THREAD, either threadTypeId or threadTypeName must be provided
            if (data.productType === "THREAD") {
                return (
                    data.threadTypeId !== undefined ||
                    (data.threadTypeName && data.threadTypeName.length > 0)
                );
            }
            // If product type is FABRIC, either fabricTypeId or fabricTypeName must be provided
            if (data.productType === "FABRIC") {
                return (
                    data.fabricTypeId !== undefined ||
                    (data.fabricTypeName && data.fabricTypeName.length > 0)
                );
            }
            return false;
        },
        {
            message: "You must select or specify a type",
            path: ["threadTypeId"],
        },
    );

type InventoryFormValues = z.infer<typeof inventorySchema>;

interface AddInventoryDialogProps {
    trigger: React.ReactNode;
}

export function AddInventoryDialog({ trigger }: AddInventoryDialogProps) {
    const { refreshInventory } = useContext(InventoryContext);
    const [isOpen, setIsOpen] = useState(false);
    const [threadTypes, setThreadTypes] = useState<TypeOption[]>([]);
    const [fabricTypes, setFabricTypes] = useState<TypeOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [availableThreadPurchases, setAvailableThreadPurchases] = useState<
        ThreadPurchase[]
    >([]);
    const [availableDyedThreads, setAvailableDyedThreads] = useState<
        DyeingProcess[]
    >([]);
    const [availableFabricProductions, setAvailableFabricProductions] =
        useState<FabricProduction[]>([]);

    // Initialize form with default values
    const form = useForm<InventoryFormValues>({
        resolver: zodResolver(inventorySchema),
        defaultValues: {
            productType: "THREAD",
            itemCode: "",
            description: "",
            currentQuantity: 0,
            unitOfMeasure: "meters",
            location: "Warehouse",
            minStockLevel: 100,
            costPerUnit: 0,
            salePrice: 0,
            createMissingType: true,
            notes: "",
            sourceType: "MANUAL",
        },
    });

    // Get current values for conditional fields
    const productType = form.watch("productType");
    const costPerUnit = form.watch("costPerUnit");
    const sourceType = form.watch("sourceType");

    // Auto-calculate sale price (20% markup) when cost changes
    useEffect(() => {
        if (costPerUnit > 0) {
            const suggestedSalePrice =
                Math.round(costPerUnit * 1.2 * 100) / 100;
            form.setValue("salePrice", suggestedSalePrice);
        }
    }, [costPerUnit, form]);

    // Fetch thread and fabric types when dialog opens
    useEffect(() => {
        const fetchTypeOptions = async () => {
            try {
                // Fetch thread and fabric types from the API
                const threadTypesData = await inventoryService.getThreadTypes();
                const fabricTypesData = await inventoryService.getFabricTypes();

                setThreadTypes(threadTypesData || []);
                setFabricTypes(fabricTypesData || []);

                // Also fetch available sources
                const threadPurchases =
                    await inventoryService.getAvailableThreadPurchases();
                const dyedThreads =
                    await inventoryService.getAvailableDyedThreads();
                const fabricProductions =
                    await inventoryService.getAvailableFabricProductions();

                setAvailableThreadPurchases(threadPurchases || []);
                setAvailableDyedThreads(dyedThreads || []);
                setAvailableFabricProductions(fabricProductions || []);
            } catch (error) {
                console.error("Failed to fetch options:", error);
                toast.error("Failed to load inventory options");
            }
        };

        if (isOpen) {
            fetchTypeOptions();
        }
    }, [isOpen]);

    // Update form values based on source selection
    useEffect(() => {
        if (sourceType === "MANUAL") return;

        // When a source is selected, prefill relevant fields
        if (
            sourceType === "THREAD_PURCHASE" &&
            form.getValues("threadPurchaseId")
        ) {
            const selectedPurchase = availableThreadPurchases.find(
                (p) => p.id === form.getValues("threadPurchaseId"),
            );

            if (selectedPurchase) {
                form.setValue("productType", "THREAD");
                form.setValue(
                    "description",
                    `${selectedPurchase.threadType} - ${selectedPurchase.colorStatus} - From ${selectedPurchase.vendor?.name || "Unknown Vendor"}`,
                );
                form.setValue("currentQuantity", selectedPurchase.quantity);
                form.setValue("unitOfMeasure", selectedPurchase.unitOfMeasure);
                form.setValue("costPerUnit", selectedPurchase.unitPrice);
                form.setValue("color", selectedPurchase.color || "");
                form.setValue("itemCode", `TP-${selectedPurchase.id}`);

                // Auto-set thread type
                const threadType = threadTypes.find(
                    (t) => t.name === selectedPurchase.threadType,
                );
                if (threadType) {
                    form.setValue("threadTypeId", threadType.id);
                } else {
                    form.setValue(
                        "threadTypeName",
                        selectedPurchase.threadType,
                    );
                }
            }
        }

        if (sourceType === "DYEING" && form.getValues("dyeingProcessId")) {
            const selectedDyeing = availableDyedThreads.find(
                (d) => d.id === form.getValues("dyeingProcessId"),
            );

            if (selectedDyeing) {
                form.setValue("productType", "THREAD");
                form.setValue(
                    "description",
                    `Dyed Thread - ${selectedDyeing.colorName || selectedDyeing.colorCode || "No color name"} - ${selectedDyeing.resultStatus}`,
                );
                form.setValue("currentQuantity", selectedDyeing.outputQuantity);
                form.setValue("unitOfMeasure", "meters"); // Default for dyed thread
                if (selectedDyeing.totalCost && selectedDyeing.outputQuantity) {
                    form.setValue(
                        "costPerUnit",
                        selectedDyeing.totalCost /
                            selectedDyeing.outputQuantity,
                    );
                }
                form.setValue(
                    "color",
                    selectedDyeing.colorName || selectedDyeing.colorCode || "",
                );
                form.setValue("itemCode", `DT-${selectedDyeing.id}`);

                // Use the thread type from purchase
                if (selectedDyeing.threadPurchase?.threadType) {
                    const threadType = threadTypes.find(
                        (t) =>
                            t.name ===
                            selectedDyeing.threadPurchase?.threadType,
                    );
                    if (threadType) {
                        form.setValue("threadTypeId", threadType.id);
                    } else {
                        form.setValue(
                            "threadTypeName",
                            selectedDyeing.threadPurchase.threadType,
                        );
                    }
                }
            }
        }

        if (
            sourceType === "FABRIC_PRODUCTION" &&
            form.getValues("fabricProductionId")
        ) {
            const selectedProduction = availableFabricProductions.find(
                (f) => f.id === form.getValues("fabricProductionId"),
            );

            if (selectedProduction) {
                form.setValue("productType", "FABRIC");
                form.setValue(
                    "description",
                    `${selectedProduction.fabricType} - Batch ${selectedProduction.batchNumber} - ${selectedProduction.status}`,
                );
                form.setValue(
                    "currentQuantity",
                    selectedProduction.quantityProduced,
                );
                form.setValue(
                    "unitOfMeasure",
                    selectedProduction.unitOfMeasure,
                );
                form.setValue(
                    "costPerUnit",
                    selectedProduction.totalCost /
                        selectedProduction.quantityProduced,
                );
                form.setValue("dimensions", selectedProduction.dimensions);
                form.setValue("itemCode", `FP-${selectedProduction.id}`);

                // Auto-set fabric type
                const fabricType = fabricTypes.find(
                    (t) => t.name === selectedProduction.fabricType,
                );
                if (fabricType) {
                    form.setValue("fabricTypeId", fabricType.id);
                } else {
                    form.setValue(
                        "fabricTypeName",
                        selectedProduction.fabricType,
                    );
                }
            }
        }
    }, [
        sourceType,
        form,
        availableThreadPurchases,
        availableDyedThreads,
        availableFabricProductions,
        threadTypes,
        fabricTypes,
    ]);

    // Reset form when dialog closes
    useEffect(() => {
        if (!isOpen) {
            form.reset({
                productType: "THREAD",
                itemCode: "",
                description: "",
                currentQuantity: 0,
                unitOfMeasure: "meters",
                location: "Warehouse",
                minStockLevel: 100,
                costPerUnit: 0,
                salePrice: 0,
                createMissingType: true,
                notes: "",
                sourceType: "MANUAL",
            });
        }
    }, [isOpen, form]);

    // Form submission handler
    const onSubmit: SubmitHandler<InventoryFormValues> = async (data) => {
        setIsLoading(true);
        try {
            const result = await inventoryService.createInventoryItem(data);

            if (result) {
                toast.success("Inventory item created successfully");
                setIsOpen(false);
                refreshInventory();
            }
        } catch (error) {
            console.error("Failed to create inventory item:", error);
            toast.error("Failed to create inventory item");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[650px]">
                <DialogHeader>
                    <DialogTitle>Add New Inventory Item</DialogTitle>
                    <DialogDescription>
                        Create a new inventory item for thread or fabric
                        products.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6"
                    >
                        <Tabs defaultValue="general" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="general">
                                    General Information
                                </TabsTrigger>
                                <TabsTrigger value="details">
                                    Product Details
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent
                                value="general"
                                className="space-y-4 pt-4"
                            >
                                {/* Product Type Selection */}
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

                                {/* Item Code */}
                                <FormField
                                    control={form.control}
                                    name="itemCode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Item Code</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter item code"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                A unique identifier for this
                                                inventory item
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Description */}
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter item description"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Thread Type Selection (only shown when product type is THREAD) */}
                                {productType === "THREAD" && (
                                    <div className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="threadTypeId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Thread Type
                                                    </FormLabel>
                                                    <Select
                                                        onValueChange={(
                                                            value,
                                                        ) =>
                                                            field.onChange(
                                                                parseInt(value),
                                                            )
                                                        }
                                                        value={field.value?.toString()}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select thread type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {threadTypes.map(
                                                                (type) => (
                                                                    <SelectItem
                                                                        key={
                                                                            type.id ||
                                                                            type.name
                                                                        }
                                                                        value={
                                                                            type.id?.toString() ||
                                                                            ""
                                                                        }
                                                                    >
                                                                        {
                                                                            type.name
                                                                        }
                                                                    </SelectItem>
                                                                ),
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription>
                                                        Select an existing
                                                        thread type or create a
                                                        new one below
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Option to create a new thread type */}
                                        <div className="flex items-center space-x-2">
                                            <FormField
                                                control={form.control}
                                                name="createMissingType"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={
                                                                    field.value
                                                                }
                                                                onCheckedChange={
                                                                    field.onChange
                                                                }
                                                            />
                                                        </FormControl>
                                                        <div className="space-y-1 leading-none">
                                                            <FormLabel>
                                                                Create new
                                                                thread type
                                                            </FormLabel>
                                                            <FormDescription>
                                                                Create a new
                                                                thread type if
                                                                not found in the
                                                                list
                                                            </FormDescription>
                                                        </div>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {/* New Thread Type Name (only shown when create new type is checked) */}
                                        {form.watch("createMissingType") && (
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
                                                                placeholder="Enter new thread type name"
                                                                {...field}
                                                                value={
                                                                    field.value ||
                                                                    ""
                                                                }
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </div>
                                )}

                                {/* Fabric Type Selection (only shown when product type is FABRIC) */}
                                {productType === "FABRIC" && (
                                    <div className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="fabricTypeId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Fabric Type
                                                    </FormLabel>
                                                    <Select
                                                        onValueChange={(
                                                            value,
                                                        ) =>
                                                            field.onChange(
                                                                parseInt(value),
                                                            )
                                                        }
                                                        value={field.value?.toString()}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select fabric type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {fabricTypes.map(
                                                                (type) => (
                                                                    <SelectItem
                                                                        key={
                                                                            type.id ||
                                                                            type.name
                                                                        }
                                                                        value={
                                                                            type.id?.toString() ||
                                                                            ""
                                                                        }
                                                                    >
                                                                        {
                                                                            type.name
                                                                        }
                                                                    </SelectItem>
                                                                ),
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription>
                                                        Select an existing
                                                        fabric type or create a
                                                        new one below
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Option to create a new fabric type */}
                                        <div className="flex items-center space-x-2">
                                            <FormField
                                                control={form.control}
                                                name="createMissingType"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={
                                                                    field.value
                                                                }
                                                                onCheckedChange={
                                                                    field.onChange
                                                                }
                                                            />
                                                        </FormControl>
                                                        <div className="space-y-1 leading-none">
                                                            <FormLabel>
                                                                Create new
                                                                fabric type
                                                            </FormLabel>
                                                            <FormDescription>
                                                                Create a new
                                                                fabric type if
                                                                not found in the
                                                                list
                                                            </FormDescription>
                                                        </div>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {/* New Fabric Type Name (only shown when create new type is checked) */}
                                        {form.watch("createMissingType") && (
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
                                                                placeholder="Enter new fabric type name"
                                                                {...field}
                                                                value={
                                                                    field.value ||
                                                                    ""
                                                                }
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent
                                value="details"
                                className="space-y-4 pt-4"
                            >
                                {/* Source Type Selection */}
                                <FormField
                                    control={form.control}
                                    name="sourceType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Source Type</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select source type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="MANUAL">
                                                        Manual Entry
                                                    </SelectItem>
                                                    <SelectItem value="THREAD_PURCHASE">
                                                        Thread Purchase
                                                    </SelectItem>
                                                    <SelectItem value="DYEING">
                                                        Dyeing Process
                                                    </SelectItem>
                                                    <SelectItem value="FABRIC_PRODUCTION">
                                                        Fabric Production
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Select where this inventory item
                                                is coming from
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Conditional Source Selection Fields */}
                                {sourceType === "THREAD_PURCHASE" && (
                                    <FormField
                                        control={form.control}
                                        name="threadPurchaseId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Thread Purchase
                                                </FormLabel>
                                                <Select
                                                    onValueChange={(value) =>
                                                        field.onChange(
                                                            parseInt(value),
                                                        )
                                                    }
                                                    value={field.value?.toString()}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select thread purchase" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {availableThreadPurchases.map(
                                                            (purchase) => (
                                                                <SelectItem
                                                                    key={
                                                                        purchase.id
                                                                    }
                                                                    value={purchase.id.toString()}
                                                                >
                                                                    {
                                                                        purchase.threadType
                                                                    }{" "}
                                                                    -{" "}
                                                                    {
                                                                        purchase.colorStatus
                                                                    }{" "}
                                                                    -{" "}
                                                                    {purchase
                                                                        .vendor
                                                                        ?.name ||
                                                                        "Unknown vendor"}{" "}
                                                                    (
                                                                    {
                                                                        purchase.quantity
                                                                    }{" "}
                                                                    {
                                                                        purchase.unitOfMeasure
                                                                    }
                                                                    )
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    Select the thread purchase
                                                    to link to this inventory
                                                    item
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {sourceType === "DYEING" && (
                                    <FormField
                                        control={form.control}
                                        name="dyeingProcessId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Dyeing Process
                                                </FormLabel>
                                                <Select
                                                    onValueChange={(value) =>
                                                        field.onChange(
                                                            parseInt(value),
                                                        )
                                                    }
                                                    value={field.value?.toString()}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select dyeing process" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {availableDyedThreads.map(
                                                            (dyeing) => (
                                                                <SelectItem
                                                                    key={
                                                                        dyeing.id
                                                                    }
                                                                    value={dyeing.id.toString()}
                                                                >
                                                                    {dyeing.colorName ||
                                                                        dyeing.colorCode ||
                                                                        "No color name"}{" "}
                                                                    -{" "}
                                                                    {
                                                                        dyeing.resultStatus
                                                                    }{" "}
                                                                    -
                                                                    {dyeing
                                                                        .threadPurchase
                                                                        ?.vendor
                                                                        ?.name
                                                                        ? `${dyeing.threadPurchase.vendor.name}`
                                                                        : "Unknown vendor"}
                                                                    (
                                                                    {
                                                                        dyeing.outputQuantity
                                                                    }{" "}
                                                                    meters)
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    Select the dyeing process to
                                                    link to this inventory item
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {sourceType === "FABRIC_PRODUCTION" && (
                                    <FormField
                                        control={form.control}
                                        name="fabricProductionId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Fabric Production
                                                </FormLabel>
                                                <Select
                                                    onValueChange={(value) =>
                                                        field.onChange(
                                                            parseInt(value),
                                                        )
                                                    }
                                                    value={field.value?.toString()}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select fabric production" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {availableFabricProductions.map(
                                                            (production) => (
                                                                <SelectItem
                                                                    key={
                                                                        production.id
                                                                    }
                                                                    value={production.id.toString()}
                                                                >
                                                                    {
                                                                        production.fabricType
                                                                    }{" "}
                                                                    - Batch{" "}
                                                                    {
                                                                        production.batchNumber
                                                                    }{" "}
                                                                    -{" "}
                                                                    {
                                                                        production.status
                                                                    }{" "}
                                                                    (
                                                                    {
                                                                        production.quantityProduced
                                                                    }{" "}
                                                                    {
                                                                        production.unitOfMeasure
                                                                    }
                                                                    )
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    Select the fabric production
                                                    to link to this inventory
                                                    item
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {/* Quantity and Units */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="currentQuantity"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Quantity</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min="0"
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
                                        name="unitOfMeasure"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Unit of Measure
                                                </FormLabel>
                                                <Select
                                                    onValueChange={
                                                        field.onChange
                                                    }
                                                    defaultValue={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select unit" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="meters">
                                                            Meters
                                                        </SelectItem>
                                                        <SelectItem value="yards">
                                                            Yards
                                                        </SelectItem>
                                                        <SelectItem value="kg">
                                                            Kilograms
                                                        </SelectItem>
                                                        <SelectItem value="pieces">
                                                            Pieces
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Location and Min Stock Level */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="location"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Location</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Where is this item stored?"
                                                        {...field}
                                                        value={
                                                            field.value || ""
                                                        }
                                                    />
                                                </FormControl>
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
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Alert when quantity falls
                                                    below this level
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Pricing */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="costPerUnit"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Cost Per Unit
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min="0"
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
                                                <FormLabel>
                                                    Sale Price
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Defaults to cost + 20%
                                                    margin
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Product-specific fields */}
                                {productType === "THREAD" && (
                                    <FormField
                                        control={form.control}
                                        name="color"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Color</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Thread color"
                                                        {...field}
                                                        value={
                                                            field.value || ""
                                                        }
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {productType === "FABRIC" && (
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <FormField
                                            control={form.control}
                                            name="color"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Color</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Fabric color"
                                                            {...field}
                                                            value={
                                                                field.value ||
                                                                ""
                                                            }
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="dimensions"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Dimensions
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="e.g. 150cm width"
                                                            {...field}
                                                            value={
                                                                field.value ||
                                                                ""
                                                            }
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}

                                {/* Notes */}
                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Notes</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Additional information about this inventory item"
                                                    className="min-h-[100px]"
                                                    {...field}
                                                    value={field.value || ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </TabsContent>
                        </Tabs>

                        {/* Form Actions */}
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsOpen(false)}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Add Item
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
