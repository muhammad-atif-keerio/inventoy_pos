"use client";

import Head from "next/head";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

import { Prisma } from "@prisma/client";
import { format } from "date-fns";
import { Download, Printer } from "lucide-react";

import { SalesInvoiceDownloadButton } from "@/components/sales/SalesInvoicePDF";
import { Button } from "@/components/ui/button";

import { SalesOrderItem } from "@/app/(dashboard)/sales/columns";
import { InvoicePrintTemplate } from "@/app/(dashboard)/sales/invoice-print-template";

import { FontCheck } from "./font-check";

// Extended Urdu translations for components and invoice content
const urduText = {
    loading: "انوائس لوڈ ہو رہا ہے...",
    error: "خرابی",
    notFound: "انوائس نہیں ملا",
    notFoundDesc:
        "مطلوبہ انوائس نہیں مل سکا۔ براہ کرم انوائس آی ڈی چیک کریں اور دوبارہ کوشش کریں۔",
    preparing: "انوائس تیار ہو رہا ہے",
    autoDownload:
        "آپ کا انوائس ایک لمحے میں ڈاؤنلوڈ ہو جائے گا۔ اگر ڈاؤنلوڈ خود بخود شروع نہیں ہوتا ہے، تو براہ کرم نیچے دیئے گئے بٹن پر کلک کریں۔",
    orderNumber: "آرڈر نمبر",
    date: "تاریخ",
    customer: "کسٹمر",
    quantity: "مقدار",
    totalAmount: "کل رقم",
    download: "ڈاؤنلوڈ کریں",
    back: "واپس جائیں",
    preview: "انوائس پیش نظارہ",
    print: "پرنٹ کریں",
    raheelFabrics: "راحیل فیبرکس",
    faisalabad: "فیصل آباد، پاکستان",
    invoice: "انوائس",
    number: "نمبر",
    customerDetails: "کسٹمر کی تفصیلات",
    name: "نام",
    contact: "رابطہ",
    email: "ای میل",
    address: "پتہ",
    city: "شہر",
    paymentStatus: "ادائیگی کی حالت",
    paid: "ادا شدہ",
    partial: "جزوی",
    pending: "زیر التواء",

    // Additional translations for invoice template
    invoiceNumber: "انوائس نمبر",
    invoiceDate: "انوائس کی تاریخ",
    companyDetails: "کمپنی کی تفصیلات",
    productDetails: "پروڈکٹ کی تفصیلات",
    productName: "پروڈکٹ کا نام",
    unitPrice: "فی یونٹ قیمت",
    totalPrice: "کل قیمت",
    subtotal: "ذیلی کل",
    discount: "رعایت",
    tax: "ٹیکس",
    grandTotal: "مجموعی کل",
    paymentMethod: "ادائیگی کا طریقہ",
    paymentTerms: "ادائیگی کی شرائط",
    thankyou: "آپ کا شکریہ!",
    contactUs: "ہم سے رابطہ کریں",
    phone: "فون",
    printDate: "پرنٹ کی تاریخ",
    deliveryDetails: "ترسیل کی تفصیلات",
    deliveryDate: "ترسیل کی تاریخ",
    deliveryAddress: "ترسیل کا پتہ",
    remarks: "تبصرے",

    // Translations that match the defaultTranslations keys in invoice-print-template.tsx
    billed_to: "بل وصول کنندہ",
    payment_details: "ادائیگی کی تفصیلات",
    payment_status: "ادائیگی کی حالت",
    payment_method: "ادائیگی کا طریقہ",
    cheque_number: "چیک نمبر",
    bank: "بینک",
    cheque_status: "چیک کی حالت",
    order_date: "آرڈر کی تاریخ",
    items: "اشیاء",
    product: "پروڈکٹ",
    unit_price: "فی یونٹ قیمت",
    amount: "رقم",
    note: "نوٹ",
    payment_summary: "ادائیگی کا خلاصہ",
    total: "کل",
    amount_paid: "ادا کی گئی رقم",
    balance_due: "باقی رقم",
    payment_history: "ادائیگی کی تاریخ",
    method: "طریقہ",
    reference: "حوالہ",
    thank_you: "آپ کے کاروبار کا شکریہ!",
    contact_info:
        "معلومات کے لیے ہم سے 7890 456 123 92+ پر یا info@raheelfabrics.com پر رابطہ کریں",
    not_specified: "غیر مخصوص",
    address_missing: "پتہ کی معلومات دستیاب نہیں ہیں",
    thread_type: "دھاگے کی قسم",
    color: "رنگ",
    fabric_type: "کپڑے کی قسم",
    dimensions: "سائز",
    company_name: "راحیل فیبرکس",
    company_tagline: "معیاری دھاگے اور کپڑے کے حل",
    company_address: "123 ٹیکسٹائل ایونیو، فیصل آباد",
    company_phone: "+92 123 456 7890",
    company_email: "info@raheelfabrics.com",
};

