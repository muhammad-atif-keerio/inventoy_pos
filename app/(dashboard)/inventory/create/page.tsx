"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { InventoryTransactionType } from "@prisma/client";
import { InfoIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import FormHeader from "@/components/form-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import { inventoryService } from "../api-service";
import { DyeingProcess, FabricProduction, ThreadPurchase } from "../interface";

const formSchema = z.object({
    itemCode: z.string().min(1, "Item code is required"),
    description: z.string().min(1, "Description is required"),
    type: z.string().min(1, "Type is required"),
    unitCost: z.string().min(1, "Unit cost is required"),
    totalCost: z.string().min(1, "Total cost is required"),
    quantity: z.string().min(1, "Quantity is required"),
    unit: z.string().min(1, "Unit is required"),
    source: z.string().optional(),
});

export default function InventoryCreatePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [sourceOptions, setSourceOptions] = useState<
        { label: string; value: string; details?: string }[]
    >([]);
    const [selectedSource, setSelectedSource] = useState<
        | Partial<ThreadPurchase>
        | Partial<DyeingProcess>
        | Partial<FabricProduction>
        | null
    >(null);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            itemCode: "",
            description: "",
            type: "",
            unitCost: "",
            totalCost: "",
            quantity: "",
            unit: "",
            source: "",
        },
    });

    const selectedType = form.watch("type");
    const quantity = form.watch("quantity");
    const unitCost = form.watch("unitCost");
    const selectedSourceId = form.watch("source");

    useEffect(() => {
        // Calculate total cost when unit cost or quantity changes
        if (unitCost && quantity) {
            const total = parseFloat(unitCost) * parseFloat(quantity);
            form.setValue("totalCost", total.toString());
        }
    }, [unitCost, quantity, form]);

    useEffect(() => {
        // Load source options based on selected type
        async function loadSourceOptions() {
            if (!selectedType) {
                setSourceOptions([]);
                return;
            }

            try {
                let options: {
                    label: string;
                    value: string;
                    details?: string;
                }[] = [];

                if (selectedType === "thread") {
                    const threadPurchases =
                        await inventoryService.getAvailableThreadPurchases();
                    options = threadPurchases.map((purchase) => ({
                        label: `Thread Purchase #${purchase.id} - ${purchase.threadType}`,
                        value: purchase.id.toString(),
                        details: `${purchase.color || "Undyed"} - ${purchase.quantity} ${purchase.unitOfMeasure} from ${purchase.vendor?.name || "Unknown vendor"}`,
                    }));
                } else if (selectedType === "dyed-thread") {
                    const dyedThreads =
                        await inventoryService.getAvailableDyedThreads();
                    options = dyedThreads.map((dyeing) => ({
                        label: `Dyeing Process #${dyeing.id} - ${dyeing.colorName || "Unnamed color"}`,
                        value: dyeing.id.toString(),
                        details: `Color code: ${dyeing.colorCode || "N/A"} - From thread purchase #${dyeing.threadPurchaseId}`,
                    }));
                } else if (selectedType === "fabric") {
                    const fabricProductions =
                        await inventoryService.getAvailableFabricProductions();
                    options = fabricProductions.map((production) => ({
                        label: `Fabric Production #${production.id} - ${production.fabricType}`,
                        value: production.id.toString(),
                        details: `Batch: ${production.batchNumber} - Dimensions: ${production.dimensions}`,
                    }));
                }

                setSourceOptions(options);

                // Reset source when type changes
                form.setValue("source", "");
                setSelectedSource(null);
            } catch (error) {
                toast.error("Failed to load source options");
                console.error(error);
            }
        }

        loadSourceOptions();
    }, [selectedType, form]);

    // Effect to load selected source details
    useEffect(() => {
        async function loadSourceDetails() {
            if (!selectedSourceId || !selectedType) {
                setSelectedSource(null);
                return;
            }

            try {
                const sourceId = parseInt(selectedSourceId);

                if (selectedType === "thread" && sourceOptions.length > 0) {
                    const purchases =
                        await inventoryService.getAvailableThreadPurchases();
                    const selectedPurchase = purchases.find(
                        (p) => p.id === sourceId,
                    );
                    if (selectedPurchase) {
                        // Auto-fill some form fields from the thread purchase
                        form.setValue("unit", selectedPurchase.unitOfMeasure);
                        form.setValue(
                            "unitCost",
                            selectedPurchase.unitPrice.toString(),
                        );

                        // If quantity not set yet, suggest the purchase quantity
                        if (!form.getValues("quantity")) {
                            form.setValue(
                                "quantity",
                                selectedPurchase.quantity.toString(),
                            );
                        }

                        // Update description if empty
                        if (!form.getValues("description")) {
                            form.setValue(
                                "description",
                                `${selectedPurchase.threadType} ${selectedPurchase.color || "Undyed"} Thread`,
                            );
                        }

                        setSelectedSource(selectedPurchase);
                    }
                } else if (
                    selectedType === "dyed-thread" &&
                    sourceOptions.length > 0
                ) {
                    const dyedThreads =
                        await inventoryService.getAvailableDyedThreads();
                    const selectedDyeing = dyedThreads.find(
                        (d) => d.id === sourceId,
                    );
                    if (selectedDyeing) {
                        // Auto-fill some form fields from the dyeing process
                        if (!form.getValues("description")) {
                            form.setValue(
                                "description",
                                `Dyed Thread - ${selectedDyeing.colorName || "Unnamed color"}`,
                            );
                        }

                        // Update unit cost if available from the dyeing process
                        if (
                            selectedDyeing.totalCost &&
                            selectedDyeing.outputQuantity
                        ) {
                            const unitCost =
                                selectedDyeing.totalCost /
                                selectedDyeing.outputQuantity;
                            form.setValue("unitCost", unitCost.toFixed(2));

                            // If quantity not set yet, suggest the output quantity
                            if (!form.getValues("quantity")) {
                                form.setValue(
                                    "quantity",
                                    selectedDyeing.outputQuantity.toString(),
                                );
                            }
                        }

                        setSelectedSource(selectedDyeing);
                    }
                } else if (
                    selectedType === "fabric" &&
                    sourceOptions.length > 0
                ) {
                    const productions =
                        await inventoryService.getAvailableFabricProductions();
                    const selectedProduction = productions.find(
                        (p) => p.id === sourceId,
                    );
                    if (selectedProduction) {
                        // Auto-fill some form fields from the fabric production
                        form.setValue("unit", selectedProduction.unitOfMeasure);

                        // If quantity not set yet, suggest the production quantity
                        if (!form.getValues("quantity")) {
                            form.setValue(
                                "quantity",
                                selectedProduction.quantityProduced.toString(),
                            );
                        }

                        // Update description if empty
                        if (!form.getValues("description")) {
                            form.setValue(
                                "description",
                                `${selectedProduction.fabricType} - Batch ${selectedProduction.batchNumber}`,
                            );
                        }

                        // Calculate and set unit cost if total cost is available
                        if (
                            selectedProduction.totalCost &&
                            selectedProduction.quantityProduced
                        ) {
                            const unitCost =
                                selectedProduction.totalCost /
                                selectedProduction.quantityProduced;
                            form.setValue("unitCost", unitCost.toFixed(2));
                        }

                        setSelectedSource(selectedProduction);
                    }
                }
            } catch (error) {
                console.error("Failed to load source details:", error);
            }
        }

        loadSourceDetails();
    }, [selectedSourceId, selectedType, sourceOptions, form]);

    // Function to handle form submission
    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);

        try {
            let sourceData = {};
            let productType = "";

            // Map the form type value to a valid ProductType enum value
            switch (values.type) {
                case "thread":
                case "dyed-thread":
                    productType = "THREAD";
                    break;
                case "fabric":
                    productType = "FABRIC";
                    break;
                default:
                    productType = values.type.toUpperCase();
            }

            if (values.source) {
                if (values.type === "thread") {
                    sourceData = { threadPurchaseId: parseInt(values.source) };
                } else if (values.type === "dyed-thread") {
                    sourceData = { dyeingProcessId: parseInt(values.source) };
                } else if (values.type === "fabric") {
                    sourceData = {
                        fabricProductionId: parseInt(values.source),
                    };
                }
            }

            const payload = {
                ...values,
                type: productType, // Use mapped ProductType enum value
                unitCost: parseFloat(values.unitCost),
                totalCost: parseFloat(values.totalCost),
                quantity: parseInt(values.quantity),
                unit: values.unit, // This will be mapped to unitOfMeasure in the API
                transactionType: InventoryTransactionType.PURCHASE,
                ...sourceData,
            };

            await inventoryService.createInventoryWithTransaction(payload);
            toast.success("Inventory item added successfully");
            router.push("/inventory");
        } catch (error) {
            toast.error("Failed to add inventory item");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6 p-6">
            <FormHeader title="Add New Inventory Item" />
            <Card>
                <CardContent className="pt-6">
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-6"
                        >
                            <div className="grid grid-cols-2 gap-6">
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
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Type</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="thread">
                                                        Thread
                                                    </SelectItem>
                                                    <SelectItem value="dyed-thread">
                                                        Dyed Thread
                                                    </SelectItem>
                                                    <SelectItem value="fabric">
                                                        Fabric
                                                    </SelectItem>
                                                    <SelectItem value="other">
                                                        Other
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
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter description"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-3 gap-6">
                                <FormField
                                    control={form.control}
                                    name="unitCost"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Unit Cost</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="quantity"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Quantity</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="0"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="unit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Unit</FormLabel>
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
                                                    <SelectItem value="kg">
                                                        Kilogram (kg)
                                                    </SelectItem>
                                                    <SelectItem value="g">
                                                        Gram (g)
                                                    </SelectItem>
                                                    <SelectItem value="m">
                                                        Meter (m)
                                                    </SelectItem>
                                                    <SelectItem value="cm">
                                                        Centimeter (cm)
                                                    </SelectItem>
                                                    <SelectItem value="pcs">
                                                        Pieces (pcs)
                                                    </SelectItem>
                                                    <SelectItem value="roll">
                                                        Roll
                                                    </SelectItem>
                                                    <SelectItem value="yard">
                                                        Yard
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
                                name="totalCost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Total Cost</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                {...field}
                                                readOnly={true}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {selectedType && selectedType !== "other" && (
                                <FormField
                                    control={form.control}
                                    name="source"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                Source
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <InfoIcon className="text-muted-foreground h-4 w-4" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>
                                                                Connect this
                                                                inventory item
                                                                to its source
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value || ""}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue
                                                            placeholder={`Select a ${selectedType.replace("-", " ")}`}
                                                        />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {sourceOptions.map(
                                                        (option) => (
                                                            <SelectItem
                                                                key={
                                                                    option.value
                                                                }
                                                                value={
                                                                    option.value
                                                                }
                                                            >
                                                                {option.label}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {selectedSource && (
                                <div className="bg-muted rounded-md p-4">
                                    <h3 className="mb-2 text-sm font-medium">
                                        Source Details
                                    </h3>
                                    {selectedType === "thread" && (
                                        <div className="space-y-2">
                                            {sourceOptions.find(
                                                (opt) =>
                                                    opt.value ===
                                                    selectedSourceId,
                                            )?.details && (
                                                <p className="text-sm">
                                                    {
                                                        sourceOptions.find(
                                                            (opt) =>
                                                                opt.value ===
                                                                selectedSourceId,
                                                        )?.details
                                                    }
                                                </p>
                                            )}
                                            <div className="flex flex-wrap gap-2">
                                                <Badge variant="outline">
                                                    {
                                                        (
                                                            selectedSource as ThreadPurchase
                                                        ).threadType
                                                    }
                                                </Badge>
                                                <Badge variant="outline">
                                                    {(
                                                        selectedSource as ThreadPurchase
                                                    ).color || "Undyed"}
                                                </Badge>
                                                <Badge variant="outline">
                                                    Received:{" "}
                                                    {(
                                                        selectedSource as ThreadPurchase
                                                    ).received
                                                        ? "Yes"
                                                        : "No"}
                                                </Badge>
                                            </div>
                                        </div>
                                    )}

                                    {selectedType === "dyed-thread" && (
                                        <div className="space-y-2">
                                            {sourceOptions.find(
                                                (opt) =>
                                                    opt.value ===
                                                    selectedSourceId,
                                            )?.details && (
                                                <p className="text-sm">
                                                    {
                                                        sourceOptions.find(
                                                            (opt) =>
                                                                opt.value ===
                                                                selectedSourceId,
                                                        )?.details
                                                    }
                                                </p>
                                            )}
                                            <div className="flex flex-wrap gap-2">
                                                <Badge
                                                    variant="outline"
                                                    style={{
                                                        backgroundColor:
                                                            (
                                                                selectedSource as DyeingProcess
                                                            ).colorCode ||
                                                            undefined,
                                                    }}
                                                >
                                                    {(
                                                        selectedSource as DyeingProcess
                                                    ).colorName ||
                                                        "Unnamed color"}
                                                </Badge>
                                            </div>
                                        </div>
                                    )}

                                    {selectedType === "fabric" && (
                                        <div className="space-y-2">
                                            {sourceOptions.find(
                                                (opt) =>
                                                    opt.value ===
                                                    selectedSourceId,
                                            )?.details && (
                                                <p className="text-sm">
                                                    {
                                                        sourceOptions.find(
                                                            (opt) =>
                                                                opt.value ===
                                                                selectedSourceId,
                                                        )?.details
                                                    }
                                                </p>
                                            )}
                                            <div className="flex flex-wrap gap-2">
                                                <Badge variant="outline">
                                                    {
                                                        (
                                                            selectedSource as FabricProduction
                                                        ).fabricType
                                                    }
                                                </Badge>
                                                <Badge variant="outline">
                                                    Batch:{" "}
                                                    {
                                                        (
                                                            selectedSource as FabricProduction
                                                        ).batchNumber
                                                    }
                                                </Badge>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push("/inventory")}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading
                                        ? "Saving..."
                                        : "Save Inventory Item"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
