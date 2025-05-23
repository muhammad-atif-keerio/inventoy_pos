"use client";

import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { format } from "date-fns";
import {
    ArrowLeft,
    CalendarClock,
    ChevronRight,
    ClipboardCheck,
    DollarSign,
    FileEdit,
    Info,
    Loader2,
    Package,
    Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { ThreadPurchase } from "../columns";

export default function ThreadOrderDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [order, setOrder] = React.useState<ThreadPurchase | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
    const [isProcessing, setIsProcessing] = React.useState(false);

    React.useEffect(() => {
        const controller = new AbortController();

        const fetchOrder = async () => {
            setLoading(true);
            setError(null);

            try {
                // Safely encode the ID parameter for the URL
                const encodedId = encodeURIComponent(id);
                console.log(
                    `Fetching thread order with ID: ${id} (encoded: ${encodedId})`,
                );

                const response = await fetch(`/api/thread/${encodedId}`, {
                    signal: controller.signal,
                });

                console.log(
                    `Response status: ${response.status} ${response.statusText}`,
                );

                // Handle 404 error specifically
                if (response.status === 404) {
                    setError(
                        "Thread order not found. It may have been deleted.",
                    );
                    if (typeof window !== "undefined") {
                        toast.error("Thread order not found", {
                            description: "This order may have been deleted.",
                        });
                    }
                    setLoading(false);
                    return;
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`API error response: ${errorText}`);
                    throw new Error(
                        `Failed to fetch order: ${response.statusText}`,
                    );
                }

                const data = await response.json();
                console.log("Successfully fetched order data:", data);

                // Ensure numeric values are properly parsed
                const normalizedData = {
                    ...data,
                    unitPrice:
                        typeof data.unitPrice === "string"
                            ? Number(data.unitPrice)
                            : data.unitPrice,
                    totalCost:
                        typeof data.totalCost === "string"
                            ? Number(data.totalCost)
                            : data.totalCost,
                };

                setOrder(normalizedData);
            } catch (err) {
                // Don't show error for aborted requests
                if (err instanceof Error && err.name === "AbortError") {
                    console.log("Fetch aborted");
                    return;
                }

                console.error("Error fetching thread order:", err);
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load thread order",
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchOrder();

        // Cleanup function to abort fetch request when component unmounts
        return () => {
            controller.abort();
        };
    }, [id]);

    // Navigate back to orders list
    const goBack = () => {
        router.push("/thread-orders");
    };

    // Navigate to edit page
    const editOrder = () => {
        router.push(`/thread-orders/edit/${id}`);
    };

    // Toggle received status
    const toggleReceived = async () => {
        if (!order) return;

        setIsProcessing(true);
        try {
            // Check both received flag and receivedAt date for status
            const isReceived = order.received || !!order.receivedAt;
            // Toggle to the opposite status
            const newStatus = !isReceived;

            console.log(
                `Toggling receive status to: ${newStatus} for order ID: ${id}`,
            );

            const encodedId = encodeURIComponent(id);
            const response = await fetch(`/api/thread/${encodedId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    received: newStatus,
                    receivedAt: newStatus ? new Date().toISOString() : null,
                }),
            });

            console.log(
                `Toggle status response: ${response.status} ${response.statusText}`,
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API error response: ${errorText}`);
                throw new Error("Failed to update order status");
            }

            const responseData = await response.json();
            console.log("Toggle status response data:", responseData);

            // Handle response which might have data inside a 'data' property or directly at the top level
            const updatedOrder = responseData.data || responseData;
            setOrder(updatedOrder);

            // If marking as received, add to inventory
            if (newStatus) {
                try {
                    // Try to update inventory without dynamic import - use direct API endpoint instead of redirect
                    const inventoryResponse = await fetch(
                        `/api/inventory/thread-purchase`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                threadPurchaseId: updatedOrder.id,
                                createMissingType: true, // Auto-create thread type if needed
                            }),
                        },
                    );

                    if (inventoryResponse.ok) {
                        console.log("Successfully updated inventory");
                        const inventoryData = await inventoryResponse.json();
                        console.log(
                            "Inventory update response:",
                            inventoryData,
                        );

                        // Force reload page after successful inventory update for fresh data
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500); // Delay slightly to allow toast messages to be seen
                    } else {
                        const errorText = await inventoryResponse.text();
                        const errorMsg = errorText
                            ? `Error: ${errorText}`
                            : "Unknown error from inventory API";
                        console.error(
                            "Error response from inventory API:",
                            errorMsg,
                        );
                        // Show toast with error but don't fail the whole operation
                        toast.error(
                            `Order marked as received, but inventory update failed: ${errorMsg}`,
                        );
                    }
                } catch (inventoryError) {
                    console.error("Error updating inventory:", inventoryError);
                    // Show toast with error but don't fail the whole operation
                    toast.error(
                        `Order marked as received, but inventory update failed: ${inventoryError instanceof Error ? inventoryError.message : "Unknown error"}`,
                    );
                }
            }

            if (typeof window !== "undefined") {
                toast.success(
                    isReceived
                        ? "Order marked as not received"
                        : "Order marked as received",
                );
            }
        } catch (error) {
            console.error("Error updating order:", error);
            if (typeof window !== "undefined") {
                toast.error("Failed to update order status");
            }
        } finally {
            setIsProcessing(false);
        }
    };

    // Delete order
    const deleteOrder = async () => {
        setIsProcessing(true);
        try {
            console.log(`Deleting order with ID: ${id}`);

            const encodedId = encodeURIComponent(id);
            const response = await fetch(`/api/thread/${encodedId}`, {
                method: "DELETE",
            });

            console.log(
                `Delete response: ${response.status} ${response.statusText}`,
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API error response: ${errorText}`);
                throw new Error("Failed to delete order");
            }

            if (typeof window !== "undefined") {
                toast.success("Thread order deleted successfully");
            }
            router.push("/thread-orders");
        } catch (error) {
            console.error("Error deleting order:", error);
            if (typeof window !== "undefined") {
                toast.error("Failed to delete order");
            }
        } finally {
            setIsProcessing(false);
            setDeleteDialogOpen(false);
        }
    };

    const getDeliveryStatus = () => {
        if (!order) return { label: "Unknown", color: "gray" };

        // Check both received flag and receivedAt date for status
        const isReceived = order.received || !!order.receivedAt;

        if (isReceived) {
            return { label: "Received", color: "green" };
        }

        return { label: "Pending", color: "amber" };
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="container mx-auto px-4 py-10 sm:px-6">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goBack}
                            className="mr-4"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Orders
                        </Button>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-red-600">
                                Error
                            </CardTitle>
                            <CardDescription>
                                {error || "Thread order not found"}
                            </CardDescription>
                        </CardHeader>
                        <CardFooter>
                            <Button onClick={goBack}>
                                Return to Orders List
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        );
    }

    const deliveryStatus = getDeliveryStatus();

    return (
        <div className="container mx-auto px-4 py-6 sm:px-6">
            <div className="flex flex-col gap-6">
                {/* Breadcrumb & Actions */}
                <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                    <div className="text-muted-foreground flex items-center gap-1 text-sm">
                        <Button
                            variant="link"
                            className="text-muted-foreground h-auto p-0"
                            onClick={goBack}
                        >
                            Thread Orders
                        </Button>
                        <ChevronRight className="h-4 w-4" />
                        <span className="text-foreground font-medium">
                            Order #{order.id}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" onClick={editOrder}>
                            <FileEdit className="mr-2 h-4 w-4" />
                            Edit
                        </Button>

                        <Button
                            variant={
                                order.received || !!order.receivedAt
                                    ? "outline"
                                    : "default"
                            }
                            size="sm"
                            onClick={toggleReceived}
                            disabled={isProcessing}
                            className={
                                order.received || !!order.receivedAt
                                    ? ""
                                    : "bg-green-600 hover:bg-green-700"
                            }
                        >
                            <Package
                                className={`mr-2 h-4 w-4 ${isProcessing ? "animate-pulse" : ""}`}
                            />
                            {isProcessing
                                ? "Updating..."
                                : order.received || !!order.receivedAt
                                  ? "Mark as Not Received"
                                  : "Mark as Received"}
                        </Button>

                        <AlertDialog
                            open={deleteDialogOpen}
                            onOpenChange={setDeleteDialogOpen}
                        >
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        Are you sure?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete thread
                                        order #{order.id} for {order.threadType}
                                        . This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isProcessing}>
                                        Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={(e) => {
                                            e.preventDefault();
                                            deleteOrder();
                                        }}
                                        disabled={isProcessing}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        {isProcessing
                                            ? "Deleting..."
                                            : "Delete Order"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>

                {/* Main content */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Left column: Order details and thread info */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Order Header */}
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <CardTitle className="flex items-center gap-2 text-2xl">
                                            <div className="flex items-center gap-2">
                                                Thread Order #{order.id}
                                                <Badge
                                                    variant={
                                                        deliveryStatus.color ===
                                                        "green"
                                                            ? "default"
                                                            : "outline"
                                                    }
                                                    className={cn(
                                                        "ml-2",
                                                        deliveryStatus.color ===
                                                            "green" &&
                                                            "bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800",
                                                        deliveryStatus.color ===
                                                            "amber" &&
                                                            "bg-amber-100 text-amber-800 hover:bg-amber-100 hover:text-amber-800",
                                                    )}
                                                >
                                                    {deliveryStatus.label}
                                                </Badge>
                                            </div>
                                        </CardTitle>
                                        <CardDescription className="mt-1">
                                            {order.threadType}
                                            {order.color &&
                                                order.colorStatus ===
                                                    "COLORED" && (
                                                    <span className="ml-2 inline-flex items-center">
                                                        <span
                                                            className="mr-1 inline-block h-3 w-3 rounded-full"
                                                            style={{
                                                                backgroundColor:
                                                                    order.color,
                                                            }}
                                                        ></span>
                                                        {order.color}
                                                    </span>
                                                )}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Thread Information */}
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">
                                                Thread Type
                                            </span>
                                            <span className="text-sm">
                                                {order.threadType}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">
                                                Color Status
                                            </span>
                                            <span className="text-sm">
                                                {order.colorStatus ===
                                                "COLORED" ? (
                                                    <Badge className="bg-blue-100 text-blue-800">
                                                        Colored
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        className="bg-gray-100 text-gray-800"
                                                    >
                                                        Raw
                                                    </Badge>
                                                )}
                                            </span>
                                        </div>
                                        {order.color && (
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">
                                                    Color
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="border-border h-6 w-6 rounded-md border"
                                                        style={{
                                                            backgroundColor:
                                                                order.color,
                                                        }}
                                                    ></div>
                                                    <span className="text-sm">
                                                        {order.color}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <Separator />

                                    {/* Dates */}
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                        <div className="flex items-start gap-2">
                                            <CalendarClock className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                                            <div>
                                                <p className="text-sm font-medium">
                                                    Order Date
                                                </p>
                                                <p className="text-muted-foreground text-sm">
                                                    {format(
                                                        new Date(
                                                            order.orderDate,
                                                        ),
                                                        "PPP",
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2">
                                            <CalendarClock className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                                            <div>
                                                <p className="text-sm font-medium">
                                                    Delivery Date
                                                </p>
                                                <p className="text-muted-foreground text-sm">
                                                    {order.deliveryDate
                                                        ? format(
                                                              new Date(
                                                                  order.deliveryDate,
                                                              ),
                                                              "PPP",
                                                          )
                                                        : "Not specified"}
                                                </p>
                                            </div>
                                        </div>

                                        {(order.received ||
                                            !!order.receivedAt) && (
                                            <div className="flex items-start gap-2">
                                                <ClipboardCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        Received On
                                                    </p>
                                                    <p className="text-muted-foreground text-sm">
                                                        {order.receivedAt
                                                            ? format(
                                                                  new Date(
                                                                      order.receivedAt,
                                                                  ),
                                                                  "PPP",
                                                              )
                                                            : "Unknown date"}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Order Cost Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <DollarSign className="h-5 w-5" />
                                    Cost Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                        <div>
                                            <p className="text-muted-foreground text-sm">
                                                Quantity
                                            </p>
                                            <p className="text-xl font-semibold">
                                                {order.quantity.toLocaleString()}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-muted-foreground text-sm">
                                                Unit Price
                                            </p>
                                            <p className="text-xl font-semibold">
                                                PKR{" "}
                                                {Number(
                                                    order.unitPrice,
                                                ).toFixed(2)}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-muted-foreground text-sm">
                                                Total Cost
                                            </p>
                                            <p className="text-xl font-semibold">
                                                PKR{" "}
                                                {Number(
                                                    order.totalCost,
                                                ).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right column: Vendor info and notes */}
                    <div className="space-y-6">
                        {/* Vendor Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    Vendor Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-muted-foreground text-sm">
                                            Vendor:
                                        </span>
                                        <span className="text-right font-medium">
                                            {order.vendor.name}
                                        </span>
                                    </div>

                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() =>
                                            router.push(
                                                `/vendors/${order.vendorId}`,
                                            )
                                        }
                                    >
                                        View Vendor Details
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Additional Notes */}
                        {(order.reference || order.remarks) && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Info className="h-5 w-5" />
                                        Additional Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {order.reference && (
                                        <div>
                                            <p className="text-sm font-medium">
                                                Reference
                                            </p>
                                            <p className="text-muted-foreground mt-1 text-sm">
                                                {order.reference}
                                            </p>
                                        </div>
                                    )}

                                    {order.remarks && (
                                        <div>
                                            <p className="text-sm font-medium">
                                                Notes
                                            </p>
                                            <p className="text-muted-foreground mt-1 text-sm">
                                                {order.remarks}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
