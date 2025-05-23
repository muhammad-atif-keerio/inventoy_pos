import { useEffect, useState } from "react";

import { PaymentMode } from "@prisma/client";
import { format } from "date-fns";
import {
    Calendar,
    CreditCard,
    DollarSign,
    FileText,
    Filter,
    Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// Define types for payment data
interface PaymentData {
    id: number;
    transactionDate: string;
    amount: number;
    mode: PaymentMode;
    referenceNumber: string | null;
    description: string;
    salesOrder: {
        id: number;
        orderNumber: string;
        customer: {
            id: number;
            name: string;
        };
    } | null;
    threadPurchase: {
        id: number;
        orderDate: string;
        vendor: {
            id: number;
            name: string;
        };
    } | null;
    chequeTransaction: {
        id: number;
        chequeNumber: string;
        bank: string;
        chequeStatus: string;
    } | null;
}

interface PaymentResponse {
    data: PaymentData[];
    meta: {
        total: number;
        page: number;
        limit: number;
    };
}

export function PaymentHistory() {
    const [payments, setPayments] = useState<PaymentData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>("");
    const [modeFilter, setModeFilter] = useState<PaymentMode | null>(null);

    // Fetch payment data
    useEffect(() => {
        const fetchPayments = async () => {
            setLoading(true);
            try {
                // Build query parameters
                const params = new URLSearchParams();
                if (modeFilter) {
                    params.append("mode", modeFilter);
                }

                const response = await fetch(
                    `/api/payments?${params.toString()}`,
                );
                if (!response.ok) {
                    throw new Error("Failed to fetch payment data");
                }

                const data: PaymentResponse = await response.json();
                setPayments(data.data);
                setError(null);
            } catch (err) {
                console.error("Error fetching payment data:", err);
                setError("Failed to load payment history");
                setPayments([]);
            } finally {
                setLoading(false);
            }
        };

        fetchPayments();
    }, [modeFilter]);

    // Filter payments based on search input
    const filteredPayments = payments.filter((payment) => {
        const searchTerm = filter.toLowerCase();
        return (
            payment.description.toLowerCase().includes(searchTerm) ||
            payment.mode.toLowerCase().includes(searchTerm) ||
            payment.referenceNumber?.toLowerCase().includes(searchTerm) ||
            payment.salesOrder?.orderNumber
                .toLowerCase()
                .includes(searchTerm) ||
            payment.salesOrder?.customer.name
                .toLowerCase()
                .includes(searchTerm) ||
            payment.threadPurchase?.vendor.name
                .toLowerCase()
                .includes(searchTerm) ||
            payment.chequeTransaction?.chequeNumber
                .toLowerCase()
                .includes(searchTerm) ||
            payment.chequeTransaction?.bank.toLowerCase().includes(searchTerm)
        );
    });

    // Format amount as currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount);
    };

    // Render payment mode badge
    const renderPaymentModeBadge = (mode: PaymentMode) => {
        const badgeClasses = {
            CASH: "bg-green-100 text-green-800",
            CHEQUE: "bg-blue-100 text-blue-800",
            ONLINE: "bg-indigo-100 text-indigo-800",
        };

        const modeIcons = {
            CASH: <DollarSign className="h-3 w-3" />,
            CHEQUE: <FileText className="h-3 w-3" />,
            ONLINE: <CreditCard className="h-3 w-3" />,
        };

        return (
            <span
                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                    badgeClasses[mode]
                }`}
            >
                {modeIcons[mode]}
                <span className="ml-1">{mode.replace("_", " ")}</span>
            </span>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Filter payments..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="max-w-xs"
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Filter className="mr-2 h-4 w-4" />
                                Filter
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Payment Mode</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={modeFilter === null}
                                onCheckedChange={() => setModeFilter(null)}
                            >
                                All Modes
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={modeFilter === PaymentMode.CASH}
                                onCheckedChange={() =>
                                    setModeFilter(PaymentMode.CASH)
                                }
                            >
                                Cash
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={modeFilter === PaymentMode.CHEQUE}
                                onCheckedChange={() =>
                                    setModeFilter(PaymentMode.CHEQUE)
                                }
                            >
                                Cheque
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={modeFilter === PaymentMode.ONLINE}
                                onCheckedChange={() =>
                                    setModeFilter(PaymentMode.ONLINE)
                                }
                            >
                                Online
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {loading ? (
                <div className="flex h-40 items-center justify-center">
                    <Loader2 className="text-primary h-8 w-8 animate-spin" />
                </div>
            ) : error ? (
                <Card>
                    <CardContent className="flex h-40 items-center justify-center">
                        <p className="text-muted-foreground">{error}</p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle>Payment Transactions</CardTitle>
                        <CardDescription>
                            {filteredPayments.length} payment records found
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Reference</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead>Mode</TableHead>
                                    <TableHead className="text-right">
                                        Amount
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPayments.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="h-24 text-center"
                                        >
                                            No payment records found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredPayments.map((payment) => (
                                        <TableRow key={payment.id}>
                                            <TableCell className="whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <Calendar className="text-muted-foreground mr-2 h-4 w-4" />
                                                    {format(
                                                        new Date(
                                                            payment.transactionDate,
                                                        ),
                                                        "MMM d, yyyy",
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {payment.referenceNumber || "-"}
                                            </TableCell>
                                            <TableCell>
                                                {payment.description}
                                            </TableCell>
                                            <TableCell>
                                                {payment.salesOrder ? (
                                                    <span className="font-medium">
                                                        Sale #
                                                        {
                                                            payment.salesOrder
                                                                .orderNumber
                                                        }
                                                    </span>
                                                ) : payment.threadPurchase ? (
                                                    <span>
                                                        Thread Purchase (
                                                        {
                                                            payment
                                                                .threadPurchase
                                                                .vendor.name
                                                        }
                                                        )
                                                    </span>
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {renderPaymentModeBadge(
                                                    payment.mode,
                                                )}
                                                {payment.chequeTransaction && (
                                                    <div className="text-muted-foreground mt-1 text-xs">
                                                        {
                                                            payment
                                                                .chequeTransaction
                                                                .chequeNumber
                                                        }{" "}
                                                        (
                                                        {
                                                            payment
                                                                .chequeTransaction
                                                                .bank
                                                        }
                                                        )
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(
                                                    Number(payment.amount),
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
