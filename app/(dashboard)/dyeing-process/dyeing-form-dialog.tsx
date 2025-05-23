"use client";

import React, { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
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
    FormDescription,
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

/* eslint-disable @typescript-eslint/no-explicit-any */

// Define thread order type
interface ThreadPurchase {
    id: number;
    threadType: string;
    color: string | null;
    colorStatus: string;
    quantity: number;
    unitOfMeasure: string;
    received: boolean;
}

// Define the full dyeing process data type for edit mode
export interface DyeingProcessData {
    id: number;
    threadPurchaseId: number;
    threadPurchase?: {
        id: number;
        threadType: string;
        colorStatus: string;
        color?: string | null;
        quantity: number;
        unitOfMeasure: string;
    };
    dyeDate: string;
    colorCode?: string | null;
    colorName?: string | null;
    dyeQuantity: number;
    outputQuantity: number;
    laborCost?: number | null;
    dyeMaterialCost?: number | null;
    totalCost?: number | null;
    resultStatus: string;
    completionDate?: string | null;
    remarks?: string | null;
}

// Define the status type to help TypeScript
type ResultStatus = "COMPLETED" | "PARTIAL" | "FAILED" | "PENDING";

// Define form schema
const dyeingFormSchema = z
    .object({
        threadPurchaseId: z.number({
            required_error: "Please select a thread purchase",
        }),
        dyeDate: z
            .date({
                required_error: "Please select a dye date",
            })
            .refine((date) => date <= new Date(), {
                message: "Dye date cannot be in the future",
            }),
        dyeQuantity: z.coerce
            .number()
            .min(0.1, "Quantity must be greater than 0")
            .refine((val) => !isNaN(val), {
                message: "Must be a valid number",
            }),
        outputQuantity: z.coerce
            .number()
            .min(0, "Output quantity must be 0 or positive")
            .refine((val) => !isNaN(val), {
                message: "Must be a valid number",
            }),
        resultStatus: z.enum(["COMPLETED", "PARTIAL", "FAILED", "PENDING"], {
            required_error: "Please select a result status",
        }),
        addToInventory: z.boolean().default(false),
        createRemainingThreadOrder: z.boolean().default(false),
        colorName: z.string().optional(),
        colorCode: z
            .string()
            .optional()
            .refine((val) => !val || /^#[0-9A-Fa-f]{6}$/.test(val), {
                message: "Color code must be a valid hex code (e.g., #FF5733)",
            }),
        laborCost: z.coerce
            .number()
            .min(0, "Labor cost must be 0 or positive")
            .optional(),
        dyeMaterialCost: z.coerce
            .number()
            .min(0, "Material cost must be 0 or positive")
            .optional(),
        totalCost: z.coerce
            .number()
            .min(0, "Total cost must be 0 or positive")
            .optional(),
        completionDate: z.date().optional().nullable(),
        remarks: z.string().optional(),
    })
    .refine(
        (data) => {
            // If status is COMPLETED, completion date is required
            return (
                data.resultStatus !== "COMPLETED" ||
                data.completionDate !== undefined
            );
        },
        {
            message: "Completion date is required when status is COMPLETED",
            path: ["completionDate"],
        },
    )
    .refine(
        (data) => {
            // Output quantity should not exceed input quantity
            return data.outputQuantity <= data.dyeQuantity;
        },
        {
            message: "Output quantity cannot exceed dye quantity",
            path: ["outputQuantity"],
        },
    );

// Extract the type from the schema
type DyeingFormValues = z.infer<typeof dyeingFormSchema>;

interface DyeingFormDialogProps {
    triggerButton: React.ReactNode;
    onDyeingProcessCreated?: () => void;
    editMode?: boolean;
    dyeingProcessData?: DyeingProcessData;
}

