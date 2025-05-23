import { format } from "date-fns";
import {
    Building,
    Calendar,
    CheckCircle2,
    Clock,
    CreditCard,
    FileText,
    Mail,
    MapPin,
    Package,
    Phone,
    Receipt,
    User,
} from "lucide-react";

import { SalesOrderItem } from "./columns";

// Default English translations - will be used if no translations are provided
const defaultTranslations = {
    invoice: "INVOICE",
    date: "Date",
    orderNumber: "Order Number",
    billed_to: "BILLED TO",
    payment_details: "PAYMENT DETAILS",
    payment_status: "Payment Status",
    payment_method: "Payment Method",
    cheque_number: "Cheque Number",
    bank: "Bank",
    cheque_status: "Cheque Status",
    pending: "PENDING",
    order_date: "Order Date",
    delivery_date: "Delivery Date",
    items: "ITEMS",
    product: "Product",
    quantity: "Quantity",
    unit_price: "Unit Price",
    amount: "Amount",
    note: "Note",
    payment_summary: "PAYMENT SUMMARY",
    subtotal: "Subtotal",
    discount: "Discount",
    tax: "Tax",
    total: "Total",
    amount_paid: "Amount Paid",
    balance_due: "Balance Due",
    payment_history: "PAYMENT HISTORY",
    method: "Method",
    reference: "Reference",
    thank_you: "Thank you for your business!",
    contact_info:
        "For any inquiries, please contact us at +92 123 456 7890 or info@raheelfabrics.com",
    not_specified: "Not specified",
    paid: "Paid",
    partial: "Partial",
    address_missing: "No address information available",
    thread_type: "Thread Type",
    color: "Color",
    fabric_type: "Fabric Type",
    dimensions: "Dimensions",
    company_name: "Raheel Fabrics",
    company_tagline: "Quality Thread & Fabric Solutions",
    company_address: "123 Textile Avenue, Faisalabad",
    company_phone: "+92 123 456 7890",
    company_email: "info@raheelfabrics.com",
};

// Utility function to format currency values
const formatCurrency = (value: number | string, currency = "PKR") => {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numValue);
};

interface InvoicePrintTemplateProps {
    sale: SalesOrderItem;
    language?: "en" | "ur";
    translations?: Record<string, string>;
}

