"use client";

import React, { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
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

import { InventoryItem } from "@/app/(dashboard)/inventory/columns";
import { InventoryContext } from "@/app/(dashboard)/inventory/inventory-context";

// Define the form schema
const restockFormSchema = z.object({
    quantity: z.coerce.number().positive("Quantity must be a positive number"),
    unitCost: z.coerce.number().nonnegative("Unit cost cannot be negative"),
    transactionType: z.enum([
        "PURCHASE",
        "ADJUSTMENT",
        "PRODUCTION",
        "TRANSFER",
    ]),
    transactionDate: z.date(),
    referenceType: z.string().optional(),
    referenceId: z.coerce.number().optional(),
    threadPurchaseId: z.coerce.number().optional(),
    dyeingProcessId: z.coerce.number().optional(),
    fabricProductionId: z.coerce.number().optional(),
    notes: z.string().optional(),
});

type RestockFormValues = z.infer<typeof restockFormSchema>;

interface RestockInventoryDialogProps {
    inventoryItem: InventoryItem;
    trigger: React.ReactNode;
}

export function RestockInventoryDialog({
    inventoryItem,
    trigger,
}: RestockInventoryDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addOptimisticAction, refreshInventory } =
        React.useContext(InventoryContext);

    const form = useForm<RestockFormValues>({
        resolver: zodResolver(restockFormSchema),
        defaultValues: {
            quantity: 0,
            unitCost: inventoryItem.costPerUnit || 0,
            transactionType: "PURCHASE",
            transactionDate: new Date(),
            referenceType: "",
            notes: "",
        },
    });

    async function onSubmit(values: RestockFormValues) {
        setIsSubmitting(true);
        try {
            // Calculate total cost
            const totalCost = values.quantity * values.unitCost;

            // API request to add inventory
            const response = await fetch(
                `/api/inventory/${inventoryItem.id}/transactions`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        ...values,
                        totalCost,
                    }),
                },
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error || "Failed to restock inventory",
                );
            }

            // Optimistic update
            addOptimisticAction({
                type: "restock",
                item: { id: inventoryItem.id },
                payload: { quantity: values.quantity },
            });

            toast.success(
                `Added ${values.quantity} ${inventoryItem.unitOfMeasure} of ${inventoryItem.description}`,
            );

            // Close the dialog and refresh
            setOpen(false);
            refreshInventory();
        } catch (error) {
            console.error("Error restocking inventory:", error);
            toast.error("Failed to restock inventory");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Restock Inventory</DialogTitle>
                    <DialogDescription>
                        Add inventory for {inventoryItem.itemCode} -{" "}
                        {inventoryItem.description}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        {/* Transaction Type */}
                        <FormField
                            control={form.control}
                            name="transactionType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Transaction Type</FormLabel>
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
                                            <SelectItem value="PURCHASE">
                                                Purchase
                                            </SelectItem>
                                            <SelectItem value="ADJUSTMENT">
                                                Adjustment
                                            </SelectItem>
                                            <SelectItem value="PRODUCTION">
                                                Production
                                            </SelectItem>
                                            <SelectItem value="TRANSFER">
                                                Transfer
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Current Quantity Display */}
                        <div className="bg-muted/50 rounded-md p-3">
                            <div className="text-sm font-medium">
                                Current Quantity
                            </div>
                            <div className="text-xl font-bold">
                                {inventoryItem.currentQuantity.toLocaleString()}{" "}
                                {inventoryItem.unitOfMeasure}
                            </div>
                        </div>

                        {/* Quantity */}
                        <FormField
                            control={form.control}
                            name="quantity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Quantity to Add (
                                        {inventoryItem.unitOfMeasure})
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="1"
                                            {...field}
                                            onChange={(e) =>
                                                field.onChange(
                                                    parseFloat(
                                                        e.target.value,
                                                    ) || 0,
                                                )
                                            }
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Unit Cost */}
                        <FormField
                            control={form.control}
                            name="unitCost"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Unit Cost (PKR)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            {...field}
                                            onChange={(e) =>
                                                field.onChange(
                                                    parseFloat(
                                                        e.target.value,
                                                    ) || 0,
                                                )
                                            }
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Transaction Date */}
                        <FormField
                            control={form.control}
                            name="transactionDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Date</FormLabel>
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
                                                onSelect={(date) =>
                                                    field.onChange(
                                                        date || new Date(),
                                                    )
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Reference Information */}
                        <div className="grid grid-cols-2 gap-2">
                            {/* Reference Type */}
                            <FormField
                                control={form.control}
                                name="referenceType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Reference Type (Optional)
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g. Invoice"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Reference ID */}
                            <FormField
                                control={form.control}
                                name="referenceId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Reference ID (Optional)
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="e.g. 123"
                                                {...field}
                                                value={field.value || ""}
                                                onChange={(e) =>
                                                    field.onChange(
                                                        e.target.value
                                                            ? parseInt(
                                                                  e.target
                                                                      .value,
                                                              )
                                                            : undefined,
                                                    )
                                                }
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Thread Purchase ID */}
                        <FormField
                            control={form.control}
                            name="threadPurchaseId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Thread Purchase ID (Optional)
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="e.g. 456"
                                            {...field}
                                            value={field.value || ""}
                                            onChange={(e) =>
                                                field.onChange(
                                                    e.target.value
                                                        ? parseInt(
                                                              e.target.value,
                                                          )
                                                        : undefined,
                                                )
                                            }
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Dyeing Process ID */}
                        <FormField
                            control={form.control}
                            name="dyeingProcessId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Dyeing Process ID (Optional)
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="e.g. 789"
                                            {...field}
                                            value={field.value || ""}
                                            onChange={(e) =>
                                                field.onChange(
                                                    e.target.value
                                                        ? parseInt(
                                                              e.target.value,
                                                          )
                                                        : undefined,
                                                )
                                            }
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Fabric Production ID */}
                        <FormField
                            control={form.control}
                            name="fabricProductionId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Fabric Production ID (Optional)
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="e.g. 101"
                                            {...field}
                                            value={field.value || ""}
                                            onChange={(e) =>
                                                field.onChange(
                                                    e.target.value
                                                        ? parseInt(
                                                              e.target.value,
                                                          )
                                                        : undefined,
                                                )
                                            }
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Notes */}
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Additional information..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Preview of New Total */}
                        <div className="bg-muted/50 rounded-md p-3">
                            <div className="text-sm font-medium">
                                New Total After Restock
                            </div>
                            <div className="text-primary text-xl font-bold">
                                {(
                                    inventoryItem.currentQuantity +
                                    (form.watch("quantity") || 0)
                                ).toLocaleString()}{" "}
                                {inventoryItem.unitOfMeasure}
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Submitting..." : "Restock"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