export function DyeingFormDialog({
    triggerButton,
    onDyeingProcessCreated,
    editMode = false,
    dyeingProcessData,
}: DyeingFormDialogProps) {
    const [open, setOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [threadOrders, setThreadOrders] = useState<ThreadPurchase[]>([]);
    const [loadingThreads, setLoadingThreads] = useState(false);
    const [userModifiedOutput, setUserModifiedOutput] = useState(false);
    const [hasRemainingQuantity, setHasRemainingQuantity] = useState(false);

    // Initialize form with type casting to fix TypeScript errors
    const form = useForm<DyeingFormValues>({
        resolver: zodResolver(dyeingFormSchema) as any,
        defaultValues: {
            threadPurchaseId: undefined,
            dyeDate: new Date(),
            dyeQuantity: 0,
            outputQuantity: 0,
            resultStatus: "PENDING",
            addToInventory: false,
            createRemainingThreadOrder: false,
            colorName: "",
            colorCode: "",
            laborCost: 0,
            dyeMaterialCost: 0,
            totalCost: 0,
            completionDate: undefined,
            remarks: "",
        },
    });

    // Watch values for cost calculation and selected thread
    const laborCost = form.watch("laborCost") || 0;
    const materialCost = form.watch("dyeMaterialCost") || 0;
    const dyeQuantity = form.watch("dyeQuantity") || 0;
    const selectedThreadId = form.watch("threadPurchaseId");
    const resultStatus = form.watch("resultStatus");

    // Get selected thread data
    const selectedThread = selectedThreadId
        ? threadOrders.find((t) => t?.id === selectedThreadId)
        : undefined;

    // Reset userModifiedOutput when thread changes
    useEffect(() => {
        if (selectedThreadId && !editMode) {
            setUserModifiedOutput(false);
        }
    }, [selectedThreadId, editMode]);

    // Set dye quantity when thread is selected (in create mode only)
    useEffect(() => {
        if (!editMode && selectedThread && selectedThread.quantity > 0) {
            form.setValue("dyeQuantity", selectedThread.quantity);
            // Calculate estimated output quantity (5% loss by default)
            const estimatedOutput = Math.round(selectedThread.quantity * 0.95);
            form.setValue("outputQuantity", estimatedOutput);
        }
    }, [selectedThreadId, selectedThread, form, editMode]);

    // Calculate total cost whenever labor or material costs change
    useEffect(() => {
        const total = Number(laborCost) + Number(materialCost);
        form.setValue("totalCost", Math.round(total * 100) / 100); // Round to 2 decimal places
    }, [laborCost, materialCost, form]);

    // Auto-calculate output quantity based on dye quantity and a 5% loss rate (create mode only)
    useEffect(() => {
        if (!editMode && dyeQuantity > 0 && !userModifiedOutput) {
            // Calculate estimated output quantity with 5% loss
            const estimatedOutput = Math.round(dyeQuantity * 0.95);
            form.setValue("outputQuantity", estimatedOutput);
        }
    }, [dyeQuantity, form, userModifiedOutput, editMode]);

    // Set completion date when status is COMPLETED
    useEffect(() => {
        if (resultStatus === "COMPLETED") {
            const currentDate = form.getValues("completionDate");
            if (!currentDate) {
                form.setValue("completionDate", new Date());
            }
        }
    }, [resultStatus, form]);

    // Initialize form with dyeing process data in edit mode
    useEffect(() => {
        if (editMode && dyeingProcessData && open) {
            // Pre-populate form with existing data
            form.setValue(
                "threadPurchaseId",
                dyeingProcessData.threadPurchaseId,
            );
            form.setValue("dyeDate", new Date(dyeingProcessData.dyeDate));
            form.setValue("dyeQuantity", dyeingProcessData.dyeQuantity);
            form.setValue("outputQuantity", dyeingProcessData.outputQuantity);
            form.setValue(
                "resultStatus",
                dyeingProcessData.resultStatus as ResultStatus,
            );
            form.setValue("colorName", dyeingProcessData.colorName || "");
            form.setValue("colorCode", dyeingProcessData.colorCode || "");
            form.setValue("laborCost", dyeingProcessData.laborCost || 0);
            form.setValue(
                "dyeMaterialCost",
                dyeingProcessData.dyeMaterialCost || 0,
            );
            form.setValue("totalCost", dyeingProcessData.totalCost || 0);
            form.setValue("remarks", dyeingProcessData.remarks || "");

            // Handle completion date
            if (dyeingProcessData.completionDate) {
                form.setValue(
                    "completionDate",
                    new Date(dyeingProcessData.completionDate),
                );
            } else {
                form.setValue("completionDate", null);
            }

            // In edit mode, we assume the user has already modified the output
            setUserModifiedOutput(true);
        }
    }, [editMode, dyeingProcessData, form, open]);

    // Fetch thread orders when dialog opens
    const fetchThreadOrders = async () => {
        try {
            setLoadingThreads(true);

            if (editMode && dyeingProcessData?.threadPurchaseId) {
                // In edit mode, we need to fetch the selected thread
                const response = await fetch(
                    `/api/thread/${dyeingProcessData.threadPurchaseId}`,
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch thread order");
                }

                const data = await response.json();
                setThreadOrders([data.data]);
            } else {
                // Get thread purchases that are received but not yet dyed (RAW status)
                const response = await fetch(
                    "/api/thread?received=true&colorStatus=RAW",
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch thread orders");
                }

                const data = await response.json();
                setThreadOrders(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching thread orders:", error);
            toast.error("Failed to fetch thread orders");
        } finally {
            setLoadingThreads(false);
        }
    };

    // Fetch thread orders when dialog opens
    useEffect(() => {
        if (open) {
            fetchThreadOrders();
            if (!editMode) {
                setUserModifiedOutput(false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, editMode]);

    // Calculate remaining quantity
    useEffect(() => {
        if (selectedThread && dyeQuantity > 0) {
            // Fetch current inventory quantity for this thread
            const fetchInventoryQuantity = async () => {
                try {
                    // Get the latest inventory information
                    const response = await fetch(
                        `/api/inventory/thread/${selectedThread.id}`,
                    );
                    if (response.ok) {
                        const data = await response.json();
                        // Check if the inventory has enough quantity
                        const inventoryQuantity =
                            data.currentQuantity || selectedThread.quantity;
                        const remaining = inventoryQuantity - dyeQuantity;
                        setHasRemainingQuantity(remaining > 0);
                    } else {
                        // Fall back to thread quantity if can't get inventory
                        const remaining = selectedThread.quantity - dyeQuantity;
                        setHasRemainingQuantity(remaining > 0);
                    }
                } catch (error) {
                    console.error("Error fetching inventory quantity:", error);
                    // Fall back to thread quantity if error occurs
                    const remaining = selectedThread.quantity - dyeQuantity;
                    setHasRemainingQuantity(remaining > 0);
                }
            };

            fetchInventoryQuantity();
        } else {
            setHasRemainingQuantity(false);
        }
    }, [selectedThread, dyeQuantity]);

    // Form submission handler
    const onSubmit = async (data: DyeingFormValues) => {
        setLoading(true);

        try {
            // If status is completed but no completion date is provided, set it to current date
            if (data.resultStatus === "COMPLETED" && !data.completionDate) {
                data.completionDate = new Date();
            }

            // Get latest inventory quantity
            let inventoryQuantity = 0;
            let remainingQuantity = 0;

            if (selectedThread) {
                try {
                    const response = await fetch(
                        `/api/inventory/thread/${selectedThread.id}`,
                    );
                    if (response.ok) {
                        const inventory = await response.json();
                        inventoryQuantity =
                            inventory.currentQuantity ||
                            selectedThread.quantity;
                    } else {
                        inventoryQuantity = selectedThread.quantity;
                    }

                    // Calculate remaining based on actual inventory
                    remainingQuantity = Math.max(
                        0,
                        inventoryQuantity - data.dyeQuantity,
                    );

                    // Security check: Ensure dye quantity doesn't exceed available inventory quantity
                    if (data.dyeQuantity > inventoryQuantity) {
                        throw new Error(
                            `Dye quantity (${data.dyeQuantity}) cannot exceed available inventory quantity (${inventoryQuantity}).`,
                        );
                    }
                } catch (error) {
                    console.error("Error fetching inventory data:", error);

                    // Fallback to thread quantity if inventory check fails
                    remainingQuantity = Math.max(
                        0,
                        selectedThread.quantity - data.dyeQuantity,
                    );

                    // Security check with fallback value
                    if (data.dyeQuantity > selectedThread.quantity) {
                        throw new Error(
                            `Dye quantity (${data.dyeQuantity}) cannot exceed available thread quantity (${selectedThread.quantity}).`,
                        );
                    }
                }
            }

            // Add remaining quantity to the data
            const requestData = {
                ...data,
                remainingQuantity,
            };

            let url = "/api/dyeing/process";
            let method = "POST";

            // For edit mode, use PATCH method and include the ID
            if (editMode && dyeingProcessData) {
                url = `/api/dyeing/process/${dyeingProcessData.id}`;
                method = "PATCH";
            }

            // Call the dyeing process API endpoint
            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestData),
            });

            // If response is not OK, parse the error message
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error ||
                        `Failed to ${editMode ? "update" : "create"} dyeing process`,
                );
            }

            // Parse the response data
            const responseData = await response.json();

            toast.success(
                `Dyeing process ${editMode ? "updated" : "added"} successfully!`,
            );

            // Show additional info if remaining thread was created
            if (responseData?.data?.remainingThreadCreated) {
                toast.info(
                    `A new thread order has been created for the remaining ${remainingQuantity} ${selectedThread?.unitOfMeasure || "units"}.`,
                );
            }

            // Close dialog and reset form
            setOpen(false);
            form.reset();
            setUserModifiedOutput(false);

            // Call callback if provided
            if (onDyeingProcessCreated) {
                onDyeingProcessCreated();
            }
        } catch (error) {
            console.error("Error submitting dyeing process:", error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : `Failed to ${editMode ? "update" : "add"} dyeing process`,
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{triggerButton}</DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>
                        {editMode ? "Edit" : "Add"} Dyeing Process
                    </DialogTitle>
                    <DialogDescription>
                        {editMode ? "Update" : "Record a new"} thread dyeing
                        process.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6"
                    >
                        {/* Thread Purchase Selection */}
                        <FormField
                            control={form.control}
                            name="threadPurchaseId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Thread Order</FormLabel>
                                    <Select
                                        disabled={
                                            loading ||
                                            loadingThreads ||
                                            editMode
                                        }
                                        onValueChange={(value) =>
                                            field.onChange(parseInt(value))
                                        }
                                        value={field.value?.toString()}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue
                                                    placeholder={
                                                        loadingThreads
                                                            ? "Loading threads..."
                                                            : "Select thread order"
                                                    }
                                                />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {loadingThreads ? (
                                                <div className="flex items-center justify-center py-2">
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    <span>Loading...</span>
                                                </div>
                                            ) : threadOrders.length === 0 ? (
                                                <div className="px-2 py-2 text-center">
                                                    <p>
                                                        No raw thread orders
                                                        available
                                                    </p>
                                                </div>
                                            ) : (
                                                threadOrders
                                                    .filter(
                                                        (thread) =>
                                                            thread && thread.id,
                                                    ) // Filter out null/undefined threads
                                                    .map((thread) => (
                                                        <SelectItem
                                                            key={thread.id}
                                                            value={thread.id.toString()}
                                                        >
                                                            #{thread.id}:{" "}
                                                            {thread.threadType}{" "}
                                                            ({thread.quantity}{" "}
                                                            {
                                                                thread.unitOfMeasure
                                                            }
                                                            )
                                                        </SelectItem>
                                                    ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Select the raw thread to dye
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Dye Date */}
                        <FormField
                            control={form.control}
                            name="dyeDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Dye Date</FormLabel>
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
                                                        <span>Pick a date</span>
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
                                                disabled={(date) =>
                                                    date > new Date() ||
                                                    date <
                                                        new Date("1900-01-01")
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Dye Quantity and Output Quantity */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="dyeQuantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Dye Quantity</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                disabled={
                                                    loading || !selectedThreadId
                                                }
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    // If user manually changes output to zero or empty, it will reset the userModifiedOutput flag
                                                    const outputValue =
                                                        form.getValues(
                                                            "outputQuantity",
                                                        );
                                                    if (!outputValue) {
                                                        setUserModifiedOutput(
                                                            false,
                                                        );
                                                    }
                                                }}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Quantity of thread to dye
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="outputQuantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Output Quantity</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                disabled={
                                                    loading || !selectedThreadId
                                                }
                                                {...field}
                                                onChange={(e) => {
                                                    setUserModifiedOutput(true);
                                                    field.onChange(e);
                                                }}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Actual output after dyeing
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Add validation warnings */}
                        {selectedThread &&
                            dyeQuantity > selectedThread.quantity && (
                                <div className="mt-2 px-1 text-sm text-red-500">
                                    Warning: Dye quantity exceeds available
                                    thread quantity ({selectedThread.quantity}{" "}
                                    {selectedThread.unitOfMeasure})
                                </div>
                            )}

                        {dyeQuantity > 0 &&
                            form.watch("outputQuantity") > dyeQuantity && (
                                <div className="mt-2 px-1 text-sm text-red-500">
                                    Warning: Output quantity cannot exceed input
                                    quantity
                                </div>
                            )}

                        {dyeQuantity > 0 &&
                            form.watch("resultStatus") === "COMPLETED" &&
                            !form.watch("completionDate") && (
                                <div className="mt-2 px-1 text-sm text-amber-500">
                                    Note: Completion date will default to today
                                    if not specified
                                </div>
                            )}

                        {/* Color Information */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="colorName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Color Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g. Navy Blue"
                                                disabled={loading}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="colorCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Color Code (HEX)</FormLabel>
                                        <FormControl>
                                            <div className="flex items-center">
                                                <Input
                                                    placeholder="#123456"
                                                    disabled={loading}
                                                    {...field}
                                                />
                                                {field.value && (
                                                    <div
                                                        className="ml-2 h-8 w-8 rounded-md border"
                                                        style={{
                                                            backgroundColor:
                                                                field.value,
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Cost Information */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <FormField
                                control={form.control}
                                name="laborCost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Labor Cost</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                disabled={loading}
                                                {...field}
                                                step="0.01"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="dyeMaterialCost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Material Cost</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                disabled={loading}
                                                {...field}
                                                step="0.01"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="totalCost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Total Cost</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                disabled={true}
                                                {...field}
                                                step="0.01"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Auto-calculated
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Status and Completion Date */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="resultStatus"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Result Status</FormLabel>
                                        <Select
                                            disabled={loading}
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="COMPLETED">
                                                    Completed
                                                </SelectItem>
                                                <SelectItem value="PARTIAL">
                                                    Partial
                                                </SelectItem>
                                                <SelectItem value="FAILED">
                                                    Failed
                                                </SelectItem>
                                                <SelectItem value="PENDING">
                                                    Pending
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="completionDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Completion Date</FormLabel>
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
                                                        disabled={
                                                            resultStatus !==
                                                            "COMPLETED"
                                                        }
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
                                                    selected={
                                                        field.value || undefined
                                                    }
                                                    onSelect={field.onChange}
                                                    disabled={(date) =>
                                                        date > new Date() ||
                                                        date <
                                                            new Date(
                                                                "1900-01-01",
                                                            )
                                                    }
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormDescription>
                                            Required if status is Completed
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Remarks */}
                        <FormField
                            control={form.control}
                            name="remarks"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Remarks</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Any additional notes about the dyeing process"
                                            className="resize-none"
                                            disabled={loading}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Add to Inventory option - only show in create mode */}
                        {!editMode && (
                            <FormField
                                control={form.control}
                                name="addToInventory"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                disabled={loading}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>
                                                Add to Inventory
                                            </FormLabel>
                                            <FormDescription>
                                                Automatically add dyed thread to
                                                inventory after process
                                                completion
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* Create Remaining Thread option - only show in create mode and when there's remaining quantity */}
                        {!editMode && hasRemainingQuantity && (
                            <FormField
                                control={form.control}
                                name="createRemainingThreadOrder"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                disabled={loading}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>
                                                Create Thread Order for
                                                Remaining Quantity
                                            </FormLabel>
                                            <FormDescription>
                                                {selectedThread &&
                                                dyeQuantity > 0 &&
                                                selectedThread.quantity >
                                                    dyeQuantity
                                                    ? `Create a new thread order for the remaining ${selectedThread.quantity - dyeQuantity} ${selectedThread.unitOfMeasure}`
                                                    : "Create a new thread order for any remaining undyed thread"}
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {editMode ? "Update" : "Save"} Dyeing Process
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
