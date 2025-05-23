"use client";

import { useEffect, useState } from "react";

import { PaymentMode, PaymentStatus, ProductType } from "@prisma/client";
import {
    BarChart as BarChartIcon,
    DollarSign,
    Loader2,
    TrendingUp,
} from "lucide-react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { toast } from "sonner";

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
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Type for analytics data from API
interface AnalyticsData {
    totalRevenue: number;
    averageOrderSize: number;
    salesByTimeframe: {
        label: string;
        value: number;
    }[];
    paymentDistribution: {
        mode: PaymentMode;
        count: number;
    }[];
    productDistribution: {
        type: ProductType;
        value: number;
    }[];
    paymentStatusDistribution: {
        status: PaymentStatus;
        count: number;
    }[];
    topCustomers: {
        name: string;
        total: number;
        count: number;
    }[];
}

// Custom tooltip props interface
interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        value: number;
        name?: string;
        dataKey?: string;
    }>;
    label?: string;
}

// Color palette for charts
const COLORS = {
    primary: "#0088FE",
    success: "#4ade80",
    warning: "#facc15",
    danger: "#f87171",
    info: "#60a5fa",
    secondary: "#9333ea",
    muted: "#9CA3AF",
};

// Payment status color mapping
const PAYMENT_STATUS_COLORS = {
    [PaymentStatus.PAID]: COLORS.success,
    [PaymentStatus.PARTIAL]: COLORS.info,
    [PaymentStatus.PENDING]: COLORS.warning,
    [PaymentStatus.CANCELLED]: COLORS.danger,
};

