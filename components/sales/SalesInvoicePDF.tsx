"use client";

import React from "react";

import {
    Customer,
    FabricProduction,
    Payment,
    Prisma,
    SalesOrder,
    ThreadPurchase,
} from "@prisma/client";
import {
    Document,
    PDFDownloadLink,
    Page,
    StyleSheet,
    Text,
    View,
} from "@react-pdf/renderer";
import { format } from "date-fns";

import { cn } from "@/lib/utils";

import { buttonVariants } from "@/components/ui/button";

// NO FONT REGISTRATION - Use only built-in PDF fonts

// Keep styling simple using only core PDF fonts
const styles = StyleSheet.create({
    page: {
        flexDirection: "column",
        backgroundColor: "#ffffff",
        padding: 30,
        fontFamily: "Helvetica",
        fontSize: 10,
        color: "#333333",
    },
    rtlText: {
        textAlign: "right",
        direction: "rtl",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 15,
    },
    headerLeft: {
        flexDirection: "column",
    },
    headerRight: {
        flexDirection: "column",
        alignItems: "flex-end",
    },
    companyName: {
        fontSize: 16,
        fontWeight: 700,
        color: "#111827",
    },
    companyDetail: {
        fontSize: 8,
        color: "#6B7280",
        marginTop: 2,
    },
    invoiceTitle: {
        fontSize: 14,
        fontWeight: 700,
        color: "#111827",
        marginBottom: 4,
    },
    invoiceDetail: {
        fontSize: 8,
        color: "#6B7280",
        marginBottom: 2,
    },
    section: {
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: 700,
        color: "#111827",
        marginBottom: 5,
        textTransform: "uppercase",
        borderBottom: "1 solid #E5E7EB",
        paddingBottom: 3,
    },
    flexRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    clientSection: {
        width: "48%",
        backgroundColor: "#F9FAFB",
        padding: 10,
        borderRadius: 3,
    },
    paymentSection: {
        width: "48%",
        backgroundColor: "#F9FAFB",
        padding: 10,
        borderRadius: 3,
    },
    clientName: {
        fontSize: 10,
        fontWeight: 700,
        color: "#111827",
        marginBottom: 3,
    },
    clientDetail: {
        fontSize: 8,
        color: "#6B7280",
        marginBottom: 1,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 5,
    },
    label: {
        fontWeight: 700,
    },
    value: {},
    table: {
        display: "flex",
        width: "auto",
        borderColor: "#E5E7EB",
        borderWidth: 1,
        borderRadius: 3,
        borderStyle: "solid",
        marginTop: 10,
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#F9FAFB",
        borderBottomColor: "#E5E7EB",
        borderBottomWidth: 1,
        borderBottomStyle: "solid",
    },
    tableHeaderCell: {
        padding: 6,
        fontSize: 8,
        fontWeight: 700,
        color: "#4B5563",
    },
    tableRow: {
        flexDirection: "row",
        borderBottomColor: "#E5E7EB",
        borderBottomWidth: 1,
        borderBottomStyle: "solid",
    },
    tableCell: {
        padding: 6,
        fontSize: 8,
    },
    col1: {
        width: "40%",
    },
    col2: {
        width: "20%",
        textAlign: "center",
    },
    col3: {
        width: "20%",
        textAlign: "right",
    },
    col4: {
        width: "20%",
        textAlign: "right",
    },
    summaryTable: {
        marginTop: 10,
        marginLeft: "auto",
        width: "35%",
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: "3 0",
    },
    summaryKey: {
        fontSize: 8,
        color: "#6B7280",
    },
    summaryValue: {
        fontSize: 8,
        fontWeight: 500,
        color: "#111827",
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: "5 0",
        marginTop: 3,
        borderTopColor: "#E5E7EB",
        borderTopWidth: 1,
        borderTopStyle: "solid",
    },
    totalKey: {
        fontSize: 10,
        fontWeight: 700,
        color: "#111827",
    },
    totalValue: {
        fontSize: 10,
        fontWeight: 700,
        color: "#111827",
    },
    paymentStatusBadge: {
        padding: "2 4",
        borderRadius: 2,
        fontSize: 8,
        fontWeight: 500,
        alignSelf: "flex-start",
        marginTop: 5,
    },
    paidBadge: {
        backgroundColor: "#D1FAE5",
        color: "#065F46",
    },
    partialBadge: {
        backgroundColor: "#FEF3C7",
        color: "#92400E",
    },
    pendingBadge: {
        backgroundColor: "#FEE2E2",
        color: "#B91C1C",
    },
    footer: {
        marginTop: 15,
        borderTopColor: "#E5E7EB",
        borderTopWidth: 1,
        borderTopStyle: "solid",
        paddingTop: 10,
        fontSize: 7,
        color: "#6B7280",
        textAlign: "center",
    },
    productDetails: {
        fontSize: 7,
        color: "#6B7280",
        marginTop: 2,
    },
    // Use this for English placeholder instead of Urdu text
    placeholderText: {
        fontStyle: "italic",
        color: "#6B7280",
    },
});

