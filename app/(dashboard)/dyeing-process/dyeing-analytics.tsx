"use client";

import { useEffect, useState } from "react";

import { BarChart3, Loader2, Scissors, Shirt } from "lucide-react";
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
    XAxis,
    YAxis,
} from "recharts";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Type definitions aligned with Prisma schema and API response
interface AnalyticsData {
    threadInventory: {
        dyedThreadsInStock: number;
        threadsWaitingToBeDyed: number;
    };
    fabricMetrics: {
        fabricInInventory: number;
        fabricInProduction: number;
        fabricSold: number;
        fabricFromDyedThreads: number;
    };
    dyeingTrends: {
        month: string;
        count: number;
    }[];
    popularColors: {
        name: string;
        count: number;
    }[];
    statusDistribution: {
        status: string;
        count: number;
    }[];
}

interface DyeingAnalyticsProps {
    refreshTrigger?: number;
}

// Color palette for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

// Fabric and thread specific colors
const FABRIC_COLORS = ["#3b82f6", "#22c55e", "#ec4899", "#8b5cf6"]; // blue, green, pink, purple

// Status colors - aligned with DyeingProcess resultStatus values from Prisma
const STATUS_COLORS = {
    COMPLETED: "#22c55e", // green
    PARTIAL: "#eab308", // yellow
    FAILED: "#ef4444", // red
    PENDING: "#3b82f6", // blue
    IN_PROGRESS: "#9333ea", // purple
    CANCELLED: "#9ca3af", // gray
    default: "#9ca3af", // gray
};

// RADIAN constant for custom label
const RADIAN = Math.PI / 180;

// Custom label renderer for pie charts
const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
}: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
}) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text
            x={x}
            y={y}
            fill="white"
            textAnchor={x > cx ? "start" : "end"}
            dominantBaseline="central"
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

// Default analytics data for when API fails
const DEFAULT_ANALYTICS_DATA: AnalyticsData = {
    threadInventory: {
        dyedThreadsInStock: 0,
        threadsWaitingToBeDyed: 0,
    },
    fabricMetrics: {
        fabricInInventory: 0,
        fabricInProduction: 0,
        fabricSold: 0,
        fabricFromDyedThreads: 0,
    },
    dyeingTrends: [],
    popularColors: [],
    statusDistribution: [],
};

