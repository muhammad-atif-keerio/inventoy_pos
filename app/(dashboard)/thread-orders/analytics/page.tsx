"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import {
    AlertCircle,
    ArrowUpRight,
    DollarSign,
    Package,
    PaintBucket,
    RefreshCw,
    Truck,
} from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    TooltipProps,
    XAxis,
    YAxis,
} from "recharts";
import { toast } from "sonner";

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

// Define interfaces for our analytics data
interface ThreadOrderAnalytics {
    orderStats: {
        totalOrders: number;
        pendingOrders: number;
        receivedOrders: number;
        dyedThreads: number;
        totalQuantity: number;
        totalValue: number;
    };
    ordersByColorStatus: {
        status: string;
        count: number;
        quantity: number;
        value: number;
    }[];
    topThreadTypes: {
        type: string;
        orderCount: number;
        quantity: number;
        value: number;
    }[];
    topVendors: {
        id: number;
        name: string;
        orderCount: number;
        quantity: number;
        value: number;
    }[];
    orderTrends: {
        month: string;
        count: number;
        quantity: number;
        value: number;
    }[];
    paymentMetrics: {
        totalPaid: number;
        totalPurchased: number;
        paymentPercentage: number;
        paymentModes: {
            mode: string;
            count: number;
            amount: number;
        }[];
    };
    colorDistribution: {
        color: string;
        status: string;
        count: number;
        quantity: number;
    }[];
}