// Helper functions
const formatCurrency = (amount: number | string | Prisma.Decimal | null) => {
    if (amount === null) return "PKR 0.00";
    const num =
        typeof amount === "string" ? parseFloat(amount) : Number(amount);
    return new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: "PKR",
        minimumFractionDigits: 2,
    }).format(num);
};

const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return format(new Date(date), "dd MMM yyyy");
};

// Define our types with necessary relationships
interface SalesInvoiceProps {
    salesOrder: SalesOrder & {
        customer: Customer;
        threadPurchase?: ThreadPurchase | null;
        fabricProduction?: FabricProduction | null;
        payments?: Payment[];
        customerName?: string;
        customerPhone?: string;
        customerEmail?: string;
        customerCity?: string;
        customerNotes?: string;
        productType?: string;
        quantitySold?: number;
        unitPrice?: number;
        items?: Array<{
            id: string;
            productId: string;
            productName: string;
            productType: string;
            quantitySold: number;
            unitPrice: number;
            threadPurchase?: ThreadPurchase | null;
            fabricProduction?: FabricProduction | null;
        }>;
    };
}

// The PDF document component
const PDFInvoiceComponent = ({ salesOrder }: SalesInvoiceProps) => {
    // Type assert the salesOrder to include the optional fields for easier destructuring
    const {
        orderNumber,
        orderDate,
        customer,
        productType = "",
        quantitySold = 0,
        unitPrice = 0,
        discount = 0,
        tax = 0,
        totalSale,
        deliveryDate,
        deliveryAddress,
        remarks,
        paymentStatus,
        payments = [],
        threadPurchase,
        fabricProduction,
        items = [], // Provide default empty array
    } = salesOrder;

    // Get product details based on type
    const productDetails =
        productType === "THREAD"
            ? {
                  name: threadPurchase?.threadType || "Thread",
                  description: `Color: ${threadPurchase?.color || "N/A"}${threadPurchase?.colorStatus ? `, Status: ${threadPurchase.colorStatus}` : ""}`,
                  unitOfMeasure: threadPurchase?.unitOfMeasure || "meters",
              }
            : {
                  name: fabricProduction?.fabricType || "Fabric",
                  description:
                      fabricProduction?.dimensions || "Standard dimensions",
                  unitOfMeasure: fabricProduction?.unitOfMeasure || "meters",
              };

    // Calculate payment totals
    const totalPaid =
        payments?.reduce((sum, payment) => sum + Number(payment.amount), 0) ||
        0;
    const balance = Number(totalSale) - totalPaid;

    // Determine payment status badge style
    const getStatusBadgeStyle = () => {
        switch (paymentStatus) {
            case "PAID":
                return { ...styles.paymentStatusBadge, ...styles.paidBadge };
            case "PARTIAL":
                return { ...styles.paymentStatusBadge, ...styles.partialBadge };
            default:
                return { ...styles.paymentStatusBadge, ...styles.pendingBadge };
        }
    };

    // Generate payments list
    const renderPayments = () => {
        if (!payments || payments.length === 0) {
            return <Text style={styles.clientDetail}>No payment records</Text>;
        }

        return payments.map((payment, index) => (
            <View key={`payment-${index}`} style={{ marginBottom: 5 }}>
                <Text style={styles.clientDetail}>
                    {formatDate(payment.transactionDate)} -{" "}
                    {formatCurrency(payment.amount)}
                    {payment.mode && ` via ${payment.mode}`}
                </Text>
            </View>
        ));
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.companyName}>RAHEEL FABRICS</Text>
                        <Text style={styles.companyDetail}>
                            Faisalabad, Pakistan
                        </Text>
                        <Text style={styles.companyDetail}>
                            +92 123 456 7890
                        </Text>
                        <Text style={styles.companyDetail}>
                            info@raheelfabrics.com
                        </Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.invoiceTitle}>INVOICE</Text>
                        <Text style={styles.invoiceDetail}>
                            Invoice #: {orderNumber}
                        </Text>
                        <Text style={styles.invoiceDetail}>
                            Date: {formatDate(orderDate)}
                        </Text>
                        <Text style={styles.invoiceDetail}>
                            Due Date: {formatDate(deliveryDate || orderDate)}
                        </Text>
                        <View style={getStatusBadgeStyle()}>
                            <Text>
                                {paymentStatus === "PAID"
                                    ? "PAID"
                                    : paymentStatus === "PARTIAL"
                                      ? "PARTIAL"
                                      : "PENDING"}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Client and Payment Information */}
                <View style={styles.flexRow}>
                    <View style={styles.clientSection}>
                        <Text style={styles.sectionTitle}>BILL TO</Text>
                        <Text style={styles.clientName}>{customer.name}</Text>
                        {customer.contact && (
                            <Text style={styles.clientDetail}>
                                Contact: {customer.contact}
                            </Text>
                        )}
                        {customer.email && (
                            <Text style={styles.clientDetail}>
                                Email: {customer.email}
                            </Text>
                        )}
                        {customer.address && (
                            <Text style={styles.clientDetail}>
                                Address: {customer.address}
                            </Text>
                        )}
                    </View>

                    <View style={styles.paymentSection}>
                        <Text style={styles.sectionTitle}>
                            PAYMENT INFORMATION
                        </Text>
                        <View style={{ marginBottom: 10 }}>
                            <Text
                                style={{
                                    ...styles.clientDetail,
                                    fontWeight: 700,
                                }}
                            >
                                Payment Status:
                            </Text>
                            <Text style={styles.clientDetail}>
                                {paymentStatus === "PAID"
                                    ? "Paid"
                                    : paymentStatus === "PARTIAL"
                                      ? "Partial"
                                      : "Pending"}
                            </Text>
                        </View>

                        {payments && payments.length > 0 && (
                            <View>
                                <Text
                                    style={{
                                        ...styles.clientDetail,
                                        fontWeight: 700,
                                    }}
                                >
                                    Payment Records:
                                </Text>
                                {renderPayments()}
                            </View>
                        )}

                        {deliveryAddress && (
                            <View style={{ marginTop: 10 }}>
                                <Text
                                    style={{
                                        ...styles.clientDetail,
                                        fontWeight: 700,
                                    }}
                                >
                                    Delivery Address:
                                </Text>
                                <Text style={styles.clientDetail}>
                                    {deliveryAddress}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Customer Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        CUSTOMER INFORMATION
                    </Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Name:</Text>
                        <Text style={styles.value}>
                            {salesOrder.customer?.name ||
                                salesOrder.customerName ||
                                "N/A"}
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Contact:</Text>
                        <Text style={styles.value}>
                            {salesOrder.customer?.contact ||
                                salesOrder.customerPhone ||
                                "N/A"}
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Email:</Text>
                        <Text style={styles.value}>
                            {salesOrder.customer?.email ||
                                salesOrder.customerEmail ||
                                "N/A"}
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Address:</Text>
                        <Text style={styles.value}>
                            {salesOrder.customer?.address ||
                                salesOrder.deliveryAddress ||
                                "N/A"}
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>City:</Text>
                        <Text style={styles.value}>
                            {salesOrder.customer?.city ||
                                salesOrder.customerCity ||
                                "N/A"}
                        </Text>
                    </View>
                    {(salesOrder.customer?.notes ||
                        salesOrder.customerNotes) && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Notes:</Text>
                            <Text style={styles.value}>
                                {salesOrder.customer?.notes ||
                                    salesOrder.customerNotes}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Items Table */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ITEMS</Text>

                    <View style={styles.table}>
                        {/* Table Header */}
                        <View style={styles.tableHeader}>
                            <Text style={[styles.tableHeaderCell, styles.col1]}>
                                PRODUCT
                            </Text>
                            <Text style={[styles.tableHeaderCell, styles.col2]}>
                                QUANTITY
                            </Text>
                            <Text style={[styles.tableHeaderCell, styles.col3]}>
                                UNIT PRICE
                            </Text>
                            <Text style={[styles.tableHeaderCell, styles.col4]}>
                                AMOUNT
                            </Text>
                        </View>

                        {/* Check if sale has multiple items */}
                        {items && items.length > 0 ? (
                            // Display multiple items
                            items.map((item, index) => (
                                <View
                                    key={item.id || index}
                                    style={styles.tableRow}
                                >
                                    <View
                                        style={[styles.tableCell, styles.col1]}
                                    >
                                        <Text>
                                            {item.productName ||
                                                `Product #${item.productId}`}
                                        </Text>
                                        <Text style={styles.productDetails}>
                                            {item.productType === "THREAD"
                                                ? "Thread"
                                                : "Fabric"}
                                        </Text>
                                        <Text style={styles.productDetails}>
                                            {item.productType === "THREAD" &&
                                            item.threadPurchase
                                                ? `${item.threadPurchase.threadType}${item.threadPurchase.color ? ` - ${item.threadPurchase.color}` : ""}`
                                                : item.productType ===
                                                        "FABRIC" &&
                                                    item.fabricProduction
                                                  ? `${item.fabricProduction.fabricType}${item.fabricProduction.dimensions ? ` - ${item.fabricProduction.dimensions}` : ""}`
                                                  : ""}
                                        </Text>
                                    </View>
                                    <Text
                                        style={[styles.tableCell, styles.col2]}
                                    >
                                        {item.quantitySold}
                                    </Text>
                                    <Text
                                        style={[styles.tableCell, styles.col3]}
                                    >
                                        {formatCurrency(item.unitPrice)}
                                    </Text>
                                    <Text
                                        style={[styles.tableCell, styles.col4]}
                                    >
                                        {formatCurrency(
                                            Number(item.unitPrice) *
                                                item.quantitySold,
                                        )}
                                    </Text>
                                </View>
                            ))
                        ) : (
                            // Legacy single product display
                            <View style={styles.tableRow}>
                                <View style={[styles.tableCell, styles.col1]}>
                                    <Text>{productDetails.name}</Text>
                                    <Text style={styles.productDetails}>
                                        {productType === "THREAD"
                                            ? "Thread"
                                            : "Fabric"}
                                    </Text>
                                    <Text style={styles.productDetails}>
                                        {productDetails.description}
                                    </Text>
                                </View>
                                <Text style={[styles.tableCell, styles.col2]}>
                                    {quantitySold}{" "}
                                    {productDetails.unitOfMeasure}
                                </Text>
                                <Text style={[styles.tableCell, styles.col3]}>
                                    {formatCurrency(unitPrice)}
                                </Text>
                                <Text style={[styles.tableCell, styles.col4]}>
                                    {formatCurrency(
                                        Number(unitPrice) * quantitySold,
                                    )}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Summary */}
                    <View style={styles.summaryTable}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryKey}>Subtotal:</Text>
                            <Text style={styles.summaryValue}>
                                {formatCurrency(
                                    items && items.length > 0
                                        ? items.reduce(
                                              (sum, item) =>
                                                  sum +
                                                  Number(item.unitPrice) *
                                                      item.quantitySold,
                                              0,
                                          )
                                        : Number(unitPrice) * quantitySold,
                                )}
                            </Text>
                        </View>

                        {Number(discount) > 0 && (
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryKey}>Discount:</Text>
                                <Text style={styles.summaryValue}>
                                    - {formatCurrency(discount)}
                                </Text>
                            </View>
                        )}

                        {Number(tax) > 0 && (
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryKey}>Tax:</Text>
                                <Text style={styles.summaryValue}>
                                    {formatCurrency(tax)}
                                </Text>
                            </View>
                        )}

                        <View style={styles.totalRow}>
                            <Text style={styles.totalKey}>Total:</Text>
                            <Text style={styles.totalValue}>
                                {formatCurrency(totalSale)}
                            </Text>
                        </View>

                        {totalPaid > 0 && (
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryKey}>
                                    Paid Amount:
                                </Text>
                                <Text style={styles.summaryValue}>
                                    {formatCurrency(totalPaid)}
                                </Text>
                            </View>
                        )}

                        {balance > 0 && (
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryKey}>
                                    Balance Due:
                                </Text>
                                <Text
                                    style={{
                                        ...styles.summaryValue,
                                        color: "#B91C1C",
                                    }}
                                >
                                    {formatCurrency(balance)}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Notes */}
                {remarks && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>REMARKS</Text>
                        <Text style={styles.clientDetail}>{remarks}</Text>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>Thank you for your business!</Text>
                    <Text style={{ marginTop: 5 }}>
                        Generated: {formatDate(new Date())}
                    </Text>
                </View>
            </Page>
        </Document>
    );
};

