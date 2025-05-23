"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown, RefreshCw, X } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
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

/* eslint-disable no-unused-vars */

interface Vendor {
    id: number;
    name: string;
    activeOrders?: number;
}

const filterFormSchema = z.object({
    vendorId: z.string().optional().nullable(),
    colorStatus: z.enum(["RAW", "COLORED", ""]).optional().nullable(),
    received: z.enum(["true", "false", ""]).optional().nullable(),
});

type FilterFormValues = z.infer<typeof filterFormSchema>;

type ReceivedValue = "true" | "false" | "";
type ColorStatusValue = "RAW" | "COLORED" | "";

interface VendorFilterProps {
    onFilterChange: (
        vendorId: string | null,
        colorStatus: string | null,
        received: string | null,
    ) => void;
    initialVendorId?: string | null;
    initialColorStatus?: string | null;
    initialReceived?: string | null;
}

export default function VendorFilter({
    onFilterChange,
    initialVendorId = null,
    initialColorStatus = null,
    initialReceived = null,
}: VendorFilterProps) {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [open, setOpen] = useState(false);

    // Convert initialReceived to the correct type
    const getInitialReceivedValue = (): ReceivedValue => {
        if (initialReceived === "true") return "true";
        if (initialReceived === "false") return "false";
        return "";
    };

    // Convert initialColorStatus to the correct type
    const getInitialColorStatusValue = (): ColorStatusValue => {
        if (initialColorStatus === "RAW") return "RAW";
        if (initialColorStatus === "COLORED") return "COLORED";
        return "";
    };

    const form = useForm<FilterFormValues>({
        resolver: zodResolver(filterFormSchema),
        defaultValues: {
            vendorId: initialVendorId || "",
            colorStatus: getInitialColorStatusValue(),
            received: getInitialReceivedValue(),
        },
    });

    const fetchVendors = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/vendors?hasActiveOrders=true");
            if (!response.ok) {
                throw new Error("Failed to fetch vendors");
            }
            const data = await response.json();
            setVendors(data);
        } catch (error) {
            console.error("Error fetching vendors:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchVendors();
    }, []);

    const onSubmit = (data: FilterFormValues) => {
        onFilterChange(
            data.vendorId || null,
            data.colorStatus || null,
            data.received || null,
        );
    };

    const resetFilters = () => {
        form.reset({
            vendorId: "",
            colorStatus: "",
            received: "",
        });
        onFilterChange(null, null, null);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="vendorId"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Vendor</FormLabel>
                            <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={open}
                                            className={cn(
                                                "justify-between",
                                                !field.value &&
                                                    "text-muted-foreground",
                                            )}
                                        >
                                            {field.value
                                                ? vendors.find(
                                                      (vendor) =>
                                                          vendor.id.toString() ===
                                                          field.value,
                                                  )?.name
                                                : "Select vendor..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="p-0">
                                    <Command>
                                        <CommandInput placeholder="Search vendors..." />
                                        <CommandEmpty>
                                            {isLoading ? (
                                                <div className="flex items-center justify-center p-4">
                                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                    Loading vendors...
                                                </div>
                                            ) : (
                                                "No vendor found."
                                            )}
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {vendors.map((vendor) => (
                                                <CommandItem
                                                    key={vendor.id}
                                                    value={vendor.id.toString()}
                                                    onSelect={(
                                                        currentValue,
                                                    ) => {
                                                        form.setValue(
                                                            "vendorId",
                                                            currentValue ===
                                                                field.value
                                                                ? ""
                                                                : currentValue,
                                                        );
                                                        setOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            field.value ===
                                                                vendor.id.toString()
                                                                ? "opacity-100"
                                                                : "opacity-0",
                                                        )}
                                                    />
                                                    <span className="flex-1">
                                                        {vendor.name}
                                                    </span>
                                                    {vendor.activeOrders ? (
                                                        <Badge
                                                            variant="secondary"
                                                            className="ml-2"
                                                        >
                                                            {
                                                                vendor.activeOrders
                                                            }
                                                        </Badge>
                                                    ) : null}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <FormDescription>
                                Filter orders by vendor
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="colorStatus"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Color Status</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value || ""}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select color status" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="">All</SelectItem>
                                    <SelectItem value="RAW">Raw</SelectItem>
                                    <SelectItem value="COLORED">
                                        Colored
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                Filter by thread color status
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="received"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Received Status</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value || ""}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select received status" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="">All</SelectItem>
                                    <SelectItem value="true">
                                        Received
                                    </SelectItem>
                                    <SelectItem value="false">
                                        Pending
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                Filter by received status
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex items-center justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={resetFilters}
                        className="gap-2"
                    >
                        <X className="h-4 w-4" />
                        Reset Filters
                    </Button>
                    <Button type="submit">Apply Filters</Button>
                </div>
            </form>
        </Form>
    );
}
