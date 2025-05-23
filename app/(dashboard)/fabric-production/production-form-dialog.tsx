"use client";

import React, { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Define the schema for the form with validations
const formSchema = z.object({
    sourceThreadId: z.coerce.number({
        required_error: "Source thread is required",
    }),
    dyeingProcessId: z.coerce.number().optional().nullable(),
    fabricType: z
        .string({
            required_error: "Fabric type is required",
        })
        .min(1, "Fabric type is required"),
    dimensions: z
        .string({
            required_error: "Dimensions are required",
        })
        .min(1, "Dimensions are required"),
    batchNumber: z
        .string({
            required_error: "Batch number is required",
        })
        .min(1, "Batch number is required"),
    quantityProduced: z.coerce
        .number({
            required_error: "Quantity produced is required",
        })
        .min(1, "Quantity must be at least 1"),
    threadUsed: z.coerce
        .number({
            required_error: "Thread used is required",
        })
        .min(1, "Thread used must be at least 1"),
    threadWastage: z.coerce.number().optional(),
    productionCost: z.coerce.number().optional(),
    laborCost: z.coerce.number().optional(),
    totalCost: z.coerce.number().optional(),
    productionDate: z.date({
        required_error: "Production date is required",
    }),
    status: z
        .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
        .default("PENDING"),
    remarks: z.string().optional(),
});

// Type for form values
type FormValues = z.infer<typeof formSchema>;

// Type for thread items from the API
interface ThreadItem {
    id: number;
    threadType: string;
    vendorName: string;
    color?: string | null;
    colorStatus: string;
    quantity: number;
    unitOfMeasure: string;
    dyeingProcess?: {
        id: number;
        colorName?: string | null;
        colorCode?: string | null;
    } | null;
}

// Props for ProductionFormDialog component
interface ProductionFormDialogProps {
    triggerButton?: React.ReactNode;
    onProductionCreated?: () => void;
}

// Fabric type options
const FABRIC_TYPES = [
    { label: "Woven", value: "WOVEN" },
    { label: "Knitted", value: "KNITTED" },
    { label: "Non-woven", value: "NON_WOVEN" },
    { label: "Felt", value: "FELT" },
    { label: "Lace", value: "LACE" },
];

// Status options
const STATUS_OPTIONS = [
    { label: "Pending", value: "PENDING" },
    { label: "In Progress", value: "IN_PROGRESS" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Cancelled", value: "CANCELLED" },
];

export function ProductionFormDialog({
    triggerButton,
    onProductionCreated,
}: ProductionFormDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [threads, setThreads] = useState<ThreadItem[]>([]);
    const [threadsLoading, setThreadsLoading] = useState(false);

    // Initialize the form with default values
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as Resolver<FormValues>,
        defaultValues: {
            sourceThreadId: 0,
            dyeingProcessId: null,
            fabricType: "",
            dimensions: "",
            batchNumber: "",
            quantityProduced: 0,
            threadUsed: 0,
            threadWastage: 0,
            productionCost: 0,
            laborCost: 0,
            productionDate: new Date(),
            status: "PENDING",
            remarks: "",
        },
    });

    // Fetch thread options
    useEffect(() => {
        async function fetchThreads() {
            setThreadsLoading(true);
            try {
                const response = await fetch(
                    "/api/inventory?type=THREAD&inStock=true",
                );
                if (!response.ok) throw new Error("Failed to fetch threads");

                // Properly parse the response with error handling
                let responseData;
                try {
                    responseData = await response.json();
                } catch (parseError) {
                    console.error("Error parsing inventory data:", parseError);
                    setThreads([]);
                    throw new Error("Invalid response format");
                }

                // Validate the data structure
                if (!responseData || !responseData.items) {
                    console.warn("Invalid API response format:", responseData);
                    setThreads([]);
                    return;
                }

                // Extract the actual inventory data array
                const data = responseData.items;

                // Transform inventory items to ThreadItem format
                const validThreads = Array.isArray(data)
                    ? data
                          .filter(
                              (item) =>
                                  item &&
                                  typeof item === "object" &&
                                  "id" in item &&
                                  item.productType === "THREAD" &&
                                  item.currentQuantity > 0,
                          )
                          .map((item) => ({
                              id: item.id,
                              threadType:
                                  item.threadType?.name || item.description,
                              vendorName:
                                  item.notes?.split("from ")[1] || "Unknown",
                              color: item.description?.includes("-")
                                  ? item.description.split("-")[1].trim()
                                  : null,
                              colorStatus: item.description?.includes("Raw")
                                  ? "RAW"
                                  : "COLORED",
                              quantity: item.currentQuantity,
                              unitOfMeasure: item.unitOfMeasure,
                              dyeingProcess: null, // We don't have direct access to dyeing process from inventory
                          }))
                    : [];

                setThreads(validThreads);

                // Log what we actually got for debugging
                if (!Array.isArray(data)) {
                    console.warn(
                        "API returned non-array inventory data:",
                        data,
                    );
                }
            } catch (error) {
                console.error("Error fetching inventory threads:", error);
                toast.error("Failed to load thread options");
                // Ensure threads is an empty array on error
                setThreads([]);
            } finally {
                setThreadsLoading(false);
            }
        }

        if (open) {
            fetchThreads();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, toast]);

    // Calculate total cost when production cost or labor cost changes
    useEffect(() => {
        const subscription = form.watch((value, { name }) => {
            if (name === "productionCost" || name === "laborCost") {
                const productionCost = value.productionCost || 0;
                const laborCost = value.laborCost || 0;

                form.setValue("totalCost", productionCost + laborCost);
            }
        });

        return () => subscription.unsubscribe();
    }, [form]);

    // Update threadUsed when source thread is selected
    const onSourceThreadChange = (threadId: number) => {
        // Ensure threads is an array before using find
        if (!Array.isArray(threads)) return;

        const thread = threads.find((t) => t.id === threadId);

        if (thread) {
            // Set the dyeingProcessId if this thread has been dyed
            if (thread.dyeingProcess) {
                form.setValue("dyeingProcessId", thread.dyeingProcess.id);
            } else {
                form.setValue("dyeingProcessId", null);
            }

            // Default the threadUsed to the available quantity
            if (thread.quantity > 0) {
                form.setValue("threadUsed", thread.quantity);
            }
        }

        form.setValue("sourceThreadId", threadId);
    };

    // Handle form submission
    async function onSubmit(data: FormValues) {
        setLoading(true);
        try {
            // Check if status is COMPLETED
            const isCompletedProduction = data.status === "COMPLETED";

            // Calculate total cost if not provided
            if (!data.totalCost && (data.productionCost || data.laborCost)) {
                data.totalCost =
                    (data.productionCost || 0) + (data.laborCost || 0);
            }

            // Get the selected thread from the threads array
            const selectedThread = threads.find(
                (thread) => thread.id === data.sourceThreadId,
            );

            if (!selectedThread) {
                throw new Error("Selected thread not found");
            }

            // Format data for API - we directly use the thread inventory ID with the useInventoryDirectly flag
            const formattedData = {
                inventoryId: data.sourceThreadId, // The ID from the form is actually the inventory ID
                useInventoryDirectly: true, // Flag indicating we're using inventory directly
                fabricType: data.fabricType,
                dimensions: data.dimensions,
                batchNumber: data.batchNumber,
                quantityProduced: data.quantityProduced,
                threadUsed: data.threadUsed,
                threadWastage: data.threadWastage || 0,
                productionCost: data.productionCost || 0,
                laborCost: data.laborCost || 0,
                totalCost: data.totalCost || 0,
                productionDate: data.productionDate.toISOString(),
                status: data.status,
                remarks: data.remarks || "",
                singleInventoryEntry: true, // Flag to ensure only one inventory entry is created
            };

            // Submit to API
            const response = await fetch("/api/fabric/production", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formattedData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error ||
                        errorData.details ||
                        "Failed to create production record",
                );
            }

            // Get the response data which may contain inventory status
            const responseData = await response.json();

            toast.success("Production record created successfully");

            // Show additional notification for inventory when created as completed
            if (isCompletedProduction) {
                if (responseData.inventoryStatus === "UPDATED") {
                    toast.success(
                        "Fabric added to inventory with quantity: " +
                            data.quantityProduced,
                    );
                } else if (responseData.inventoryError) {
                    toast.error("Inventory Update Issue");
                }
            }

            setOpen(false);
            form.reset();

            if (onProductionCreated) {
                onProductionCreated();
            }
        } catch (error) {
            console.error("Error submitting form:", error);
            toast.error(
                "Failed to create production record: " +
                    (error instanceof Error ? error.message : "Unknown error"),
            );
        } finally {
            setLoading(false);
        }
    }

    // Handle form reset
    function onReset() {
        form.reset();
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {triggerButton || (
                    <Button variant="default">New Production</Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>Add New Production</DialogTitle>
                    <DialogDescription>
                        Create a new fabric production record
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-3"
                    >
                        {/* Thread & Fabric Section */}
                        <div className="grid grid-cols-1 gap-3">
                            {/* Source Thread Selection */}
                            <FormField
                                control={form.control}
                                name="sourceThreadId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Source Thread</FormLabel>
                                        <Select
                                            onValueChange={(value) =>
                                                onSourceThreadChange(
                                                    parseInt(value),
                                                )
                                            }
                                            defaultValue={
                                                field.value > 0
                                                    ? field.value.toString()
                                                    : undefined
                                            }
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select thread" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {threadsLoading ? (
                                                    <SelectItem
                                                        value="loading"
                                                        disabled
                                                    >
                                                        Loading threads...
                                                    </SelectItem>
                                                ) : threads &&
                                                  threads.length > 0 ? (
                                                    threads.map((thread) => (
                                                        <SelectItem
                                                            key={thread.id}
                                                            value={thread.id.toString()}
                                                        >
                                                            #{thread.id} -{" "}
                                                            {thread.threadType}
                                                            {thread.colorStatus ===
                                                                "COLORED" &&
                                                            thread.dyeingProcess
                                                                ?.colorName
                                                                ? ` (${thread.dyeingProcess.colorName})`
                                                                : thread.color
                                                                  ? ` (${thread.color})`
                                                                  : ""}
                                                            - {thread.quantity}{" "}
                                                            {
                                                                thread.unitOfMeasure
                                                            }{" "}
                                                            -{" "}
                                                            {thread.vendorName}
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <SelectItem
                                                        value="empty"
                                                        disabled
                                                    >
                                                        No threads available
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Fabric Type Selection */}
                            <FormField
                                control={form.control}
                                name="fabricType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fabric Type</FormLabel>
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
                                                {FABRIC_TYPES.map((type) => (
                                                    <SelectItem
                                                        key={type.value}
                                                        value={type.value}
                                                    >
                                                        {type.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Batch & Dimensions Section */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Batch Number */}
                            <FormField
                                control={form.control}
                                name="batchNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Batch Number</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g. FB-2023-001"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Dimensions */}
                            <FormField
                                control={form.control}
                                name="dimensions"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Dimensions</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g. 60in x 40in"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Thread Usage Section */}
                        <div className="grid grid-cols-3 gap-3">
                            {/* Thread Used */}
                            <FormField
                                control={form.control}
                                name="threadUsed"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Thread Used</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={0}
                                                placeholder="0"
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(
                                                        e.target
                                                            .valueAsNumber || 0,
                                                    );
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Thread Wastage */}
                            <FormField
                                control={form.control}
                                name="threadWastage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Thread Wastage</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={0}
                                                placeholder="0"
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(
                                                        e.target
                                                            .valueAsNumber || 0,
                                                    );
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Quantity Produced */}
                            <FormField
                                control={form.control}
                                name="quantityProduced"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quantity Produced</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={0}
                                                placeholder="0"
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(
                                                        e.target
                                                            .valueAsNumber || 0,
                                                    );
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Cost Section */}
                        <div className="grid grid-cols-3 gap-3">
                            {/* Production Cost */}
                            <FormField
                                control={form.control}
                                name="productionCost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Production Cost (PKR)
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={0}
                                                placeholder="0"
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(
                                                        e.target
                                                            .valueAsNumber || 0,
                                                    );
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Labor Cost */}
                            <FormField
                                control={form.control}
                                name="laborCost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Labor Cost (PKR)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={0}
                                                placeholder="0"
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(
                                                        e.target
                                                            .valueAsNumber || 0,
                                                    );
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Total Cost (Calculated) */}
                            <FormField
                                control={form.control}
                                name="totalCost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Total Cost (PKR)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                readOnly
                                                className="bg-muted/50"
                                                {...field}
                                                value={field.value || 0}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Date & Status Section */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Production Date */}
                            <FormField
                                control={form.control}
                                name="productionDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Production Date</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value &&
                                                                "text-muted-foreground",
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(
                                                                field.value,
                                                                "PPP",
                                                            )
                                                        ) : (
                                                            <span>
                                                                Pick a date
                                                            </span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                className="w-auto p-0"
                                                align="start"
                                            >
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Status */}
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {STATUS_OPTIONS.map(
                                                    (status) => (
                                                        <SelectItem
                                                            key={status.value}
                                                            value={status.value}
                                                        >
                                                            {status.label}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Remarks Section */}
                        <FormField
                            control={form.control}
                            name="remarks"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Remarks</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Additional notes"
                                            className="max-h-[80px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Form buttons */}
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onReset}
                            >
                                Reset
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Submitting..." : "Submit"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
