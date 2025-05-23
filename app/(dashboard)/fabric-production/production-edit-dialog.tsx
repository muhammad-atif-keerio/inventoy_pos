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

import { FabricProduction } from "./page";

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
        .number()
        .min(0, "Thread used cannot be negative")
        .optional(),
    threadWastage: z.coerce
        .number()
        .min(0, "Thread wastage cannot be negative")
        .optional(),
    productionCost: z.coerce
        .number()
        .min(0, "Production cost cannot be negative")
        .optional(),
    laborCost: z.coerce
        .number()
        .min(0, "Labor cost cannot be negative")
        .optional(),
    totalCost: z.coerce
        .number()
        .min(0, "Total cost cannot be negative")
        .optional(),
    productionDate: z.date({
        required_error: "Production date is required",
    }),
    completionDate: z.date().optional().nullable(),
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

// Props for ProductionEditDialog component
interface ProductionEditDialogProps {
    production: FabricProduction;
    triggerButton?: React.ReactNode;
    onProductionUpdated?: () => void;
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

export function ProductionEditDialog({
    production,
    triggerButton,
    onProductionUpdated,
}: ProductionEditDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [threads, setThreads] = useState<ThreadItem[]>([]);
    const [threadsLoading, setThreadsLoading] = useState(false);

    // Initialize the form with the production data
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as Resolver<FormValues>,
        defaultValues: {
            sourceThreadId: production.sourceThreadId,
            dyeingProcessId: production.dyeingProcessId,
            fabricType: production.fabricType,
            dimensions: production.dimensions,
            batchNumber: production.batchNumber,
            quantityProduced: production.quantityProduced,
            threadUsed: production.threadUsed || 0,
            threadWastage: production.threadWastage || 0,
            productionCost: production.productionCost || 0,
            laborCost: production.laborCost || 0,
            totalCost: production.totalCost || 0,
            productionDate: production.productionDate
                ? new Date(production.productionDate)
                : new Date(),
            completionDate: production.completionDate
                ? new Date(production.completionDate)
                : null,
            status: production.status || "PENDING",
            remarks: production.remarks || "",
        },
    });

    // Fetch thread options
    useEffect(() => {
        async function fetchThreads() {
            setThreadsLoading(true);
            try {
                const response = await fetch(
                    "/api/thread?received=true&includeInventory=true",
                );
                if (!response.ok) throw new Error("Failed to fetch threads");

                // Properly parse the response with error handling
                let responseData;
                try {
                    responseData = await response.json();
                } catch (parseError) {
                    console.error("Error parsing thread data:", parseError);
                    setThreads([]);
                    throw new Error("Invalid response format");
                }

                // Validate the data structure
                if (!responseData || !responseData.data) {
                    console.warn("Invalid API response format:", responseData);
                    setThreads([]);
                    return;
                }

                // Extract the actual thread data array
                const data = responseData.data;

                // Make sure we're setting an array and each item has required properties
                const validThreads = Array.isArray(data)
                    ? data
                          .filter(
                              (item) =>
                                  item &&
                                  typeof item === "object" &&
                                  "id" in item,
                          )
                          .map((thread) => ({
                              id: thread.id,
                              threadType: thread.threadType,
                              vendorName: thread.vendorName,
                              color: thread.color,
                              colorStatus: thread.colorStatus,
                              quantity:
                                  thread.inventory?.currentQuantity ||
                                  thread.quantity,
                              unitOfMeasure: thread.unitOfMeasure,
                              dyeingProcess: thread.dyeingProcessId
                                  ? {
                                        id: thread.dyeingProcessId,
                                        colorName: thread.dyedColor || null,
                                        colorCode: null,
                                    }
                                  : null,
                          }))
                    : [];

                setThreads(validThreads);

                // Log what we actually got for debugging
                if (!Array.isArray(data)) {
                    console.warn("API returned non-array thread data:", data);
                }
            } catch (error) {
                console.error("Error fetching threads:", error);
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

    // Calculate total cost when production or labor cost changes
    useEffect(() => {
        const productionCost = form.watch("productionCost") || 0;
        const laborCost = form.watch("laborCost") || 0;
        form.setValue("totalCost", productionCost + laborCost);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.watch("productionCost"), form.watch("laborCost"), form]);

    // Handle thread source change
    const onSourceThreadChange = (threadId: number) => {
        const selectedThread = threads.find((t) => t.id === threadId);

        if (selectedThread) {
            // Update dyeingProcessId based on selection
            form.setValue(
                "dyeingProcessId",
                selectedThread.dyeingProcess?.id || 0,
            );

            // Set thread used to available quantity if positive
            if (selectedThread.quantity > 0) {
                form.setValue("threadUsed", selectedThread.quantity);
            }

            // Update sourceThreadId
            form.setValue("sourceThreadId", threadId);
        }
    };

    // Handle form submission
    async function onSubmit(data: FormValues) {
        setLoading(true);
        try {
            // Check if status is changing to COMPLETED
            const isCompletionUpdate =
                data.status === "COMPLETED" &&
                production.status !== "COMPLETED";

            // Update completion date if status is changed to completed
            if (isCompletionUpdate && !data.completionDate) {
                data.completionDate = new Date();
            }

            // Calculate total cost if not provided
            if (!data.totalCost) {
                data.totalCost =
                    (data.productionCost || 0) + (data.laborCost || 0);
            }

            // Format date for API
            const formattedData = {
                ...data,
                productionDate: data.productionDate.toISOString(),
                completionDate: data.completionDate
                    ? data.completionDate.toISOString()
                    : null,
            };

            // Submit to API
            const response = await fetch(
                `/api/fabric/production/${production.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(formattedData),
                },
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error ||
                        errorData.details ||
                        "Failed to update production record",
                );
            }

            // Get the response data which may contain inventory status
            const responseData = await response.json();

            toast.success("Production record updated successfully");

            // Show additional notification for inventory when marked as completed
            if (isCompletionUpdate) {
                if (responseData.inventorySuccess) {
                    toast.success("Inventory Updated");
                } else if (responseData.inventoryError) {
                    toast.error("Inventory Update Issue");
                }
            }

            setOpen(false);

            if (onProductionUpdated) {
                onProductionUpdated();
            }
        } catch (error) {
            console.error("Error submitting form:", error);
            toast.error("Failed to update production record");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {triggerButton || (
                    <Button variant="outline">Edit Production</Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>Edit Production</DialogTitle>
                    <DialogDescription>
                        Update production record #{production.id}
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
                                                field.value
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

                        {/* Quantity & Date Section */}
                        <div className="grid grid-cols-2 gap-3">
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
                        </div>

                        {/* Thread Usage Section */}
                        <div className="grid grid-cols-2 gap-3">
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
                                                step="0.1"
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
                                                step="0.1"
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

                        {/* Costs Section */}
                        <div className="grid grid-cols-3 gap-3">
                            {/* Production Cost */}
                            <FormField
                                control={form.control}
                                name="productionCost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Production Cost</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={0}
                                                step="0.01"
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
                                        <FormLabel>Labor Cost</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={0}
                                                step="0.01"
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

                            {/* Total Cost */}
                            <FormField
                                control={form.control}
                                name="totalCost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Total Cost</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                placeholder="0"
                                                disabled
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

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
                                            {STATUS_OPTIONS.map((status) => (
                                                <SelectItem
                                                    key={status.value}
                                                    value={status.value}
                                                >
                                                    {status.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Submitting..." : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
