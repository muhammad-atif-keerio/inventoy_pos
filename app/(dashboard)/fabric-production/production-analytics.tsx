"use client";

import React, { useEffect, useState } from "react";

import {
    Bar,
    BarChart,
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

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { formatCurrency } from "./columns";

// Define the analytics data structure
interface FabricProductionAnalytics {
    summary: {
        totalProductions: number;
        completedProductions: number;
        inProgressProductions: number;
        pendingProductions?: number;
        totalFabricProduced: number;
        totalThreadUsed: number;
        totalValue: number;
    };
    byStatus: {
        status: string;
        count: number;
    }[];
    byFabricType: {
        fabricType: string;
        count: number;
        quantity: number;
    }[];
    productionTimeline: {
        month: string;
        count: number;
        quantity: number;
    }[];
}

// Default empty analytics object to prevent null reference errors
const defaultAnalytics: FabricProductionAnalytics = {
    summary: {
        totalProductions: 0,
        completedProductions: 0,
        inProgressProductions: 0,
        pendingProductions: 0,
        totalFabricProduced: 0,
        totalThreadUsed: 0,
        totalValue: 0,
    },
    byStatus: [],
    byFabricType: [],
    productionTimeline: [],
};

// Colors for charts
const STATUS_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

export function ProductionAnalytics() {
    const [analytics, setAnalytics] =
        useState<FabricProductionAnalytics>(defaultAnalytics);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setIsLoading(true);
            try {
                const response = await fetch("/api/fabric/analytics");

                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch analytics: ${response.status}`,
                    );
                }

                const data = await response.json();

                // Ensure all required fields are present with fallbacks
                const processedData: FabricProductionAnalytics = {
                    summary: {
                        totalProductions: data.summary?.totalProductions || 0,
                        completedProductions:
                            data.summary?.completedProductions || 0,
                        inProgressProductions:
                            data.summary?.inProgressProductions || 0,
                        pendingProductions:
                            data.summary?.pendingProductions || 0,
                        totalFabricProduced:
                            data.summary?.totalFabricProduced || 0,
                        totalThreadUsed: data.summary?.totalThreadUsed || 0,
                        totalValue: data.summary?.totalValue || 0,
                    },
                    byStatus: data.byStatus || [],
                    byFabricType: data.byFabricType || [],
                    productionTimeline: data.productionTimeline || [],
                };

                setAnalytics(processedData);
            } catch (error) {
                console.error(
                    "Error fetching fabric production analytics:",
                    error,
                );
                toast.error("Failed to load production analytics");
                // Maintain default analytics on error
                setAnalytics(defaultAnalytics);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    // Custom tooltip for charts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="rounded-md border bg-white p-4 shadow-sm">
                    <p className="font-medium">{label}</p>
                    <p className="text-sm">
                        {payload[0].name}:{" "}
                        <span className="font-medium">{payload[0].value}</span>
                    </p>
                    {payload[1] && (
                        <p className="text-sm">
                            {payload[1].name}:{" "}
                            <span className="font-medium">
                                {payload[1].value}
                            </span>
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    if (isLoading) {
        return (
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                    <Card key={`skeleton-${index}`}>
                        <CardHeader className="pb-2">
                            <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="mb-2 h-8 w-1/3" />
                            <Skeleton className="h-3 w-2/3" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const { summary, byStatus, byFabricType, productionTimeline } = analytics;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Productions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summary.totalProductions}
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">
                            {summary.completedProductions} completed,{" "}
                            {summary.inProgressProductions} in progress
                            {summary.pendingProductions
                                ? `, ${summary.pendingProductions} pending`
                                : ""}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Fabric Produced
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summary.totalFabricProduced.toLocaleString()} m
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">
                            Used {summary.totalThreadUsed.toLocaleString()} m of
                            thread
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Production Value
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(summary.totalValue)}
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">
                            Based on production costs
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Status Distribution Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Production Status</CardTitle>
                        <CardDescription>
                            Distribution of production status
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {byStatus.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={byStatus}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) =>
                                            `${name} (${(percent * 100).toFixed(0)}%)`
                                        }
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="count"
                                        nameKey="status"
                                    >
                                        {byStatus.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={
                                                    STATUS_COLORS[
                                                        index %
                                                            STATUS_COLORS.length
                                                    ]
                                                }
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center">
                                <p className="text-muted-foreground">
                                    No status data available
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Fabric Type Distribution Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Fabric Types</CardTitle>
                        <CardDescription>
                            Production by fabric type
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {byFabricType.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={byFabricType}>
                                    <XAxis dataKey="fabricType" />
                                    <YAxis />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar
                                        name="Count"
                                        dataKey="count"
                                        fill="#8884d8"
                                    />
                                    <Bar
                                        name="Quantity (m)"
                                        dataKey="quantity"
                                        fill="#82ca9d"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center">
                                <p className="text-muted-foreground">
                                    No fabric type data available
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Production Timeline Chart */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Production Timeline</CardTitle>
                        <CardDescription>
                            Monthly production output
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {productionTimeline.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={productionTimeline}>
                                    <XAxis dataKey="month" />
                                    <YAxis
                                        yAxisId="left"
                                        orientation="left"
                                        stroke="#8884d8"
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        stroke="#82ca9d"
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar
                                        yAxisId="left"
                                        name="Count"
                                        dataKey="count"
                                        fill="#8884d8"
                                    />
                                    <Bar
                                        yAxisId="right"
                                        name="Quantity (m)"
                                        dataKey="quantity"
                                        fill="#82ca9d"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center">
                                <p className="text-muted-foreground">
                                    No timeline data available
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
