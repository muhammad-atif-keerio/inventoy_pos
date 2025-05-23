import { Inter } from "next/font/google";
import Image from "next/image";

import { format } from "date-fns";

import { cn } from "@/lib/utils";

import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const inter = Inter({ subsets: ["latin"] });

interface Address {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
}

interface InvoiceItem {
    id: number;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    tax?: number;
    total: number;
}

interface Customer {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    address?: Address;
}

interface InvoiceData {
    id: string;
    invoiceNumber: string;
    date: Date;
    dueDate?: Date;
    customer: Customer;
    items: InvoiceItem[];
    subtotal: number;
    discount?: number;
    tax?: number;
    total: number;
    status: string;
    notes?: string;
    paymentStatus: string;
    paymentAmount?: number;
    paymentMode?: string;
}

interface InvoicePrintTemplateProps {
    invoiceData: InvoiceData;
    companyName?: string;
    companyLogo?: string;
    companyAddress?: Address;
    companyPhone?: string;
    companyEmail?: string;
    companyWebsite?: string;
}

// Define a simplified SalesOrderItem interface for the helper functions
// Currently not in use, kept for future implementation
/*
interface SalesOrderItem {
    productType: 'THREAD' | 'FABRIC';
    productId: number;
    quantitySold: number;
    unitPrice: number;
    discount: number;
    tax: number;
    subtotal: number;
    productDetails?: {
        threadProduct?: {
            name: string;
            color: string;
        };
        fabricProduction?: {
            name?: string;
            description?: string;
        };
    };
}
*/

// Helper functions
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "PKR",
        minimumFractionDigits: 0,
    }).format(amount);
};

const formatAddress = (address?: Address) => {
    if (!address) return "";
    const parts = [
        address.street,
        address.city,
        address.state,
        address.postalCode,
        address.country,
    ].filter(Boolean);
    return parts.join(", ");
};

// This function will be used when integrating with the API that returns SalesOrderItems
// Currently keeping it for future implementation
/*
const formatProductName = (item: SalesOrderItem): string => {
    if (item.productType === 'THREAD') {
        const threadDetails = item.productDetails?.threadProduct;
        if (threadDetails) {
            return `Thread: ${threadDetails.name} (${threadDetails.color})`;
        }
    } else if (item.productType === 'FABRIC') {
        const fabricDetails = item.productDetails?.fabricProduction;
        if (fabricDetails) {
            return `Fabric: ${fabricDetails.name || 'Unnamed'} - ${fabricDetails.description || 'No description'}`;
        }
    }
    return 'Unknown Product';
};

// This function will be used when integrating with the API that returns SalesOrderItems
// Currently keeping it for future implementation
const convertSalesItemsToInvoiceItems = (items: SalesOrderItem[]): InvoiceItem[] => {
    return items.map((item, index) => ({
        id: index + 1,
        name: formatProductName(item),
        description: item.productType === 'THREAD' ? 'Thread Product' : 'Fabric Product',
        quantity: item.quantitySold,
        unitPrice: item.unitPrice,
        discount: item.discount,
        tax: item.tax,
        total: item.subtotal,
    }));
};
*/