export function InvoicePrintTemplate({
    sale,
    language = "en",
    translations = defaultTranslations,
}: InvoicePrintTemplateProps) {
    // Helper function to get translated text
    const t = (key: keyof typeof defaultTranslations) => {
        return translations[key] || defaultTranslations[key];
    };

    // Check if we should use RTL layout
    const isRTL = language === "ur";

    // CSS classes for RTL text alignment
    const textAlignClass = isRTL ? "urdu-text" : "";
    const textAlignRightClass = isRTL ? "text-left" : "text-right";
    const textAlignLeftClass = isRTL ? "text-right" : "text-left";
    const flexDirectionClass = isRTL ? "flex-row-reverse" : "flex-row";

    const getProductName = () => {
        if (sale.productType === "THREAD" && sale.threadPurchase) {
            return `${sale.threadPurchase.threadType} ${
                sale.threadPurchase.color
                    ? `- ${sale.threadPurchase.color}`
                    : ""
            }`;
        } else if (sale.productType === "FABRIC" && sale.fabricProduction) {
            return `${sale.fabricProduction.fabricType} ${
                sale.fabricProduction.dimensions
                    ? `- ${sale.fabricProduction.dimensions}`
                    : ""
            }`;
        }
        return `Product #${sale.productId}`;
    };

    const getPaymentStatusBadge = (status: string) => {
        switch (status) {
            case "PAID":
                return (
                    <div className="inline-flex items-center rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        <span className={textAlignClass}>{t("paid")}</span>
                    </div>
                );
            case "PARTIAL":
                return (
                    <div className="inline-flex items-center rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                        <Clock className="mr-1 h-3 w-3" />
                        <span className={textAlignClass}>{t("partial")}</span>
                    </div>
                );
            default:
                return (
                    <div className="inline-flex items-center rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                        <Clock className="mr-1 h-3 w-3" />
                        <span className={textAlignClass}>{t("pending")}</span>
                    </div>
                );
        }
    };

    const totalPaid = sale.payments
        ? sale.payments.reduce((sum, p) => sum + Number(p.amount), 0)
        : 0;
    const balanceDue = sale.totalSale - totalPaid;

    return (
        <div
            className={`mx-auto max-w-4xl bg-white p-8 text-gray-800 ${isRTL ? "rtl-document" : ""}`}
        >
            {/* Header with logo and company info */}
            <div
                className={`mb-8 flex justify-between border-b pb-6 ${flexDirectionClass}`}
            >
                <div className={textAlignClass}>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {t("company_name")}
                    </h1>
                    <p className="mt-1 text-gray-500">{t("company_tagline")}</p>
                    <div
                        className={`mt-3 space-y-1 text-sm text-gray-600 ${isRTL ? "text-right" : ""}`}
                    >
                        <p
                            className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse justify-end" : ""}`}
                        >
                            <Building className="text-primary h-3.5 w-3.5" />
                            <span>{t("company_address")}</span>
                        </p>
                        <p
                            className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse justify-end" : ""}`}
                        >
                            <Phone className="text-primary h-3.5 w-3.5" />
                            <span>{t("company_phone")}</span>
                        </p>
                        <p
                            className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse justify-end" : ""}`}
                        >
                            <Mail className="text-primary h-3.5 w-3.5" />
                            <span>{t("company_email")}</span>
                        </p>
                    </div>
                </div>
                <div className={textAlignRightClass}>
                    <div className="mb-3 inline-block rounded-lg bg-blue-50 px-3 py-1">
                        <span
                            className={`font-semibold text-blue-600 ${textAlignClass}`}
                        >
                            {t("invoice")}
                        </span>
                    </div>
                    <p
                        className={`mt-1 text-xl font-semibold ${textAlignClass}`}
                    >
                        #{sale.orderNumber}
                    </p>
                    <p className={`mt-1 text-gray-500 ${textAlignClass}`}>
                        {t("date")}: {format(new Date(sale.orderDate), "PP")}
                    </p>
                    <div className="mt-2">
                        {getPaymentStatusBadge(sale.paymentStatus)}
                    </div>
                </div>
            </div>

            {/* Customer Information */}
            <div
                className={`mb-8 grid grid-cols-2 gap-8 ${isRTL ? "rtl-table" : ""}`}
            >
                <div className="rounded-lg bg-gray-50 p-5">
                    <h3
                        className={`mb-3 flex items-center gap-2 font-medium text-gray-700 ${isRTL ? "flex-row-reverse justify-end" : ""}`}
                    >
                        <User className="h-4 w-4 text-blue-600" />
                        <span className={textAlignClass}>{t("billed_to")}</span>
                    </h3>
                    <div className={`space-y-2 ${isRTL ? "text-right" : ""}`}>
                        <p
                            className={`text-lg font-medium text-gray-800 ${textAlignClass}`}
                        >
                            {sale.customerName}
                        </p>
                        {sale.customerPhone && (
                            <p
                                className={`flex items-center gap-1 text-sm text-gray-600 ${isRTL ? "flex-row-reverse justify-end" : ""}`}
                            >
                                <Phone className="h-3.5 w-3.5 text-gray-500" />
                                {sale.customerPhone}
                            </p>
                        )}
                        {sale.customerEmail && (
                            <p
                                className={`flex items-center gap-1 text-sm text-gray-600 ${isRTL ? "flex-row-reverse justify-end" : ""}`}
                            >
                                <Mail className="h-3.5 w-3.5 text-gray-500" />
                                {sale.customerEmail}
                            </p>
                        )}
                        {sale.deliveryAddress && (
                            <p
                                className={`mt-1 flex items-start gap-1 border-t border-gray-200 pt-1 text-sm text-gray-600 ${isRTL ? "flex-row-reverse justify-end" : ""}`}
                            >
                                <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
                                <span>{sale.deliveryAddress}</span>
                            </p>
                        )}
                        {!sale.deliveryAddress && (
                            <p
                                className={`text-sm text-gray-500 italic ${textAlignClass}`}
                            >
                                {t("address_missing")}
                            </p>
                        )}
                    </div>
                </div>

                <div className="rounded-lg bg-gray-50 p-5">
                    <h3
                        className={`mb-3 flex items-center gap-2 font-medium text-gray-700 ${isRTL ? "flex-row-reverse justify-end" : ""}`}
                    >
                        <Receipt className="h-4 w-4 text-blue-600" />
                        <span className={textAlignClass}>
                            {t("payment_details")}
                        </span>
                    </h3>
                    <div className={`space-y-2 ${isRTL ? "text-right" : ""}`}>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <p
                                    className={`text-xs text-gray-500 ${textAlignClass}`}
                                >
                                    {t("payment_status")}
                                </p>
                                <p className={`font-medium ${textAlignClass}`}>
                                    {sale.paymentStatus}
                                </p>
                            </div>
                            <div>
                                <p
                                    className={`text-xs text-gray-500 ${textAlignClass}`}
                                >
                                    {t("payment_method")}
                                </p>
                                <p className={`font-medium ${textAlignClass}`}>
                                    {sale.paymentMode || t("not_specified")}
                                </p>
                            </div>
                        </div>

                        {sale.paymentMode === "CHEQUE" && (
                            <>
                                <div className="mt-1 grid grid-cols-2 gap-2 border-t border-gray-200 pt-1">
                                    <div>
                                        <p
                                            className={`text-xs text-gray-500 ${textAlignClass}`}
                                        >
                                            {t("cheque_number")}
                                        </p>
                                        <p
                                            className={`font-medium ${textAlignClass}`}
                                        >
                                            {sale.chequeNumber}
                                        </p>
                                    </div>
                                    <div>
                                        <p
                                            className={`text-xs text-gray-500 ${textAlignClass}`}
                                        >
                                            {t("bank")}
                                        </p>
                                        <p
                                            className={`font-medium ${textAlignClass}`}
                                        >
                                            {sale.bank || t("not_specified")}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <p
                                        className={`text-xs text-gray-500 ${textAlignClass}`}
                                    >
                                        {t("cheque_status")}
                                    </p>
                                    <p
                                        className={`font-medium ${textAlignClass}`}
                                    >
                                        {sale.chequeStatus || t("pending")}
                                    </p>
                                </div>
                            </>
                        )}

                        <div className="mt-2 border-t border-gray-200 pt-1">
                            <p
                                className={`text-xs text-gray-500 ${textAlignClass}`}
                            >
                                {t("order_date")}
                            </p>
                            <p
                                className={`flex items-center gap-1.5 font-medium ${isRTL ? "flex-row-reverse justify-end" : ""}`}
                            >
                                <Calendar className="h-3.5 w-3.5 text-gray-500" />
                                {format(new Date(sale.orderDate), "PP")}
                            </p>
                        </div>

                        {sale.deliveryDate && (
                            <div>
                                <p
                                    className={`text-xs text-gray-500 ${textAlignClass}`}
                                >
                                    {t("delivery_date")}
                                </p>
                                <p
                                    className={`flex items-center gap-1.5 font-medium ${isRTL ? "flex-row-reverse justify-end" : ""}`}
                                >
                                    <Calendar className="h-3.5 w-3.5 text-gray-500" />
                                    {format(new Date(sale.deliveryDate), "PP")}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Products Table */}
            <div className="mb-8">
                <h3
                    className={`mb-3 flex items-center gap-2 font-medium text-gray-700 ${isRTL ? "flex-row-reverse justify-end" : ""}`}
                >
                    <Package className="h-4 w-4 text-blue-600" />
                    <span className={textAlignClass}>{t("items")}</span>
                </h3>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table
                        className={`w-full text-sm ${isRTL ? "rtl-table" : ""}`}
                    >
                        <thead>
                            <tr className="bg-gray-50">
                                <th
                                    className={`px-4 py-3 font-medium text-gray-600 ${textAlignLeftClass}`}
                                >
                                    <span className={textAlignClass}>
                                        {t("product")}
                                    </span>
                                </th>
                                <th
                                    className={`px-4 py-3 text-center font-medium text-gray-600`}
                                >
                                    <span className={textAlignClass}>
                                        {t("quantity")}
                                    </span>
                                </th>
                                <th
                                    className={`px-4 py-3 font-medium text-gray-600 ${textAlignRightClass}`}
                                >
                                    <span className={textAlignClass}>
                                        {t("unit_price")}
                                    </span>
                                </th>
                                <th
                                    className={`px-4 py-3 font-medium text-gray-600 ${textAlignRightClass}`}
                                >
                                    <span className={textAlignClass}>
                                        {t("amount")}
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Check if sale has multiple items */}
                            {(sale.items?.length ?? 0) > 0 ? (
                                // Map through all items
                                sale.items?.map((item, index) => (
                                    <tr
                                        key={item.id || index}
                                        className="border-t border-gray-200"
                                    >
                                        <td
                                            className={`px-4 py-3 ${textAlignLeftClass}`}
                                        >
                                            <div>
                                                <p
                                                    className={`font-medium text-gray-800 ${isRTL ? "text-right" : ""}`}
                                                >
                                                    {item.productName ||
                                                        `#${item.productId}`}
                                                </p>
                                                <p
                                                    className={`text-xs text-gray-500 ${isRTL ? "text-right" : ""}`}
                                                >
                                                    {item.productType}
                                                </p>
                                                {item.productType ===
                                                    "THREAD" &&
                                                    item.threadPurchase && (
                                                        <div
                                                            className={`mt-1 text-xs text-gray-500 ${isRTL ? "text-right" : ""}`}
                                                        >
                                                            <p>
                                                                {t(
                                                                    "thread_type",
                                                                )}
                                                                :{" "}
                                                                {
                                                                    item
                                                                        .threadPurchase
                                                                        .threadType
                                                                }
                                                            </p>
                                                            {item.threadPurchase
                                                                .color && (
                                                                <p>
                                                                    {t("color")}
                                                                    :{" "}
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
                                                    "FABRIC" &&
                                                    item.fabricProduction && (
                                                        <div
                                                            className={`mt-1 text-xs text-gray-500 ${isRTL ? "text-right" : ""}`}
                                                        >
                                                            <p>
                                                                {t(
                                                                    "fabric_type",
                                                                )}
                                                                :{" "}
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
                                                                    {t(
                                                                        "dimensions",
                                                                    )}
                                                                    :{" "}
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
                                        <td className="px-4 py-3 text-center">
                                            {item.quantitySold}
                                        </td>
                                        <td
                                            className={`px-4 py-3 ${textAlignRightClass}`}
                                        >
                                            {formatCurrency(item.unitPrice)}
                                        </td>
                                        <td
                                            className={`px-4 py-3 font-medium ${textAlignRightClass}`}
                                        >
                                            {formatCurrency(
                                                item.unitPrice *
                                                    item.quantitySold,
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                // Legacy single product display
                                <tr className="border-t border-gray-200">
                                    <td
                                        className={`px-4 py-3 ${textAlignLeftClass}`}
                                    >
                                        <div>
                                            <p
                                                className={`font-medium text-gray-800 ${isRTL ? "text-right" : ""}`}
                                            >
                                                {getProductName()}
                                            </p>
                                            <p
                                                className={`text-xs text-gray-500 ${isRTL ? "text-right" : ""}`}
                                            >
                                                {sale.productType}
                                            </p>
                                            {sale.productType === "THREAD" &&
                                                sale.threadPurchase && (
                                                    <div
                                                        className={`mt-1 text-xs text-gray-500 ${isRTL ? "text-right" : ""}`}
                                                    >
                                                        <p>
                                                            {t("thread_type")}:{" "}
                                                            {
                                                                sale
                                                                    .threadPurchase
                                                                    .threadType
                                                            }
                                                        </p>
                                                        {sale.threadPurchase
                                                            .color && (
                                                            <p>
                                                                {t("color")}:{" "}
                                                                {
                                                                    sale
                                                                        .threadPurchase
                                                                        .color
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            {sale.productType === "FABRIC" &&
                                                sale.fabricProduction && (
                                                    <div
                                                        className={`mt-1 text-xs text-gray-500 ${isRTL ? "text-right" : ""}`}
                                                    >
                                                        <p>
                                                            {t("fabric_type")}:{" "}
                                                            {
                                                                sale
                                                                    .fabricProduction
                                                                    .fabricType
                                                            }
                                                        </p>
                                                        {sale.fabricProduction
                                                            .dimensions && (
                                                            <p>
                                                                {t(
                                                                    "dimensions",
                                                                )}
                                                                :{" "}
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
                                    <td className="px-4 py-3 text-center">
                                        {sale.quantitySold}
                                    </td>
                                    <td
                                        className={`px-4 py-3 ${textAlignRightClass}`}
                                    >
                                        {formatCurrency(sale.unitPrice)}
                                    </td>
                                    <td
                                        className={`px-4 py-3 font-medium ${textAlignRightClass}`}
                                    >
                                        {formatCurrency(
                                            sale.unitPrice * sale.quantitySold,
                                        )}
                                    </td>
                                </tr>
                            )}
                            {sale.remarks && (
                                <tr className="border-t border-gray-200 bg-gray-50">
                                    <td colSpan={4} className="px-4 py-3">
                                        <p
                                            className={`text-xs text-gray-600 ${isRTL ? "text-right" : ""}`}
                                        >
                                            <span
                                                className={`font-medium ${textAlignClass}`}
                                            >
                                                {t("note")}:
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

            {/* Payment Summary */}
            <div className={`flex ${isRTL ? "justify-start" : "justify-end"}`}>
                <div className="w-2/5 overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                        <h3
                            className={`flex items-center gap-2 font-medium text-gray-700 ${isRTL ? "flex-row-reverse justify-end" : ""}`}
                        >
                            <CreditCard className="h-4 w-4 text-blue-600" />
                            <span className={textAlignClass}>
                                {t("payment_summary")}
                            </span>
                        </h3>
                    </div>
                    <div
                        className={`space-y-2 p-4 ${isRTL ? "text-right" : ""}`}
                    >
                        <div
                            className={`flex justify-between ${isRTL ? "flex-row-reverse" : ""}`}
                        >
                            <span className={`text-gray-600 ${textAlignClass}`}>
                                {t("subtotal")}:
                            </span>
                            <span className="font-medium">
                                {formatCurrency(
                                    (sale.items?.length ?? 0) > 0
                                        ? (sale.items?.reduce(
                                              (sum, item) =>
                                                  sum +
                                                  item.unitPrice *
                                                      item.quantitySold,
                                              0,
                                          ) ?? 0)
                                        : sale.unitPrice * sale.quantitySold,
                                )}
                            </span>
                        </div>

                        {sale.discount && sale.discount > 0 && (
                            <div
                                className={`flex justify-between ${isRTL ? "flex-row-reverse" : ""}`}
                            >
                                <span
                                    className={`text-gray-600 ${textAlignClass}`}
                                >
                                    {t("discount")}:
                                </span>
                                <span className="text-green-600">
                                    - {formatCurrency(sale.discount)}
                                </span>
                            </div>
                        )}

                        {sale.tax && sale.tax > 0 && (
                            <div
                                className={`flex justify-between ${isRTL ? "flex-row-reverse" : ""}`}
                            >
                                <span
                                    className={`text-gray-600 ${textAlignClass}`}
                                >
                                    {t("tax")}:
                                </span>
                                <span>{formatCurrency(sale.tax)}</span>
                            </div>
                        )}

                        <div className="my-2 border-t border-gray-200 pt-2"></div>

                        <div
                            className={`flex justify-between text-lg font-medium ${isRTL ? "flex-row-reverse" : ""}`}
                        >
                            <span className={textAlignClass}>
                                {t("total")}:
                            </span>
                            <span>{formatCurrency(sale.totalSale)}</span>
                        </div>

                        {sale.payments && sale.payments.length > 0 && (
                            <>
                                <div
                                    className={`flex justify-between pt-2 text-sm ${isRTL ? "flex-row-reverse" : ""}`}
                                >
                                    <span
                                        className={`text-gray-600 ${textAlignClass}`}
                                    >
                                        {t("amount_paid")}:
                                    </span>
                                    <span className="text-green-600">
                                        {formatCurrency(totalPaid)}
                                    </span>
                                </div>

                                <div
                                    className={`flex justify-between text-sm font-medium ${isRTL ? "flex-row-reverse" : ""}`}
                                >
                                    <span
                                        className={`text-gray-600 ${textAlignClass}`}
                                    >
                                        {t("balance_due")}:
                                    </span>
                                    <span
                                        className={
                                            sale.paymentStatus === "PAID"
                                                ? "text-green-600"
                                                : "text-amber-600"
                                        }
                                    >
                                        {formatCurrency(balanceDue)}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment history if available */}
            {sale.payments && sale.payments.length > 0 && (
                <div className="mt-8 overflow-hidden rounded-lg border border-gray-200">
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                        <h3
                            className={`flex items-center gap-2 font-medium text-gray-700 ${isRTL ? "flex-row-reverse justify-end" : ""}`}
                        >
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span className={textAlignClass}>
                                {t("payment_history")}
                            </span>
                        </h3>
                    </div>
                    <table
                        className={`w-full text-sm ${isRTL ? "rtl-table" : ""}`}
                    >
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th
                                    className={`px-4 py-2 font-medium text-gray-600 ${textAlignLeftClass}`}
                                >
                                    <span className={textAlignClass}>
                                        {t("date")}
                                    </span>
                                </th>
                                <th
                                    className={`px-4 py-2 font-medium text-gray-600 ${textAlignLeftClass}`}
                                >
                                    <span className={textAlignClass}>
                                        {t("method")}
                                    </span>
                                </th>
                                <th
                                    className={`px-4 py-2 font-medium text-gray-600 ${textAlignLeftClass}`}
                                >
                                    <span className={textAlignClass}>
                                        {t("reference")}
                                    </span>
                                </th>
                                <th
                                    className={`px-4 py-2 font-medium text-gray-600 ${textAlignRightClass}`}
                                >
                                    <span className={textAlignClass}>
                                        {t("amount")}
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sale.payments.map((payment, index) => (
                                <tr
                                    key={index}
                                    className={
                                        index > 0
                                            ? "border-t border-gray-200"
                                            : ""
                                    }
                                >
                                    <td
                                        className={`px-4 py-2 text-gray-800 ${textAlignLeftClass}`}
                                    >
                                        {format(
                                            new Date(payment.transactionDate),
                                            "PP",
                                        )}
                                    </td>
                                    <td
                                        className={`px-4 py-2 text-gray-800 ${textAlignLeftClass}`}
                                    >
                                        {payment.mode}
                                    </td>
                                    <td
                                        className={`px-4 py-2 text-gray-800 ${textAlignLeftClass}`}
                                    >
                                        {payment.referenceNumber ||
                                            (payment.chequeTransaction
                                                ? payment.chequeTransaction
                                                      .chequeNumber
                                                : "-")}
                                    </td>
                                    <td
                                        className={`px-4 py-2 font-medium text-gray-800 ${textAlignRightClass}`}
                                    >
                                        {formatCurrency(payment.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Footer */}
            <div
                className={`mt-12 border-t border-gray-200 pt-4 text-center text-xs text-gray-500 ${isRTL ? "urdu-text" : ""}`}
            >
                <p>{t("thank_you")}</p>
                <p className="mt-1">{t("contact_info")}</p>
            </div>
        </div>
    );
}