// Helper function to adapt SalesOrderItem to the format expected by SalesInvoicePDF
const adaptSalesOrderForPDF = (item: SalesOrderItem) => {
    // Helper function to safely convert to Decimal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const safeDecimal = (value: any) => {
        if (value === undefined || value === null) return null;
        try {
            return new Prisma.Decimal(value);
        } catch (error) {
            console.warn(`Failed to convert ${value} to Decimal:`, error);
            return new Prisma.Decimal(0);
        }
    };

    return {
        ...item,
        // Convert string dates to Date objects
        orderDate: new Date(item.orderDate),
        deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
        // Convert numeric values to Prisma.Decimal if needed
        unitPrice: safeDecimal(item.unitPrice),
        discount: safeDecimal(item.discount),
        tax: safeDecimal(item.tax),
        totalSale: safeDecimal(item.totalSale),
        // Fix string | undefined to string | null for fields that expect null
        deliveryAddress: item.deliveryAddress || null,
        remarks: item.remarks || null,
        paymentMode: item.paymentMode || null,
        // Store additional customer fields for backward compatibility
        customerName: item.customerName || "Customer",
        customerPhone: item.customerPhone || null,
        customerEmail: item.customerEmail || null,
        // Use customer object if available, otherwise build from flat fields
        customer: item.customer
            ? {
                  ...item.customer,
                  // Ensure required fields are present
                  name: item.customer.name || item.customerName || "Customer",
                  contact: item.customer.contact || item.customerPhone || "",
                  email: item.customer.email || item.customerEmail || null,
                  address:
                      item.customer.address || item.deliveryAddress || null,
                  // Add createdAt and updatedAt if not present
                  createdAt: item.customer.createdAt
                      ? typeof item.customer.createdAt === "string"
                          ? new Date(item.customer.createdAt)
                          : item.customer.createdAt
                      : new Date(),
                  updatedAt: item.customer.updatedAt
                      ? typeof item.customer.updatedAt === "string"
                          ? new Date(item.customer.updatedAt)
                          : item.customer.updatedAt
                      : new Date(),
                  // Ensure city is never undefined
                  city: item.customer.city || null,
              }
            : {
                  // Create a customer object from the flat fields if not present
                  id: item.customerId,
                  name: item.customerName || "Customer",
                  contact: item.customerPhone || "",
                  email: item.customerEmail || null,
                  address: item.deliveryAddress || null,
                  city: null,
                  notes: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
              },
        // Add any other required fields
        payments: item.payments || [],
        // Process items array if present
        items:
            item.items?.map((itemInCart) => ({
                ...itemInCart,
                unitPrice: safeDecimal(itemInCart.unitPrice),
                // Handle any other decimal fields in items
                discount: safeDecimal(itemInCart.discount),
                tax: safeDecimal(itemInCart.tax),
                subtotal: safeDecimal(itemInCart.subtotal),
            })) || [],
    };
};

interface InvoicePreviewClientProps {
    id: string;
}

