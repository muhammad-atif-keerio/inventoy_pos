"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { format } from "date-fns";
import {
    Building2,
    ChevronLeft,
    Edit,
    Mail,
    MapPin,
    Package,
    Phone,
    Trash,
} from "lucide-react";
import { toast } from "sonner";

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
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { VendorItem } from "../columns";

// Interface for ThreadPurchase based on the Prisma schema
interface ThreadPurchase {
    id: number;
    orderDate: string;
    threadType: string;
    color?: string | null;
    colorStatus: "COLORED" | "RAW";
    quantity: number;
    unitPrice: number;
    totalCost: number;
    unitOfMeasure: string;
    deliveryDate?: string | null;
    remarks?: string | null;
    reference?: string | null;
    received: boolean;
    receivedAt?: string | null;
}

// Extended VendorItem with threadPurchases
interface VendorWithThreadPurchases extends VendorItem {
    threadPurchases?: ThreadPurchase[];
}

export default function VendorDetailPage() {
    const params = useParams();
    const router = useRouter();
    const vendorId = params.id as string;

    const [vendor, setVendor] = useState<VendorWithThreadPurchases | null>(
        null,
    );
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch vendor details
    useEffect(() => {
        const fetchVendorDetails = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`/api/vendors/${vendorId}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch vendor details");
                }
                const data = await response.json();
                setVendor(data);
            } catch (error) {
                console.error("Error fetching vendor details:", error);
                toast.error("Failed to load vendor details");
            } finally {
                setIsLoading(false);
            }
        };

        if (vendorId) {
            fetchVendorDetails();
        }
    }, [vendorId]);

    // Handle vendor deletion
    const handleDeleteVendor = async () => {
        if (!vendor) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/vendors/${vendorId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to delete vendor");
            }

            toast.success("Vendor deleted successfully");
            router.push("/vendors");
        } catch (error) {
            console.error("Error deleting vendor:", error);
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("Failed to delete vendor");
            }
        } finally {
            setIsDeleting(false);
        }
    };

    // Handle navigation
    const navigateBack = () => {
        router.back();
    };

    const navigateToEdit = () => {
        router.push(`/vendors/edit/${vendorId}`);
    };

    return (
        <div className="container mx-auto px-4 py-8 md:px-6">
            <div className="mb-8">
                <Button variant="ghost" onClick={navigateBack} className="mb-4">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Vendors
                </Button>

                {isLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-4 w-1/6" />
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                {vendor?.name || "Vendor Details"}
                            </h1>
                            <p className="text-muted-foreground">
                                Vendor ID: {vendor?.id}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={navigateToEdit}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                            </Button>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive">
                                        <Trash className="mr-2 h-4 w-4" />
                                        Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            Are you absolutely sure?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete the
                                            vendor &quot;{vendor?.name}&quot;
                                            and all associated data. This action
                                            cannot be undone.
                                            {vendor?.activeOrders &&
                                                vendor.activeOrders > 0 && (
                                                    <p className="text-destructive mt-2 font-semibold">
                                                        Warning: This vendor has{" "}
                                                        {vendor.activeOrders}{" "}
                                                        active thread orders.
                                                    </p>
                                                )}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>
                                            Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleDeleteVendor}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            disabled={isDeleting}
                                        >
                                            {isDeleting
                                                ? "Deleting..."
                                                : "Delete Vendor"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <Skeleton className="h-[200px]" />
                    <Skeleton className="h-[200px]" />
                    <Skeleton className="h-[200px]" />
                </div>
            ) : vendor ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {/* Vendor Details Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Building2 className="text-muted-foreground mr-2 h-5 w-5" />
                                Vendor Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-muted-foreground mb-1 text-sm font-medium">
                                    Name
                                </p>
                                <p className="font-semibold">{vendor.name}</p>
                            </div>

                            <div>
                                <p className="text-muted-foreground mb-1 flex items-center text-sm font-medium">
                                    <Phone className="mr-2 h-3.5 w-3.5" />
                                    Contact
                                </p>
                                <p>{vendor.contact}</p>
                            </div>

                            {vendor.email && (
                                <div>
                                    <p className="text-muted-foreground mb-1 flex items-center text-sm font-medium">
                                        <Mail className="mr-2 h-3.5 w-3.5" />
                                        Email
                                    </p>
                                    <p className="break-all">{vendor.email}</p>
                                </div>
                            )}

                            {(vendor.city || vendor.address) && (
                                <div>
                                    <p className="text-muted-foreground mb-1 flex items-center text-sm font-medium">
                                        <MapPin className="mr-2 h-3.5 w-3.5" />
                                        Location
                                    </p>
                                    {vendor.city && <p>{vendor.city}</p>}
                                    {vendor.address && (
                                        <p className="text-muted-foreground text-sm">
                                            {vendor.address}
                                        </p>
                                    )}
                                </div>
                            )}

                            <Separator />

                            <div className="text-muted-foreground text-sm">
                                <p>
                                    Added on{" "}
                                    {format(new Date(vendor.createdAt), "PPP")}
                                </p>
                                <p>
                                    Last updated on{" "}
                                    {format(new Date(vendor.updatedAt), "PPP")}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Order Summary Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Package className="text-muted-foreground mr-2 h-5 w-5" />
                                Order Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-muted-foreground text-sm font-medium">
                                        Active Orders
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {vendor.activeOrders || 0}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-sm font-medium">
                                        Total Purchases
                                    </p>
                                    <p className="text-2xl font-bold">
                                        PKR{" "}
                                        {vendor.totalPurchases?.toLocaleString() ||
                                            0}
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            {vendor.notes && (
                                <div>
                                    <p className="text-muted-foreground mb-1 text-sm font-medium">
                                        Notes
                                    </p>
                                    <p className="text-sm">{vendor.notes}</p>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() =>
                                    router.push(
                                        `/thread-orders/order?vendorId=${vendor.id}`,
                                    )
                                }
                            >
                                Create New Order
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Recent Orders Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                Recent Thread Orders
                            </CardTitle>
                            <CardDescription>
                                Latest thread purchase orders
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {vendor.threadPurchases &&
                            Array.isArray(vendor.threadPurchases) &&
                            vendor.threadPurchases.length > 0 ? (
                                <div className="mt-8 space-y-6">
                                    <h2 className="text-2xl font-semibold">
                                        Recent Thread Orders
                                    </h2>
                                    <div className="flex flex-wrap gap-4">
                                        {vendor.threadPurchases
                                            .slice(0, 3)
                                            .map((order: ThreadPurchase) => (
                                                <Card
                                                    key={order.id}
                                                    className="min-w-[300px] flex-1"
                                                >
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-lg">
                                                            {order.threadType} -{" "}
                                                            {order.color ||
                                                                "Raw"}
                                                        </CardTitle>
                                                        <CardDescription>
                                                            {format(
                                                                new Date(
                                                                    order.orderDate,
                                                                ),
                                                                "PPP",
                                                            )}
                                                        </CardDescription>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="grid gap-1">
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">
                                                                    Quantity:
                                                                </span>
                                                                <span className="font-medium">
                                                                    {
                                                                        order.quantity
                                                                    }{" "}
                                                                    {
                                                                        order.unitOfMeasure
                                                                    }
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">
                                                                    Unit Price:
                                                                </span>
                                                                <span className="font-medium">
                                                                    Rs.{" "}
                                                                    {order.unitPrice.toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">
                                                                    Total Cost:
                                                                </span>
                                                                <span className="font-medium">
                                                                    Rs.{" "}
                                                                    {order.totalCost.toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">
                                                                    Status:
                                                                </span>
                                                                <Badge
                                                                    variant={
                                                                        order.received
                                                                            ? "outline"
                                                                            : "default"
                                                                    }
                                                                >
                                                                    {order.received
                                                                        ? "Received"
                                                                        : "Pending"}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-muted-foreground py-8 text-center">
                                    <p>No thread orders found</p>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button
                                variant="link"
                                className="w-full"
                                onClick={() =>
                                    router.push(
                                        `/thread-orders?vendorId=${vendor.id}`,
                                    )
                                }
                            >
                                View All Orders
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            ) : (
                <div className="py-12 text-center">
                    <h2 className="mb-2 text-xl font-semibold">
                        Vendor not found
                    </h2>
                    <p className="text-muted-foreground mb-6">
                        The vendor you are looking for does not exist or has
                        been deleted.
                    </p>
                    <Button onClick={navigateBack}>Return to Vendors</Button>
                </div>
            )}

            {vendor &&
                vendor.threadPurchases &&
                vendor.threadPurchases.length > 0 && (
                    <div className="mt-8">
                        <h2 className="mb-4 text-2xl font-semibold">
                            Thread Purchase History
                        </h2>
                        <Card>
                            <Table>
                                <TableCaption>
                                    {vendor.threadPurchases.length} thread
                                    purchase records found
                                </TableCaption>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Thread Type</TableHead>
                                        <TableHead>Color</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead className="text-right">
                                            Unit Price
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Total
                                        </TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {vendor.threadPurchases.map(
                                        (order: ThreadPurchase) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-medium">
                                                    {format(
                                                        new Date(
                                                            order.orderDate,
                                                        ),
                                                        "PP",
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {order.threadType}
                                                </TableCell>
                                                <TableCell>
                                                    {order.color || "Raw"}
                                                </TableCell>
                                                <TableCell>
                                                    {order.quantity}{" "}
                                                    {order.unitOfMeasure}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    Rs.{" "}
                                                    {order.unitPrice.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    Rs.{" "}
                                                    {order.totalCost.toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            order.received
                                                                ? "outline"
                                                                : "default"
                                                        }
                                                    >
                                                        {order.received
                                                            ? "Received"
                                                            : "Pending"}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ),
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </div>
                )}
        </div>
    );
}
