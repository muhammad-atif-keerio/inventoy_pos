"use client";

import * as React from "react";

import { format } from "date-fns";
import {
    Box,
    Clock,
    Loader2,
    Mail,
    MapPin,
    Phone,
    PiggyBank,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { VendorItem } from "@/app/(dashboard)/vendors/columns";

// Define thread purchase item interface based on the Prisma schema
export interface ThreadPurchaseItem {
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
    received: boolean;
    receivedAt?: string | null;
}

interface ViewVendorDialogProps {
    vendor: VendorItem;
    trigger: React.ReactNode;
}

export function ViewVendorDialog({ vendor, trigger }: ViewVendorDialogProps) {
    const [open, setOpen] = React.useState(false);
    const [threadPurchases, setThreadPurchases] = React.useState<
        ThreadPurchaseItem[]
    >([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState("overview");

    // Fetch thread purchases when dialog opens
    React.useEffect(() => {
        if (open && vendor.id) {
            setIsLoading(true);
            fetch(`/api/vendors/${vendor.id}`)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Failed to fetch vendor details");
                    }
                    return response.json();
                })
                .then((data) => {
                    if (
                        data.threadPurchases &&
                        Array.isArray(data.threadPurchases)
                    ) {
                        setThreadPurchases(data.threadPurchases);
                    } else {
                        setThreadPurchases([]);
                    }
                })
                .catch((error) => {
                    console.error("Error fetching thread purchases:", error);
                    toast.error("Failed to load vendor details");
                    setThreadPurchases([]);
                })
                .finally(() => setIsLoading(false));
        }
    }, [open, vendor.id]);

    // Get the vendor's initials for the avatar
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((part) => part.charAt(0))
            .join("")
            .toUpperCase()
            .substring(0, 2);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Avatar className="bg-primary text-primary-foreground h-8 w-8">
                            <AvatarFallback>
                                {getInitials(vendor.name)}
                            </AvatarFallback>
                        </Avatar>
                        {vendor.name}
                    </DialogTitle>
                    <DialogDescription>
                        Vendor ID: {vendor.id} • Added on{" "}
                        {format(new Date(vendor.createdAt), "PPP")}
                    </DialogDescription>
                </DialogHeader>

                <Tabs
                    defaultValue="overview"
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="mt-2"
                >
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="orders">
                            Thread Orders
                            {vendor.activeOrders && vendor.activeOrders > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {vendor.activeOrders}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4 py-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-medium">
                                        Contact Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-start gap-2">
                                        <Phone className="text-muted-foreground mt-0.5 h-4 w-4" />
                                        <div>
                                            <div className="font-medium">
                                                Phone Number
                                            </div>
                                            <div className="text-sm">
                                                {vendor.contact}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <Mail className="text-muted-foreground mt-0.5 h-4 w-4" />
                                        <div>
                                            <div className="font-medium">
                                                Email Address
                                            </div>
                                            <div className="text-sm">
                                                {vendor.email || "Not provided"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <MapPin className="text-muted-foreground mt-0.5 h-4 w-4" />
                                        <div>
                                            <div className="font-medium">
                                                Location
                                            </div>
                                            <div className="text-sm">
                                                {vendor.city ? (
                                                    <>
                                                        {vendor.city}
                                                        {vendor.address && (
                                                            <>
                                                                ,{" "}
                                                                {vendor.address}
                                                            </>
                                                        )}
                                                    </>
                                                ) : (
                                                    vendor.address ||
                                                    "Not provided"
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-medium">
                                        Business Summary
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-start gap-2">
                                        <PiggyBank className="text-muted-foreground mt-0.5 h-4 w-4" />
                                        <div>
                                            <div className="font-medium">
                                                Total Purchases
                                            </div>
                                            <div className="text-lg font-semibold">
                                                {typeof vendor.totalPurchases ===
                                                "number"
                                                    ? `PKR ${vendor.totalPurchases.toLocaleString()}`
                                                    : "PKR 0"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <Box className="text-muted-foreground mt-0.5 h-4 w-4" />
                                        <div>
                                            <div className="font-medium">
                                                Active Orders
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-semibold">
                                                    {vendor.activeOrders || 0}
                                                </span>
                                                {vendor.activeOrders &&
                                                    vendor.activeOrders > 0 && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs"
                                                        >
                                                            Active
                                                        </Badge>
                                                    )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <Clock className="text-muted-foreground mt-0.5 h-4 w-4" />
                                        <div>
                                            <div className="font-medium">
                                                Business Timeline
                                            </div>
                                            <div className="text-sm">
                                                <div>
                                                    Added:{" "}
                                                    {format(
                                                        new Date(
                                                            vendor.createdAt,
                                                        ),
                                                        "PP",
                                                    )}
                                                </div>
                                                <div>
                                                    Last Updated:{" "}
                                                    {format(
                                                        new Date(
                                                            vendor.updatedAt,
                                                        ),
                                                        "PP",
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {vendor.notes && (
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-medium">
                                        Additional Notes
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm whitespace-pre-wrap">
                                        {vendor.notes}
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="orders" className="py-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-medium">
                                    Thread Purchase History
                                </CardTitle>
                                <CardDescription>
                                    Recent thread orders placed with this vendor
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                                    </div>
                                ) : threadPurchases.length > 0 ? (
                                    <div className="space-y-4">
                                        {threadPurchases.map((purchase) => (
                                            <Card
                                                key={purchase.id}
                                                className="overflow-hidden"
                                            >
                                                <div
                                                    className={`h-1.5 w-full ${purchase.received ? "bg-green-500" : "bg-amber-500"}`}
                                                />
                                                <CardContent className="p-4">
                                                    <div className="mb-2 flex items-start justify-between">
                                                        <div>
                                                            <h4 className="text-base font-semibold">
                                                                {
                                                                    purchase.threadType
                                                                }
                                                            </h4>
                                                            <div className="text-muted-foreground text-sm">
                                                                Order #
                                                                {purchase.id} •{" "}
                                                                {format(
                                                                    new Date(
                                                                        purchase.orderDate,
                                                                    ),
                                                                    "PP",
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <Badge
                                                                variant={
                                                                    purchase.colorStatus ===
                                                                    "RAW"
                                                                        ? "secondary"
                                                                        : "default"
                                                                }
                                                            >
                                                                {
                                                                    purchase.colorStatus
                                                                }
                                                            </Badge>
                                                            <div className="mt-1">
                                                                <Badge
                                                                    variant={
                                                                        purchase.received
                                                                            ? "outline"
                                                                            : "default"
                                                                    }
                                                                >
                                                                    {purchase.received
                                                                        ? "Received"
                                                                        : "Pending"}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <Separator className="my-3" />

                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                                        <div>
                                                            <span className="text-muted-foreground">
                                                                Quantity:
                                                            </span>{" "}
                                                            {purchase.quantity}{" "}
                                                            {
                                                                purchase.unitOfMeasure
                                                            }
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">
                                                                Unit Price:
                                                            </span>{" "}
                                                            PKR{" "}
                                                            {purchase.unitPrice.toLocaleString()}
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">
                                                                Total Cost:
                                                            </span>{" "}
                                                            <span className="font-medium">
                                                                PKR{" "}
                                                                {purchase.totalCost.toLocaleString()}
                                                            </span>
                                                        </div>
                                                        {purchase.color && (
                                                            <div>
                                                                <span className="text-muted-foreground">
                                                                    Color:
                                                                </span>{" "}
                                                                {purchase.color}
                                                            </div>
                                                        )}
                                                        {purchase.receivedAt && (
                                                            <div className="col-span-2">
                                                                <span className="text-muted-foreground">
                                                                    Received on:
                                                                </span>{" "}
                                                                {format(
                                                                    new Date(
                                                                        purchase.receivedAt,
                                                                    ),
                                                                    "PPP",
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-muted-foreground py-8 text-center">
                                        No thread purchase history found for
                                        this vendor
                                    </div>
                                )}
                            </CardContent>
                            {threadPurchases.length > 0 && (
                                <CardFooter className="border-t px-6 py-4">
                                    <div className="flex w-full items-center justify-between text-sm">
                                        <div>
                                            Showing {threadPurchases.length}{" "}
                                            orders
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                setActiveTab("overview")
                                            }
                                        >
                                            Back to Overview
                                        </Button>
                                    </div>
                                </CardFooter>
                            )}
                        </Card>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
