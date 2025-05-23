"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
    CalendarIcon,
    Check,
    ChevronsUpDown,
    InfoIcon,
    Loader2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import { ThreadPurchase } from "../columns";

// Form schema for validation
const threadOrderSchema = z.object({
    vendorId: z.string().min(1, "Vendor is required"),
    threadType: z.string().min(1, "Thread type is required"),
    color: z.string().optional(),
    colorStatus: z.string().min(1, "Color status is required"),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.coerce.number().min(0.01, "Unit price must be greater than 0"),
    unitOfMeasure: z.string().min(1, "Unit of measure is required"),
    requiredBy: z.string().optional(),
    reference: z.string().optional(),
    remarks: z.string().optional(),
});

type ThreadOrderValues = z.infer<typeof threadOrderSchema>;

// Define vendor interface to match the API response
interface Vendor {
    id: string;
    name: string;
    contact: string;
    email?: string;
    address?: string;
}

// Add props interface for the ThreadOrderForm component
interface ThreadOrderFormProps {
    existingOrder?: ThreadPurchase;
    isEditing?: boolean;
}

// Define default values
const defaultValues: Partial<ThreadOrderValues> = {
    threadType: "",
    color: "",
    colorStatus: "",
    quantity: 1,
    unitPrice: 0,
    unitOfMeasure: "units",
    requiredBy: "",
    reference: "",
    remarks: "",
};

// Options for dropdown selects
const colorStatusOptions = [
    { value: "COLORED", label: "Colored" },
    { value: "RAW", label: "Raw" },
];

// Units of measure options
const unitOfMeasureOptions = [
    { value: "units", label: "Units" },
    { value: "meters", label: "Meters" },
    { value: "yards", label: "Yards" },
    { value: "kg", label: "Kilograms" },
    { value: "lbs", label: "Pounds" },
    { value: "rolls", label: "Rolls" },
    { value: "spools", label: "Spools" },
];

// Common thread types
const commonThreadTypes = [
    "T-120 Polyester",
    "T-90 Polyester",
    "T-70 Polyester",
    "Cotton Thread",
    "Nylon Thread",
    "Silk Thread",
    "Spun Polyester",
    "Metallic Thread",
];

// Predefined color options with groups
const colorGroups = [
    {
        name: "Basic",
        colors: [
            { value: "#000000", name: "Black" },
            { value: "#FFFFFF", name: "White" },
            { value: "#FF0000", name: "Red" },
            { value: "#0000FF", name: "Blue" },
            { value: "#FFFF00", name: "Yellow" },
            { value: "#008000", name: "Green" },
        ],
    },
    {
        name: "Extended",
        colors: [
            { value: "#FFA500", name: "Orange" },
            { value: "#800080", name: "Purple" },
            { value: "#A52A2A", name: "Brown" },
            { value: "#808080", name: "Gray" },
            { value: "#FFC0CB", name: "Pink" },
            { value: "#40E0D0", name: "Turquoise" },
        ],
    },
    {
        name: "Special",
        colors: [
            { value: "#00008B", name: "Navy Blue" },
            { value: "#8B4513", name: "Saddle Brown" },
            { value: "#4B0082", name: "Indigo" },
            { value: "#32CD32", name: "Lime Green" },
            { value: "#FF69B4", name: "Hot Pink" },
            { value: "#C0C0C0", name: "Silver" },
        ],
    },
];

// Helper function to format currency
const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: "PKR",
        minimumFractionDigits: 0,
    }).format(amount);
};