export function InvoicePrintTemplate({
    invoiceData,
    companyName = "Your Company Name",
    companyLogo = "/logo.png",
    companyAddress = {
        street: "123 Business Street",
        city: "City",
        state: "State",
        postalCode: "12345",
        country: "Country",
    },
    companyPhone = "+123 456 7890",
    companyEmail = "info@yourcompany.com",
    companyWebsite = "www.yourcompany.com",
}: InvoicePrintTemplateProps) {
    return (
        <div className={cn("min-h-screen bg-white p-4", inter.className)}>
            {/* Invoice Header */}
            <div className="mb-8 flex justify-between">
                <div>
                    <div className="relative h-12 w-40">
                        <Image
                            src={companyLogo}
                            alt={companyName}
                            fill
                            className="object-contain"
                        />
                    </div>
                    <div className="mt-4">
                        <h2 className="text-xl font-bold">{companyName}</h2>
                        <p className="text-muted-foreground text-sm">
                            {formatAddress(companyAddress)}
                        </p>
                        <p className="text-sm">{companyPhone}</p>
                        <p className="text-sm">{companyEmail}</p>
                        <p className="text-sm">{companyWebsite}</p>
                    </div>
                </div>
                <div className="text-right">
                    <h1 className="text-3xl font-bold">INVOICE</h1>
                    <p className="mt-1 text-sm font-medium">
                        #{invoiceData.invoiceNumber}
                    </p>
                    <div className="mt-4 text-sm">
                        <div className="flex justify-end space-x-4">
                            <div>
                                <p className="font-medium">Date:</p>
                                <p className="font-medium">Status:</p>
                                {invoiceData.dueDate && (
                                    <p className="font-medium">Due Date:</p>
                                )}
                                <p className="font-medium">Payment Status:</p>
                            </div>
                            <div className="text-right">
                                <p>
                                    {format(
                                        new Date(invoiceData.date),
                                        "dd MMM yyyy",
                                    )}
                                </p>
                                <p className="capitalize">
                                    {invoiceData.status.toLowerCase()}
                                </p>
                                {invoiceData.dueDate && (
                                    <p>
                                        {format(
                                            new Date(invoiceData.dueDate),
                                            "dd MMM yyyy",
                                        )}
                                    </p>
                                )}
                                <p className="capitalize">
                                    {invoiceData.paymentStatus.toLowerCase()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Customer Information */}
            <div className="mb-8 border-t border-b py-4">
                <div className="flex justify-between">
                    <div>
                        <h3 className="font-semibold">Bill To:</h3>
                        <div className="mt-2">
                            <p className="font-bold">
                                {invoiceData.customer.name}
                            </p>
                            {invoiceData.customer.email && (
                                <p className="text-sm">
                                    {invoiceData.customer.email}
                                </p>
                            )}
                            {invoiceData.customer.phone && (
                                <p className="text-sm">
                                    {invoiceData.customer.phone}
                                </p>
                            )}
                            {invoiceData.customer.address && (
                                <p className="text-sm">
                                    {formatAddress(
                                        invoiceData.customer.address,
                                    )}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <h3 className="font-semibold">Payment Information:</h3>
                        <div className="mt-2 text-sm">
                            <p>Mode: {invoiceData.paymentMode || "N/A"}</p>
                            <p>
                                Amount Paid:{" "}
                                {invoiceData.paymentAmount
                                    ? formatCurrency(invoiceData.paymentAmount)
                                    : "N/A"}
                            </p>
                            <p>
                                Balance:{" "}
                                {formatCurrency(
                                    invoiceData.total -
                                        (invoiceData.paymentAmount || 0),
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Invoice Items */}
            <div className="mb-8">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">No.</TableHead>
                            <TableHead className="w-[40%]">Item</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            {(invoiceData.items.some((item) => item.discount) ||
                                invoiceData.discount) && (
                                <TableHead className="text-right">
                                    Discount
                                </TableHead>
                            )}
                            {(invoiceData.items.some((item) => item.tax) ||
                                invoiceData.tax) && (
                                <TableHead className="text-right">
                                    Tax
                                </TableHead>
                            )}
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoiceData.items.map((item, index) => (
                            <TableRow key={item.id}>
                                <TableCell className="align-top">
                                    {index + 1}
                                </TableCell>
                                <TableCell className="align-top">
                                    <div className="font-medium">
                                        {item.name}
                                    </div>
                                    {item.description && (
                                        <div className="text-muted-foreground mt-1 text-xs">
                                            {item.description}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="text-right align-top">
                                    {item.quantity}
                                </TableCell>
                                <TableCell className="text-right align-top">
                                    {formatCurrency(item.unitPrice)}
                                </TableCell>
                                {(invoiceData.items.some(
                                    (item) => item.discount,
                                ) ||
                                    invoiceData.discount) && (
                                    <TableCell className="text-right align-top">
                                        {item.discount
                                            ? formatCurrency(item.discount)
                                            : "-"}
                                    </TableCell>
                                )}
                                {(invoiceData.items.some((item) => item.tax) ||
                                    invoiceData.tax) && (
                                    <TableCell className="text-right align-top">
                                        {item.tax
                                            ? formatCurrency(item.tax)
                                            : "-"}
                                    </TableCell>
                                )}
                                <TableCell className="text-right align-top font-medium">
                                    {formatCurrency(item.total)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell
                                colSpan={
                                    3 +
                                    (invoiceData.items.some(
                                        (item) => item.discount,
                                    ) || invoiceData.discount
                                        ? 1
                                        : 0) +
                                    (invoiceData.items.some(
                                        (item) => item.tax,
                                    ) || invoiceData.tax
                                        ? 1
                                        : 0)
                                }
                            >
                                Subtotal
                            </TableCell>
                            <TableCell className="text-right">
                                {formatCurrency(invoiceData.subtotal)}
                            </TableCell>
                        </TableRow>
                        {invoiceData.discount && invoiceData.discount > 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={
                                        3 +
                                        (invoiceData.items.some(
                                            (item) => item.discount,
                                        ) || invoiceData.discount
                                            ? 1
                                            : 0) +
                                        (invoiceData.items.some(
                                            (item) => item.tax,
                                        ) || invoiceData.tax
                                            ? 1
                                            : 0)
                                    }
                                >
                                    Discount
                                </TableCell>
                                <TableCell className="text-right">
                                    {formatCurrency(invoiceData.discount)}
                                </TableCell>
                            </TableRow>
                        )}
                        {invoiceData.tax && invoiceData.tax > 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={
                                        3 +
                                        (invoiceData.items.some(
                                            (item) => item.discount,
                                        ) || invoiceData.discount
                                            ? 1
                                            : 0) +
                                        (invoiceData.items.some(
                                            (item) => item.tax,
                                        ) || invoiceData.tax
                                            ? 1
                                            : 0)
                                    }
                                >
                                    Tax
                                </TableCell>
                                <TableCell className="text-right">
                                    {formatCurrency(invoiceData.tax)}
                                </TableCell>
                            </TableRow>
                        )}
                        <TableRow>
                            <TableCell
                                colSpan={
                                    3 +
                                    (invoiceData.items.some(
                                        (item) => item.discount,
                                    ) || invoiceData.discount
                                        ? 1
                                        : 0) +
                                    (invoiceData.items.some(
                                        (item) => item.tax,
                                    ) || invoiceData.tax
                                        ? 1
                                        : 0)
                                }
                                className="font-bold"
                            >
                                Total
                            </TableCell>
                            <TableCell className="text-right font-bold">
                                {formatCurrency(invoiceData.total)}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>

            {/* Notes */}
            {invoiceData.notes && (
                <div className="mb-8">
                    <h3 className="mb-2 font-semibold">Notes:</h3>
                    <p className="text-muted-foreground text-sm whitespace-pre-line">
                        {invoiceData.notes}
                    </p>
                </div>
            )}

            {/* Footer */}
            <div className="text-muted-foreground border-t pt-4 text-center text-sm">
                <p>Thank you for your business!</p>
                <p className="mt-1">
                    For any questions regarding this invoice, please contact{" "}
                    {companyEmail}
                </p>
            </div>
        </div>
    );
}