export function DyeingAnalytics({ refreshTrigger = 0 }: DyeingAnalyticsProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
        null,
    );

    // Fetch analytics data
    useEffect(() => {
        async function fetchAnalytics() {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(
                    `/api/dyeing/analytics?t=${Date.now()}`,
                );
                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch analytics data: ${response.status}`,
                    );
                }
                const result = await response.json();

                if (result.success && result.data) {
                    setAnalyticsData(result.data);
                } else {
                    // If API reports error, use the data it returns anyway (it should be zeroed out)
                    if (result.data) {
                        setAnalyticsData(result.data);
                        if (result.error) {
                            setError(
                                `API returned data with errors: ${result.error}`,
                            );
                        }
                    } else {
                        throw new Error(
                            result.error || "Invalid response format",
                        );
                    }
                }
            } catch (error) {
                console.error("Error fetching analytics:", error);
                setError(
                    error instanceof Error
                        ? error.message
                        : "Failed to load analytics data",
                );
                toast.error(
                    "Analytics data not available. Using placeholder data.",
                );
                // Initialize with default data structure
                setAnalyticsData(DEFAULT_ANALYTICS_DATA);
            } finally {
                setLoading(false);
            }
        }

        fetchAnalytics();
    }, [refreshTrigger]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-6">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                <span>Loading dyeing analytics...</span>
            </div>
        );
    }

    // Always use either the fetched data or default data
    // This ensures we don't try to render with null data
    const safeData = analyticsData || DEFAULT_ANALYTICS_DATA;

    // Show a warning if we have an error but are using default data
    if (error) {
        toast.warning("Using default data due to API error", {
            id: "analytics-error",
            duration: 3000,
        });
    }

    // Prepare data for fabric pie chart with null checks
    const fabricData = [
        {
            name: "In Inventory",
            value: safeData.fabricMetrics?.fabricInInventory || 0,
        },
        {
            name: "In Production",
            value: safeData.fabricMetrics?.fabricInProduction || 0,
        },
        { name: "Sold", value: safeData.fabricMetrics?.fabricSold || 0 },
        {
            name: "From Dyed Threads",
            value: safeData.fabricMetrics?.fabricFromDyedThreads || 0,
        },
    ].filter((item) => item.value > 0);

    // Prepare thread data for pie chart with null checks
    const threadData = [
        {
            name: "Dyed Threads",
            value: safeData.threadInventory?.dyedThreadsInStock || 0,
        },
        {
            name: "Waiting to be Dyed",
            value: safeData.threadInventory?.threadsWaitingToBeDyed || 0,
        },
    ].filter((item) => item.value > 0);

    // Format color chart data
    const colorData =
        safeData.popularColors?.map((color, index) => ({
            name: color.name,
            value: color.count,
            fill: color.name.startsWith("#")
                ? color.name
                : COLORS[index % COLORS.length],
        })) || [];

    // Format status distribution data
    const statusData =
        safeData.statusDistribution?.map((item) => ({
            name: formatStatusName(item.status),
            value: item.count,
            fill:
                STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] ||
                STATUS_COLORS.default,
        })) || [];

    // Function to format status name for display
    function formatStatusName(status: string): string {
        return status.charAt(0) + status.slice(1).toLowerCase();
    }

    const hasThreadData = threadData.length > 0;
    const hasFabricData = fabricData.length > 0;
    const hasColorData = colorData.length > 0;
    const hasStatusData = statusData.length > 0;
    const hasTrendData =
        safeData.dyeingTrends && safeData.dyeingTrends.length > 0;

    return (
        <div className="space-y-6">
            {/* Display a notification if no data sections are available */}
            {!hasThreadData &&
                !hasFabricData &&
                !hasColorData &&
                !hasStatusData &&
                !hasTrendData && (
                    <Card className="border-none shadow-sm">
                        <CardContent className="pt-6 pb-6">
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <BarChart3 className="mb-4 h-10 w-10 text-gray-400" />
                                <h3 className="mb-1 text-lg font-medium">
                                    No Dyeing Analytics Available
                                </h3>
                                <p className="text-gray-500">
                                    Start processing dye jobs to see analytics
                                    data here.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

            {/* Fabric Metrics */}
            <div>
                <h3 className="mb-3 text-lg font-medium">Fabric Metrics</h3>
                <div className="flex flex-col gap-4 md:flex-row">
                    {/* Left side: Metrics cards */}
                    <div className="grid w-full grid-cols-2 gap-3 md:w-1/2 md:grid-cols-4">
                        {/* Fabric in Inventory */}
                        <Card className="border-none bg-blue-50 shadow-sm">
                            <CardHeader className="px-3 pt-3 pb-1">
                                <CardTitle className="flex items-center text-sm font-medium text-blue-800">
                                    <Shirt className="mr-1 h-4 w-4" />
                                    In Inventory
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 pt-0 pb-3">
                                <div className="text-2xl font-bold text-blue-600">
                                    {(
                                        safeData.fabricMetrics
                                            ?.fabricInInventory || 0
                                    ).toLocaleString()}{" "}
                                    <span className="text-sm">m</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Fabric in Production */}
                        <Card className="border-none bg-green-50 shadow-sm">
                            <CardHeader className="px-3 pt-3 pb-1">
                                <CardTitle className="flex items-center text-sm font-medium text-green-800">
                                    <Shirt className="mr-1 h-4 w-4" />
                                    In Production
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 pt-0 pb-3">
                                <div className="text-2xl font-bold text-green-600">
                                    {(
                                        safeData.fabricMetrics
                                            ?.fabricInProduction || 0
                                    ).toLocaleString()}{" "}
                                    <span className="text-sm">m</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Fabric Sold */}
                        <Card className="border-none bg-pink-50 shadow-sm">
                            <CardHeader className="px-3 pt-3 pb-1">
                                <CardTitle className="flex items-center text-sm font-medium text-pink-800">
                                    <Shirt className="mr-1 h-4 w-4" />
                                    Sold
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 pt-0 pb-3">
                                <div className="text-2xl font-bold text-pink-600">
                                    {(
                                        safeData.fabricMetrics?.fabricSold || 0
                                    ).toLocaleString()}{" "}
                                    <span className="text-sm">m</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Fabric from Dyed Threads */}
                        <Card className="border-none bg-purple-50 shadow-sm">
                            <CardHeader className="px-3 pt-3 pb-1">
                                <CardTitle className="flex items-center overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-purple-800">
                                    <Shirt className="mr-1 h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">
                                        From Dyed Threads
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 pt-0 pb-3">
                                <div className="text-2xl font-bold text-purple-600">
                                    {(
                                        safeData.fabricMetrics
                                            ?.fabricFromDyedThreads || 0
                                    ).toLocaleString()}{" "}
                                    <span className="text-sm">m</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right side: Fabric Distribution Chart */}
                    <div className="w-full md:w-1/2">
                        <Card className="h-full border-none shadow-sm">
                            <CardContent className="h-full pt-4">
                                {hasFabricData ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height={200}
                                    >
                                        <PieChart>
                                            <Pie
                                                data={fabricData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={80}
                                                paddingAngle={2}
                                                dataKey="value"
                                                labelLine={false}
                                                label={renderCustomizedLabel}
                                            >
                                                {fabricData.map(
                                                    (entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={
                                                                FABRIC_COLORS[
                                                                    index %
                                                                        FABRIC_COLORS.length
                                                                ]
                                                            }
                                                        />
                                                    ),
                                                )}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value) =>
                                                    value.toLocaleString() +
                                                    " meters"
                                                }
                                            />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-[200px] items-center justify-center">
                                        <p className="text-gray-500">
                                            No fabric data available
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Thread Metrics */}
            <div>
                <h3 className="mb-3 text-lg font-medium">Thread Inventory</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Thread Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Dyed Threads */}
                        <Card className="border-none bg-purple-50 shadow-sm">
                            <CardHeader className="px-3 pt-3 pb-1">
                                <CardTitle className="flex items-center text-sm font-medium text-purple-800">
                                    <Scissors className="mr-1 h-4 w-4" />
                                    Dyed Threads
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 pt-0 pb-3">
                                <div className="text-2xl font-bold text-purple-600">
                                    {(
                                        safeData.threadInventory
                                            ?.dyedThreadsInStock || 0
                                    ).toLocaleString()}{" "}
                                    <span className="text-sm">units</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Threads Waiting */}
                        <Card className="border-none bg-amber-50 shadow-sm">
                            <CardHeader className="px-3 pt-3 pb-1">
                                <CardTitle className="flex items-center text-sm font-medium text-amber-800">
                                    <Scissors className="mr-1 h-4 w-4" />
                                    To Be Dyed
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 pt-0 pb-3">
                                <div className="text-2xl font-bold text-amber-600">
                                    {(
                                        safeData.threadInventory
                                            ?.threadsWaitingToBeDyed || 0
                                    ).toLocaleString()}{" "}
                                    <span className="text-sm">units</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Thread Distribution Chart */}
                    <Card className="border-none shadow-sm">
                        <CardContent className="pt-4">
                            {hasThreadData ? (
                                <ResponsiveContainer width="100%" height={150}>
                                    <PieChart>
                                        <Pie
                                            data={threadData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={35}
                                            outerRadius={60}
                                            paddingAngle={2}
                                            dataKey="value"
                                            labelLine={false}
                                            label={renderCustomizedLabel}
                                        >
                                            <Cell fill="#9333EA" />
                                            <Cell fill="#F59E0B" />
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) =>
                                                value.toLocaleString() +
                                                " units"
                                            }
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-[150px] items-center justify-center">
                                    <p className="text-gray-500">
                                        No thread data available
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Dyeing Status Distribution */}
            <div>
                <h3 className="mb-3 text-lg font-medium">
                    Dyeing Process Status
                </h3>
                <Card className="border-none shadow-sm">
                    {hasStatusData ? (
                        <>
                            <CardHeader className="px-4 pt-4 pb-1">
                                <CardTitle className="flex items-center text-sm font-medium">
                                    <BarChart3 className="mr-1 h-4 w-4" />
                                    Process Status Distribution
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pt-2 pb-4">
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart
                                        data={statusData}
                                        layout="vertical"
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={80}
                                        />
                                        <Tooltip
                                            formatter={(value) => [
                                                `${value} processes`,
                                                "Count",
                                            ]}
                                        />
                                        <Bar dataKey="value">
                                            {statusData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.fill}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </>
                    ) : (
                        <CardContent className="py-8">
                            <div className="flex flex-col items-center justify-center text-center">
                                <p className="text-gray-500">
                                    No status data available
                                </p>
                            </div>
                        </CardContent>
                    )}
                </Card>
            </div>

            {/* Color Distribution */}
            <div>
                <h3 className="mb-3 text-lg font-medium">Popular Colors</h3>
                <Card className="border-none shadow-sm">
                    {hasColorData ? (
                        <CardContent className="pt-4">
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={colorData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        paddingAngle={2}
                                        dataKey="value"
                                        label={({ name, percent }) =>
                                            `${name} (${(percent * 100).toFixed(0)}%)`
                                        }
                                        labelLine={false}
                                    >
                                        {colorData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.fill}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => [
                                            `${value} processes`,
                                            "Count",
                                        ]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    ) : (
                        <CardContent className="py-8">
                            <div className="flex flex-col items-center justify-center text-center">
                                <p className="text-gray-500">
                                    No color data available
                                </p>
                            </div>
                        </CardContent>
                    )}
                </Card>
            </div>

            {/* Monthly Dyeing Trends */}
            <div>
                <h3 className="mb-3 text-lg font-medium">
                    Monthly Dyeing Trends
                </h3>
                <Card className="border-none shadow-sm">
                    {hasTrendData ? (
                        <CardContent className="pt-4">
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={safeData.dyeingTrends || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(value) => [
                                            `${value} processes`,
                                            "Count",
                                        ]}
                                    />
                                    <Bar dataKey="count" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    ) : (
                        <CardContent className="py-8">
                            <div className="flex flex-col items-center justify-center text-center">
                                <p className="text-gray-500">
                                    No trend data available
                                </p>
                            </div>
                        </CardContent>
                    )}
                </Card>
            </div>
        </div>
    );
}
