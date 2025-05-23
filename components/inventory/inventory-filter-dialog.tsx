"use client";

import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Filter } from "lucide-react";
import { useForm } from "react-hook-form";
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

// Define the filter schema
const filterSchema = z.object({
    itemCode: z.string().optional(),
    description: z.string().optional(),
    itemType: z.string().optional(),
    location: z.string().optional(),
    supplier: z.string().optional(),
    stockStatus: z.string().optional(),
});

type FilterValues = z.infer<typeof filterSchema>;

// Options for item types and stock status
const itemTypeOptions = [
    { label: "Fabric", value: "Fabric" },
    { label: "Thread", value: "Thread" },
    { label: "Dye", value: "Dye" },
    { label: "Accessory", value: "Accessory" },
    { label: "Tool", value: "Tool" },
    { label: "Packaging", value: "Packaging" },
    { label: "Other", value: "Other" },
];

const stockStatusOptions = [
    { label: "In Stock", value: "inStock" },
    { label: "Low Stock", value: "lowStock" },
    { label: "Out of Stock", value: "outOfStock" },
];

export function InventoryFilterDialog() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [open, setOpen] = React.useState(false);

    // Initialize the form with current search params
    const form = useForm<FilterValues>({
        resolver: zodResolver(filterSchema),
        defaultValues: {
            itemCode: searchParams.get("itemCode") || "",
            description: searchParams.get("description") || "",
            itemType: searchParams.get("itemType") || "all",
            location: searchParams.get("location") || "",
            supplier: searchParams.get("supplier") || "",
            stockStatus: searchParams.get("stockStatus") || "all",
        },
    });

    // Function to apply filters
    const onSubmit = (values: FilterValues) => {
        // Create a new URLSearchParams instance
        const params = new URLSearchParams();

        // Add non-empty values to search params, ignoring "all" values
        Object.entries(values).forEach(([key, value]) => {
            if (value && value.trim() !== "" && value !== "all") {
                params.set(key, value);
            }
        });

        // Update the URL with the new search params
        router.push(`/inventory?${params.toString()}`);
        setOpen(false);
    };

    // Function to clear all filters
    const clearFilters = () => {
        form.reset({
            itemCode: "",
            description: "",
            itemType: "all",
            location: "",
            supplier: "",
            stockStatus: "all",
        });
        router.push("/inventory");
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Filter Inventory</DialogTitle>
                    <DialogDescription>
                        Set filters to narrow down your inventory items
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4 py-4"
                    >
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

                        <FormField
                            control={form.control}
                            name="itemType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Item Type</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select item type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                All Types
                                            </SelectItem>
                                            {itemTypeOptions.map((option) => (
                                                <SelectItem
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Location</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter location"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="supplier"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Supplier</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter supplier"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="stockStatus"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Stock Status</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select stock status" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                All Status
                                            </SelectItem>
                                            {stockStatusOptions.map(
                                                (option) => (
                                                    <SelectItem
                                                        key={option.value}
                                                        value={option.value}
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

                        <DialogFooter className="flex justify-between">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={clearFilters}
                            >
                                Clear Filters
                            </Button>
                            <Button type="submit">Apply Filters</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