// Use memo to optimize rendering
export const SalesInvoicePDF = React.memo(PDFInvoiceComponent);
// Set display name for better debugging
SalesInvoicePDF.displayName = "SalesInvoicePDF";

// PDF Download Button Component for reuse throughout the app
interface InvoiceDownloadProps {
    salesOrder: SalesInvoiceProps["salesOrder"];
    fileName?: string;
    children?: React.ReactNode;
    className?: string;
}

export const SalesInvoiceDownloadButton = ({
    salesOrder,
    fileName = `Invoice-${salesOrder.orderNumber}.pdf`,
    children,
    className,
}: InvoiceDownloadProps) => {
    // Use a local state to determine if we need to show loading
    const [isReady, setIsReady] = React.useState(false);

    // Ensure we're only rendering in the browser
    React.useEffect(() => {
        setIsReady(true);
    }, []);

    if (!isReady) {
        return (
            <button
                className={cn(
                    buttonVariants({ variant: "default" }),
                    className,
                )}
                disabled
            >
                Preparing PDF...
            </button>
        );
    }

    return (
        <PDFDownloadLink
            document={<SalesInvoicePDF salesOrder={salesOrder} />}
            fileName={fileName}
            className={cn(
                buttonVariants({ variant: "default" }),
                className,
                "pdf-download-link", // Always include this class for reliable targeting
            )}
        >
            {({ loading, error }) => {
                if (loading) return "Generating invoice...";
                if (error) {
                    console.error("PDF generation error:", error);
                    return `Error: ${error}`;
                }
                return children || "Download Invoice";
            }}
        </PDFDownloadLink>
    );
};

// Hook for programmatic PDF generation - simplified
export const useSalesInvoicePDF = () => {
    return { url: null, blob: null, loading: false, error: null };
};
