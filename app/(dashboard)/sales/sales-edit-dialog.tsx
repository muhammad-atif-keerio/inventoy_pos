"use client";

import React, { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import {
    ChequeStatus,
    ColorStatus,
    PaymentMode,
    PaymentStatus,
    ProductType,
} from "@prisma/client";
import { format } from "date-fns";
import {
    AlertCircle,
    CalendarIcon,
    Loader2,
    Package,
    Receipt,
    Save,
    Truck,
    User,
} from "lucide-react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { cn } from "@/lib/utils";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import { SalesOrderItem } from "./columns";

// Define schema with validation
const saleFormSchema = z
    .object({
        customerName: z
            .string()
            .min(2, "Customer name must be at least 2 characters"),
        orderNumber: z.string().optional(),
        quantitySold: z.string().refine((val) => {
            const num = parseInt(val);
            return !isNaN(num) && num > 0;
        }, "Quantity must be a positive number"),
        salePrice: z.string().refine((val) => {
            const num = parseFloat(val);
            return !isNaN(num) && num > 0;
        }, "Price must be a positive number"),
        discount: z
            .string()
            .optional()
            .refine(
                (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
                {
                    message:
                        "Discount must be a non-negative number if provided",
                },
            ),
        tax: z
            .string()
            .optional()
            .refine(
                (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
                {
                    message: "Tax must be a non-negative number if provided",
                },
            ),
        orderDate: z.date(),
        deliveryDate: z.date().optional(),
        deliveryAddress: z.string().optional(),
        remarks: z.string().optional(),
        paymentStatus: z.nativeEnum(PaymentStatus),
        paymentMode: z.nativeEnum(PaymentMode).optional(),
        paymentAmount: z
            .string()
            .optional()
            .refine(
                (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
                { message: "Payment amount must be a non-negative number" },
            ),
        chequeNumber: z.string().optional(),
        bank: z.string().optional(),
        branch: z.string().optional(),
        updateInventory: z.boolean(),
    })
    .refine(
        (data) => {
            // Check if cheque details are required
            if (data.paymentMode === PaymentMode.CHEQUE) {
                return !!data.chequeNumber && !!data.bank;
            }
            return true;
        },
        {
            message:
                "Cheque number and bank are required when payment mode is CHEQUE",
            path: ["chequeNumber"],
        },
    );

type SaleFormValues = z.infer<typeof saleFormSchema>;

// Define a type for the API response payment object
interface ApiPayment {
    id: number;
    amount: number;
    mode: PaymentMode;
    transactionDate: string;
    referenceNumber?: string;
    description: string;
    remarks?: string;
    createdAt: string;
    updatedAt: string;
    chequeTransaction?: {
        id: number;
        chequeNumber: string;
        bank: string;
        branch?: string;
        chequeAmount: number;
        issueDate: string;
        clearanceDate?: string;
        chequeStatus: ChequeStatus;
        remarks?: string;
    } | null;
}

// Define a type for the inventory entry in API response
interface InventoryEntry {
    id: number;
    quantity: number;
    transactionType: string;
    transactionDate: string;
    inventoryId?: number;
    inventory?: {
        id: number;
        itemCode: string;
        currentQuantity: number;
    };
}

// Define a type for the API response
interface SaleApiResponse {
    id: number;
    orderNumber: string;
    orderDate: string;
    customerId: number;
    customerName?: string;
    productType: ProductType;
    productId: number;
    productName?: string;
    quantitySold: number;
    unitPrice: number;
    discount?: number | null;
    tax?: number | null;
    totalSale: number;
    deliveryDate?: string | null;
    deliveryAddress?: string | null;
    remarks?: string | null;
    paymentMode?: PaymentMode | null;
    paymentStatus: PaymentStatus;
    payments: ApiPayment[];
    customer?: {
        id: number;
        name: string;
        contact?: string;
        email?: string;
        address?: string;
        city?: string;
    } | null;
    threadPurchase?: {
        id: number;
        threadType: string;
        color?: string;
        colorStatus: ColorStatus;
        vendor?: {
            id: number;
            name: string;
        } | null;
    } | null;
    fabricProduction?: {
        id: number;
        fabricType: string;
        dimensions?: string;
        batchNumber?: string;
    } | null;
    inventoryEntries?: InventoryEntry[];
    updateInventory?: boolean;
}

export function SalesEditDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [sale, setSale] = useState<SalesOrderItem | null>(null);
    const [forceRender, setForceRender] = useState(0);

    // Form setup with validation
    const form = useForm<SaleFormValues>({
        resolver: zodResolver(saleFormSchema),
        defaultValues: {
            customerName: "",
            orderNumber: "",
            quantitySold: "",
            salePrice: "",
            discount: "",
            tax: "",
            orderDate: new Date(),
            deliveryAddress: "",
            remarks: "",
            paymentStatus: PaymentStatus.PENDING,
            paymentMode: PaymentMode.CASH,
            paymentAmount: "",
            chequeNumber: "",
            bank: "",
            branch: "",
            updateInventory: true,
        },
    });

    // Force updates when key fields change
    useEffect(() => {
        // Every time we force a render, trigger validation to refresh the UI
        if (forceRender > 0) {
            form.trigger();
        }
    }, [forceRender, form]);

    // Update payment amount when quantity, price, discount, or tax changes and payment status is PAID
    useEffect(() => {
        const subscription = form.watch((value, { name }) => {
            // Only update if one of these fields changes and payment status is PAID
            if (
                ["quantitySold", "salePrice", "discount", "tax"].includes(
                    name as string,
                ) &&
                form.getValues("paymentStatus") === PaymentStatus.PAID
            ) {
                const quantitySold = parseInt(value.quantitySold || "0");
                const salePrice = parseFloat(value.salePrice || "0");
                const discount = parseFloat(value.discount || "0");
                const tax = parseFloat(value.tax || "0");

                let totalAmount = quantitySold * salePrice;
                if (!isNaN(discount)) totalAmount -= discount;
                if (!isNaN(tax)) totalAmount += tax;

                // Only update if we have valid values to calculate with
                if (quantitySold > 0 && salePrice > 0) {
                    form.setValue("paymentAmount", totalAmount.toString(), {
                        shouldValidate: true,
                    });
                }
            }
        });

        return () => subscription.unsubscribe();
    }, [form]);

    // Listen for custom edit event
    useEffect(() => {
        const handleEditSale = (event: Event) => {
            const customEvent = event as CustomEvent<SalesOrderItem>;
            setSale(customEvent.detail as SalesOrderItem);
            setOpen(true);
        };

        window.addEventListener("editSale", handleEditSale);

        return () => {
            window.removeEventListener("editSale", handleEditSale);
        };
    }, []);

    // Add a useEffect hook to force render when dialog opens
    useEffect(() => {
        if (open) {
            // Force a re-render after a slight delay to ensure data is displayed
            const timer = setTimeout(() => {
                setForceRender((prev) => prev + 1);
            }, 200);

            return () => clearTimeout(timer);
        }
    }, [open]);

    // Fetch sale details and populate form when opened
    useEffect(() => {
        if (open && sale?.id) {
            fetchSaleDetails(sale.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, sale?.id]);

    // Set sale after type casting to ensure compatibility
    const setSaleWithTypeCheck = (data: SaleApiResponse) => {
        // Convert API response to SalesOrderItem format
        const saleItem: SalesOrderItem = {
            id: data.id,
            orderNumber: data.orderNumber || "",
            orderDate: data.orderDate,
            customerId: data.customerId,
            customerName: data.customer?.name || data.customerName || "",
            productType: data.productType,
            productId: data.productId,
            productName: data.productName || "",
            quantitySold: data.quantitySold,
            unitPrice: data.unitPrice,
            salePrice: data.unitPrice,
            discount: data.discount as number | undefined,
            tax: data.tax as number | undefined,
            totalSale: data.totalSale,
            deliveryDate: data.deliveryDate as string | undefined,
            deliveryAddress: data.deliveryAddress as string | undefined,
            remarks: data.remarks as string | undefined,
            paymentMode: data.paymentMode as PaymentMode | undefined,
            paymentStatus: data.paymentStatus,
            threadPurchase: data.threadPurchase
                ? {
                      id: data.threadPurchase.id,
                      threadType: data.threadPurchase.threadType,
                      color: data.threadPurchase.color || undefined,
                      colorStatus: data.threadPurchase.colorStatus,
                      vendorName: data.threadPurchase.vendor?.name,
                  }
                : undefined,
            fabricProduction: data.fabricProduction
                ? {
                      id: data.fabricProduction.id,
                      fabricType: data.fabricProduction.fabricType,
                      dimensions: data.fabricProduction.dimensions,
                      batchNumber: data.fabricProduction.batchNumber,
                  }
                : undefined,
            payments: data.payments?.map((payment) => ({
                id: payment.id,
                amount: payment.amount,
                mode: payment.mode,
                transactionDate: payment.transactionDate,
                referenceNumber: payment.referenceNumber,
                description: payment.description,
                chequeTransaction: payment.chequeTransaction
                    ? {
                          id: payment.chequeTransaction.id,
                          chequeNumber: payment.chequeTransaction.chequeNumber,
                          bank: payment.chequeTransaction.bank,
                          branch: payment.chequeTransaction.branch,
                          chequeAmount: payment.chequeTransaction.chequeAmount,
                          chequeStatus: payment.chequeTransaction.chequeStatus,
                          clearanceDate:
                              payment.chequeTransaction.clearanceDate,
                      }
                    : null,
            })),
            inventoryEntries: data.inventoryEntries?.map((entry) => ({
                id: entry.id,
                quantity: entry.quantity,
                transactionType: entry.transactionType,
                transactionDate: entry.transactionDate,
                inventoryId: entry.inventoryId,
                inventoryCode: entry.inventory?.itemCode,
            })),
        };

        setSale(saleItem);
    };

    const handleOpenChange = (newOpenState: boolean) => {
        setOpen(newOpenState);
        if (!newOpenState) {
            // Reset form when dialog closes
            form.reset();
            setSale(null);
        }
    };

    const fetchSaleDetails = async (saleId: number) => {
        setLoadingDetails(true);
        try {
            const response = await fetch(`/api/sales/${saleId}`);
            if (!response.ok) {
                throw new Error("Failed to fetch sale details");
            }

            const data = (await response.json()) as SaleApiResponse;
            console.log("API Response:", data); // Debug log

            // Validate that we have the required data
            if (!data || !data.id) {
                throw new Error("Invalid data received from API");
            }

            // Set sale with proper type conversion
            setSaleWithTypeCheck(data);

            // Extract cheque details from payments if available
            let chequeNumber = "";
            let bank = "";
            let branch = "";
            let totalPaymentAmount = 0;

            if (
                data.payments &&
                Array.isArray(data.payments) &&
                data.payments.length > 0
            ) {
                // Calculate total payment amount
                totalPaymentAmount = data.payments.reduce((sum, payment) => {
                    const amount =
                        typeof payment.amount === "number"
                            ? payment.amount
                            : parseFloat(String(payment.amount));
                    return sum + (isNaN(amount) ? 0 : amount);
                }, 0);

                // Find a cheque payment if any exists
                const chequePayment = data.payments.find(
                    (payment) =>
                        payment.mode === PaymentMode.CHEQUE &&
                        payment.chequeTransaction,
                );

                if (chequePayment?.chequeTransaction) {
                    chequeNumber =
                        chequePayment.chequeTransaction.chequeNumber || "";
                    bank = chequePayment.chequeTransaction.bank || "";
                    branch = chequePayment.chequeTransaction.branch || "";
                }
            }

            // Important: First reset the form with empty values
            form.reset(
                {
                    customerName: "",
                    orderNumber: "",
                    quantitySold: "",
                    salePrice: "",
                    discount: "",
                    tax: "",
                    orderDate: new Date(),
                    deliveryDate: undefined,
                    deliveryAddress: "",
                    remarks: "",
                    paymentStatus: PaymentStatus.PENDING,
                    paymentMode: PaymentMode.CASH,
                    paymentAmount: "",
                    chequeNumber: "",
                    bank: "",
                    branch: "",
                    updateInventory: true,
                },
                { keepDefaultValues: false },
            );

            // Wait a bit for reset to complete
            setTimeout(() => {
                try {
                    // Then set individual field values directly
                    // Customer Information
                    form.setValue(
                        "customerName",
                        data.customer?.name || data.customerName || "",
                        { shouldValidate: true },
                    );

                    // Order Information
                    form.setValue("orderNumber", data.orderNumber || "", {
                        shouldValidate: true,
                    });
                    if (data.orderDate) {
                        const orderDate = new Date(data.orderDate);
                        form.setValue("orderDate", orderDate, {
                            shouldValidate: true,
                        });
                    }
                    form.setValue(
                        "quantitySold",
                        String(data.quantitySold || 0),
                        { shouldValidate: true },
                    );

                    // Handle potential different field names and formats
                    let unitPrice = 0;
                    if (
                        typeof data.unitPrice === "number" &&
                        !isNaN(data.unitPrice)
                    ) {
                        unitPrice = data.unitPrice;
                    } else {
                        // If unitPrice is not a valid number (which should never happen), try parsing it
                        const parsedUnitPrice = parseFloat(
                            String(data.unitPrice || 0),
                        );
                        if (!isNaN(parsedUnitPrice)) {
                            unitPrice = parsedUnitPrice;
                        }
                    }
                    form.setValue("salePrice", String(unitPrice || 0), {
                        shouldValidate: true,
                    });

                    // Payment Details
                    form.setValue("paymentStatus", data.paymentStatus, {
                        shouldValidate: true,
                    });
                    form.setValue(
                        "paymentMode",
                        data.paymentMode || PaymentMode.CASH,
                        { shouldValidate: true },
                    );
                    form.setValue(
                        "paymentAmount",
                        totalPaymentAmount > 0
                            ? String(totalPaymentAmount)
                            : "",
                        { shouldValidate: true },
                    );

                    // Handle discount
                    if (data.discount !== null && data.discount !== undefined) {
                        const discountValue =
                            typeof data.discount === "number"
                                ? data.discount
                                : parseFloat(String(data.discount));
                        form.setValue(
                            "discount",
                            isNaN(discountValue) ? "" : String(discountValue),
                            { shouldValidate: true },
                        );
                    } else {
                        form.setValue("discount", "", { shouldValidate: true });
                    }

                    // Handle tax
                    if (data.tax !== null && data.tax !== undefined) {
                        const taxValue =
                            typeof data.tax === "number"
                                ? data.tax
                                : parseFloat(String(data.tax));
                        form.setValue(
                            "tax",
                            isNaN(taxValue) ? "" : String(taxValue),
                            { shouldValidate: true },
                        );
                    } else {
                        form.setValue("tax", "", { shouldValidate: true });
                    }

                    // Cheque Details
                    form.setValue("chequeNumber", chequeNumber, {
                        shouldValidate: true,
                    });
                    form.setValue("bank", bank, { shouldValidate: true });
                    form.setValue("branch", branch, { shouldValidate: true });

                    // Delivery Information
                    if (data.deliveryDate) {
                        const deliveryDate = new Date(data.deliveryDate);
                        form.setValue("deliveryDate", deliveryDate, {
                            shouldValidate: true,
                        });
                    }
                    form.setValue(
                        "deliveryAddress",
                        data.deliveryAddress || "",
                        { shouldValidate: true },
                    );

                    // Additional Information
                    form.setValue("remarks", data.remarks || "", {
                        shouldValidate: true,
                    });
                    form.setValue(
                        "updateInventory",
                        typeof data.updateInventory === "boolean"
                            ? data.updateInventory
                            : true,
                        { shouldValidate: true },
                    );

                    // Log form values for debugging
                    console.log("Form values after setting:", form.getValues());

                    // Force re-render the entire form
                    setForceRender((prev) => prev + 1);

                    // Trigger form validation and re-render
                    form.trigger();
                } catch (err) {
                    console.error("Error setting form values:", err);
                }
            }, 100);
        } catch (error) {
            console.error("Error fetching sale details:", error);
            toast.error("Could not load sale details", {
                description: "Please try again later",
            });
        } finally {
            setLoadingDetails(false);
        }
    };

    const onSubmit: SubmitHandler<SaleFormValues> = async (values) => {
        if (!sale) return;

        setLoading(true);
        try {
            // Calculate total price
            const quantity = parseInt(values.quantitySold);
            const price = parseFloat(values.salePrice);
            let totalPrice = quantity * price;

            // Apply discount if provided
            if (values.discount && !isNaN(parseFloat(values.discount))) {
                totalPrice -= parseFloat(values.discount);
            }

            // Apply tax if provided
            if (values.tax && !isNaN(parseFloat(values.tax))) {
                totalPrice += parseFloat(values.tax);
            }

            // Handle payment amount based on payment status
            let paymentAmount = 0;
            if (values.paymentStatus === PaymentStatus.PAID) {
                paymentAmount = totalPrice;
            } else if (
                values.paymentStatus === PaymentStatus.PARTIAL &&
                values.paymentAmount
            ) {
                paymentAmount = parseFloat(values.paymentAmount);
            }

            // Prepare data for updating
            const updateData = {
                id: sale.id,
                customerName: values.customerName,
                orderNumber: values.orderNumber,
                quantitySold: parseInt(values.quantitySold),
                unitPrice: parseFloat(values.salePrice),
                discount: values.discount ? parseFloat(values.discount) : null,
                tax: values.tax ? parseFloat(values.tax) : null,
                totalSale: totalPrice,
                orderDate: values.orderDate.toISOString(),
                deliveryDate: values.deliveryDate
                    ? values.deliveryDate.toISOString()
                    : null,
                deliveryAddress: values.deliveryAddress || null,
                remarks: values.remarks || null,
                paymentStatus: values.paymentStatus,
                paymentMode: values.paymentMode,
                paymentAmount: paymentAmount,
                chequeDetails:
                    values.paymentMode === PaymentMode.CHEQUE
                        ? {
                              chequeNumber: values.chequeNumber,
                              bank: values.bank,
                              branch: values.branch || null,
                          }
                        : null,
                updateInventory: values.updateInventory,
            };

            // Submit update to API
            const response = await fetch(`/api/sales/${sale.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Failed to update sale");
            }

            await response.json();

            toast.success("Sale updated successfully", {
                description: `Order ${values.orderNumber || "#" + sale.id} has been updated.`,
            });

            handleOpenChange(false);

            // Refresh data by dispatching a custom event
            window.dispatchEvent(new CustomEvent("salesDataUpdated"));
        } catch (error) {
            console.error("Error updating sale:", error);
            const errorMessage =
                error instanceof Error ? error.message : "An error occurred";

            toast.error("Failed to update sale", {
                description: errorMessage,
            });
        } finally {
            setLoading(false);
        }
    };

    if (!sale) return null;

    // Only show inventory warning for thread and fabric sales that actually update inventory
    const showInventoryWarning =
        (sale.productType === "THREAD" || sale.productType === "FABRIC") &&
        sale.quantitySold > 0 &&
        form.watch("updateInventory") === true;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[900px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span>Edit Sale {sale.orderNumber}</span>
                    </DialogTitle>
                    <DialogDescription>
                        Update the sale details and press Save to apply changes
                    </DialogDescription>
                </DialogHeader>

                {loadingDetails ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="text-center">
                            <Loader2 className="text-primary mx-auto mb-2 h-8 w-8 animate-spin" />
                            <p className="text-muted-foreground text-sm">
                                Loading sale details...
                            </p>
                        </div>
                    </div>
                ) : (
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-6"
                        >
                            {showInventoryWarning && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>
                                        Important: Inventory will be affected
                                    </AlertTitle>
                                    <AlertDescription>
                                        This will update the inventory levels
                                        for the selected product.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="grid gap-6 md:grid-cols-3">
                                {/* Customer Information */}
                                <Card className="col-span-1 md:col-span-1">
                                    <CardHeader className="bg-muted/20 pb-3">
                                        <CardTitle className="flex items-center text-sm font-medium">
                                            <User className="text-muted-foreground mr-2 h-4 w-4" />
                                            Customer Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-4">
                                        <FormField
                                            control={form.control}
                                            name="customerName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Customer Name
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            value={field.value}
                                                            onChange={(e) => {
                                                                field.onChange(
                                                                    e,
                                                                );
                                                                form.trigger(
                                                                    "customerName",
                                                                );
                                                            }}
                                                            placeholder="Enter customer name"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>

                                {/* Order Information */}
                                <Card className="col-span-1 md:col-span-2">
                                    <CardHeader className="bg-muted/20 pb-3">
                                        <CardTitle className="flex items-center text-sm font-medium">
                                            <Package className="text-muted-foreground mr-2 h-4 w-4" />
                                            Order Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="orderNumber"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Order Number
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                value={
                                                                    field.value
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    field.onChange(
                                                                        e,
                                                                    );
                                                                    form.trigger(
                                                                        "orderNumber",
                                                                    );
                                                                }}
                                                                placeholder="Enter order number"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="orderDate"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col">
                                                        <FormLabel>
                                                            Order Date
                                                        </FormLabel>
                                                        <Popover>
                                                            <PopoverTrigger
                                                                asChild
                                                            >
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
                                                                        type="button" // Important to prevent form submission
                                                                    >
                                                                        {field.value ? (
                                                                            format(
                                                                                field.value,
                                                                                "PPP",
                                                                            )
                                                                        ) : (
                                                                            <span>
                                                                                Select
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
                                                                    onSelect={(
                                                                        date,
                                                                    ) => {
                                                                        if (
                                                                            date
                                                                        ) {
                                                                            field.onChange(
                                                                                date,
                                                                            );
                                                                        }
                                                                        form.trigger(
                                                                            "orderDate",
                                                                        );
                                                                    }}
                                                                    initialFocus
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="quantitySold"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Quantity
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                value={
                                                                    field.value
                                                                }
                                                                type="number"
                                                                min="1"
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    field.onChange(
                                                                        e,
                                                                    );
                                                                    form.trigger(
                                                                        "quantitySold",
                                                                    );

                                                                    // Auto-update payment amount if status is PAID
                                                                    if (
                                                                        form.watch(
                                                                            "paymentStatus",
                                                                        ) ===
                                                                        PaymentStatus.PAID
                                                                    ) {
                                                                        const quantitySold =
                                                                            parseInt(
                                                                                e
                                                                                    .target
                                                                                    .value ||
                                                                                    "0",
                                                                            );
                                                                        const salePrice =
                                                                            parseFloat(
                                                                                form.getValues(
                                                                                    "salePrice",
                                                                                ) ||
                                                                                    "0",
                                                                            );
                                                                        const discount =
                                                                            parseFloat(
                                                                                form.getValues(
                                                                                    "discount",
                                                                                ) ||
                                                                                    "0",
                                                                            );
                                                                        const tax =
                                                                            parseFloat(
                                                                                form.getValues(
                                                                                    "tax",
                                                                                ) ||
                                                                                    "0",
                                                                            );

                                                                        let totalAmount =
                                                                            quantitySold *
                                                                            salePrice;
                                                                        if (
                                                                            !isNaN(
                                                                                discount,
                                                                            )
                                                                        )
                                                                            totalAmount -=
                                                                                discount;
                                                                        if (
                                                                            !isNaN(
                                                                                tax,
                                                                            )
                                                                        )
                                                                            totalAmount +=
                                                                                tax;

                                                                        if (
                                                                            totalAmount >
                                                                            0
                                                                        ) {
                                                                            form.setValue(
                                                                                "paymentAmount",
                                                                                totalAmount.toString(),
                                                                                {
                                                                                    shouldValidate:
                                                                                        true,
                                                                                },
                                                                            );
                                                                        }
                                                                    }
                                                                }}
                                                                placeholder="Enter quantity"
                                                            />
                                                        </FormControl>
                                                        <FormDescription className="text-xs">
                                                            Current product:{" "}
                                                            {sale?.productName ||
                                                                (sale
                                                                    ? `${sale.productType} #${sale.productId}`
                                                                    : "")}
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="salePrice"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Unit Price
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                value={
                                                                    field.value
                                                                }
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    field.onChange(
                                                                        e,
                                                                    );
                                                                    form.trigger(
                                                                        "salePrice",
                                                                    );

                                                                    // Auto-update payment amount if status is PAID
                                                                    if (
                                                                        form.watch(
                                                                            "paymentStatus",
                                                                        ) ===
                                                                        PaymentStatus.PAID
                                                                    ) {
                                                                        const quantitySold =
                                                                            parseInt(
                                                                                form.getValues(
                                                                                    "quantitySold",
                                                                                ) ||
                                                                                    "0",
                                                                            );
                                                                        const salePrice =
                                                                            parseFloat(
                                                                                e
                                                                                    .target
                                                                                    .value ||
                                                                                    "0",
                                                                            );
                                                                        const discount =
                                                                            parseFloat(
                                                                                form.getValues(
                                                                                    "discount",
                                                                                ) ||
                                                                                    "0",
                                                                            );
                                                                        const tax =
                                                                            parseFloat(
                                                                                form.getValues(
                                                                                    "tax",
                                                                                ) ||
                                                                                    "0",
                                                                            );

                                                                        let totalAmount =
                                                                            quantitySold *
                                                                            salePrice;
                                                                        if (
                                                                            !isNaN(
                                                                                discount,
                                                                            )
                                                                        )
                                                                            totalAmount -=
                                                                                discount;
                                                                        if (
                                                                            !isNaN(
                                                                                tax,
                                                                            )
                                                                        )
                                                                            totalAmount +=
                                                                                tax;

                                                                        if (
                                                                            totalAmount >
                                                                            0
                                                                        ) {
                                                                            form.setValue(
                                                                                "paymentAmount",
                                                                                totalAmount.toString(),
                                                                                {
                                                                                    shouldValidate:
                                                                                        true,
                                                                                },
                                                                            );
                                                                        }
                                                                    }
                                                                }}
                                                                placeholder="Enter unit price"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Payment Details */}
                                <Card className="col-span-1 md:col-span-2">
                                    <CardHeader className="bg-muted/20 pb-3">
                                        <CardTitle className="flex items-center text-sm font-medium">
                                            <Receipt className="text-muted-foreground mr-2 h-4 w-4" />
                                            Payment Details
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="paymentStatus"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Payment Status
                                                        </FormLabel>
                                                        <Select
                                                            defaultValue={
                                                                field.value
                                                            }
                                                            value={field.value}
                                                            onValueChange={(
                                                                value: PaymentStatus,
                                                            ) => {
                                                                // Update the payment amount when setting status to PAID
                                                                if (
                                                                    value ===
                                                                    PaymentStatus.PAID
                                                                ) {
                                                                    const quantitySold =
                                                                        parseInt(
                                                                            form.getValues(
                                                                                "quantitySold",
                                                                            ) ||
                                                                                "0",
                                                                        );
                                                                    const salePrice =
                                                                        parseFloat(
                                                                            form.getValues(
                                                                                "salePrice",
                                                                            ) ||
                                                                                "0",
                                                                        );
                                                                    const discount =
                                                                        parseFloat(
                                                                            form.getValues(
                                                                                "discount",
                                                                            ) ||
                                                                                "0",
                                                                        );
                                                                    const tax =
                                                                        parseFloat(
                                                                            form.getValues(
                                                                                "tax",
                                                                            ) ||
                                                                                "0",
                                                                        );

                                                                    let totalAmount =
                                                                        quantitySold *
                                                                        salePrice;
                                                                    if (
                                                                        !isNaN(
                                                                            discount,
                                                                        )
                                                                    )
                                                                        totalAmount -=
                                                                            discount;
                                                                    if (
                                                                        !isNaN(
                                                                            tax,
                                                                        )
                                                                    )
                                                                        totalAmount +=
                                                                            tax;

                                                                    form.setValue(
                                                                        "paymentAmount",
                                                                        totalAmount.toString(),
                                                                        {
                                                                            shouldValidate:
                                                                                true,
                                                                        },
                                                                    );
                                                                } else if (
                                                                    value ===
                                                                    PaymentStatus.PENDING
                                                                ) {
                                                                    // When pending, clear payment amount and disable payment mode
                                                                    form.setValue(
                                                                        "paymentAmount",
                                                                        "",
                                                                        {
                                                                            shouldValidate:
                                                                                true,
                                                                        },
                                                                    );
                                                                    form.setValue(
                                                                        "paymentMode",
                                                                        PaymentMode.CASH,
                                                                        {
                                                                            shouldValidate:
                                                                                true,
                                                                        },
                                                                    );
                                                                }
                                                                field.onChange(
                                                                    value,
                                                                );
                                                                setForceRender(
                                                                    (prev) =>
                                                                        prev +
                                                                        1,
                                                                );
                                                            }}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select status" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem
                                                                    value={
                                                                        PaymentStatus.PAID
                                                                    }
                                                                >
                                                                    Paid
                                                                </SelectItem>
                                                                <SelectItem
                                                                    value={
                                                                        PaymentStatus.PARTIAL
                                                                    }
                                                                >
                                                                    Partial
                                                                </SelectItem>
                                                                <SelectItem
                                                                    value={
                                                                        PaymentStatus.PENDING
                                                                    }
                                                                >
                                                                    Pending
                                                                </SelectItem>
                                                                <SelectItem
                                                                    value={
                                                                        PaymentStatus.CANCELLED
                                                                    }
                                                                >
                                                                    Cancelled
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {form.watch("paymentStatus") !==
                                                PaymentStatus.PENDING && (
                                                <FormField
                                                    control={form.control}
                                                    name="paymentAmount"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>
                                                                Payment Amount
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    value={
                                                                        field.value
                                                                    }
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    disabled={
                                                                        form.watch(
                                                                            "paymentStatus",
                                                                        ) ===
                                                                        PaymentStatus.PENDING
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) => {
                                                                        field.onChange(
                                                                            e,
                                                                        );
                                                                        form.trigger(
                                                                            "paymentAmount",
                                                                        );
                                                                    }}
                                                                    placeholder="Enter payment amount"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            )}

                                            <FormField
                                                control={form.control}
                                                name="paymentMode"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Payment Mode
                                                        </FormLabel>
                                                        <Select
                                                            defaultValue={
                                                                field.value
                                                            }
                                                            value={
                                                                field.value ||
                                                                PaymentMode.CASH
                                                            }
                                                            onValueChange={(
                                                                value: PaymentMode,
                                                            ) => {
                                                                // When changing payment mode, clear cheque details if not CHEQUE
                                                                if (
                                                                    value !==
                                                                    PaymentMode.CHEQUE
                                                                ) {
                                                                    form.setValue(
                                                                        "chequeNumber",
                                                                        "",
                                                                        {
                                                                            shouldValidate:
                                                                                true,
                                                                        },
                                                                    );
                                                                    form.setValue(
                                                                        "bank",
                                                                        "",
                                                                        {
                                                                            shouldValidate:
                                                                                true,
                                                                        },
                                                                    );
                                                                    form.setValue(
                                                                        "branch",
                                                                        "",
                                                                        {
                                                                            shouldValidate:
                                                                                true,
                                                                        },
                                                                    );
                                                                }
                                                                field.onChange(
                                                                    value,
                                                                );
                                                                setForceRender(
                                                                    (prev) =>
                                                                        prev +
                                                                        1,
                                                                );
                                                            }}
                                                            disabled={
                                                                form.watch(
                                                                    "paymentStatus",
                                                                ) ===
                                                                PaymentStatus.PENDING
                                                            }
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select mode" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem
                                                                    value={
                                                                        PaymentMode.CASH
                                                                    }
                                                                >
                                                                    Cash
                                                                </SelectItem>
                                                                <SelectItem
                                                                    value={
                                                                        PaymentMode.CHEQUE
                                                                    }
                                                                >
                                                                    Cheque
                                                                </SelectItem>
                                                                <SelectItem
                                                                    value={
                                                                        PaymentMode.ONLINE
                                                                    }
                                                                >
                                                                    Online
                                                                    Transfer
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="discount"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Discount
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                value={
                                                                    field.value
                                                                }
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    field.onChange(
                                                                        e,
                                                                    );
                                                                    form.trigger(
                                                                        "discount",
                                                                    );

                                                                    // Auto-update payment amount if status is PAID
                                                                    if (
                                                                        form.watch(
                                                                            "paymentStatus",
                                                                        ) ===
                                                                        PaymentStatus.PAID
                                                                    ) {
                                                                        const quantitySold =
                                                                            parseInt(
                                                                                form.getValues(
                                                                                    "quantitySold",
                                                                                ) ||
                                                                                    "0",
                                                                            );
                                                                        const salePrice =
                                                                            parseFloat(
                                                                                form.getValues(
                                                                                    "salePrice",
                                                                                ) ||
                                                                                    "0",
                                                                            );
                                                                        const discount =
                                                                            parseFloat(
                                                                                e
                                                                                    .target
                                                                                    .value ||
                                                                                    "0",
                                                                            );
                                                                        const tax =
                                                                            parseFloat(
                                                                                form.getValues(
                                                                                    "tax",
                                                                                ) ||
                                                                                    "0",
                                                                            );

                                                                        let totalAmount =
                                                                            quantitySold *
                                                                            salePrice;
                                                                        if (
                                                                            !isNaN(
                                                                                discount,
                                                                            )
                                                                        )
                                                                            totalAmount -=
                                                                                discount;
                                                                        if (
                                                                            !isNaN(
                                                                                tax,
                                                                            )
                                                                        )
                                                                            totalAmount +=
                                                                                tax;

                                                                        if (
                                                                            totalAmount >
                                                                            0
                                                                        ) {
                                                                            form.setValue(
                                                                                "paymentAmount",
                                                                                totalAmount.toString(),
                                                                                {
                                                                                    shouldValidate:
                                                                                        true,
                                                                                },
                                                                            );
                                                                        }
                                                                    }
                                                                }}
                                                                placeholder="Enter discount amount"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="tax"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Tax
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                value={
                                                                    field.value
                                                                }
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    field.onChange(
                                                                        e,
                                                                    );
                                                                    form.trigger(
                                                                        "tax",
                                                                    );

                                                                    // Auto-update payment amount if status is PAID
                                                                    if (
                                                                        form.watch(
                                                                            "paymentStatus",
                                                                        ) ===
                                                                        PaymentStatus.PAID
                                                                    ) {
                                                                        const quantitySold =
                                                                            parseInt(
                                                                                form.getValues(
                                                                                    "quantitySold",
                                                                                ) ||
                                                                                    "0",
                                                                            );
                                                                        const salePrice =
                                                                            parseFloat(
                                                                                form.getValues(
                                                                                    "salePrice",
                                                                                ) ||
                                                                                    "0",
                                                                            );
                                                                        const discount =
                                                                            parseFloat(
                                                                                form.getValues(
                                                                                    "discount",
                                                                                ) ||
                                                                                    "0",
                                                                            );
                                                                        const tax =
                                                                            parseFloat(
                                                                                e
                                                                                    .target
                                                                                    .value ||
                                                                                    "0",
                                                                            );

                                                                        let totalAmount =
                                                                            quantitySold *
                                                                            salePrice;
                                                                        if (
                                                                            !isNaN(
                                                                                discount,
                                                                            )
                                                                        )
                                                                            totalAmount -=
                                                                                discount;
                                                                        if (
                                                                            !isNaN(
                                                                                tax,
                                                                            )
                                                                        )
                                                                            totalAmount +=
                                                                                tax;

                                                                        if (
                                                                            totalAmount >
                                                                            0
                                                                        ) {
                                                                            form.setValue(
                                                                                "paymentAmount",
                                                                                totalAmount.toString(),
                                                                                {
                                                                                    shouldValidate:
                                                                                        true,
                                                                                },
                                                                            );
                                                                        }
                                                                    }
                                                                }}
                                                                placeholder="Enter tax amount"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {/* Cheque details section */}
                                        {form.watch("paymentMode") ===
                                            PaymentMode.CHEQUE && (
                                            <div className="bg-muted/20 space-y-4 rounded-lg border p-4">
                                                <h3 className="text-sm font-medium">
                                                    Cheque Details
                                                </h3>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="chequeNumber"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    Cheque
                                                                    Number
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        value={
                                                                            field.value
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) => {
                                                                            field.onChange(
                                                                                e,
                                                                            );
                                                                            form.trigger(
                                                                                "chequeNumber",
                                                                            );
                                                                        }}
                                                                        placeholder="Enter cheque number"
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name="bank"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    Bank
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        value={
                                                                            field.value
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) => {
                                                                            field.onChange(
                                                                                e,
                                                                            );
                                                                            form.trigger(
                                                                                "bank",
                                                                            );
                                                                        }}
                                                                        placeholder="Enter bank name"
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name="branch"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    Branch
                                                                    (Optional)
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        value={
                                                                            field.value
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) => {
                                                                            field.onChange(
                                                                                e,
                                                                            );
                                                                            form.trigger(
                                                                                "branch",
                                                                            );
                                                                        }}
                                                                        placeholder="Enter branch name"
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Delivery Information */}
                                <Card className="col-span-1 md:col-span-1">
                                    <CardHeader className="bg-muted/20 pb-3">
                                        <CardTitle className="flex items-center text-sm font-medium">
                                            <Truck className="text-muted-foreground mr-2 h-4 w-4" />
                                            Delivery Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-4">
                                        <FormField
                                            control={form.control}
                                            name="deliveryDate"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>
                                                        Delivery Date (Optional)
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
                                                                    type="button" // Important to prevent form submission
                                                                >
                                                                    {field.value ? (
                                                                        format(
                                                                            field.value,
                                                                            "PPP",
                                                                        )
                                                                    ) : (
                                                                        <span>
                                                                            Select
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
                                                                onSelect={(
                                                                    date,
                                                                ) => {
                                                                    field.onChange(
                                                                        date,
                                                                    );
                                                                    form.trigger(
                                                                        "deliveryDate",
                                                                    );
                                                                }}
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="deliveryAddress"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Delivery Address
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            value={
                                                                field.value ||
                                                                ""
                                                            }
                                                            placeholder="Enter delivery address"
                                                            className="h-20 resize-none"
                                                            onChange={(e) => {
                                                                field.onChange(
                                                                    e,
                                                                );
                                                                form.trigger(
                                                                    "deliveryAddress",
                                                                );
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>

                                {/* Additional Information */}
                                <Card className="col-span-1 md:col-span-3">
                                    <CardHeader className="bg-muted/20 pb-3">
                                        <CardTitle className="text-sm font-medium">
                                            Additional Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-4">
                                        <FormField
                                            control={form.control}
                                            name="remarks"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Remarks
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            value={
                                                                field.value ||
                                                                ""
                                                            }
                                                            placeholder="Add any additional notes or remarks"
                                                            className="resize-none"
                                                            onChange={(e) => {
                                                                field.onChange(
                                                                    e,
                                                                );
                                                                form.trigger(
                                                                    "remarks",
                                                                );
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <Separator className="my-4" />

                                        <FormField
                                            control={form.control}
                                            name="updateInventory"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={
                                                                field.value
                                                            }
                                                            onCheckedChange={(
                                                                checked,
                                                            ) => {
                                                                field.onChange(
                                                                    checked,
                                                                );
                                                                form.trigger(
                                                                    "updateInventory",
                                                                );
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel>
                                                            Update Inventory
                                                        </FormLabel>
                                                        <FormDescription>
                                                            When checked,
                                                            inventory will be
                                                            updated to reflect
                                                            quantity changes
                                                        </FormDescription>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>
                            </div>

                            <DialogFooter className="flex items-center justify-between border-t pt-4">
                                <div className="text-muted-foreground text-sm">
                                    <span>
                                        Last updated:{" "}
                                        {sale.orderDate
                                            ? format(
                                                  new Date(sale.orderDate),
                                                  "PPP",
                                              )
                                            : "Unknown"}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        type="button"
                                        onClick={() => handleOpenChange(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={loading}>
                                        {loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save Changes
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </DialogFooter>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}
