"use client";

import React, { useEffect, useState } from "react";

import {
    ChequeStatus,
    PaymentMode,
    PaymentStatus,
    ProductType,
} from "@prisma/client";
import { format } from "date-fns";
import {
    AlertTriangle,
    ArrowDownUp,
    Banknote,
    Calculator,
    Calendar,
    CheckCircle2,
    Clock,
    CreditCard,
    Download,
    FileText,
    Globe,
    Loader2,
    Mail,
    MapPin,
    Package,
    Phone,
    Receipt,
    ShoppingBag,
    Truck,
    User,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { SalesOrderItem } from "./columns";
import { downloadInvoice } from "./handleDownloadInvoice";

// Define a type for the items in a sale
type SaleItem = NonNullable<SalesOrderItem["items"]>[number];

// Helper function to format currency
const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return "-";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "PKR",
        minimumFractionDigits: 0,
    }).format(amount);
};

export function SalesDetailsDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sale, setSale] = useState<SalesOrderItem | null>(null);
    const [showInvoice, setShowInvoice] = useState(false);

    // Listen for the custom event to open this dialog
    useEffect(() => {
        const handleViewSalesDetails = (event: Event) => {
            const customEvent = event as CustomEvent<SalesOrderItem>;
            setSale(customEvent.detail);
            setOpen(true);
        };

        window.addEventListener("viewSalesDetails", handleViewSalesDetails);

        return () => {
            window.removeEventListener(
                "viewSalesDetails",
                handleViewSalesDetails,
            );
        };
    }, []);

    // Fetch detailed sales data when opened with an ID
    useEffect(() => {
        if (open && sale?.id) {
            fetchSaleDetails(sale.id);
        }
    }, [open, sale?.id]);

    const fetchSaleDetails = async (saleId: number) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/sales/${saleId}`);
            if (!response.ok) {
                throw new Error("Failed to fetch sale details");
            }

            const data = await response.json();
            setSale(data);
        } catch (error) {
            console.error("Error fetching sale details:", error);
            toast.error("Could not load sale details", {
                description: "Please try again later",
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePrintInvoice = () => {
        if (!sale) return;

        // Show the invoice view
        setShowInvoice(true);

        // Notify user about PDF generation
        toast.success("Invoice view ready", {
            description: "Use the download button to save a PDF copy",
        });
    };

    // Function to handle PDF download (this would connect to the PDF generation API)
    const handleDownloadInvoice = () => {
        if (!sale) return;

        toast.success("PDF Generation Started", {
            description:
                "Your invoice is being generated. It will download automatically when ready.",
        });

        // Use the utility function to handle the download
        downloadInvoice(sale)
            .then(() => {
                setTimeout(() => {
                    toast.success("Invoice Downloaded Successfully");
                }, 1500);
            })
            .catch((error: Error) => {
                toast.error("Failed to generate invoice", {
                    description: error.message || "Please try again later",
                });
            });
    };

    // Helper to determine payment status badge style
    const getPaymentStatusBadge = (status: PaymentStatus) => {
        switch (status) {
            case PaymentStatus.PAID:
                return (
                    <Badge
                        variant="outline"
                        className="border-green-200 bg-green-50 text-green-700"
                    >
                        <CheckCircle2 className="mr-1 h-3 w-3" /> {status}
                    </Badge>
                );
            case PaymentStatus.PARTIAL:
                return (
                    <Badge
                        variant="outline"
                        className="border-blue-200 bg-blue-50 text-blue-700"
                    >
                        <ArrowDownUp className="mr-1 h-3 w-3" /> {status}
                    </Badge>
                );
            case PaymentStatus.PENDING:
                return (
                    <Badge
                        variant="outline"
                        className="border-yellow-200 bg-yellow-50 text-yellow-700"
                    >
                        <Clock className="mr-1 h-3 w-3" /> {status}
                    </Badge>
                );
            case PaymentStatus.CANCELLED:
                return (
                    <Badge
                        variant="outline"
                        className="border-red-200 bg-red-50 text-red-700"
                    >
                        <AlertTriangle className="mr-1 h-3 w-3" /> {status}
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Helper to get the payment mode badge
    const getPaymentModeBadge = (
        mode?: PaymentMode,
        chequeStatus?: ChequeStatus,
    ) => {
        if (!mode) return null;

        switch (mode) {
            case PaymentMode.CASH:
                return (
                    <Badge
                        variant="outline"
                        className="border-green-200 bg-green-50 text-green-700"
                    >
                        <Banknote className="mr-1 h-3 w-3" /> {mode}
                    </Badge>
                );
            case PaymentMode.CHEQUE:
                if (chequeStatus === ChequeStatus.CLEARED) {
                    return (
                        <Badge
                            variant="outline"
                            className="border-blue-200 bg-blue-50 text-blue-700"
                        >
                            <CheckCircle2 className="mr-1 h-3 w-3" /> {mode} (
                            {chequeStatus})
                        </Badge>
                    );
                } else if (chequeStatus === ChequeStatus.BOUNCED) {
                    return (
                        <Badge
                            variant="outline"
                            className="border-red-200 bg-red-50 text-red-700"
                        >
                            <AlertTriangle className="mr-1 h-3 w-3" /> {mode} (
                            {chequeStatus})
                        </Badge>
                    );
                } else {
                    return (
                        <Badge
                            variant="outline"
                            className="border-yellow-200 bg-yellow-50 text-yellow-700"
                        >
                            <Clock className="mr-1 h-3 w-3" /> {mode} (
                            {chequeStatus || "PENDING"})
                        </Badge>
                    );
                }
            case PaymentMode.ONLINE:
                return (
                    <Badge
                        variant="outline"
                        className="border-purple-200 bg-purple-50 text-purple-700"
                    >
                        <CreditCard className="mr-1 h-3 w-3" /> {mode}
                    </Badge>
                );
            default:
                return <Badge variant="outline">{mode}</Badge>;
        }
    };

    // Get product type badge
    const getProductTypeBadge = (type: ProductType) => {
        switch (type) {
            case ProductType.THREAD:
                return (
                    <Badge
                        variant="outline"
                        className="border-blue-200 bg-blue-50 text-blue-700"
                    >
                        {type}
                    </Badge>
                );
            case ProductType.FABRIC:
                return (
                    <Badge
                        variant="outline"
                        className="border-purple-200 bg-purple-50 text-purple-700"
                    >
                        {type}
                    </Badge>
                );
            default:
                return <Badge variant="outline">{type}</Badge>;
        }
    };

    // Construct product name
    const getProductName = () => {
        if (!sale) return "";

        if (sale.productName) return sale.productName;

        if (sale.productType === ProductType.THREAD && sale.threadPurchase) {
            const tp = sale.threadPurchase;
            let name = `${tp.threadType} - ${tp.colorStatus === "COLORED" ? tp.color : "Raw"}`;
            if (tp.vendorName) name += ` (${tp.vendorName})`;
            return name;
        }

        if (sale.productType === ProductType.FABRIC && sale.fabricProduction) {
            const fp = sale.fabricProduction;
            let name = `${fp.fabricType}${fp.dimensions ? ` - ${fp.dimensions}` : ""}`;
            if (fp.batchNumber) name += ` (Batch: ${fp.batchNumber})`;
            return name;
        }

        return `Product #${sale.productId}`;
    };

    if (!sale) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-[900px]">
                {showInvoice && sale ? (
                    <>
                        <div className="from-primary/5 to-background sticky top-0 z-10 flex items-center justify-between border-b bg-gradient-to-r p-6 pb-4">
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                <FileText className="text-primary h-5 w-5" />
                                <span>Invoice #{sale.orderNumber}</span>
                            </DialogTitle>
                            <div className="flex gap-2">
                                <div className="min-w-[180px]">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadInvoice}
                                        className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                                    >
                                        <Download className="mr-2 h-4 w-4" />{" "}
                                        Download PDF
                                    </Button>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowInvoice(false)}
                                >
                                    Back to Details
                                </Button>
                            </div>
                        </div>

                        {/* Modern Invoice Design */}
                        <div className="p-6 pt-0">
                            <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                                {/* Header Section with gradient */}
                                <div className="from-primary/10 to-primary/5 relative flex flex-col items-start justify-between gap-6 border-b bg-gradient-to-r px-8 py-10 md:flex-row">
                                    <div className="bg-primary absolute top-0 left-0 h-full w-2"></div>
                                    <div>
                                        <h2 className="text-3xl font-bold tracking-tight">
                                            Raheel Fabrics
                                        </h2>
                                        <p className="text-muted-foreground mt-1">
                                            Textile Excellence
                                        </p>
                                        <div className="mt-4 space-y-1 text-sm">
                                            <p className="flex items-center gap-2">
                                                <MapPin className="text-primary h-3.5 w-3.5" />
                                                <span>
                                                    Faisalabad, Pakistan
                                                </span>
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <Phone className="text-primary h-3.5 w-3.5" />
                                                <span>+92 123 456 7890</span>
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <Mail className="text-primary h-3.5 w-3.5" />
                                                <span>
                                                    info@raheelfabrics.com
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="bg-primary/10 mb-3 inline-block rounded-lg px-3 py-1">
                                            <span className="text-primary font-semibold">
                                                INVOICE
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xl font-semibold">
                                            #{sale.orderNumber}
                                        </p>
                                        <p className="text-muted-foreground mt-1">
                                            Date:{" "}
                                            {format(
                                                new Date(sale.orderDate),
                                                "PPP",
                                            )}
                                        </p>
                                        <div className="mt-2">
                                            {getPaymentStatusBadge(
                                                sale.paymentStatus,
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Client and Order Info */}
                                <div className="grid grid-cols-1 gap-8 border-b p-8 md:grid-cols-2">
                                    <div className="bg-muted/20 rounded-lg p-6 shadow-sm transition-shadow hover:shadow">
                                        <h3 className="text-primary/90 mb-4 flex items-center gap-2 font-medium">
                                            <User className="text-primary h-4 w-4" />
                                            <span>CUSTOMER INFORMATION</span>
                                        </h3>
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-muted-foreground text-sm">
                                                    Customer Name
                                                </p>
                                                <p className="text-lg font-medium">
                                                    {sale.customerName}
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-muted-foreground text-sm">
                                                        Customer ID
                                                    </p>
                                                    <p className="font-medium">
                                                        {sale.customerId}
                                                    </p>
                                                </div>
                                                {sale.customerId &&
                                                    sale.customerPhone && (
                                                        <div>
                                                            <p className="text-muted-foreground text-sm">
                                                                Contact
                                                            </p>
                                                            <p className="font-medium">
                                                                {
                                                                    sale.customerPhone
                                                                }
                                                            </p>
                                                        </div>
                                                    )}
                                            </div>
                                            {sale.customerId &&
                                                sale.customerEmail && (
                                                    <div>
                                                        <p className="text-muted-foreground text-sm">
                                                            Email
                                                        </p>
                                                        <p className="font-medium">
                                                            {sale.customerEmail}
                                                        </p>
                                                    </div>
                                                )}
                                            <div className="bg-primary/5 mt-2 rounded-md p-3">
                                                <p className="text-muted-foreground mb-1 text-sm font-medium">
                                                    Address Information
                                                </p>
                                                {sale.customerId &&
                                                    sale.deliveryAddress && (
                                                        <div className="mt-1">
                                                            <p className="text-sm font-medium">
                                                                {
                                                                    sale.deliveryAddress
                                                                }
                                                            </p>
                                                        </div>
                                                    )}
                                                {(!sale.customerId ||
                                                    !sale.deliveryAddress) && (
                                                    <p className="text-muted-foreground text-sm italic">
                                                        No address information
                                                        available
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-muted/20 rounded-lg p-6 shadow-sm transition-shadow hover:shadow">
                                        <h3 className="text-primary/90 mb-4 flex items-center gap-2 font-medium">
                                            <Receipt className="text-primary h-4 w-4" />
                                            <span>ORDER DETAILS</span>
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-muted-foreground text-sm">
                                                        Order Date
                                                    </p>
                                                    <p className="font-medium">
                                                        {format(
                                                            new Date(
                                                                sale.orderDate,
                                                            ),
                                                            "PPP",
                                                        )}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground text-sm">
                                                        Order Status
                                                    </p>
                                                    <div className="mt-1">
                                                        {getPaymentStatusBadge(
                                                            sale.paymentStatus,
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-primary/5 mt-2 rounded-md p-3">
                                                <p className="text-muted-foreground mb-1 text-sm font-medium">
                                                    Delivery Information
                                                </p>
                                                <div>
                                                    <p className="mt-1 text-sm">
                                                        <span className="font-medium">
                                                            Address:
                                                        </span>{" "}
                                                        {sale.deliveryAddress ||
                                                            "Same as billing address"}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="mt-1 text-sm">
                                                        <span className="font-medium">
                                                            Date:
                                                        </span>{" "}
                                                        {sale.deliveryDate
                                                            ? format(
                                                                  new Date(
                                                                      sale.deliveryDate,
                                                                  ),
                                                                  "PPP",
                                                              )
                                                            : "Not specified"}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="bg-muted/10 mt-2 rounded-md p-3">
                                                <p className="text-muted-foreground mb-1 text-sm font-medium">
                                                    Payment Information
                                                </p>
                                                <div className="mt-1 grid grid-cols-2 gap-2">
                                                    <div>
                                                        <p className="text-sm">
                                                            <span className="font-medium">
                                                                Method:
                                                            </span>{" "}
                                                            {sale.paymentMode ||
                                                                "Not specified"}
                                                        </p>
                                                    </div>
                                                    {sale.paymentMode ===
                                                        "CHEQUE" && (
                                                        <div>
                                                            <p className="text-sm">
                                                                <span className="font-medium">
                                                                    Cheque
                                                                    Status:
                                                                </span>{" "}
                                                                {sale.chequeStatus ||
                                                                    "PENDING"}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {sale.paymentMode ===
                                                    "CHEQUE" && (
                                                    <>
                                                        <div className="mt-1">
                                                            <p className="text-sm">
                                                                <span className="font-medium">
                                                                    Cheque
                                                                    Number:
                                                                </span>{" "}
                                                                {
                                                                    sale.chequeNumber
                                                                }
                                                            </p>
                                                        </div>
                                                        <div className="mt-1">
                                                            <p className="text-sm">
                                                                <span className="font-medium">
                                                                    Bank:
                                                                </span>{" "}
                                                                {sale.bank ||
                                                                    "Not specified"}
                                                            </p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Product Details */}
                                <div className="border-b p-8">
                                    <h3 className="text-primary/90 mb-4 flex items-center gap-2 font-medium">
                                        <Package className="text-primary h-4 w-4" />
                                        <span>PRODUCT DETAILS</span>
                                    </h3>
                                    <div className="bg-muted/10 overflow-hidden rounded-lg border shadow-sm">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-muted/30">
                                                    <th className="p-4 text-left font-medium">
                                                        Product
                                                    </th>
                                                    <th className="p-4 text-center font-medium">
                                                        Quantity
                                                    </th>
                                                    <th className="p-4 text-right font-medium">
                                                        Unit Price
                                                    </th>
                                                    <th className="p-4 text-right font-medium">
                                                        Amount
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {/* Check if sales has items array and map through them */}
                                                {(sale.items?.length ?? 0) >
                                                0 ? (
                                                    sale.items?.map(
                                                        (
                                                            item: SaleItem,
                                                            index: number,
                                                        ) => (
                                                            <tr
                                                                key={
                                                                    item.id ||
                                                                    index
                                                                }
                                                                className={
                                                                    index > 0
                                                                        ? "border-t"
                                                                        : ""
                                                                }
                                                            >
                                                                <td className="p-4">
                                                                    <div>
                                                                        <p className="font-medium">
                                                                            {item.productName ||
                                                                                `#${item.productId}`}
                                                                        </p>
                                                                        <p className="text-muted-foreground text-sm">
                                                                            {
                                                                                item.productType
                                                                            }
                                                                        </p>

                                                                        {/* Show additional product details based on type */}
                                                                        {item.productType ===
                                                                            ProductType.THREAD &&
                                                                            item.threadPurchase && (
                                                                                <div className="text-muted-foreground mt-1 text-xs">
                                                                                    <p>
                                                                                        Thread
                                                                                        Type:{" "}
                                                                                        {
                                                                                            item
                                                                                                .threadPurchase
                                                                                                .threadType
                                                                                        }
                                                                                    </p>
                                                                                    {item
                                                                                        .threadPurchase
                                                                                        .color && (
                                                                                        <p>
                                                                                            Color:{" "}
                                                                                            {
                                                                                                item
                                                                                                    .threadPurchase
                                                                                                    .color
                                                                                            }
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            )}

                                                                        {item.productType ===
                                                                            ProductType.FABRIC &&
                                                                            item.fabricProduction && (
                                                                                <div className="text-muted-foreground mt-1 text-xs">
                                                                                    <p>
                                                                                        Fabric
                                                                                        Type:{" "}
                                                                                        {
                                                                                            item
                                                                                                .fabricProduction
                                                                                                .fabricType
                                                                                        }
                                                                                    </p>
                                                                                    {item
                                                                                        .fabricProduction
                                                                                        .dimensions && (
                                                                                        <p>
                                                                                            Dimensions:{" "}
                                                                                            {
                                                                                                item
                                                                                                    .fabricProduction
                                                                                                    .dimensions
                                                                                            }
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-center">
                                                                    {
                                                                        item.quantitySold
                                                                    }
                                                                </td>
                                                                <td className="p-4 text-right">
                                                                    {formatCurrency(
                                                                        item.unitPrice,
                                                                    )}
                                                                </td>
                                                                <td className="p-4 text-right font-medium">
                                                                    {formatCurrency(
                                                                        item.unitPrice *
                                                                            item.quantitySold,
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )
                                                ) : (
                                                    // Fallback to legacy structure if no items array
                                                    <tr>
                                                        <td className="p-4">
                                                            <div>
                                                                <p className="font-medium">
                                                                    {getProductName()}
                                                                </p>
                                                                <p className="text-muted-foreground text-sm">
                                                                    {
                                                                        sale.productType
                                                                    }
                                                                </p>

                                                                {/* Show additional product details based on type */}
                                                                {sale.productType ===
                                                                    ProductType.THREAD &&
                                                                    sale.threadPurchase && (
                                                                        <div className="text-muted-foreground mt-1 text-xs">
                                                                            <p>
                                                                                Thread
                                                                                Type:{" "}
                                                                                {
                                                                                    sale
                                                                                        .threadPurchase
                                                                                        .threadType
                                                                                }
                                                                            </p>
                                                                            {sale
                                                                                .threadPurchase
                                                                                .color && (
                                                                                <p>
                                                                                    Color:{" "}
                                                                                    {
                                                                                        sale
                                                                                            .threadPurchase
                                                                                            .color
                                                                                    }
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                {sale.productType ===
                                                                    ProductType.FABRIC &&
                                                                    sale.fabricProduction && (
                                                                        <div className="text-muted-foreground mt-1 text-xs">
                                                                            <p>
                                                                                Fabric
                                                                                Type:{" "}
                                                                                {
                                                                                    sale
                                                                                        .fabricProduction
                                                                                        .fabricType
                                                                                }
                                                                            </p>
                                                                            {sale
                                                                                .fabricProduction
                                                                                .dimensions && (
                                                                                <p>
                                                                                    Dimensions:{" "}
                                                                                    {
                                                                                        sale
                                                                                            .fabricProduction
                                                                                            .dimensions
                                                                                    }
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            {sale.quantitySold}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            {formatCurrency(
                                                                sale.unitPrice,
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-right font-medium">
                                                            {formatCurrency(
                                                                sale.unitPrice *
                                                                    sale.quantitySold,
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                                {sale.remarks && (
                                                    <tr className="bg-muted/5 border-t">
                                                        <td
                                                            colSpan={4}
                                                            className="p-4"
                                                        >
                                                            <p className="text-muted-foreground text-sm">
                                                                <span className="font-medium">
                                                                    Note:
                                                                </span>{" "}
                                                                {sale.remarks}
                                                            </p>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Totals Section with gradient background */}
                                <div className="from-primary/5 to-background flex justify-end bg-gradient-to-r p-8">
                                    <div className="bg-card w-full rounded-lg border p-6 shadow-sm md:w-1/2 lg:w-2/5">
                                        <h3 className="mb-4 flex items-center gap-2 font-medium">
                                            <Calculator className="text-primary h-4 w-4" />
                                            <span>PAYMENT SUMMARY</span>
                                        </h3>
                                        <div className="space-y-3">
                                            {/* Calculate subtotal from all items */}
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                    Subtotal:
                                                </span>
                                                <span>
                                                    {formatCurrency(
                                                        (sale.items?.length ??
                                                            0) > 0
                                                            ? (sale.items?.reduce(
                                                                  (
                                                                      sum: number,
                                                                      item: SaleItem,
                                                                  ) =>
                                                                      sum +
                                                                      item.unitPrice *
                                                                          item.quantitySold,
                                                                  0,
                                                              ) ?? 0)
                                                            : sale.unitPrice *
                                                                  sale.quantitySold,
                                                    )}
                                                </span>
                                            </div>

                                            {sale.discount &&
                                                sale.discount > 0 && (
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">
                                                            Discount:
                                                        </span>
                                                        <span className="text-green-600">
                                                            -{" "}
                                                            {formatCurrency(
                                                                sale.discount,
                                                            )}
                                                        </span>
                                                    </div>
                                                )}

                                            {sale.tax && sale.tax > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">
                                                        Tax:
                                                    </span>
                                                    <span>
                                                        {formatCurrency(
                                                            sale.tax,
                                                        )}
                                                    </span>
                                                </div>
                                            )}

                                            <Separator className="my-2" />

                                            <div className="flex justify-between text-lg font-medium">
                                                <span>Total:</span>
                                                <span>
                                                    {formatCurrency(
                                                        sale.totalSale,
                                                    )}
                                                </span>
                                            </div>

                                            {sale.payments &&
                                                sale.payments.length > 0 && (
                                                    <>
                                                        <div className="flex justify-between pt-2 text-sm">
                                                            <span className="text-muted-foreground">
                                                                Amount Paid:
                                                            </span>
                                                            <span className="text-green-600">
                                                                {formatCurrency(
                                                                    sale.payments.reduce(
                                                                        (
                                                                            sum,
                                                                            p,
                                                                        ) =>
                                                                            sum +
                                                                            Number(
                                                                                p.amount,
                                                                            ),
                                                                        0,
                                                                    ),
                                                                )}
                                                            </span>
                                                        </div>

                                                        <div className="flex justify-between text-sm font-medium">
                                                            <span className="text-muted-foreground">
                                                                Balance Due:
                                                            </span>
                                                            <span
                                                                className={
                                                                    sale.paymentStatus ===
                                                                    "PAID"
                                                                        ? "text-green-600"
                                                                        : "text-amber-600"
                                                                }
                                                            >
                                                                {formatCurrency(
                                                                    sale.totalSale -
                                                                        sale.payments.reduce(
                                                                            (
                                                                                sum,
                                                                                p,
                                                                            ) =>
                                                                                sum +
                                                                                Number(
                                                                                    p.amount,
                                                                                ),
                                                                            0,
                                                                        ),
                                                                )}
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                        </div>
                                    </div>
                                </div>

                                {/* Payment History Section */}
                                {sale.payments && sale.payments.length > 0 && (
                                    <div className="border-t p-8">
                                        <h3 className="mb-4 flex items-center gap-2 font-medium">
                                            <Clock className="text-primary h-4 w-4" />
                                            <span>PAYMENT HISTORY</span>
                                        </h3>
                                        <div className="space-y-2">
                                            {sale.payments.map((payment) => (
                                                <div
                                                    key={payment.id}
                                                    className="bg-muted/5 flex flex-col rounded-lg border p-3 sm:flex-row sm:justify-between"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {payment.mode ===
                                                            "CASH" && (
                                                            <Banknote className="text-primary h-4 w-4" />
                                                        )}
                                                        {payment.mode ===
                                                            "CHEQUE" && (
                                                            <CreditCard className="text-primary h-4 w-4" />
                                                        )}
                                                        {payment.mode ===
                                                            "ONLINE" && (
                                                            <Globe className="text-primary h-4 w-4" />
                                                        )}
                                                        <span>
                                                            {format(
                                                                new Date(
                                                                    payment.transactionDate,
                                                                ),
                                                                "PPP",
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 flex items-center gap-4 sm:mt-0">
                                                        {payment.referenceNumber && (
                                                            <span className="text-muted-foreground text-xs">
                                                                Ref:{" "}
                                                                {
                                                                    payment.referenceNumber
                                                                }
                                                            </span>
                                                        )}
                                                        <span className="font-medium">
                                                            {formatCurrency(
                                                                payment.amount,
                                                            )}
                                                        </span>
                                                        {getPaymentModeBadge(
                                                            payment.mode as PaymentMode,
                                                            payment
                                                                .chequeTransaction
                                                                ?.chequeStatus,
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="from-primary/10 to-primary/5 border-t bg-gradient-to-r p-8 text-center">
                                    <div className="mx-auto max-w-xl">
                                        <p className="mb-2 text-sm font-medium">
                                            Thank you for your business!
                                        </p>
                                        <p className="text-muted-foreground mb-4 text-xs">
                                            For any questions regarding this
                                            invoice, please contact our customer
                                            service team.
                                        </p>
                                        <div className="text-muted-foreground flex flex-wrap justify-center gap-4 text-xs">
                                            <span className="flex items-center">
                                                <Globe className="mr-1 h-3 w-3" />{" "}
                                                www.raheelfabrics.com
                                            </span>
                                            <span className="flex items-center">
                                                <Mail className="mr-1 h-3 w-3" />{" "}
                                                info@raheelfabrics.com
                                            </span>
                                            <span className="flex items-center">
                                                <Phone className="mr-1 h-3 w-3" />{" "}
                                                +92 123 456 7890
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <DialogHeader className="bg-background sticky top-0 z-10 p-6 pb-0">
                            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                <DialogTitle className="text-xl">{`Order ${sale.orderNumber}`}</DialogTitle>
                                <div className="flex space-x-2">
                                    {getPaymentStatusBadge(sale.paymentStatus)}
                                    {getProductTypeBadge(sale.productType)}
                                </div>
                            </div>
                            <DialogDescription className="flex items-center justify-between text-sm">
                                <div className="flex items-center">
                                    <Calendar className="text-muted-foreground mr-1.5 h-3.5 w-3.5" />
                                    {sale.orderDate
                                        ? format(
                                              new Date(sale.orderDate),
                                              "PPP",
                                          )
                                        : "No date"}
                                </div>
                                <div>
                                    {sale && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handlePrintInvoice}
                                        >
                                            <Download className="mr-1.5 h-3.5 w-3.5" />{" "}
                                            Download Invoice
                                        </Button>
                                    )}
                                </div>
                            </DialogDescription>
                        </DialogHeader>

                        {loading ? (
                            <div className="flex h-64 items-center justify-center">
                                <div className="text-center">
                                    <Loader2 className="text-primary mx-auto mb-2 h-8 w-8 animate-spin" />
                                    <p className="text-muted-foreground text-sm">
                                        Loading sale details...
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <Tabs defaultValue="details" className="w-full">
                                <div className="px-6 pt-6">
                                    <TabsList className="grid w-full grid-cols-3 sm:max-w-md">
                                        <TabsTrigger value="details">
                                            Overview
                                        </TabsTrigger>
                                        <TabsTrigger value="payments">
                                            Payments
                                        </TabsTrigger>
                                        <TabsTrigger value="history">
                                            Activity
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent
                                    value="details"
                                    className="p-6 pt-4"
                                >
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                        {/* Customer Information */}
                                        <Card className="col-span-1 overflow-hidden rounded-lg border shadow-sm">
                                            <CardHeader className="bg-muted/20 pb-3">
                                                <CardTitle className="flex items-center text-sm font-medium">
                                                    <User className="text-muted-foreground mr-2 h-4 w-4" />
                                                    Customer
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-4">
                                                <div className="flex items-center">
                                                    <Avatar className="mr-3 h-9 w-9">
                                                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                                            {sale.customerName
                                                                ?.split(" ")
                                                                .map(
                                                                    (n) => n[0],
                                                                )
                                                                .join("")
                                                                .toUpperCase() ||
                                                                "C"}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <h3 className="text-sm font-medium">
                                                            {sale.customerName}
                                                        </h3>
                                                        <p className="text-muted-foreground text-xs">
                                                            ID:{" "}
                                                            {sale.customerId}
                                                        </p>
                                                    </div>
                                                </div>

                                                {sale.deliveryAddress && (
                                                    <div className="mt-4 text-sm">
                                                        <div className="text-muted-foreground flex items-start text-xs">
                                                            <MapPin className="mt-0.5 mr-1 h-3.5 w-3.5" />
                                                            <span className="break-all">
                                                                {
                                                                    sale.deliveryAddress
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        {/* Product Information */}
                                        <Card className="col-span-1 overflow-hidden rounded-lg border shadow-sm">
                                            <CardHeader className="bg-muted/20 pb-3">
                                                <CardTitle className="flex items-center text-sm font-medium">
                                                    <Package className="text-muted-foreground mr-2 h-4 w-4" />
                                                    Product
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-4">
                                                <div className="mb-2 flex items-center">
                                                    <div className="bg-primary/10 mr-3 flex h-8 w-8 items-center justify-center rounded-full">
                                                        <ShoppingBag className="text-primary h-4 w-4" />
                                                    </div>
                                                    <span className="text-sm font-medium">
                                                        {getProductName()}
                                                    </span>
                                                </div>

                                                <div className="mt-3 grid grid-cols-2 gap-2">
                                                    <div className="text-xs">
                                                        <p className="text-muted-foreground">
                                                            Quantity
                                                        </p>
                                                        <p className="font-medium">
                                                            {sale.quantitySold}
                                                        </p>
                                                    </div>
                                                    <div className="text-xs">
                                                        <p className="text-muted-foreground">
                                                            Unit Price
                                                        </p>
                                                        <p className="font-medium">
                                                            {formatCurrency(
                                                                sale.unitPrice,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Payment Information */}
                                        <Card className="col-span-1 overflow-hidden rounded-lg border shadow-sm">
                                            <CardHeader className="bg-muted/20 pb-3">
                                                <CardTitle className="flex items-center text-sm font-medium">
                                                    <Receipt className="text-muted-foreground mr-2 h-4 w-4" />
                                                    Payment
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-4">
                                                <div className="mb-2 flex items-start justify-between">
                                                    <span className="text-sm font-medium">
                                                        Total Amount
                                                    </span>
                                                    <span className="text-lg font-bold">
                                                        {formatCurrency(
                                                            sale.totalSale,
                                                        )}
                                                    </span>
                                                </div>

                                                <Separator className="my-3" />

                                                <div className="mb-1 flex items-center justify-between">
                                                    <span className="text-muted-foreground text-xs">
                                                        Payment Mode
                                                    </span>
                                                    {getPaymentModeBadge(
                                                        sale.paymentMode,
                                                        sale.chequeStatus,
                                                    )}
                                                </div>

                                                {sale.paymentMode ===
                                                    PaymentMode.CHEQUE && (
                                                    <div className="mt-2 text-xs">
                                                        <p className="text-muted-foreground mb-1">
                                                            Cheque Details
                                                        </p>
                                                        {sale.chequeNumber && (
                                                            <p className="font-medium">
                                                                #
                                                                {
                                                                    sale.chequeNumber
                                                                }{" "}
                                                                · {sale.bank}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        {/* Order Summary */}
                                        <Card className="col-span-1 overflow-hidden rounded-lg border shadow-sm md:col-span-3">
                                            <CardHeader className="bg-muted/20 pb-3">
                                                <CardTitle className="flex items-center text-sm font-medium">
                                                    <FileText className="text-muted-foreground mr-2 h-4 w-4" />
                                                    Order Summary
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-4">
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">
                                                                Subtotal
                                                            </span>
                                                            <span>
                                                                {formatCurrency(
                                                                    sale.unitPrice *
                                                                        sale.quantitySold,
                                                                )}
                                                            </span>
                                                        </div>

                                                        {sale.discount &&
                                                            sale.discount >
                                                                0 && (
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-muted-foreground">
                                                                        Discount
                                                                    </span>
                                                                    <span className="text-green-600">
                                                                        -{" "}
                                                                        {formatCurrency(
                                                                            sale.discount,
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            )}

                                                        {sale.tax &&
                                                            sale.tax > 0 && (
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-muted-foreground">
                                                                        Tax
                                                                    </span>
                                                                    <span>
                                                                        {formatCurrency(
                                                                            sale.tax,
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            )}

                                                        <Separator className="my-2" />

                                                        <div className="flex justify-between text-sm font-medium">
                                                            <span>Total</span>
                                                            <span>
                                                                {formatCurrency(
                                                                    sale.totalSale,
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {sale.remarks && (
                                                            <div className="text-sm">
                                                                <p className="text-muted-foreground mb-1 text-xs">
                                                                    Remarks
                                                                </p>
                                                                <p className="text-sm">
                                                                    {
                                                                        sale.remarks
                                                                    }
                                                                </p>
                                                            </div>
                                                        )}

                                                        {sale.deliveryDate && (
                                                            <div className="text-sm">
                                                                <p className="text-muted-foreground mb-1 text-xs">
                                                                    Delivery
                                                                    Date
                                                                </p>
                                                                <div className="flex items-center">
                                                                    <Truck className="text-muted-foreground mr-1.5 h-3.5 w-3.5" />
                                                                    <span>
                                                                        {format(
                                                                            new Date(
                                                                                sale.deliveryDate,
                                                                            ),
                                                                            "PPP",
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </TabsContent>

                                <TabsContent
                                    value="payments"
                                    className="p-6 pt-4"
                                >
                                    <Card className="overflow-hidden rounded-lg border shadow-sm">
                                        <CardHeader className="bg-muted/20">
                                            <CardTitle className="text-sm font-medium">
                                                Payment History
                                            </CardTitle>
                                            <CardDescription>
                                                All transactions related to this
                                                sale
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-4">
                                            {sale.payments &&
                                            sale.payments.length > 0 ? (
                                                <div className="space-y-4">
                                                    {sale.payments.map(
                                                        (payment) => (
                                                            <div
                                                                key={payment.id}
                                                                className="bg-card flex items-start rounded-lg border p-3"
                                                            >
                                                                <div className="bg-primary/10 mr-3 flex h-8 w-8 items-center justify-center rounded-full">
                                                                    <Banknote className="text-primary h-4 w-4" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="mb-1 flex justify-between">
                                                                        <span className="text-sm font-medium">
                                                                            {payment.mode ===
                                                                            PaymentMode.CHEQUE
                                                                                ? "Cheque Payment"
                                                                                : payment.mode ===
                                                                                    PaymentMode.CASH
                                                                                  ? "Cash Payment"
                                                                                  : "Online Payment"}
                                                                        </span>
                                                                        <span className="text-sm font-bold">
                                                                            {formatCurrency(
                                                                                payment.amount,
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-muted-foreground mb-1 text-xs">
                                                                        {format(
                                                                            new Date(
                                                                                payment.transactionDate,
                                                                            ),
                                                                            "PPP",
                                                                        )}
                                                                        {payment.referenceNumber &&
                                                                            ` · Ref: ${payment.referenceNumber}`}
                                                                    </div>
                                                                    {payment.description && (
                                                                        <p className="text-xs">
                                                                            {
                                                                                payment.description
                                                                            }
                                                                        </p>
                                                                    )}

                                                                    {payment.chequeTransaction && (
                                                                        <div className="bg-muted/30 mt-2 rounded p-2 text-xs">
                                                                            <div className="mb-1 flex justify-between">
                                                                                <span className="text-muted-foreground">
                                                                                    Cheque
                                                                                    #
                                                                                    {
                                                                                        payment
                                                                                            .chequeTransaction
                                                                                            .chequeNumber
                                                                                    }
                                                                                </span>
                                                                                <Badge
                                                                                    variant="outline"
                                                                                    className={
                                                                                        payment
                                                                                            .chequeTransaction
                                                                                            .chequeStatus ===
                                                                                        ChequeStatus.CLEARED
                                                                                            ? "border-green-200 bg-green-50 text-green-700"
                                                                                            : payment
                                                                                                    .chequeTransaction
                                                                                                    .chequeStatus ===
                                                                                                ChequeStatus.BOUNCED
                                                                                              ? "border-red-200 bg-red-50 text-red-700"
                                                                                              : "border-yellow-200 bg-yellow-50 text-yellow-700"
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        payment
                                                                                            .chequeTransaction
                                                                                            .chequeStatus
                                                                                    }
                                                                                </Badge>
                                                                            </div>
                                                                            <div>
                                                                                {
                                                                                    payment
                                                                                        .chequeTransaction
                                                                                        .bank
                                                                                }{" "}
                                                                                {payment
                                                                                    .chequeTransaction
                                                                                    .branch &&
                                                                                    `· ${payment.chequeTransaction.branch}`}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="py-6 text-center">
                                                    <div className="bg-muted mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                                                        <Receipt className="text-muted-foreground h-6 w-6" />
                                                    </div>
                                                    <h3 className="mb-1 text-sm font-medium">
                                                        No payments recorded
                                                    </h3>
                                                    <p className="text-muted-foreground mb-3 text-xs">
                                                        This sale doesn&apos;t
                                                        have any payment records
                                                        yet
                                                    </p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent
                                    value="history"
                                    className="p-6 pt-4"
                                >
                                    <Card className="overflow-hidden rounded-lg border shadow-sm">
                                        <CardHeader className="bg-muted/20">
                                            <CardTitle className="text-sm font-medium">
                                                Activity Timeline
                                            </CardTitle>
                                            <CardDescription>
                                                Recent activity and inventory
                                                changes
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            {sale.inventoryEntries &&
                                            sale.inventoryEntries.length > 0 ? (
                                                <div className="py-2">
                                                    {sale.inventoryEntries.map(
                                                        (entry, index) => (
                                                            <div
                                                                key={entry.id}
                                                                className="relative flex flex-col py-3 pr-4 pl-8"
                                                            >
                                                                {/* Timeline connector line */}
                                                                {index <
                                                                    sale
                                                                        .inventoryEntries!
                                                                        .length -
                                                                        1 && (
                                                                    <div className="bg-border absolute top-5 bottom-0 left-4 w-px"></div>
                                                                )}

                                                                {/* Timeline dot */}
                                                                <div className="bg-primary absolute top-4 left-3 h-2 w-2 rounded-full"></div>

                                                                <div className="mb-1 flex items-start justify-between">
                                                                    <div className="text-sm font-medium">
                                                                        Inventory{" "}
                                                                        {entry.transactionType ===
                                                                        "SALES"
                                                                            ? "Deducted"
                                                                            : entry.transactionType}
                                                                    </div>
                                                                    <div className="text-muted-foreground text-xs">
                                                                        {format(
                                                                            new Date(
                                                                                entry.transactionDate,
                                                                            ),
                                                                            "PPP",
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="text-sm">
                                                                    {
                                                                        entry.quantity
                                                                    }{" "}
                                                                    {entry.transactionType ===
                                                                    "SALES"
                                                                        ? "units sold"
                                                                        : "units adjusted"}
                                                                    {entry.inventoryId &&
                                                                        entry.inventoryCode &&
                                                                        ` from inventory item ${entry.inventoryCode}`}
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="px-4 py-8 text-center">
                                                    <div className="bg-muted mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                                                        <Clock className="text-muted-foreground h-6 w-6" />
                                                    </div>
                                                    <h3 className="mb-1 text-sm font-medium">
                                                        No activity records
                                                    </h3>
                                                    <p className="text-muted-foreground text-xs">
                                                        No detailed activity
                                                        history is available
                                                    </p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>
                        )}

                        <div className="bg-muted/10 sticky bottom-0 flex justify-end gap-2 border-t p-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setOpen(false)}
                            >
                                Close
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handlePrintInvoice}
                            >
                                <FileText className="mr-2 h-4 w-4" /> View
                                Invoice
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
