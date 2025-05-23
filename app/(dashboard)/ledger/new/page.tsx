"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, ChevronLeft, Info, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { cn } from "@/lib/utils";

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
import { Textarea } from "@/components/ui/textarea";

// Schema for the form with validation
const formSchema = z.object({
    entryType: z.enum(["PAYABLE", "RECEIVABLE"], {
        required_error: "Entry type is required",
    }),
    description: z.string().min(3, "Description must be at least 3 characters"),
    amount: z.string().refine(
        (val) => {
            const num = parseFloat(val);
            return !isNaN(num) && num > 0;
        },
        { message: "Amount must be a positive number" },
    ),
    entryDate: z.date({
        required_error: "Entry date is required",
    }),
    dueDate: z.date().optional(),
    reference: z.string().optional(),
    notes: z.string().optional(),
    vendorId: z.string().optional(),
    customerId: z.string().optional(),
    vendorName: z.string().optional(),
    customerName: z.string().optional(),
    useManualVendor: z.boolean().optional(),
    useManualCustomer: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Wrap in a function that uses searchParams
function NewLedgerEntryContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const typeParam = searchParams?.get("type") || null;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [vendors, setVendors] = useState<{ id: number; name: string }[]>([]);
    const [customers, setCustomers] = useState<{ id: number; name: string }[]>(
        [],
    );
    const [isLoadingParties, setIsLoadingParties] = useState(false);
    const [useManualVendor, setUseManualVendor] = useState(false);
    const [useManualCustomer, setUseManualCustomer] = useState(false);

    // Get the page title based on the entry type
    const getPageTitle = () => {
        if (typeParam === "payable") return "Add New Payable";
        if (typeParam === "receivable") return "Add New Receivable";
        return "Add New Ledger Entry";
    };

    // Initialize form with default values
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            entryType: (typeParam === "payable"
                ? "PAYABLE"
                : typeParam === "receivable"
                  ? "RECEIVABLE"
                  : undefined) as "PAYABLE" | "RECEIVABLE",
            description: "",
            amount: "",
            entryDate: new Date(),
            reference: "",
            notes: "",
            useManualVendor: false,
            useManualCustomer: false,
            vendorId: "",
            customerId: "",
            vendorName: "",
            customerName: "",
        },
    });

    // Watch entry type to conditionally render vendor/customer fields
    const entryType = form.watch("entryType");

    // Load vendors and customers for the form
    const loadParties = async () => {
        setIsLoadingParties(true);
        try {
            // Load vendors for payables
            const vendorsPromise = fetch("/api/vendors?limit=100").then((res) =>
                res.json(),
            );

            // Load customers for receivables
            const customersPromise = fetch("/api/customers?limit=100").then(
                (res) => res.json(),
            );

            const [vendorsData, customersData] = await Promise.all([
                vendorsPromise,
                customersPromise,
            ]);

            setVendors(vendorsData.vendors || []);
            setCustomers(customersData.customers || []);
        } catch (error) {
            console.error("Error loading parties:", error);
            toast.error("Failed to load vendors or customers");
        } finally {
            setIsLoadingParties(false);
        }
    };

    // Submit the form data
    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true);

        try {
            // Validate that vendor is provided for payables (either ID or name)
            if (data.entryType === "PAYABLE") {
                if (
                    useManualVendor &&
                    (!data.vendorName || data.vendorName.trim() === "")
                ) {
                    form.setError("vendorName", {
                        type: "manual",
                        message: "Vendor name is required",
                    });
                    setIsSubmitting(false);
                    return;
                } else if (
                    !useManualVendor &&
                    (!data.vendorId || data.vendorId === "")
                ) {
                    form.setError("vendorId", {
                        type: "manual",
                        message: "Please select a vendor",
                    });
                    setIsSubmitting(false);
                    return;
                }
            }

            // Validate that customer is provided for receivables
            if (data.entryType === "RECEIVABLE") {
                if (
                    useManualCustomer &&
                    (!data.customerName || data.customerName.trim() === "")
                ) {
                    form.setError("customerName", {
                        type: "manual",
                        message: "Customer name is required",
                    });
                    setIsSubmitting(false);
                    return;
                } else if (
                    !useManualCustomer &&
                    (!data.customerId || data.customerId === "")
                ) {
                    form.setError("customerId", {
                        type: "manual",
                        message: "Please select a customer",
                    });
                    setIsSubmitting(false);
                    return;
                }
            }

            // Make API request to create the ledger entry
            const response = await fetch("/api/ledger", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...data,
                    // Include khataId from URL parameters to ensure proper association
                    khataId: searchParams?.get("khataId") || "1", // Default to khata 1 if not specified
                    entryDate: data.entryDate.toISOString(),
                    dueDate: data.dueDate
                        ? data.dueDate.toISOString()
                        : undefined,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error || "Failed to create ledger entry",
                );
            }

            const responseData = await response.json();

            // Show success message
            toast.success("Ledger entry created successfully");

            // Invalidate cache for the ledger page
            try {
                await fetch("/api/revalidate?path=/ledger", {
                    cache: "no-store",
                });
                console.log("Revalidated ledger page cache");
            } catch (e) {
                console.error("Failed to revalidate cache:", e);
            }

            // Navigate to the new entry detail page
            if (responseData?.entry?.id) {
                router.push(`/ledger/${responseData.entry.id}`);
            } else {
                router.push("/ledger");
            }
        } catch (error) {
            console.error("Error creating ledger entry:", error);
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("Failed to create ledger entry");
            }
            setIsSubmitting(false);
        }
    };

    // Navigation
    const handleCancel = () => {
        router.back();
    };

    // Load vendors and customers on initial render
    useEffect(() => {
        loadParties();
    }, []);

    // Toggle manual vendor entry mode
    const toggleManualVendor = () => {
        const newValue = !useManualVendor;
        setUseManualVendor(newValue);
        form.setValue("useManualVendor", newValue);

        if (newValue) {
            // Switching to manual entry - clear selected vendor ID
            form.setValue("vendorId", "");
            // Clear validation error if any
            form.clearErrors("vendorId");
        } else {
            // Switching to dropdown selection - clear manual vendor name
            form.setValue("vendorName", "");
            // Clear validation error if any
            form.clearErrors("vendorName");
        }
    };

    // Toggle manual customer entry mode
    const toggleManualCustomer = () => {
        const newValue = !useManualCustomer;
        setUseManualCustomer(newValue);
        form.setValue("useManualCustomer", newValue);

        if (newValue) {
            // Switching to manual entry - clear selected customer ID
            form.setValue("customerId", "");
            // Clear validation error if any
            form.clearErrors("customerId");
        } else {
            // Switching to dropdown selection - clear manual customer name
            form.setValue("customerName", "");
            // Clear validation error if any
            form.clearErrors("customerName");
        }
    };

    return (
        <div className="container max-w-5xl space-y-6 py-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        onClick={handleCancel}
                        size="icon"
                        className="h-8 w-8"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {getPageTitle()}
                    </h1>
                </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="md:col-span-2">
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-6"
                        >
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg">
                                        Basic Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        {/* Entry Type */}
                                        <FormField
                                            control={form.control}
                                            name="entryType"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Entry Type{" "}
                                                        <span className="text-destructive">
                                                            *
                                                        </span>
                                                    </FormLabel>
                                                    <Select
                                                        onValueChange={
                                                            field.onChange
                                                        }
                                                        defaultValue={
                                                            field.value
                                                        }
                                                        disabled={
                                                            typeParam ===
                                                                "payable" ||
                                                            typeParam ===
                                                                "receivable"
                                                        }
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select entry type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="PAYABLE">
                                                                Payable
                                                                (Outgoing)
                                                            </SelectItem>
                                                            <SelectItem value="RECEIVABLE">
                                                                Receivable
                                                                (Incoming)
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription>
                                                        Payable is money you
                                                        owe; Receivable is money
                                                        owed to you
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
                                                    <FormLabel>
                                                        Description{" "}
                                                        <span className="text-destructive">
                                                            *
                                                        </span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Enter description"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Brief description of
                                                        this transaction
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Amount */}
                                        <FormField
                                            control={form.control}
                                            name="amount"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Amount{" "}
                                                        <span className="text-destructive">
                                                            *
                                                        </span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Enter amount"
                                                            type="number"
                                                            min="0.01"
                                                            step="0.01"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Amount in PKR (e.g.
                                                        1000.00)
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Reference Number */}
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
                                                            placeholder="Enter reference number"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Optional reference
                                                        number for this
                                                        transaction
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg">
                                        Dates
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        {/* Entry Date */}
                                        <FormField
                                            control={form.control}
                                            name="entryDate"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>
                                                        Entry Date{" "}
                                                        <span className="text-destructive">
                                                            *
                                                        </span>
                                                    </FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant={
                                                                        "outline"
                                                                    }
                                                                    className={cn(
                                                                        "pl-3 text-left font-normal",
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
                                                                            Pick
                                                                            a
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
                                                                    field.value
                                                                }
                                                                onSelect={
                                                                    field.onChange
                                                                }
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormDescription>
                                                        Date when this entry was
                                                        recorded
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Due Date */}
                                        <FormField
                                            control={form.control}
                                            name="dueDate"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>
                                                        Due Date
                                                    </FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant={
                                                                        "outline"
                                                                    }
                                                                    className={cn(
                                                                        "pl-3 text-left font-normal",
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
                                                                            Pick
                                                                            a
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
                                                                    field.value ||
                                                                    undefined
                                                                }
                                                                onSelect={
                                                                    field.onChange
                                                                }
                                                                initialFocus
                                                                disabled={(
                                                                    date,
                                                                ) =>
                                                                    date <
                                                                    new Date(
                                                                        "1900-01-01",
                                                                    )
                                                                }
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormDescription>
                                                        Date when payment is due
                                                        (optional)
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg">
                                        {entryType === "PAYABLE"
                                            ? "Vendor Information"
                                            : "Customer Information"}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Vendor (for Payables) */}
                                    {entryType === "PAYABLE" && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <FormLabel className="text-base">
                                                    Vendor{" "}
                                                    <span className="text-destructive">
                                                        *
                                                    </span>
                                                </FormLabel>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={toggleManualVendor}
                                                >
                                                    {useManualVendor
                                                        ? "Select Existing Vendor"
                                                        : "Enter Manually"}
                                                </Button>
                                            </div>

                                            {!useManualVendor ? (
                                                <FormField
                                                    control={form.control}
                                                    name="vendorId"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <Select
                                                                onValueChange={
                                                                    field.onChange
                                                                }
                                                                value={
                                                                    field.value
                                                                }
                                                                disabled={
                                                                    isLoadingParties
                                                                }
                                                            >
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Select vendor" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    {isLoadingParties ? (
                                                                        <div className="flex items-center justify-center p-2">
                                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                            <span>
                                                                                Loading
                                                                                vendors...
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        vendors.map(
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
                                                                        )
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormDescription>
                                                                Select a vendor
                                                                from your
                                                                existing records
                                                            </FormDescription>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            ) : (
                                                <FormField
                                                    control={form.control}
                                                    name="vendorName"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <Input
                                                                    placeholder="Enter vendor name"
                                                                    {...field}
                                                                />
                                                            </FormControl>
                                                            <FormDescription>
                                                                Enter vendor
                                                                name manually
                                                                (will not be
                                                                added to your
                                                                vendor records)
                                                            </FormDescription>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            )}
                                        </div>
                                    )}

                                    {/* Customer (for Receivables) */}
                                    {entryType === "RECEIVABLE" && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <FormLabel className="text-base">
                                                    Customer{" "}
                                                    <span className="text-destructive">
                                                        *
                                                    </span>
                                                </FormLabel>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={
                                                        toggleManualCustomer
                                                    }
                                                >
                                                    {useManualCustomer
                                                        ? "Select Existing Customer"
                                                        : "Enter Manually"}
                                                </Button>
                                            </div>

                                            {!useManualCustomer ? (
                                                <FormField
                                                    control={form.control}
                                                    name="customerId"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <Select
                                                                onValueChange={
                                                                    field.onChange
                                                                }
                                                                value={
                                                                    field.value
                                                                }
                                                                disabled={
                                                                    isLoadingParties
                                                                }
                                                            >
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Select customer" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    {isLoadingParties ? (
                                                                        <div className="flex items-center justify-center p-2">
                                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                            <span>
                                                                                Loading
                                                                                customers...
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        customers.map(
                                                                            (
                                                                                customer,
                                                                            ) => (
                                                                                <SelectItem
                                                                                    key={
                                                                                        customer.id
                                                                                    }
                                                                                    value={customer.id.toString()}
                                                                                >
                                                                                    {
                                                                                        customer.name
                                                                                    }
                                                                                </SelectItem>
                                                                            ),
                                                                        )
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormDescription>
                                                                Select a
                                                                customer from
                                                                your existing
                                                                records
                                                            </FormDescription>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            ) : (
                                                <FormField
                                                    control={form.control}
                                                    name="customerName"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <Input
                                                                    placeholder="Enter customer name"
                                                                    {...field}
                                                                />
                                                            </FormControl>
                                                            <FormDescription>
                                                                Enter customer
                                                                name manually
                                                                (will not be
                                                                added to your
                                                                customer
                                                                records)
                                                            </FormDescription>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg">
                                        Additional Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {/* Notes */}
                                    <FormField
                                        control={form.control}
                                        name="notes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Notes</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Enter any additional notes"
                                                        className="min-h-[100px]"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Additional information about
                                                    this entry
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save Entry"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>

                <div>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">
                                Entry Guide
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start gap-2">
                                <Info className="text-muted-foreground mt-0.5 h-5 w-5" />
                                <div>
                                    <h3 className="font-medium">
                                        Payable vs Receivable
                                    </h3>
                                    <p className="text-muted-foreground text-sm">
                                        Payable is money you owe to someone.
                                        Receivable is money someone owes you.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-2">
                                <Info className="text-muted-foreground mt-0.5 h-5 w-5" />
                                <div>
                                    <h3 className="font-medium">Due Date</h3>
                                    <p className="text-muted-foreground text-sm">
                                        Setting a due date helps track when
                                        payments are expected.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-2">
                                <Info className="text-muted-foreground mt-0.5 h-5 w-5" />
                                <div>
                                    <h3 className="font-medium">
                                        Manual Entry
                                    </h3>
                                    <p className="text-muted-foreground text-sm">
                                        Use manual entry if the vendor/customer
                                        isn&apos;t in your records.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// Export a new component that uses Suspense
export default function NewLedgerEntryPage() {
    return (
        <Suspense
            fallback={
                <div className="container flex items-center justify-center py-10">
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    <p>Loading form...</p>
                </div>
            }
        >
            <NewLedgerEntryContent />
        </Suspense>
    );
}