export default function InvoicePreviewClient({
    id,
}: InvoicePreviewClientProps) {
    const [loading, setLoading] = useState(true);
    const [salesOrder, setSalesOrder] = useState<SalesOrderItem | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPdfReady, setIsPdfReady] = useState(false);
    const searchParams = useSearchParams();
    const isPdfMode = searchParams?.get("pdf") === "true";
    const [language, setLanguage] = useState<"en" | "ur">("ur"); // Default to Urdu

    // Add a developer mode state for testing font rendering
    const [devMode, setDevMode] = useState(false);

    // Only compute adapted sales order when needed
    const adaptedSalesOrder = useMemo(
        () => (salesOrder ? adaptSalesOrderForPDF(salesOrder) : null),
        [salesOrder],
    );

    // Store download button reference
    const [autoDownloadTriggered, setAutoDownloadTriggered] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function fetchSalesOrder() {
            if (!id) {
                if (isMounted) {
                    setError("Invalid invoice ID");
                    setLoading(false);
                }
                return;
            }

            try {
                const response = await fetch(`/api/sales/${id}`);

                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch invoice data: ${response.statusText}`,
                    );
                }

                const data = await response.json();
                if (isMounted) {
                    setSalesOrder(data);
                    // Delay setting PDF ready to allow component to stabilize
                    setTimeout(() => {
                        if (isMounted) setIsPdfReady(true);
                    }, 500);
                }
            } catch (err) {
                console.error("Error fetching sales order:", err);
                if (isMounted) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load invoice",
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchSalesOrder();

        // Cleanup function to prevent memory leaks
        return () => {
            isMounted = false;
        };
    }, [id]);

    // Fix the auto-download functionality to prevent hydration mismatches
    useEffect(() => {
        if (
            !loading &&
            salesOrder &&
            !error &&
            isPdfMode &&
            !autoDownloadTriggered &&
            typeof window !== "undefined" // Only run in browser
        ) {
            const timer = setTimeout(() => {
                try {
                    const downloadButton = document.querySelector(
                        ".download-trigger",
                    ) as HTMLButtonElement | null;
                    if (downloadButton) {
                        downloadButton.click();
                        setAutoDownloadTriggered(true);
                    }
                } catch (err) {
                    console.error("Error triggering download:", err);
                }
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [loading, salesOrder, error, isPdfMode, autoDownloadTriggered]);

    // Script to auto-download PDF after rendering - used for both view modes
    useEffect(() => {
        // Only run in browser environment
        if (!loading && salesOrder && !error && typeof window !== "undefined") {
            let attempts = 0;
            const maxAttempts = 3;
            let intervalId: ReturnType<typeof setInterval> | null = null;

            const downloadPDF = () => {
                try {
                    console.log("Attempting to trigger PDF download...");
                    const downloadLink = document.querySelector(
                        ".pdf-download-link",
                    ) as HTMLAnchorElement | null;

                    if (downloadLink) {
                        console.log("Found download link, clicking it...");
                        downloadLink.click();
                        return true;
                    } else if (attempts < maxAttempts) {
                        console.log(
                            `Download link not found, attempt ${attempts + 1} of ${maxAttempts}`,
                        );
                        attempts++;
                        return false;
                    } else {
                        console.error(
                            "Max attempts reached, download link not found",
                        );
                        return true; // Stop trying after max attempts
                    }
                } catch (err) {
                    console.error("Error triggering PDF download:", err);
                    return true; // Stop on error
                }
            };

            // Initial attempt
            if (!downloadPDF()) {
                // Try again after a delay if first attempt failed
                intervalId = setInterval(() => {
                    if (downloadPDF()) {
                        if (intervalId !== null) clearInterval(intervalId);
                    }
                }, 1000);
            }

            // Clean up interval
            return () => {
                if (intervalId !== null) clearInterval(intervalId);
            };
        }
    }, [loading, salesOrder, error]);

    // Separate component for loading state for better code organization
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-4 border-r-transparent"></div>
                    <p className="urdu-text mt-4 text-sm text-gray-500">
                        {urduText.loading}
                    </p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
                    <h2 className="urdu-text text-lg font-semibold text-red-700">
                        {urduText.error}
                    </h2>
                    <p className="urdu-text mt-2 text-sm text-red-600">
                        {error === "Invoice not found"
                            ? urduText.notFound
                            : error}
                    </p>
                </div>
            </div>
        );
    }

    // Not found state
    if (!salesOrder) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
                    <h2 className="urdu-text text-lg font-semibold text-amber-700">
                        {urduText.notFound}
                    </h2>
                    <p className="urdu-text mt-2 text-sm text-amber-600">
                        {urduText.notFoundDesc}
                    </p>
                </div>
            </div>
        );
    }

    // If in PDF mode and data is loaded, render the PDF download UI
    if (isPdfMode) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-white px-4 text-center">
                <div className="w-full max-w-md space-y-6 rounded-lg border border-gray-100 bg-white p-8 shadow-sm">
                    <h1 className="urdu-text text-xl font-semibold text-gray-900">
                        {urduText.preparing}
                    </h1>

                    <p className="urdu-text text-sm text-gray-500">
                        {urduText.autoDownload}
                    </p>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-inner">
                        <div className="flex justify-between">
                            <div className="urdu-text text-sm font-medium text-gray-700">
                                {urduText.orderNumber}
                            </div>
                            <div className="text-sm text-gray-900">
                                {salesOrder.orderNumber}
                            </div>
                        </div>
                        <div className="mt-2 flex justify-between">
                            <div className="urdu-text text-sm font-medium text-gray-700">
                                {urduText.date}
                            </div>
                            <div className="text-sm text-gray-900">
                                {format(
                                    new Date(salesOrder.orderDate),
                                    "dd MMM yyyy",
                                )}
                            </div>
                        </div>
                        <div className="mt-2 flex justify-between">
                            <div className="urdu-text text-sm font-medium text-gray-700">
                                {urduText.customer}
                            </div>
                            <div className="text-sm text-gray-900">
                                {salesOrder.customer?.name ||
                                    salesOrder.customerName ||
                                    "Customer"}
                            </div>
                        </div>
                        <div className="mt-2 flex justify-between">
                            <div className="urdu-text text-sm font-medium text-gray-700">
                                {urduText.quantity}
                            </div>
                            <div className="text-sm text-gray-900">
                                {salesOrder.quantitySold}
                            </div>
                        </div>
                        <div className="mt-2 flex justify-between">
                            <div className="urdu-text text-sm font-medium text-gray-700">
                                {urduText.totalAmount}
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                                Rs{" "}
                                {Number(salesOrder.totalSale).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {adaptedSalesOrder && (
                        <SalesInvoiceDownloadButton
                            // Type assertion to the component's expected type
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            salesOrder={adaptedSalesOrder as any}
                            fileName={`Invoice-${salesOrder.orderNumber}.pdf`}
                            className="download-trigger w-full"
                        >
                            <span className="flex items-center justify-center">
                                <Download className="mr-2 h-4 w-4" />
                                <span className="urdu-text">
                                    {urduText.download}
                                </span>
                            </span>
                        </SalesInvoiceDownloadButton>
                    )}

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.history.back()}
                    >
                        <span className="urdu-text">{urduText.back}</span>
                    </Button>
                </div>
            </div>
        );
    }

    // Regular invoice preview UI with Urdu font styling
    return (
        <>
            {/* Essential meta tags for proper text encoding */}
            <Head>
                <meta charSet="UTF-8" />
                <meta
                    httpEquiv="Content-Type"
                    content="text/html; charset=utf-8"
                />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                />
            </Head>

            {/* Proper Urdu font configuration with fallbacks */}
            <style jsx global>{`
                /* Use the existing Noto Nastaliq Urdu font with proper Unicode support */
                @font-face {
                    font-family: "Noto Nastaliq Urdu";
                    src: url("/fonts/NotoNastaliqUrdu-VariableFont_wght.ttf")
                        format("truetype");
                    font-weight: 400 700;
                    font-style: normal;
                    font-display: swap;
                    unicode-range:
                        U+0600-06FF, U+0750-077F, U+08A0-08FF, U+FB50-FDFF,
                        U+FE70-FEFF;
                }

                /* Ensure proper text encoding for Urdu */
                html {
                    -webkit-text-size-adjust: 100%;
                    -webkit-font-smoothing: antialiased;
                }

                /* Enhanced Urdu text styling with better fallbacks */
                .urdu-text {
                    font-family:
                        "Noto Nastaliq Urdu", "Nastaliq Nafees",
                        "Jameel Noori Nastaleeq", "Urdu Typesetting",
                        "Alvi Nastaleeq", Arial, sans-serif;
                    direction: rtl;
                    text-align: right;
                    unicode-bidi: bidi-override;
                    /* Force text color for visibility */
                    color: #333333;
                    /* Prevent character joining issues */
                    letter-spacing: 0;
                    word-spacing: normal;
                    /* Ensure proper line height for Nastaliq script */
                    line-height: 1.8;
                    /* Fix rendering issues on some browsers */
                    -webkit-font-feature-settings:
                        "kern", "liga", "clig", "calt";
                    font-feature-settings: "kern", "liga", "clig", "calt";
                }

                /* Fix color of Urdu text in specific contexts */
                .bg-primary .urdu-text,
                [class*="bg-green"] .urdu-text,
                [class*="bg-blue"] .urdu-text,
                .text-white .urdu-text,
                .btn .urdu-text,
                button .urdu-text {
                    color: white !important;
                }

                /* Make sure links with Urdu text have proper colors */
                a .urdu-text {
                    color: inherit;
                }

                /* Ensure invoice header texts are visible */
                .sticky .urdu-text {
                    color: #333333;
                }

                /* Prevent text overflow issues */
                .urdu-text-container {
                    overflow-wrap: break-word;
                    word-wrap: break-word;
                    -ms-word-break: break-all;
                    word-break: break-word;
                }

                /* Enhanced print styles for Urdu text */
                @media print {
                    @page {
                        size: A4;
                        margin: 1cm;
                    }

                    html,
                    body {
                        direction: rtl;
                        font-family:
                            "Noto Nastaliq Urdu", "Nastaliq Nafees",
                            "Jameel Noori Nastaleeq", "Urdu Typesetting", Arial,
                            sans-serif;
                        color: black !important;
                    }

                    .urdu-print-text {
                        font-family:
                            "Noto Nastaliq Urdu", "Nastaliq Nafees",
                            "Jameel Noori Nastaleeq", "Urdu Typesetting", Arial,
                            sans-serif;
                        direction: rtl;
                        text-align: right;
                        color: black !important;
                    }

                    /* Force Urdu text to render correctly in print */
                    .urdu-document * {
                        font-family:
                            "Noto Nastaliq Urdu", "Nastaliq Nafees",
                            "Jameel Noori Nastaleeq", "Urdu Typesetting", Arial,
                            sans-serif !important;
                        color: black !important;
                    }

                    /* Make sure tables display correctly in RTL */
                    .rtl-table {
                        direction: rtl;
                        unicode-bidi: embed;
                    }

                    .rtl-table th,
                    .rtl-table td {
                        text-align: right;
                        color: black !important;
                    }

                    /* Fix text corruption in PDF generations */
                    .urdu-text {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        color: black !important;
                    }
                }
            `}</style>

            <div className="urdu-document min-h-screen bg-white">
                <div className="mx-auto max-w-4xl">
                    {/* Print-only header */}
                    <div className="sticky top-0 z-10 border-b bg-white shadow-sm print:hidden">
                        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
                            <div>
                                <h1 className="text-lg font-semibold text-gray-900">
                                    <span className="urdu-text text-gray-900">
                                        {urduText.invoice}
                                    </span>{" "}
                                    #{salesOrder.orderNumber}
                                </h1>
                                <p className="text-sm text-gray-500">
                                    {format(
                                        new Date(salesOrder.orderDate),
                                        "PPP",
                                    )}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Developer mode toggle - only visible in development */}
                                {process.env.NODE_ENV === "development" && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setDevMode(!devMode)}
                                        className="mr-2 text-xs invert"
                                    >
                                        {devMode
                                            ? "Hide Font Check"
                                            : "Font Check"}
                                    </Button>
                                )}

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setLanguage(
                                            language === "en" ? "ur" : "en",
                                        )
                                    }
                                    className="mr-2 invert"
                                >
                                    <span
                                        className={`urdu-text ${language === "en" ? "text-gray-800" : "text-blue-600"}`}
                                    >
                                        {language === "en" ? "اردو" : "English"}
                                    </span>
                                </Button>

                                <button
                                    onClick={() => window.print()}
                                    className="bg-primary hover:bg-primary/90 flex items-center rounded-md px-4 py-2 text-sm font-medium text-white"
                                >
                                    <Printer className="mr-1.5 h-4 w-4" />
                                    <span className="urdu-text text-white">
                                        Print/Download in Urdu
                                    </span>
                                </button>

                                {isPdfReady && adaptedSalesOrder && (
                                    <SalesInvoiceDownloadButton
                                        // Type assertion to the component's expected type
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        salesOrder={adaptedSalesOrder as any}
                                        fileName={`Invoice-${salesOrder.orderNumber}.pdf`}
                                        className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                                    >
                                        <Download className="mr-1.5 h-4 w-4" />{" "}
                                        <span className="urdu-text text-white">
                                            Download in English
                                        </span>
                                    </SalesInvoiceDownloadButton>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Show font check tool in developer mode */}
                    {devMode && process.env.NODE_ENV === "development" && (
                        <div className="print:hidden">
                            <FontCheck />
                        </div>
                    )}

                    {/* Invoice content with Urdu language support */}
                    <div className="p-4 pb-16">
                        {/* Pass the language and translations to the invoice template with explicit text color settings */}
                        <InvoicePrintTemplate
                            sale={salesOrder}
                            language={language}
                            translations={urduText}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