// Custom tooltip for charts
const CustomTooltip = ({
    active,
    payload,
    label,
}: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background rounded-md border p-2 shadow-md">
                <p className="font-semibold">{label}</p>
                {payload.map((item, index) => (
                    <p key={index} style={{ color: item.color }}>
                        {item.name || ""}:{" "}
                        {item.name &&
                        (item.name.toLowerCase().includes("value") ||
                            item.name.toLowerCase().includes("amount"))
                            ? new Intl.NumberFormat("en-PK", {
                                  style: "currency",
                                  currency: "PKR",
                                  maximumFractionDigits: 0,
                              }).format(Number(item.value || 0))
                            : (item.value || 0).toLocaleString()}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function ThreadOrderAnalyticsPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [analytics, setAnalytics] =
        React.useState<ThreadOrderAnalytics | null>(null);

    // Colors for charts
    const COLORS = [
        "#0088FE",
        "#00C49F",
        "#FFBB28",
        "#FF8042",
        "#8884d8",
        "#82ca9d",
        "#ffc658",
        "#8dd1e1",
    ];

    // Fetch analytics data
    const fetchAnalytics = React.useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(
                `/api/thread/analytics?t=${Date.now()}`,
                {
                    cache: "no-store",
                },
            );

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setAnalytics(data.data);
                } else {
                    setError(
                        data.error || "Failed to load thread order analytics",
                    );
                    toast.error(
                        data.error || "Failed to load thread order analytics",
                    );
                }
            } else {
                const errorData = await response.json();
                setError(
                    errorData.error || "Failed to load thread order analytics",
                );
                toast.error(
                    errorData.error || "Failed to load thread order analytics",
                );
            }
        } catch (error) {
            console.error("Error fetching thread order analytics:", error);
            setError(
                "Failed to load thread order analytics. Please try again.",
            );
            toast.error("Failed to load thread order analytics");
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-PK", {
            style: "currency",
            currency: "PKR",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="container mx-auto space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Thread Orders Analytics
                    </h1>
                    <p className="text-muted-foreground">
                        Comprehensive insights into thread purchasing and dyeing
                        operations
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchAnalytics}
                    disabled={isLoading}
                >
                    <RefreshCw
                        className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                    />
                    Refresh Data
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="orders">Order Details</TabsTrigger>
                    <TabsTrigger value="colors">Color Analysis</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    {/* Overview Stats Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {/* Total Orders Card */}
                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total Orders
                                </CardTitle>
                                <Package className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <Skeleton className="h-8 w-24" />
                                ) : (
                                    <div className="text-2xl font-bold">
                                        {analytics?.orderStats.totalOrders || 0}
                                    </div>
                                )}
                                <p className="text-muted-foreground text-xs">
                                    Total thread orders placed
                                </p>
                            </CardContent>
                            <CardFooter className="p-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full"
                                    onClick={() =>
                                        router.push("/thread-orders")
                                    }
                                >
                                    View All Orders
                                    <ArrowUpRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Pending Orders Card */}
                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Pending Orders
                                </CardTitle>
                                <Truck className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <Skeleton className="h-8 w-24" />
                                ) : (
                                    <div className="text-2xl font-bold">
                                        {analytics?.orderStats.pendingOrders ||
                                            0}
                                    </div>
                                )}
                                <p className="text-muted-foreground text-xs">
                                    Orders awaiting delivery
                                </p>
                            </CardContent>
                            <CardFooter className="p-2">
                                <div className="text-muted-foreground w-full text-right text-xs">
                                    {!isLoading && analytics && (
                                        <span>
                                            {(
                                                (analytics.orderStats
                                                    .pendingOrders /
                                                    Math.max(
                                                        analytics.orderStats
                                                            .totalOrders,
                                                        1,
                                                    )) *
                                                100
                                            ).toFixed(1)}
                                            % of total
                                        </span>
                                    )}
                                </div>
                            </CardFooter>
                        </Card>

                        {/* Dyed Threads Card */}
                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Dyed Threads
                                </CardTitle>
                                <PaintBucket className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <Skeleton className="h-8 w-24" />
                                ) : (
                                    <div className="text-2xl font-bold">
                                        {analytics?.orderStats.dyedThreads || 0}
                                    </div>
                                )}
                                <p className="text-muted-foreground text-xs">
                                    Threads with dyeing processes
                                </p>
                            </CardContent>
                            <CardFooter className="p-2">
                                <div className="text-muted-foreground w-full text-right text-xs">
                                    {!isLoading && analytics && (
                                        <span>
                                            {(
                                                (analytics.orderStats
                                                    .dyedThreads /
                                                    Math.max(
                                                        analytics.orderStats
                                                            .totalOrders,
                                                        1,
                                                    )) *
                                                100
                                            ).toFixed(1)}
                                            % of total
                                        </span>
                                    )}
                                </div>
                            </CardFooter>
                        </Card>

                        {/* Payment Status Card */}
                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Payment Status
                                </CardTitle>
                                <DollarSign className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <Skeleton className="h-8 w-24" />
                                ) : (
                                    <div className="text-2xl font-bold">
                                        {analytics?.paymentMetrics
                                            ? analytics.paymentMetrics.paymentPercentage.toFixed(
                                                  1,
                                              ) + "%"
                                            : "0%"}
                                    </div>
                                )}
                                <p className="text-muted-foreground text-xs">
                                    Of total purchases paid
                                </p>
                            </CardContent>
                            <CardFooter className="p-2">
                                <div className="text-muted-foreground w-full text-xs">
                                    {!isLoading &&
                                        analytics?.paymentMetrics && (
                                            <span>
                                                {formatCurrency(
                                                    analytics.paymentMetrics
                                                        .totalPaid,
                                                )}{" "}
                                                /{" "}
                                                {formatCurrency(
                                                    analytics.paymentMetrics
                                                        .totalPurchased,
                                                )}
                                            </span>
                                        )}
                                </div>
                            </CardFooter>
                        </Card>
                    </div>

                    {/* Top Thread Types and Purchase Trends Charts */}
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Top Thread Types Chart */}
                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader>
                                <CardTitle>Top Thread Types</CardTitle>
                                <CardDescription>
                                    Most popular thread types by quantity
                                    ordered
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-80">
                                {isLoading ? (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <Skeleton className="h-full w-full" />
                                    </div>
                                ) : analytics?.topThreadTypes &&
                                  analytics.topThreadTypes.length > 0 ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <BarChart
                                            data={analytics.topThreadTypes.map(
                                                (thread) => ({
                                                    name: thread.type,
                                                    quantity: thread.quantity,
                                                    value: thread.value,
                                                }),
                                            )}
                                            layout="vertical"
                                            margin={{
                                                top: 5,
                                                right: 30,
                                                left: 60,
                                                bottom: 5,
                                            }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                horizontal={false}
                                            />
                                            <XAxis type="number" />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={100}
                                            />
                                            <Tooltip
                                                content={<CustomTooltip />}
                                            />
                                            <Bar
                                                dataKey="quantity"
                                                fill="#0088FE"
                                                name="Quantity"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-muted-foreground flex h-full items-center justify-center">
                                        No thread type data available
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Purchase Trends Chart */}
                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader>
                                <CardTitle>Purchase Trends</CardTitle>
                                <CardDescription>
                                    Monthly thread order volume over time
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-80">
                                {isLoading ? (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <Skeleton className="h-full w-full" />
                                    </div>
                                ) : analytics?.orderTrends &&
                                  analytics.orderTrends.length > 0 ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <BarChart
                                            data={analytics.orderTrends}
                                            margin={{
                                                top: 20,
                                                right: 30,
                                                left: 20,
                                                bottom: 30,
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="month"
                                                angle={-45}
                                                textAnchor="end"
                                                height={50}
                                            />
                                            <YAxis yAxisId="left" />
                                            <YAxis
                                                yAxisId="right"
                                                orientation="right"
                                                tickFormatter={(value) =>
                                                    formatCurrency(value)
                                                }
                                            />
                                            <Tooltip
                                                content={<CustomTooltip />}
                                            />
                                            <Legend />
                                            <Bar
                                                yAxisId="left"
                                                dataKey="count"
                                                name="Order Count"
                                                fill="#0088FE"
                                            />
                                            <Bar
                                                yAxisId="right"
                                                dataKey="value"
                                                name="Order Value"
                                                fill="#00C49F"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-muted-foreground flex h-full items-center justify-center">
                                        No monthly trend data available
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Total Metrics and Payment Mode Charts */}
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Total Metrics Card */}
                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader>
                                <CardTitle>Overall Metrics</CardTitle>
                                <CardDescription>
                                    Summary of key thread purchase metrics
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-full" />
                                    </div>
                                ) : analytics ? (
                                    <div className="space-y-4">
                                        <div className="flex justify-between">
                                            <span className="font-medium">
                                                Total Quantity:
                                            </span>
                                            <span>
                                                {analytics.orderStats.totalQuantity.toLocaleString()}{" "}
                                                units
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium">
                                                Total Value:
                                            </span>
                                            <span>
                                                {formatCurrency(
                                                    analytics.orderStats
                                                        .totalValue,
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium">
                                                Received Orders:
                                            </span>
                                            <span>
                                                {
                                                    analytics.orderStats
                                                        .receivedOrders
                                                }{" "}
                                                (
                                                {(
                                                    (analytics.orderStats
                                                        .receivedOrders /
                                                        Math.max(
                                                            analytics.orderStats
                                                                .totalOrders,
                                                            1,
                                                        )) *
                                                    100
                                                ).toFixed(1)}
                                                %)
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium">
                                                Average Order Value:
                                            </span>
                                            <span>
                                                {formatCurrency(
                                                    analytics.orderStats
                                                        .totalValue /
                                                        Math.max(
                                                            analytics.orderStats
                                                                .totalOrders,
                                                            1,
                                                        ),
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-muted-foreground text-center">
                                        No data available
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Payment Modes Chart */}
                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader>
                                <CardTitle>Payment Methods</CardTitle>
                                <CardDescription>
                                    Distribution of payments by method
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-64">
                                {isLoading ? (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <Skeleton className="h-full w-full" />
                                    </div>
                                ) : analytics?.paymentMetrics?.paymentModes &&
                                  analytics.paymentMetrics.paymentModes.length >
                                      0 ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <PieChart>
                                            <Pie
                                                data={analytics.paymentMetrics.paymentModes.map(
                                                    (mode) => ({
                                                        name: mode.mode,
                                                        value: mode.amount,
                                                    }),
                                                )}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={true}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                                nameKey="name"
                                                label={({ name, percent }) =>
                                                    `${name}: ${(percent * 100).toFixed(0)}%`
                                                }
                                            >
                                                {analytics.paymentMetrics.paymentModes.map(
                                                    (_, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={
                                                                COLORS[
                                                                    index %
                                                                        COLORS.length
                                                                ]
                                                            }
                                                        />
                                                    ),
                                                )}
                                            </Pie>
                                            <Tooltip
                                                content={<CustomTooltip />}
                                            />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-muted-foreground flex h-full items-center justify-center">
                                        No payment method data available
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="orders" className="space-y-4">
                    {/* Order Details Charts */}
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Top Vendors Chart */}
                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader>
                                <CardTitle>Top Vendors</CardTitle>
                                <CardDescription>
                                    Vendors with highest thread purchase value
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-80">
                                {isLoading ? (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <Skeleton className="h-full w-full" />
                                    </div>
                                ) : analytics?.topVendors &&
                                  analytics.topVendors.length > 0 ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <BarChart
                                            data={analytics.topVendors.map(
                                                (vendor) => ({
                                                    name: vendor.name,
                                                    value: vendor.value,
                                                    orders: vendor.orderCount,
                                                }),
                                            )}
                                            layout="vertical"
                                            margin={{
                                                top: 5,
                                                right: 30,
                                                left: 60,
                                                bottom: 5,
                                            }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                horizontal={false}
                                            />
                                            <XAxis
                                                type="number"
                                                tickFormatter={(value) =>
                                                    formatCurrency(value)
                                                }
                                            />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={100}
                                            />
                                            <Tooltip
                                                content={<CustomTooltip />}
                                            />
                                            <Bar
                                                dataKey="value"
                                                fill="#00C49F"
                                                name="Purchase Value"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-muted-foreground flex h-full items-center justify-center">
                                        No vendor data available
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Orders by Color Status Chart */}
                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader>
                                <CardTitle>Orders by Color Status</CardTitle>
                                <CardDescription>
                                    Distribution of thread orders by color
                                    status
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-80">
                                {isLoading ? (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <Skeleton className="h-full w-full" />
                                    </div>
                                ) : analytics?.ordersByColorStatus &&
                                  analytics.ordersByColorStatus.length > 0 ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <BarChart
                                            data={analytics.ordersByColorStatus.map(
                                                (status) => ({
                                                    name: status.status,
                                                    count: status.count,
                                                    value: status.value,
                                                }),
                                            )}
                                            layout="vertical"
                                            margin={{
                                                top: 5,
                                                right: 30,
                                                left: 90,
                                                bottom: 5,
                                            }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                horizontal={false}
                                            />
                                            <XAxis type="number" />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={120}
                                            />
                                            <Tooltip
                                                content={<CustomTooltip />}
                                            />
                                            <Legend />
                                            <Bar
                                                dataKey="count"
                                                fill="#FFBB28"
                                                name="Order Count"
                                            />
                                            <Bar
                                                dataKey="value"
                                                fill="#FF8042"
                                                name="Order Value"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-muted-foreground flex h-full items-center justify-center">
                                        No color status data available
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="colors" className="space-y-4">
                    {/* Color Distribution Charts */}
                    <Card className="transition-shadow hover:shadow-md">
                        <CardHeader>
                            <CardTitle>Color Distribution</CardTitle>
                            <CardDescription>
                                Most ordered thread colors and their quantities
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-96">
                            {isLoading ? (
                                <div className="flex h-full w-full items-center justify-center">
                                    <Skeleton className="h-full w-full" />
                                </div>
                            ) : analytics?.colorDistribution &&
                              analytics.colorDistribution.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={analytics.colorDistribution.map(
                                            (color) => ({
                                                name: color.color,
                                                quantity: color.quantity,
                                                count: color.count,
                                                status: color.status,
                                            }),
                                        )}
                                        layout="vertical"
                                        margin={{
                                            top: 5,
                                            right: 30,
                                            left: 100,
                                            bottom: 5,
                                        }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            horizontal={false}
                                        />
                                        <XAxis type="number" />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={100}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Bar
                                            dataKey="quantity"
                                            name="Quantity"
                                            fill="#0088FE"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-muted-foreground flex h-full items-center justify-center">
                                    No color distribution data available
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