export function SalesAnalytics() {
    const [loading, setLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
        null,
    );
    const [timeRange, setTimeRange] = useState<"7days" | "30days" | "1year">(
        "30days",
    );

    // Fetch analytics data
    useEffect(() => {
        async function fetchAnalytics() {
            setLoading(true);
            try {
                // Call the real API endpoint
                const response = await fetch(
                    `/api/sales/analytics?range=${timeRange}`,
                );
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(
                        errorData.error || "Failed to fetch analytics data",
                    );
                }
                const data = await response.json();
                setAnalyticsData(data);
            } catch (error) {
                console.error("Error fetching analytics:", error);
                toast.error("Failed to load analytics data", {
                    description:
                        error instanceof Error
                            ? error.message
                            : "Please try again later",
                });
                // Set default empty data structure
                setAnalyticsData({
                    totalRevenue: 0,
                    averageOrderSize: 0,
                    salesByTimeframe: [],
                    paymentDistribution: [],
                    productDistribution: [],
                    paymentStatusDistribution: [],
                    topCustomers: [],
                });
            } finally {
                setLoading(false);
            }
        }

        fetchAnalytics();
    }, [timeRange]);

    if (loading) {
        return (
            <div className="bg-card flex w-full items-center justify-center rounded-lg border p-8">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="text-primary h-8 w-8 animate-spin" />
                    <p className="text-muted-foreground text-sm">
                        Loading analytics data...
                    </p>
                </div>
            </div>
        );
    }

    if (
        !analyticsData ||
        (analyticsData.salesByTimeframe.length === 0 &&
            analyticsData.paymentDistribution.length === 0 &&
            analyticsData.productDistribution.length === 0)
    ) {
        return (
            <div className="bg-card w-full rounded-lg border p-8">
                <div className="flex flex-col items-center justify-center space-y-2 py-6 text-center">
                    <BarChartIcon className="text-muted-foreground/50 h-12 w-12" />
                    <h3 className="mt-2 text-lg font-medium">
                        No Analytics Data Available
                    </h3>
                    <p className="text-muted-foreground text-sm">
                        Create sales records to see analytics visualizations
                    </p>
                </div>
            </div>
        );
    }

    // Format currency values
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "PKR",
            minimumFractionDigits: 0,
        }).format(value);
    };

    // Custom tooltip component for charts
    const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background rounded-md border p-2 text-sm shadow-md">
                    <p className="font-medium">{label}</p>
                    <p className="text-primary">{`Value: ${formatCurrency(payload[0].value)}`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            {/* Time range selector */}
            <div className="flex items-center justify-between">
                <Tabs
                    value={timeRange}
                    onValueChange={(value) =>
                        setTimeRange(value as "7days" | "30days" | "1year")
                    }
                    className="w-full max-w-md"
                >
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="7days">7 Days</TabsTrigger>
                        <TabsTrigger value="30days">30 Days</TabsTrigger>
                        <TabsTrigger value="1year">Year</TabsTrigger>
                    </TabsList>
                </Tabs>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            Export
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem>Export as PDF</DropdownMenuItem>
                        <DropdownMenuItem>Export as CSV</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {/* Total Revenue */}
                <Card className="border shadow transition-shadow hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Revenue
                        </CardTitle>
                        <DollarSign className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(analyticsData.totalRevenue)}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            For the selected period
                        </p>
                    </CardContent>
                </Card>

                {/* Average Order Size */}
                <Card className="border shadow transition-shadow hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Average Order
                        </CardTitle>
                        <BarChartIcon className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(analyticsData.averageOrderSize)}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            Per transaction
                        </p>
                    </CardContent>
                </Card>

                {/* Sales Trend */}
                <Card className="border shadow transition-shadow hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Trend
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+12.5%</div>
                        <p className="text-xs text-green-600">
                            Increase from previous period
                        </p>
                    </CardContent>
                </Card>

                {/* Total Orders */}
                <Card className="border shadow transition-shadow hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Orders
                        </CardTitle>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-muted-foreground h-4 w-4"
                        >
                            <path d="M8.8 20v-4.1l1.9.2a2.3 2.3 0 0 0 2.164-2.1V8.3A5.37 5.37 0 0 0 2 8.25c0 2.8.656 3.95 1 4.8a.1.1 0 0 0 .2 0c.5-.4 1.3-1.1 1.3-1.1" />
                            <path d="M19.8 17.8a7.5 7.5 0 0 0 .003-10.603" />
                            <path d="M17 15a3.5 3.5 0 0 0-.025-4.95" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {analyticsData.paymentDistribution.reduce(
                                (acc, item) => acc + item.count,
                                0,
                            )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            Total completed orders
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Sales Over Time Chart */}
                <Card className="border shadow transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                            Sales Over Time
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Revenue trend for the selected period
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {analyticsData.salesByTimeframe.length > 0 ? (
                            <div className="h-[250px] p-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={analyticsData.salesByTimeframe}
                                        margin={{
                                            top: 5,
                                            right: 20,
                                            left: 0,
                                            bottom: 5,
                                        }}
                                    >
                                        <defs>
                                            <linearGradient
                                                id="colorRevenue"
                                                x1="0"
                                                y1="0"
                                                x2="0"
                                                y2="1"
                                            >
                                                <stop
                                                    offset="5%"
                                                    stopColor={COLORS.primary}
                                                    stopOpacity={0.8}
                                                />
                                                <stop
                                                    offset="95%"
                                                    stopColor={COLORS.primary}
                                                    stopOpacity={0}
                                                />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            className="stroke-muted"
                                        />
                                        <XAxis
                                            dataKey="label"
                                            tick={{ fontSize: 12 }}
                                            tickLine={{ stroke: "transparent" }}
                                            axisLine={{ stroke: "#e5e7eb" }}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12 }}
                                            tickFormatter={(value) =>
                                                `₨${value}`
                                            }
                                            tickLine={{ stroke: "transparent" }}
                                            axisLine={{ stroke: "#e5e7eb" }}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke={COLORS.primary}
                                            fillOpacity={1}
                                            fill="url(#colorRevenue)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex h-[250px] items-center justify-center">
                                <p className="text-muted-foreground text-sm">
                                    No sales data available
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Payment Distribution & Status */}
                <Card className="border shadow transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                            Payment Distribution
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Payment methods and status breakdown
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            {/* Payment Methods */}
                            <div className="h-[200px]">
                                {analyticsData.paymentDistribution.length >
                                0 ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <PieChart>
                                            <Pie
                                                data={
                                                    analyticsData.paymentDistribution
                                                }
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={70}
                                                paddingAngle={5}
                                                dataKey="count"
                                                nameKey="mode"
                                            >
                                                {analyticsData.paymentDistribution.map(
                                                    (entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={
                                                                Object.values(
                                                                    COLORS,
                                                                )[
                                                                    index %
                                                                        Object.values(
                                                                            COLORS,
                                                                        ).length
                                                                ]
                                                            }
                                                        />
                                                    ),
                                                )}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value) => [
                                                    `${value} orders`,
                                                    "Count",
                                                ]}
                                                labelFormatter={(label) =>
                                                    `${label}`
                                                }
                                            />
                                            <Legend
                                                layout="vertical"
                                                verticalAlign="middle"
                                                align="right"
                                                iconSize={8}
                                                iconType="circle"
                                                wrapperStyle={{
                                                    fontSize: 12,
                                                    paddingLeft: 10,
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center">
                                        <p className="text-muted-foreground text-sm">
                                            No payment data
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Payment Status */}
                            <div className="h-[200px]">
                                {analyticsData.paymentStatusDistribution &&
                                analyticsData.paymentStatusDistribution.length >
                                    0 ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <PieChart>
                                            <Pie
                                                data={
                                                    analyticsData.paymentStatusDistribution
                                                }
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={70}
                                                paddingAngle={5}
                                                dataKey="count"
                                                nameKey="status"
                                            >
                                                {analyticsData.paymentStatusDistribution.map(
                                                    (entry) => (
                                                        <Cell
                                                            key={`cell-${entry.status}`}
                                                            fill={
                                                                PAYMENT_STATUS_COLORS[
                                                                    entry.status
                                                                ] ||
                                                                COLORS.muted
                                                            }
                                                        />
                                                    ),
                                                )}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value) => [
                                                    `${value} orders`,
                                                    "Count",
                                                ]}
                                                labelFormatter={(label) =>
                                                    `${label}`
                                                }
                                            />
                                            <Legend
                                                layout="vertical"
                                                verticalAlign="middle"
                                                align="right"
                                                iconSize={8}
                                                iconType="circle"
                                                wrapperStyle={{
                                                    fontSize: 12,
                                                    paddingLeft: 10,
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center">
                                        <p className="text-muted-foreground text-sm">
                                            No status data
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Customers */}
                {analyticsData.topCustomers &&
                    analyticsData.topCustomers.length > 0 && (
                        <Card className="border shadow transition-shadow hover:shadow-md lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Top Customers
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Customers with highest purchase volume
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[250px]">
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <BarChart
                                            data={analyticsData.topCustomers.slice(
                                                0,
                                                5,
                                            )} // Show top 5
                                            layout="vertical"
                                            margin={{
                                                top: 5,
                                                right: 30,
                                                left: 120,
                                                bottom: 5,
                                            }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                className="stroke-muted"
                                            />
                                            <XAxis
                                                type="number"
                                                tickFormatter={(value) =>
                                                    formatCurrency(value)
                                                }
                                                tick={{ fontSize: 12 }}
                                                tickLine={{
                                                    stroke: "transparent",
                                                }}
                                                axisLine={{ stroke: "#e5e7eb" }}
                                            />
                                            <YAxis
                                                type="category"
                                                dataKey="name"
                                                tick={{ fontSize: 12 }}
                                                width={120}
                                                tickLine={{
                                                    stroke: "transparent",
                                                }}
                                                axisLine={{ stroke: "#e5e7eb" }}
                                            />
                                            <Tooltip
                                                formatter={(value) => [
                                                    formatCurrency(
                                                        Number(value),
                                                    ),
                                                    "Total Spent",
                                                ]}
                                                labelFormatter={(label) =>
                                                    `Customer: ${label}`
                                                }
                                            />
                                            <Bar
                                                dataKey="total"
                                                fill={COLORS.primary}
                                                radius={[0, 4, 4, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    )}
            </div>
        </div>
    );
}