export function ThreadOrderForm({
    existingOrder,
    isEditing = false,
}: ThreadOrderFormProps) {
    const router = useRouter();
    const [vendors, setVendors] = React.useState<Vendor[]>([]);
    const [isLoadingVendors, setIsLoadingVendors] = React.useState(false);
    const [colorPickerOpen, setColorPickerOpen] = React.useState(false);
    const [selectedColorName, setSelectedColorName] = React.useState("");
    const [calendarOpen, setCalendarOpen] = React.useState(false);
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
        existingOrder?.deliveryDate
            ? new Date(existingOrder.deliveryDate)
            : undefined,
    );
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Prepare form values if editing an existing order
    const initialValues = React.useMemo(() => {
        if (!existingOrder) return defaultValues;

        let requiredByDate = "";

        // Handle the date value with explicit timezone handling
        if (existingOrder.deliveryDate) {
            try {
                // Parse the date and format it consistently
                const dateObj = new Date(existingOrder.deliveryDate);
                if (!isNaN(dateObj.getTime())) {
                    // Format as YYYY-MM-DD to avoid timezone issues
                    requiredByDate = format(dateObj, "yyyy-MM-dd");
                    console.log("Initial date value set to:", requiredByDate);
                }
            } catch (error) {
                console.error("Error parsing initial date:", error);
            }
        }
        return {
            vendorId: existingOrder.vendorId.toString(),
            threadType: existingOrder.threadType,
            color: existingOrder.color || "",
            colorStatus: existingOrder.colorStatus,
            quantity: isNaN(existingOrder.quantity)
                ? 1
                : existingOrder.quantity,
            unitPrice: isNaN(Number(existingOrder.unitPrice))
                ? 0
                : Number(existingOrder.unitPrice),
            unitOfMeasure: existingOrder.unitOfMeasure || "units",
            requiredBy: requiredByDate,
            reference: existingOrder.reference || "",
            remarks: existingOrder.remarks || "",
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existingOrder, defaultValues]);

    // Set initial color name if editing
    React.useEffect(() => {
        if (existingOrder?.color) {
            const colorOption = colorGroups
                .flatMap((group) => group.colors)
                .find(
                    (c) =>
                        c.value.toLowerCase() ===
                        existingOrder.color?.toLowerCase(),
                );
            setSelectedColorName(colorOption?.name || existingOrder.color);
        }
    }, [existingOrder]);

    React.useEffect(() => {
        async function fetchVendors() {
            setIsLoadingVendors(true);
            try {
                const response = await fetch("/api/vendors");
                if (!response.ok) {
                    throw new Error("Failed to fetch vendors");
                }
                const data = await response.json();
                // Extract vendors from the nested response structure
                if (data && Array.isArray(data.vendors)) {
                    setVendors(data.vendors);
                } else {
                    console.error("Unexpected API response structure:", data);
                    setVendors([]);
                }
            } catch (error) {
                console.error("Error loading vendors:", error);
                if (typeof window !== "undefined") {
                    toast.error(
                        "Failed to load vendors. Please refresh the page.",
                    );
                }
                setVendors([]);
            } finally {
                setIsLoadingVendors(false);
            }
        }

        fetchVendors();
    }, []);

    const form = useForm<ThreadOrderValues>({
        resolver: zodResolver(threadOrderSchema),
        defaultValues: initialValues,
    });

    // Calculate total cost based on quantity and unit price
    const quantity = form.watch("quantity") || 0;
    const unitPrice = form.watch("unitPrice") || 0;
    const totalCost = isNaN(quantity * unitPrice) ? 0 : quantity * unitPrice;
    const watchedColor = form.watch("color") || "";
    const watchedThreadType = form.watch("threadType") || "";

    // Handle thread type selection
    const handleThreadTypeSelect = (type: string) => {
        form.setValue("threadType", type);
    };

    // Handle color option selection
    const handleColorSelect = (color: string, name: string) => {
        form.setValue("color", color);
        setSelectedColorName(name);
        setColorPickerOpen(false);
    };

    // Handle custom color input
    const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        form.setValue("color", value);

        // Find the color name if it's a preset
        const colorOption = colorGroups
            .flatMap((group) => group.colors)
            .find((c) => c.value.toLowerCase() === value.toLowerCase());
        setSelectedColorName(colorOption?.name || value);
    };

    async function onSubmit(data: ThreadOrderValues) {
        setIsSubmitting(true);
        try {
            // Find the selected vendor to include its name in the order
            const selectedVendor = Array.isArray(vendors)
                ? vendors.find((v) => v.id.toString() === data.vendorId)
                : undefined;

            // Prepare the order data with vendor information and ensure correct data types
            const orderData = {
                // Convert vendorId to a number if it's meant to be numeric
                vendorId: Number(data.vendorId),
                threadType: data.threadType,
                color: data.color || null,
                colorStatus: data.colorStatus,
                quantity: Number(data.quantity),
                unitPrice: Number(data.unitPrice),
                unitOfMeasure: data.unitOfMeasure,
                // Format date consistently and use deliveryDate field
                deliveryDate:
                    data.requiredBy && data.requiredBy.trim() !== ""
                        ? data.requiredBy
                        : null,
                // Keep requiredBy for backwards compatibility if needed
                requiredBy:
                    data.requiredBy && data.requiredBy.trim() !== ""
                        ? data.requiredBy
                        : null,
                reference:
                    data.reference && data.reference.trim() !== ""
                        ? data.reference
                        : null,
                remarks:
                    data.remarks && data.remarks.trim() !== ""
                        ? data.remarks
                        : null,
                vendorName: selectedVendor?.name || "Unknown Vendor",
                orderDate: new Date().toISOString(),
                totalCost: Number(totalCost),
            };

            console.log("Sending order data with date:", orderData);

            // API call - either update existing or create new
            const url =
                isEditing && existingOrder
                    ? `/api/thread/${existingOrder.id}`
                    : "/api/thread/order";

            const method = isEditing ? "PATCH" : "POST";

            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(orderData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to save order");
            }

            // Navigate to appropriate page after successful save
            router.push(
                isEditing
                    ? `/thread-orders/${existingOrder?.id}`
                    : "/thread-orders",
            );

            if (typeof window !== "undefined") {
                toast.success(
                    isEditing
                        ? "Thread order updated successfully"
                        : "Thread order created successfully",
                );
            }
        } catch (error) {
            console.error("Error saving thread order:", error);
            if (typeof window !== "undefined") {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : "Failed to save thread order. Please try again.",
                );
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="mx-auto max-w-7xl">
            <Card className="border-0 shadow-sm">
                <CardHeader className="space-y-1 pb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl">
                                {isEditing
                                    ? "Edit Thread Order"
                                    : "New Thread Order"}
                            </CardTitle>
                            <CardDescription className="mt-1">
                                {isEditing
                                    ? "Update the thread order details below"
                                    : "Create a new thread order by filling out the form below"}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    isEditing && existingOrder
                                        ? router.push(
                                              `/thread-orders/${existingOrder.id}`,
                                          )
                                        : router.back()
                                }
                            >
                                Cancel
                            </Button>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="sm"
                                            form="thread-order-form"
                                            type="submit"
                                            className="gap-1"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                                    {isEditing
                                                        ? "Updating..."
                                                        : "Creating..."}
                                                </>
                                            ) : isEditing ? (
                                                "Update Order"
                                            ) : (
                                                "Create Order"
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>
                                            {isEditing
                                                ? "Save changes to this thread order"
                                                : "Create a new thread order with the provided details"}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <Tabs defaultValue="details" className="w-full">
                        <TabsList className="mb-6 grid h-auto grid-cols-3">
                            <TabsTrigger value="details" className="py-2.5">
                                Order Details
                            </TabsTrigger>
                            <TabsTrigger value="thread" className="py-2.5">
                                Thread Information
                            </TabsTrigger>
                            <TabsTrigger value="additional" className="py-2.5">
                                Additional Info
                            </TabsTrigger>
                        </TabsList>

                        <Form {...form}>
                            <form
                                id="thread-order-form"
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-6"
                            >
                                <TabsContent
                                    value="details"
                                    className="mt-0 space-y-6"
                                >
                                    <div className="bg-muted/50 rounded-md p-5">
                                        <h3 className="mb-3 text-base font-medium">
                                            Vendor & Delivery Information
                                        </h3>
                                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                            {/* Vendor */}
                                            <FormField
                                                control={form.control}
                                                name="vendorId"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Vendor
                                                        </FormLabel>
                                                        <Select
                                                            onValueChange={
                                                                field.onChange
                                                            }
                                                            defaultValue={
                                                                field.value
                                                            }
                                                            disabled={
                                                                isLoadingVendors
                                                            }
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue
                                                                        placeholder={
                                                                            isLoadingVendors
                                                                                ? "Loading vendors..."
                                                                                : "Select vendor"
                                                                        }
                                                                    />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className="max-h-[200px]">
                                                                {vendors.length ===
                                                                    0 &&
                                                                    !isLoadingVendors && (
                                                                        <SelectItem
                                                                            value="no-vendors"
                                                                            disabled
                                                                        >
                                                                            No
                                                                            vendors
                                                                            available
                                                                        </SelectItem>
                                                                    )}
                                                                {vendors.map(
                                                                    (
                                                                        vendor,
                                                                    ) => (
                                                                        <SelectItem
                                                                            key={
                                                                                vendor.id
                                                                            }
                                                                            value={vendor.id.toString()}
                                                                        >
                                                                            {
                                                                                vendor.name
                                                                            }
                                                                        </SelectItem>
                                                                    ),
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormDescription>
                                                            {vendors.length ===
                                                                0 &&
                                                            !isLoadingVendors
                                                                ? "No vendors found. Add vendors in the vendor management section first."
                                                                : "Select the vendor for this thread order"}
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Required By Date */}
                                            <FormField
                                                control={form.control}
                                                name="requiredBy"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col">
                                                        <FormLabel>
                                                            Required By
                                                            (Optional)
                                                        </FormLabel>
                                                        <div className="grid gap-2">
                                                            <Popover
                                                                open={
                                                                    calendarOpen
                                                                }
                                                                onOpenChange={
                                                                    setCalendarOpen
                                                                }
                                                            >
                                                                <PopoverTrigger
                                                                    asChild
                                                                >
                                                                    <FormControl>
                                                                        <Button
                                                                            variant={
                                                                                "outline"
                                                                            }
                                                                            className={cn(
                                                                                "w-full pl-3 text-left font-normal",
                                                                                !selectedDate &&
                                                                                    "text-muted-foreground",
                                                                            )}
                                                                        >
                                                                            {selectedDate ? (
                                                                                format(
                                                                                    selectedDate,
                                                                                    "PPP",
                                                                                )
                                                                            ) : (
                                                                                <span>
                                                                                    Select
                                                                                    delivery
                                                                                    date
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
                                                                            selectedDate
                                                                        }
                                                                        onSelect={(
                                                                            date,
                                                                        ) => {
                                                                            setSelectedDate(
                                                                                date,
                                                                            );
                                                                            field.onChange(
                                                                                date
                                                                                    ? format(
                                                                                          date,
                                                                                          "yyyy-MM-dd",
                                                                                      )
                                                                                    : "",
                                                                            );
                                                                        }}
                                                                        fromDate={
                                                                            new Date()
                                                                        }
                                                                        classNames={{
                                                                            day_selected:
                                                                                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                                                            day_today:
                                                                                "bg-accent text-accent-foreground",
                                                                        }}
                                                                        className="rounded-md border"
                                                                        initialFocus
                                                                    />
                                                                </PopoverContent>
                                                            </Popover>
                                                        </div>
                                                        <FormDescription>
                                                            When do you need
                                                            this order
                                                            delivered? (Leave
                                                            blank if no specific
                                                            date)
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <h3 className="mt-6 mb-3 text-base font-medium">
                                            Pricing Information
                                        </h3>
                                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                            {/* Quantity */}
                                            <FormField
                                                control={form.control}
                                                name="quantity"
                                                render={({
                                                    field: { ...restField },
                                                }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Quantity
                                                        </FormLabel>
                                                        <FormControl>
                                                            <div className="flex">
                                                                <Input
                                                                    type="number"
                                                                    {...restField}
                                                                    className="rounded-r-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                                                />
                                                                <div className="bg-muted border-input text-muted-foreground inline-flex items-center rounded-r-md border border-l-0 px-3 text-sm">
                                                                    {form.watch(
                                                                        "unitOfMeasure",
                                                                    ) ||
                                                                        "units"}
                                                                </div>
                                                            </div>
                                                        </FormControl>
                                                        <FormDescription>
                                                            Number of units to
                                                            order
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Unit of Measure */}
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
                                                            defaultValue={
                                                                field.value
                                                            }
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select unit of measure" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {unitOfMeasureOptions.map(
                                                                    (
                                                                        option,
                                                                    ) => (
                                                                        <SelectItem
                                                                            key={
                                                                                option.value
                                                                            }
                                                                            value={
                                                                                option.value
                                                                            }
                                                                        >
                                                                            {
                                                                                option.label
                                                                            }
                                                                        </SelectItem>
                                                                    ),
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormDescription>
                                                            Specify the unit of
                                                            measurement for this
                                                            thread order
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Unit Price */}
                                            <FormField
                                                control={form.control}
                                                name="unitPrice"
                                                render={({
                                                    field: { ...restField },
                                                }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Unit Price
                                                        </FormLabel>
                                                        <FormControl>
                                                            <div className="flex">
                                                                <div className="bg-muted border-input text-muted-foreground inline-flex items-center rounded-l-md border border-r-0 px-3 text-sm">
                                                                    PKR
                                                                </div>
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    {...restField}
                                                                    className="rounded-l-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                                                />
                                                            </div>
                                                        </FormControl>
                                                        <FormDescription>
                                                            Price per unit
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    {/* Order Summary */}
                                    <div className="border-border rounded-md border p-5">
                                        <h3 className="mb-3 text-lg font-medium">
                                            Order Summary
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between border-b pb-2">
                                                <span className="text-muted-foreground">
                                                    Vendor:
                                                </span>
                                                <span className="font-medium">
                                                    {Array.isArray(vendors)
                                                        ? vendors.find(
                                                              (v) =>
                                                                  v.id.toString() ===
                                                                  form.watch(
                                                                      "vendorId",
                                                                  ),
                                                          )?.name ||
                                                          "Not selected"
                                                        : "Not selected"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">
                                                    Quantity:
                                                </span>
                                                <span>
                                                    {quantity}{" "}
                                                    {unitOfMeasureOptions.find(
                                                        (option) =>
                                                            option.value ===
                                                            form.watch(
                                                                "unitOfMeasure",
                                                            ),
                                                    )?.label || "units"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">
                                                    Unit of Measure:
                                                </span>
                                                <span>
                                                    {unitOfMeasureOptions.find(
                                                        (option) =>
                                                            option.value ===
                                                            form.watch(
                                                                "unitOfMeasure",
                                                            ),
                                                    )?.label || "Units"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">
                                                    Unit Price:
                                                </span>
                                                <span>
                                                    {formatCurrency(unitPrice)}
                                                </span>
                                            </div>
                                            <Separator className="my-2" />
                                            <div className="flex items-center justify-between text-lg">
                                                <span className="font-medium">
                                                    Total Cost:
                                                </span>
                                                <span className="font-bold">
                                                    {formatCurrency(totalCost)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent
                                    value="thread"
                                    className="mt-0 space-y-6"
                                >
                                    <div className="bg-muted/50 rounded-md p-5">
                                        <h3 className="mb-3 text-base font-medium">
                                            Thread Specifications
                                        </h3>
                                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                            {/* Thread Type */}
                                            <FormField
                                                control={form.control}
                                                name="threadType"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Thread Type
                                                        </FormLabel>
                                                        <FormControl>
                                                            <div className="space-y-2">
                                                                <Input
                                                                    placeholder="Enter thread type (e.g. T-120 Polyester)"
                                                                    {...field}
                                                                />
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {commonThreadTypes.map(
                                                                        (
                                                                            type,
                                                                        ) => (
                                                                            <Badge
                                                                                key={
                                                                                    type
                                                                                }
                                                                                variant={
                                                                                    watchedThreadType ===
                                                                                    type
                                                                                        ? "default"
                                                                                        : "outline"
                                                                                }
                                                                                className="hover:bg-muted cursor-pointer transition-colors"
                                                                                onClick={() =>
                                                                                    handleThreadTypeSelect(
                                                                                        type,
                                                                                    )
                                                                                }
                                                                            >
                                                                                {
                                                                                    type
                                                                                }
                                                                            </Badge>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </FormControl>
                                                        <FormDescription>
                                                            Select or enter the
                                                            type of thread for
                                                            this order
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Color Status */}
                                            <FormField
                                                control={form.control}
                                                name="colorStatus"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Color Status
                                                        </FormLabel>
                                                        <Select
                                                            onValueChange={
                                                                field.onChange
                                                            }
                                                            defaultValue={
                                                                field.value
                                                            }
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select color status" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {colorStatusOptions.map(
                                                                    (
                                                                        option,
                                                                    ) => (
                                                                        <SelectItem
                                                                            key={
                                                                                option.value
                                                                            }
                                                                            value={
                                                                                option.value
                                                                            }
                                                                        >
                                                                            {
                                                                                option.label
                                                                            }
                                                                        </SelectItem>
                                                                    ),
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormDescription>
                                                            Specify if the
                                                            thread is already
                                                            colored or raw
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {/* Color */}
                                        <FormField
                                            control={form.control}
                                            name="color"
                                            render={({ field }) => (
                                                <FormItem className="mt-6">
                                                    <FormLabel className="flex items-center gap-1">
                                                        Thread Color
                                                        <div
                                                            className="border-border h-4 w-4 rounded-full border shadow-sm"
                                                            style={{
                                                                backgroundColor:
                                                                    watchedColor ||
                                                                    "#FFFFFF",
                                                            }}
                                                        />
                                                    </FormLabel>
                                                    <Popover
                                                        open={colorPickerOpen}
                                                        onOpenChange={
                                                            setColorPickerOpen
                                                        }
                                                    >
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <div
                                                                    className="border-input bg-background ring-offset-background hover:bg-accent/10 relative flex h-11 w-full cursor-pointer items-center rounded-md border px-3 py-2 text-sm transition-colors"
                                                                    {...field}
                                                                >
                                                                    <div
                                                                        className="mr-3 h-7 w-7 rounded-md shadow-sm"
                                                                        style={{
                                                                            backgroundColor:
                                                                                watchedColor ||
                                                                                "#FFFFFF",
                                                                            border: "1px solid #E5E7EB",
                                                                        }}
                                                                    />
                                                                    <div className="flex flex-1 items-center justify-between">
                                                                        <span className="font-medium">
                                                                            {selectedColorName ||
                                                                                watchedColor ||
                                                                                "Select color"}
                                                                        </span>
                                                                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                                    </div>
                                                                </div>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent
                                                            className="w-auto p-0"
                                                            align="start"
                                                        >
                                                            <div className="w-[350px] max-w-[90vw] p-4">
                                                                <div className="mb-4">
                                                                    <label className="mb-1.5 block text-xs font-medium">
                                                                        Custom
                                                                        Color
                                                                    </label>
                                                                    <div className="flex gap-2">
                                                                        <input
                                                                            type="color"
                                                                            className="border-input h-9 w-14 cursor-pointer rounded-md border p-0"
                                                                            value={
                                                                                watchedColor
                                                                            }
                                                                            onChange={
                                                                                handleColorInputChange
                                                                            }
                                                                        />
                                                                        <Input
                                                                            placeholder="Enter color name or hex"
                                                                            value={
                                                                                selectedColorName
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) => {
                                                                                setSelectedColorName(
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                );
                                                                                form.setValue(
                                                                                    "color",
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                );
                                                                            }}
                                                                            className="h-9 flex-1"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                {colorGroups.map(
                                                                    (group) => (
                                                                        <div
                                                                            key={
                                                                                group.name
                                                                            }
                                                                            className="mb-3"
                                                                        >
                                                                            <label className="mb-1.5 block text-xs font-medium">
                                                                                {
                                                                                    group.name
                                                                                }{" "}
                                                                                Colors
                                                                            </label>
                                                                            <div className="grid grid-cols-6 gap-1.5">
                                                                                {group.colors.map(
                                                                                    (
                                                                                        color,
                                                                                    ) => (
                                                                                        <TooltipProvider
                                                                                            key={
                                                                                                color.value
                                                                                            }
                                                                                        >
                                                                                            <Tooltip>
                                                                                                <TooltipTrigger
                                                                                                    asChild
                                                                                                >
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() =>
                                                                                                            handleColorSelect(
                                                                                                                color.value,
                                                                                                                color.name,
                                                                                                            )
                                                                                                        }
                                                                                                        className={cn(
                                                                                                            "flex h-8 w-8 items-center justify-center rounded-md",
                                                                                                            "border shadow-sm transition-transform hover:scale-110",
                                                                                                            watchedColor.toLowerCase() ===
                                                                                                                color.value.toLowerCase()
                                                                                                                ? "border-primary ring-primary ring-1"
                                                                                                                : "border-border",
                                                                                                        )}
                                                                                                        style={{
                                                                                                            backgroundColor:
                                                                                                                color.value,
                                                                                                        }}
                                                                                                    >
                                                                                                        {watchedColor.toLowerCase() ===
                                                                                                            color.value.toLowerCase() && (
                                                                                                            <Check
                                                                                                                className={cn(
                                                                                                                    "h-4 w-4",
                                                                                                                    [
                                                                                                                        "#FFFFFF",
                                                                                                                        "#FFFF00",
                                                                                                                        "#FFC0CB",
                                                                                                                        "#40E0D0",
                                                                                                                    ].includes(
                                                                                                                        color.value,
                                                                                                                    )
                                                                                                                        ? "text-black"
                                                                                                                        : "text-white",
                                                                                                                )}
                                                                                                            />
                                                                                                        )}
                                                                                                    </button>
                                                                                                </TooltipTrigger>
                                                                                                <TooltipContent>
                                                                                                    <p>
                                                                                                        {
                                                                                                            color.name
                                                                                                        }
                                                                                                    </p>
                                                                                                </TooltipContent>
                                                                                            </Tooltip>
                                                                                        </TooltipProvider>
                                                                                    ),
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormDescription>
                                                        Choose the color for
                                                        this thread order
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent
                                    value="additional"
                                    className="mt-0 space-y-6"
                                >
                                    <div className="bg-muted/50 rounded-md p-5">
                                        <h3 className="mb-3 text-base font-medium">
                                            Additional Information
                                        </h3>

                                        {/* Reference */}
                                        <FormField
                                            control={form.control}
                                            name="reference"
                                            render={({ field }) => (
                                                <FormItem className="mb-6">
                                                    <FormLabel className="flex items-center gap-2">
                                                        <span>
                                                            Reference Number
                                                        </span>
                                                        <span className="text-muted-foreground text-xs">
                                                            (Optional)
                                                        </span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            placeholder="PO-12345 or Order Reference"
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Enter any reference
                                                        number for this order
                                                        such as a PO number
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Remarks */}
                                        <FormField
                                            control={form.control}
                                            name="remarks"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="flex items-center gap-2">
                                                        <span>
                                                            Additional Notes
                                                        </span>
                                                        <span className="text-muted-foreground text-xs">
                                                            (Optional)
                                                        </span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            {...field}
                                                            placeholder="Enter any special requirements, handling instructions, or additional details"
                                                            className="min-h-[150px] resize-y"
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Include any specific
                                                        requirements, handling
                                                        instructions, or other
                                                        relevant information
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="border-border rounded-md border p-5">
                                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                            <InfoIcon className="h-4 w-4" />
                                            <p>
                                                Fields marked with an asterisk
                                                (*) are required
                                            </p>
                                        </div>
                                    </div>
                                </TabsContent>
                            </form>
                        </Form>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
