"use client";

import Link from "next/link";
import * as React from "react";

import {
    AlertCircle,
    ArrowUpRight,
    DollarSign,
    Layers,
    Package,
    Palette,
    RefreshCw,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define interface for dashboard data from API
interface DashboardData {
    period: {
        range: string;
        start: string;
        end: string;
    };
    inventorySummary: {
        totalItems: number;
        totalQuantity: number;
        inventoryValue: number;
        potentialSalesValue: number;
        lowStockItems: number;
        outOfStockItems: number;
    };
    productionSummary: {
        pendingThreadOrders: number;
        ongoingDyeingProcesses: number;
        activeFabricProduction: number;
        pendingThreadOrdersDetails: Array<{
            id: number;
            threadType: string;
            quantity: number;
            unitOfMeasure: string;
            vendor: string;
            orderDate: string;
            deliveryDate: string | null;
        }>;
        ongoingDyeingProcessesDetails: Array<{
            id: number;
            colorName: string;
            colorCode: string;
            quantity: number;
            threadType: string;
            vendor: string;
            startDate: string;
        }>;
        activeFabricProductionDetails: Array<{
            id: number;
            fabricType: string;
            batchNumber: string;
            dimensions: string;
            quantity: number;
            status: string;
            startDate: string;
        }>;
    };
    salesSummary: {
        currentPeriod: number;
        previousPeriod: number;
        growth: number;
        orderCount: number;
        recentSales: Array<{
            id: number;
            orderNumber: string;
            amount: number;
            date: string;
            customer: {
                id: number;
                name: string;
                contact: string;
            } | null;
            status: string;
            paymentMode: string | null;
        }>;
        salesByProductType: Array<{
            productType: string;
            orderCount: number;
            salesAmount: number;
            percentage: number;
        }>;
    };
    financialSummary: {
        pendingPaymentsCount: number;
        pendingPaymentsTotal: number;
        pendingChequesCount: number;
        pendingChequesTotal: number;
        cashflowTotal: number;
        pendingPaymentsDetails: Array<{
            id: number;
            orderNumber: string;
            date: string;
            customer: string;
            totalAmount: number;
            paidAmount: number;
            remainingAmount: number;
        }>;
        pendingChequesDetails: Array<{
            id: number;
            chequeNumber: string;
            bank: string;
            amount: number;
            issueDate: string;
            orderNumber: string | null;
            customer: string;
        }>;
    };
    topItems: {
        sellingItems: Array<{
            id: number;
            itemCode: string;
            description: string;
            productType: string;
            typeName: string;
            quantitySold: number;
            currentStock: number;
        }>;
        customers: Array<{
            id: number;
            name: string;
            contact: string;
            email: string;
            orderCount: number;
            totalSpent: number;
        }>;
    };
}

export default function DashboardPage() {
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [dashboardData, setDashboardData] =
        React.useState<DashboardData | null>(null);
    const [dateRange, setDateRange] = React.useState<string>("month");

    // Fetch dashboard data
    const fetchDashboardData = React.useCallback(
        async (range: string = "month") => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(
                    `/api/dashboard?range=${range}&t=${Date.now()}`,
                    {
                        cache: "no-store",
                    },
                );

                if (response.ok) {
                    const responseData = await response.json();
                    if (responseData.success) {
                        // Create a new object without the success property
                        const dashboardData = { ...responseData };
                        delete dashboardData.success;
                        setDashboardData(dashboardData as DashboardData);
                    } else {
                        setError(
                            responseData.error ||
                                "Failed to load dashboard data",
                        );
                    }
                } else {
                    const errorData = await response.json();
                    setError(
                        errorData.error || "Failed to load dashboard data",
                    );
                }
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                setError("Failed to load dashboard data. Please try again.");
            } finally {
                setIsLoading(false);
            }
        },
        [],
    );

    React.useEffect(() => {
        fetchDashboardData(dateRange);
    }, [fetchDashboardData, dateRange]);

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-PK", {
            style: "currency",
            currency: "PKR",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    if (error) {
        return (
            <div className="flex-1 space-y-6 p-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button onClick={() => fetchDashboardData(dateRange)}>
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-6 p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <div className="flex items-center gap-2">
                    <select
                        className="rounded border p-1 text-sm"
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        disabled={isLoading}
                    >
                        <option value="week">Last Week</option>
                        <option value="month">This Month</option>
                        <option value="quarter">Last Quarter</option>
                        <option value="year">Last Year</option>
                    </select>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchDashboardData(dateRange)}
                        disabled={isLoading}
                    >
                        <RefreshCw
                            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                        />
                        Refresh
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">
                        Business Overview
                    </TabsTrigger>
                    <TabsTrigger value="sales">Sales</TabsTrigger>
                    <TabsTrigger value="production">Production</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {/* Thread Orders Card */}
                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Thread Orders
                                </CardTitle>
                                <Package className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <Skeleton className="h-8 w-24" />
                                ) : (
                                    <div className="text-2xl font-bold">
                                        {dashboardData?.productionSummary
                                            .pendingThreadOrders || 0}
                                    </div>
                                )}
                                <p className="text-muted-foreground text-xs">
                                    Pending orders awaiting delivery
                                </p>
                            </CardContent>
                            <CardFooter className="p-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full"
                                    asChild
                                >
                                    <Link href="/thread-orders">
                                        View All Orders
                                        <ArrowUpRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Dyeing Processes Card */}
                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Dyeing Processes
                                </CardTitle>
                                <Palette className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <Skeleton className="h-8 w-24" />
                                ) : (
                                    <div className="text-2xl font-bold">
                                        {dashboardData?.productionSummary
                                            .ongoingDyeingProcesses || 0}
                                    </div>
                                )}
                                <p className="text-muted-foreground text-xs">
                                    Ongoing dyeing operations
                                </p>
                            </CardContent>
                            <CardFooter className="p-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full"
                                    asChild
                                >
                                    <Link href="/dyeing-process">
                                        View Dyeing Processes
                                        <ArrowUpRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Fabric Production Card */}
                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Fabric Production
                                </CardTitle>
                                <Layers className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <Skeleton className="h-8 w-24" />
                                ) : (
                                    <div className="text-2xl font-bold">
                                        {dashboardData?.productionSummary
                                            .activeFabricProduction || 0}
                                    </div>
                                )}
                                <p className="text-muted-foreground text-xs">
                                    Active fabric production jobs
                                </p>
                            </CardContent>
                            <CardFooter className="p-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full"
                                    asChild
                                >
                                    <Link href="/fabric-production">
                                        View Production
                                        <ArrowUpRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Monthly Sales Card */}
                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {dateRange === "month"
                                        ? "Monthly"
                                        : dateRange === "week"
                                          ? "Weekly"
                                          : dateRange === "quarter"
                                            ? "Quarterly"
                                            : "Yearly"}{" "}
                                    Sales
                                </CardTitle>
                                <DollarSign className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <Skeleton className="h-8 w-24" />
                                ) : (
                                    <div className="text-2xl font-bold">
                                        {formatCurrency(
                                            dashboardData?.salesSummary
                                                .currentPeriod || 0,
                                        )}
                                    </div>
                                )}
                                <p className="text-muted-foreground flex items-center text-xs">
                                    <span
                                        className={`mr-1 inline-block ${dashboardData?.salesSummary.growth && dashboardData?.salesSummary.growth > 0 ? "text-green-500" : "text-red-500"}`}
                                    >
                                        {dashboardData?.salesSummary.growth &&
                                        dashboardData?.salesSummary.growth > 0
                                            ? "↑"
                                            : "↓"}
                                    </span>
                                    {dashboardData?.salesSummary.growth
                                        ? Math.abs(
                                              dashboardData?.salesSummary
                                                  .growth,
                                          ).toFixed(2)
                                        : 0}
                                    % from last period
                                </p>
                            </CardContent>
                            <CardFooter className="p-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full"
                                    asChild
                                >
                                    <Link href="/sales">
                                        View Sales
                                        <ArrowUpRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        {/* Inventory Status Card */}
                        <Card className="col-span-4 transition-shadow hover:shadow-md">
                            <CardHeader>
                                <CardTitle>Inventory Status</CardTitle>
                                <CardDescription>
                                    Current stock levels across all categories
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="flex h-[200px] items-center justify-center">
                                        <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-muted/10 flex flex-col rounded-lg p-4">
                                                <span className="text-sm font-medium">
                                                    Total Items
                                                </span>
                                                <span className="text-2xl font-bold">
                                                    {dashboardData
                                                        ?.inventorySummary
                                                        .totalItems || 0}
                                                </span>
                                            </div>
                                            <div className="bg-muted/10 flex flex-col rounded-lg p-4">
                                                <span className="text-sm font-medium">
                                                    Inventory Value
                                                </span>
                                                <span className="text-2xl font-bold">
                                                    {formatCurrency(
                                                        dashboardData
                                                            ?.inventorySummary
                                                            .inventoryValue ||
                                                            0,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex flex-col rounded-lg bg-yellow-500 p-4">
                                                <span className="text-sm font-medium">
                                                    Low Stock Items
                                                </span>
                                                <span className="text-2xl font-bold">
                                                    {dashboardData
                                                        ?.inventorySummary
                                                        .lowStockItems || 0}
                                                </span>
                                            </div>
                                            <div className="flex flex-col rounded-lg bg-red-500 p-4">
                                                <span className="text-sm font-medium">
                                                    Out of Stock
                                                </span>
                                                <span className="text-2xl font-bold">
                                                    {dashboardData
                                                        ?.inventorySummary
                                                        .outOfStockItems || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    asChild
                                >
                                    <Link href="/inventory">
                                        View Inventory
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Recent Sales Card */}
                        <Card className="col-span-3 transition-shadow hover:shadow-md">
                            <CardHeader>
                                <CardTitle>Recent Sales</CardTitle>
                                <CardDescription>
                                    Latest sales transactions
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="space-y-2">
                                        {Array(3)
                                            .fill(0)
                                            .map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="flex justify-between"
                                                >
                                                    <Skeleton className="h-5 w-32" />
                                                    <Skeleton className="h-5 w-16" />
                                                </div>
                                            ))}
                                    </div>
                                ) : dashboardData?.salesSummary.recentSales
                                      .length ? (
                                    <div className="space-y-2">
                                        {dashboardData?.salesSummary.recentSales.map(
                                            (sale) => (
                                                <div
                                                    key={sale.id}
                                                    className="flex items-center justify-between"
                                                >
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-medium">
                                                            {sale.customer
                                                                ?.name ||
                                                                "Unknown"}
                                                        </p>
                                                        <p className="text-muted-foreground text-xs">
                                                            {formatDate(
                                                                sale.date,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className={`h-2 w-2 rounded-full ${
                                                                sale.status ===
                                                                "PAID"
                                                                    ? "bg-green-500"
                                                                    : sale.status ===
                                                                        "PARTIAL"
                                                                      ? "bg-yellow-500"
                                                                      : "bg-red-500"
                                                            }`}
                                                        />
                                                        <p className="text-sm font-medium">
                                                            {formatCurrency(
                                                                sale.amount,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-sm">
                                        No recent sales found
                                    </p>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    asChild
                                >
                                    <Link href="/sales">View All Sales</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="sales" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card className="col-span-2 transition-shadow hover:shadow-md">
                            <CardHeader>
                                <CardTitle>Sales Overview</CardTitle>
                                <CardDescription>
                                    Period:{" "}
                                    {dashboardData?.period.start
                                        ? formatDate(
                                              dashboardData?.period.start,
                                          )
                                        : ""}{" "}
                                    to{" "}
                                    {dashboardData?.period.end
                                        ? formatDate(dashboardData?.period.end)
                                        : ""}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pl-2">
                                {isLoading ? (
                                    <div className="flex h-[300px] items-center justify-center">
                                        <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
                                    </div>
                                ) : (
                                    <div className="flex h-[300px] flex-col items-center justify-center">
                                        <div className="text-3xl font-bold">
                                            {formatCurrency(
                                                dashboardData?.salesSummary
                                                    .currentPeriod || 0,
                                            )}
                                        </div>
                                        <div className="text-muted-foreground text-sm">
                                            Total{" "}
                                            {dashboardData?.salesSummary
                                                .orderCount || 0}{" "}
                                            orders
                                        </div>
                                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                                            {dashboardData?.salesSummary.salesByProductType.map(
                                                (item, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="bg-muted/20 rounded-md p-2 text-sm"
                                                    >
                                                        <span className="font-medium">
                                                            {item.productType}
                                                            :{" "}
                                                        </span>
                                                        <span>
                                                            {formatCurrency(
                                                                item.salesAmount,
                                                            )}{" "}
                                                            (
                                                            {item.percentage.toFixed(
                                                                1,
                                                            )}
                                                            %)
                                                        </span>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader>
                                <CardTitle>Payment Status</CardTitle>
                                <CardDescription>
                                    Pending and received payments
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="mt-2 space-y-4">
                                    {isLoading ? (
                                        <Skeleton className="h-5 w-full" />
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm font-medium">
                                                    Pending Payments
                                                </div>
                                                <div className="text-muted-foreground text-sm">
                                                    {formatCurrency(
                                                        dashboardData
                                                            ?.financialSummary
                                                            .pendingPaymentsTotal ||
                                                            0,
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm font-medium">
                                                    Pending Cheques
                                                </div>
                                                <div className="text-muted-foreground text-sm">
                                                    {formatCurrency(
                                                        dashboardData
                                                            ?.financialSummary
                                                            .pendingChequesTotal ||
                                                            0,
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm font-medium">
                                                    Period Cashflow
                                                </div>
                                                <div className="text-muted-foreground text-sm">
                                                    {formatCurrency(
                                                        dashboardData
                                                            ?.financialSummary
                                                            .cashflowTotal || 0,
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    asChild
                                >
                                    <Link href="/sales">View All Payments</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="production" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader>
                                <CardTitle>Thread Dyeing</CardTitle>
                                <CardDescription>
                                    Current dyeing operations
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="flex h-[200px] items-center justify-center">
                                        <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
                                    </div>
                                ) : (
                                    <div className="h-[200px] space-y-4 overflow-auto pr-2">
                                        {dashboardData?.productionSummary.ongoingDyeingProcessesDetails.map(
                                            (process) => (
                                                <div
                                                    key={process.id}
                                                    className="bg-muted/10 rounded-lg p-3"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="h-3 w-3 rounded-full"
                                                            style={{
                                                                backgroundColor:
                                                                    process.colorCode ||
                                                                    "#888",
                                                            }}
                                                        />
                                                        <div className="font-medium">
                                                            {process.colorName ||
                                                                "Unnamed Color"}
                                                        </div>
                                                    </div>
                                                    <div className="text-muted-foreground mt-1 text-sm">
                                                        {process.threadType} (
                                                        {process.quantity}{" "}
                                                        units) -{" "}
                                                        {process.vendor}
                                                    </div>
                                                    <div className="text-muted-foreground mt-1 text-xs">
                                                        Started:{" "}
                                                        {formatDate(
                                                            process.startDate,
                                                        )}
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                        {dashboardData?.productionSummary
                                            .ongoingDyeingProcessesDetails
                                            .length === 0 && (
                                            <div className="flex h-full items-center justify-center">
                                                <p className="text-muted-foreground">
                                                    No ongoing dyeing processes
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    asChild
                                >
                                    <Link href="/dyeing-process">
                                        View Dyeing Operations
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>

                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader>
                                <CardTitle>Fabric Production</CardTitle>
                                <CardDescription>
                                    Current fabric production status
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="flex h-[200px] items-center justify-center">
                                        <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
                                    </div>
                                ) : (
                                    <div className="h-[200px] space-y-4 overflow-auto pr-2">
                                        {dashboardData?.productionSummary.activeFabricProductionDetails.map(
                                            (production) => (
                                                <div
                                                    key={production.id}
                                                    className="bg-muted/10 rounded-lg p-3"
                                                >
                                                    <div className="font-medium">
                                                        {production.fabricType}
                                                    </div>
                                                    <div className="mt-1 text-sm">
                                                        Batch:{" "}
                                                        {production.batchNumber}{" "}
                                                        -{" "}
                                                        {production.dimensions}
                                                    </div>
                                                    <div className="mt-1 flex justify-between text-xs">
                                                        <span>
                                                            Quantity:{" "}
                                                            {
                                                                production.quantity
                                                            }
                                                        </span>
                                                        <span
                                                            className={`rounded-full px-2 text-xs ${
                                                                production.status ===
                                                                "COMPLETED"
                                                                    ? "bg-green-100 text-green-800"
                                                                    : production.status ===
                                                                        "IN_PROGRESS"
                                                                      ? "bg-blue-100 text-blue-800"
                                                                      : "bg-yellow-100 text-yellow-800"
                                                            }`}
                                                        >
                                                            {production.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                        {dashboardData?.productionSummary
                                            .activeFabricProductionDetails
                                            .length === 0 && (
                                            <div className="flex h-full items-center justify-center">
                                                <p className="text-muted-foreground">
                                                    No active fabric productions
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    asChild
                                >
                                    <Link href="/fabric-production">
                                        View Production
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
