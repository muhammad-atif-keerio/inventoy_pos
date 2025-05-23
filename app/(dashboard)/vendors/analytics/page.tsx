"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import {
    AlertCircle,
    ArrowUpRight,
    Building2,
    BuildingIcon,
    DollarSign,
    Package,
    RefreshCw,
} from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
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
interface VendorAnalytics {
    vendorStats: {
        totalVendors: number;
        activeVendors: number;
        vendorsWithPendingOrders: number;
    };
    topVendorsByValue: {
        id: number;
        name: string;
        purchaseCount: number;
        totalValue: number;
    }[];
    vendorsWithMostOrders: {
        id: number;
        name: string;
        orderCount: number;
    }[];
    purchaseTrends: {
        month: string;
        count: number;
        value: number;
    }[];
    paymentMetrics: {
        totalPaid: number;
        totalPurchased: number;
        paymentModes: {
            mode: string;
            count: number;
            amount: number;
        }[];
    };
    cityDistribution: {
        city: string;
        count: number;
    }[];
}

export default function VendorAnalyticsPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [analytics, setAnalytics] = React.useState<VendorAnalytics | null>(
        null,
    );

    // Colors for charts
    const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

    // Fetch analytics data
    const fetchAnalytics = React.useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(
                `/api/vendors/analytics?t=${Date.now()}`,
                {
                    cache: "no-store",
                },
            );

            if (response.ok) {
                const data = await response.json();
                setAnalytics(data.data);
            } else {
                const errorData = await response.json();
                setError(errorData.error || "Failed to load vendor analytics");
            }
        } catch (error) {
            console.error("Error fetching vendor analytics:", error);
            setError("Failed to load vendor analytics. Please try again.");
            toast.error("Failed to load vendor analytics");
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

    // Format large numbers with K/M/B suffix
    const formatNumber = (num: number) => {
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
        }
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
        }
        return num.toString();
    };

    // Prepare data for the payment modes pie chart
    const preparePaymentModesData = () => {
        if (!analytics?.paymentMetrics?.paymentModes) return [];

        return analytics.paymentMetrics.paymentModes.map((mode) => ({
            name: mode.mode,
            value: mode.amount,
        }));
    };

    // Custom tooltip for charts
    const CustomTooltip = ({
        active,
        payload,
        label,
    }: TooltipProps<number, string>) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background rounded border p-2 shadow-md">
                    <p className="font-medium">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }}>
                            {entry.name && entry.name.includes("value")
                                ? formatCurrency(entry.value || 0)
                                : formatNumber(entry.value || 0)}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (error) {
        return (
            <div className="container mx-auto space-y-6 p-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button onClick={fetchAnalytics}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Vendor Analytics
                    </h1>
                    <p className="text-muted-foreground">
                        Comprehensive insights into vendor performance and
                        purchasing patterns
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

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="performance">
                        Vendor Performance
                    </TabsTrigger>
                    <TabsTrigger value="trends">Purchase Trends</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    {/* Overview Stats Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {/* Total Vendors Card */}
                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total Vendors
                                </CardTitle>
                                <Building2 className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <Skeleton className="h-8 w-24" />
                                ) : (
                                    <div className="text-2xl font-bold">
                                        {analytics?.vendorStats.totalVendors ||
                                            0}
                                    </div>
                                )}
                                <p className="text-muted-foreground text-xs">
                                    Registered suppliers in the system
                                </p>
                            </CardContent>
                            <CardFooter className="p-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => router.push("/vendors")}
                                >
                                    View All Vendors
                                    <ArrowUpRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Active Vendors Card */}
                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Active Vendors
                                </CardTitle>
                                <BuildingIcon className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <Skeleton className="h-8 w-24" />
                                ) : (
                                    <div className="text-2xl font-bold">
                                        {analytics?.vendorStats.activeVendors ||
                                            0}
                                    </div>
                                )}
                                <p className="text-muted-foreground text-xs">
                                    Vendors with orders in the last 6 months
                                </p>
                            </CardContent>
                            <CardFooter className="p-2">
                                <div className="text-muted-foreground w-full text-right text-xs">
                                    {!isLoading && analytics && (
                                        <span>
                                            {(
                                                (analytics.vendorStats
                                                    .activeVendors /
                                                    analytics.vendorStats
                                                        .totalVendors) *
                                                100
                                            ).toFixed(1)}
                                            % of total
                                        </span>
                                    )}
                                </div>
                            </CardFooter>
                        </Card>

                        {/* Vendors with Pending Orders Card */}
                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Pending Orders
                                </CardTitle>
                                <Package className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <Skeleton className="h-8 w-24" />
                                ) : (
                                    <div className="text-2xl font-bold">
                                        {analytics?.vendorStats
                                            .vendorsWithPendingOrders || 0}
                                    </div>
                                )}
                                <p className="text-muted-foreground text-xs">
                                    Vendors with outstanding orders
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
                                    View Orders
                                    <ArrowUpRight className="ml-2 h-4 w-4" />
                                </Button>
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
                                            ? (
                                                  (analytics.paymentMetrics
                                                      .totalPaid /
                                                      Math.max(
                                                          analytics
                                                              .paymentMetrics
                                                              .totalPurchased,
                                                          1,
                                                      )) *
                                                  100
                                              ).toFixed(1) + "%"
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

                    {/* Top Vendors and Purchase Trends Charts */}
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Top Vendors by Value Chart */}
                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader>
                                <CardTitle>
                                    Top Vendors by Purchase Value
                                </CardTitle>
                                <CardDescription>
                                    Vendors with highest total purchase value
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-80">
                                {isLoading ? (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <Skeleton className="h-full w-full" />
                                    </div>
                                ) : analytics?.topVendorsByValue &&
                                  analytics.topVendorsByValue.length > 0 ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <BarChart
                                            data={analytics.topVendorsByValue.map(
                                                (vendor) => ({
                                                    name: vendor.name,
                                                    value: vendor.totalValue,
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
                                                fill="#0088FE"
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

                        {/* Purchase Trends Chart */}
                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader>
                                <CardTitle>
                                    Purchase Trends (Last 6 Months)
                                </CardTitle>
                                <CardDescription>
                                    Monthly purchase volume and order count
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-80">
                                {isLoading ? (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <Skeleton className="h-full w-full" />
                                    </div>
                                ) : analytics?.purchaseTrends &&
                                  analytics.purchaseTrends.length > 0 ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <BarChart
                                            data={analytics.purchaseTrends}
                                            margin={{
                                                top: 5,
                                                right: 30,
                                                left: 20,
                                                bottom: 25,
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="month"
                                                angle={-45}
                                                textAnchor="end"
                                                height={60}
                                            />
                                            <YAxis
                                                yAxisId="left"
                                                orientation="left"
                                                tickFormatter={formatNumber}
                                            />
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
                                            <Bar
                                                yAxisId="left"
                                                dataKey="count"
                                                fill="#00C49F"
                                                name="Order Count"
                                            />
                                            <Bar
                                                yAxisId="right"
                                                dataKey="value"
                                                fill="#0088FE"
                                                name="Purchase Value"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-muted-foreground flex h-full items-center justify-center">
                                        No purchase trend data available
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="performance" className="space-y-4">
                    {/* Vendor Performance Charts */}
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Vendors with Most Orders Chart */}
                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader>
                                <CardTitle>Vendors with Most Orders</CardTitle>
                                <CardDescription>
                                    Vendors ranked by number of orders placed
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-80">
                                {isLoading ? (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <Skeleton className="h-full w-full" />
                                    </div>
                                ) : analytics?.vendorsWithMostOrders &&
                                  analytics.vendorsWithMostOrders.length > 0 ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <BarChart
                                            data={analytics.vendorsWithMostOrders.map(
                                                (vendor) => ({
                                                    name: vendor.name,
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
                                                dataKey="orders"
                                                fill="#FFBB28"
                                                name="Order Count"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-muted-foreground flex h-full items-center justify-center">
                                        No vendor order data available
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Payment Modes Distribution Chart */}
                        <Card className="transition-shadow hover:shadow-md">
                            <CardHeader>
                                <CardTitle>
                                    Payment Modes Distribution
                                </CardTitle>
                                <CardDescription>
                                    Distribution of payments by payment method
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-80">
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
                                                data={preparePaymentModesData()}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={true}
                                                outerRadius={100}
                                                fill="#8884d8"
                                                dataKey="value"
                                                nameKey="name"
                                                label={({ name, percent }) =>
                                                    `${name}: ${(percent * 100).toFixed(0)}%`
                                                }
                                            >
                                                {preparePaymentModesData().map(
                                                    (entry, index) => (
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
                                                formatter={(value) =>
                                                    formatCurrency(
                                                        Number(value),
                                                    )
                                                }
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-muted-foreground flex h-full items-center justify-center">
                                        No payment mode data available
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="trends" className="space-y-4">
                    {/* Geographic Distribution */}
                    <Card className="transition-shadow hover:shadow-md">
                        <CardHeader>
                            <CardTitle>
                                Vendor Geographic Distribution
                            </CardTitle>
                            <CardDescription>
                                Distribution of vendors by city
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-80">
                            {isLoading ? (
                                <div className="flex h-full w-full items-center justify-center">
                                    <Skeleton className="h-full w-full" />
                                </div>
                            ) : analytics?.cityDistribution &&
                              analytics.cityDistribution.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={analytics.cityDistribution.map(
                                            (city) => ({
                                                name: city.city || "Unknown",
                                                count: city.count,
                                            }),
                                        )}
                                        layout="vertical"
                                        margin={{
                                            top: 5,
                                            right: 30,
                                            left: 80,
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
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar
                                            dataKey="count"
                                            fill="#8884d8"
                                            name="Vendor Count"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-muted-foreground flex h-full items-center justify-center">
                                    No city distribution data available
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
