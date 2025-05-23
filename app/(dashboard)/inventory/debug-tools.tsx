"use client";

import React, { useState } from "react";

import {
    AlertCircle,
    Bug,
    Database,
    RefreshCw,
    ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface DebugResponse {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
    message?: string;
    timestamp?: string;
}

export function InventoryDebugTools() {
    const [isLoading, setIsLoading] = useState(false);
    const [apiTestResult, setApiTestResult] = useState<DebugResponse | null>(
        null,
    );
    const [showDebug, setShowDebug] = useState(false);

    const runApiTest = async (endpoint: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(endpoint);

            // Get the raw text first to handle potential JSON parsing issues
            const text = await response.text();
            let data: Record<string, unknown>;

            try {
                data = JSON.parse(text);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
            } catch (_) {
                data = {
                    success: false,
                    error: "Invalid JSON response",
                    rawResponse:
                        text.substring(0, 500) +
                        (text.length > 500 ? "..." : ""),
                };
            }

            setApiTestResult({
                success: response.ok,
                data,
                timestamp: new Date().toISOString(),
            });

            if (response.ok) {
                toast.success("API endpoint test successful");
            } else {
                toast.error("API endpoint test failed");
            }
        } catch (error) {
            setApiTestResult({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            });
            toast.error("API connection error");
        } finally {
            setIsLoading(false);
        }
    };

    const generateTestData = async (count: number = 3) => {
        setIsLoading(true);
        try {
            const response = await fetch(
                `/api/inventory?generateTestData=true&count=${count}`,
            );
            const data = await response.json();

            setApiTestResult({
                success: response.ok,
                data,
                message:
                    data.message || `Generated ${count} test inventory items`,
                timestamp: new Date().toISOString(),
            });

            if (response.ok) {
                toast.success(
                    data.message || `Generated ${count} test inventory items`,
                );
            } else {
                toast.error("Failed to generate test data");
            }
        } catch (error) {
            setApiTestResult({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
                message: "Failed to generate test data",
                timestamp: new Date().toISOString(),
            });
            toast.error("Failed to generate test data");
        } finally {
            setIsLoading(false);
        }
    };

    if (!showDebug) {
        return (
            <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDebug(true)}
                className="flex items-center gap-1"
            >
                <Bug className="h-4 w-4" />
                <span className="text-xs">Debug Tools</span>
            </Button>
        );
    }

    return (
        <Card className="mb-4 w-full">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <ShieldAlert className="h-5 w-5 text-yellow-500" />
                        Inventory Debug Tools
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDebug(false)}
                    >
                        Close
                    </Button>
                </div>
                <CardDescription>
                    Troubleshooting tools for inventory system issues
                </CardDescription>
            </CardHeader>
            <CardContent className="pb-3">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium">
                            API Endpoint Tests
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => runApiTest("/api/inventory")}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
                                ) : (
                                    <Database className="mr-1 h-4 w-4" />
                                )}
                                Test Inventory API
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    runApiTest(
                                        "/api/inventory?includeRelations=true",
                                    )
                                }
                                disabled={isLoading}
                            >
                                Test with Relations
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    runApiTest("/api/thread-purchase/available")
                                }
                                disabled={isLoading}
                            >
                                Test Thread Purchases
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    runApiTest("/api/dyeing/available")
                                }
                                disabled={isLoading}
                            >
                                Test Dyeing Processes
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <h3 className="text-sm font-medium">
                            Database Actions
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => generateTestData(3)}
                                disabled={isLoading}
                            >
                                Generate Test Data (3 Items)
                            </Button>
                        </div>
                    </div>

                    {apiTestResult && (
                        <>
                            <Separator />

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium">
                                        Test Result
                                    </h3>
                                    <Badge
                                        variant={
                                            apiTestResult.success
                                                ? "default"
                                                : "destructive"
                                        }
                                    >
                                        {apiTestResult.success
                                            ? "Success"
                                            : "Failed"}
                                    </Badge>
                                </div>

                                {apiTestResult.message && (
                                    <p className="text-muted-foreground text-sm">
                                        {apiTestResult.message}
                                    </p>
                                )}

                                {apiTestResult.error && (
                                    <div className="mt-1 flex items-start gap-1 text-sm text-red-500">
                                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                        <span>{apiTestResult.error}</span>
                                    </div>
                                )}

                                <Collapsible className="w-full">
                                    <CollapsibleTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-2 w-full"
                                        >
                                            {apiTestResult.data
                                                ? "View Response Data"
                                                : "No Data"}
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <ScrollArea className="mt-2 h-[300px] w-full rounded-md border p-4">
                                            <pre className="text-xs whitespace-pre-wrap">
                                                {JSON.stringify(
                                                    apiTestResult.data,
                                                    null,
                                                    2,
                                                )}
                                            </pre>
                                        </ScrollArea>
                                    </CollapsibleContent>
                                </Collapsible>
                            </div>
                        </>
                    )}
                </div>
            </CardContent>
            <CardFooter className="text-muted-foreground border-t pt-3 text-xs">
                {apiTestResult?.timestamp
                    ? `Last test: ${new Date(apiTestResult.timestamp).toLocaleString()}`
                    : "No tests run yet"}
            </CardFooter>
        </Card>
    );
}
