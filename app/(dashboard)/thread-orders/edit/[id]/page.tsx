"use client";

import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { ArrowLeft, CalendarIcon, Loader2, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { cn } from "@/lib/utils";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// Define the form schema with validation
const formSchema = z.object({
    vendorId: z.string().min(1, { message: "Please select a vendor" }),
    threadType: z.string().min(1, { message: "Thread type is required" }),
    colorStatus: z.enum(["RAW", "COLORED"]),
    color: z.string().optional(),
    quantity: z.coerce.number().positive("Quantity must be positive"),
    unitPrice: z.coerce.number().positive("Unit price must be positive"),
    unitOfMeasure: z.string().default("meters"),
    deliveryDate: z.date().optional().nullable(),
    reference: z.string().optional(),
    remarks: z.string().optional(),
    received: z.boolean().default(false),
});

// This is the type we'll use for our form
type FormData = z.infer<typeof formSchema>;

export default function EditThreadOrderPage() {
    const params = useParams();
    const router = useRouter();
    const [isLoading, setIsLoading] = React.useState(false);
    const [isFetching, setIsFetching] = React.useState(true);
    const [vendors, setVendors] = React.useState<
        Array<{ id: number; name: string }>
    >([]);
    const [error, setError] = React.useState<string | null>(null);

    // Initialize form with default values
    const form = useForm<FormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            vendorId: "",
            threadType: "",
            colorStatus: "RAW" as const,
            color: "",
            quantity: 0,
            unitPrice: 0,
            unitOfMeasure: "meters",
            deliveryDate: null,
            reference: "",
            remarks: "",
            received: false,
        },
    });

    // Fetch vendors for dropdown
    React.useEffect(() => {
        const fetchVendors = async () => {
            try {
                const response = await fetch("/api/vendors");

                if (!response.ok) {
                    throw new Error("Failed to fetch vendors");
                }

                const data = await response.json();
                // Check the structure of the response and extract vendors array correctly
                if (data && data.vendors && Array.isArray(data.vendors)) {
                    setVendors(data.vendors);
                } else if (Array.isArray(data)) {
                    setVendors(data);
                } else {
                    console.error("Unexpected vendors data structure:", data);
                    setVendors([]);
                }
            } catch (error) {
                console.error("Error fetching vendors:", error);
                toast.error("Failed to load vendors");
                setVendors([]); // Set empty array on error to prevent map errors
            }
        };

        fetchVendors();
    }, []);

    // Fetch thread order data
    React.useEffect(() => {
        const fetchOrder = async () => {
            if (!params.id) return;

            setIsFetching(true);
            setError(null);

            try {
                const response = await fetch(`/api/thread/${params.id}`);

                if (!response.ok) {
                    throw new Error("Failed to fetch thread order");
                }

                const orderData = await response.json();

                // Ensure we have valid data before setting form values
                if (!orderData) {
                    throw new Error("No data returned from the server");
                }

                console.log("Fetched order data:", orderData);

                // Format the data for the form with null checking
                form.reset({
                    vendorId: orderData.vendorId
                        ? orderData.vendorId.toString()
                        : "",
                    threadType: orderData.threadType || "",
                    colorStatus: orderData.colorStatus || "RAW",
                    color: orderData.color || "",
                    quantity: orderData.quantity || 0,
                    unitPrice: orderData.unitPrice || 0,
                    unitOfMeasure: orderData.unitOfMeasure || "meters",
                    deliveryDate: orderData.deliveryDate
                        ? parseISO(orderData.deliveryDate)
                        : null,
                    reference: orderData.reference || "",
                    remarks: orderData.remarks || "",
                    received: orderData.received || false,
                });
            } catch (error) {
                console.error("Error fetching thread order:", error);
                setError("Failed to load the thread order. Please try again.");
            } finally {
                setIsFetching(false);
            }
        };

        fetchOrder();
    }, [params.id, form]);

    // Form submission handler
    const onSubmit = async (values: FormData) => {
        setIsLoading(true);
        setError(null);

        try {
            // Calculate total cost
            const totalCost = values.quantity * values.unitPrice;

            // Prepare the data for API - DO NOT include ID in the update data
            const orderData = {
                ...values,
                totalCost,
                // Convert string to number for vendorId to match schema
                vendorId: parseInt(values.vendorId),
                deliveryDate: values.deliveryDate
                    ? values.deliveryDate.toISOString()
                    : null,
            };

            const response = await fetch(`/api/thread/${params.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(orderData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error || "Failed to update thread order",
                );
            }

            toast.success("Thread order updated successfully");
            router.push("/thread-orders");
        } catch (error) {
            console.error("Error updating thread order:", error);
            setError(
                `Failed to update thread order: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
            toast.error(
                `Failed to update thread order: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Handle cancel/back button
    const handleCancel = () => {
        router.back();
    };

    // Calculate total cost for display
    const totalCost = React.useMemo(() => {
        const quantity = form.watch("quantity") || 0;
        const unitPrice = form.watch("unitPrice") || 0;
        return quantity * unitPrice;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.watch("quantity"), form.watch("unitPrice")]);

    // Check if color status is colored to show/hide color field
    const isColored = form.watch("colorStatus") === "COLORED";

    if (isFetching) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
                <span className="ml-2 text-lg">Loading thread order...</span>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl space-y-6 py-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCancel}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Edit Thread Order
                    </h1>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Form {...form}>
                <form
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onSubmit={form.handleSubmit(onSubmit as any)}
                    className="space-y-8"
                >
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                {/* Vendor Selection */}
                                <FormField
                                    control={form.control}
                                    name="vendorId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Vendor</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                value={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a vendor" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Array.isArray(vendors) &&
                                                    vendors.length > 0 ? (
                                                        vendors.map(
                                                            (vendor) => (
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
                                                        )
                                                    ) : (
                                                        <SelectItem
                                                            value="no-vendors"
                                                            disabled
                                                        >
                                                            No vendors available
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                The supplier for this thread
                                                order
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Thread Type */}
                                <FormField
                                    control={form.control}
                                    name="threadType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Thread Type</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g. Cotton, Polyester"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Type of thread being ordered
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Separator />

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                {/* Color Status */}
                                <FormField
                                    control={form.control}
                                    name="colorStatus"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Color Status</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                value={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select color status" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="RAW">
                                                        Raw (Undyed)
                                                    </SelectItem>
                                                    <SelectItem value="COLORED">
                                                        Colored
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Is the thread colored or raw?
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Color (only shown if colorStatus is COLORED) */}
                                {isColored && (
                                    <FormField
                                        control={form.control}
                                        name="color"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Color</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="e.g. Navy Blue, Red"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Color of the thread
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>

                            <Separator />

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                {/* Quantity */}
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
                                                    onChange={(e) =>
                                                        field.onChange(
                                                            e.target
                                                                .valueAsNumber ||
                                                                0,
                                                        )
                                                    }
                                                />
                                            </FormControl>
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
                                            <FormLabel>Unit</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                value={field.value}
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
                                                    <SelectItem value="lbs">
                                                        Pounds
                                                    </SelectItem>
                                                    <SelectItem value="rolls">
                                                        Rolls
                                                    </SelectItem>
                                                    <SelectItem value="spools">
                                                        Spools
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Unit Price */}
                                <FormField
                                    control={form.control}
                                    name="unitPrice"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Unit Price (PKR)
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="0.00"
                                                    {...field}
                                                    onChange={(e) =>
                                                        field.onChange(
                                                            e.target
                                                                .valueAsNumber ||
                                                                0,
                                                        )
                                                    }
                                                    step="0.01"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Total Cost Display */}
                            <div className="bg-muted rounded-md p-4">
                                <div className="text-muted-foreground text-sm font-medium">
                                    Total Cost
                                </div>
                                <div className="mt-1 text-2xl font-bold">
                                    PKR{" "}
                                    {totalCost.toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                {/* Delivery Date */}
                                <FormField
                                    control={form.control}
                                    name="deliveryDate"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>
                                                Expected Delivery Date
                                            </FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full text-left font-normal",
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
                                                        selected={
                                                            field.value ||
                                                            undefined
                                                        }
                                                        onSelect={
                                                            field.onChange
                                                        }
                                                        disabled={(date) =>
                                                            date <
                                                            new Date(
                                                                new Date().setHours(
                                                                    0,
                                                                    0,
                                                                    0,
                                                                    0,
                                                                ),
                                                            )
                                                        }
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormDescription>
                                                When the order is expected to
                                                arrive
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Reference */}
                                <FormField
                                    control={form.control}
                                    name="reference"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Reference Number
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g. PO-2023-001"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Optional reference number or
                                                code
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
                                                placeholder="Additional notes or comments about this order"
                                                {...field}
                                                className="min-h-[100px]"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Separator />

                            {/* Received Status */}
                            <FormField
                                control={form.control}
                                name="received"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">
                                                Mark as Received
                                            </FormLabel>
                                            <FormDescription>
                                                Toggle this when the order has
                                                been received
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !form.formState.isDirty}
                        >
                            {isLoading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
