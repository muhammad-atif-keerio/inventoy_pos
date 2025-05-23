import { Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LedgerLoading() {
    return (
        <div className="container mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 md:space-x-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Ledger System
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Loading financial data...
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Skeleton className="h-10 w-[200px]" />
                    <Skeleton className="h-10 w-[250px]" />
                    <Skeleton className="h-10 w-10 rounded" />
                    <Skeleton className="h-10 w-28 rounded" />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array(8)
                    .fill(0)
                    .map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    <Skeleton className="h-4 w-24" />
                                </CardTitle>
                                <Skeleton className="h-4 w-4 rounded-full" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="mb-1 h-8 w-20" />
                                <Skeleton className="h-4 w-32" />
                            </CardContent>
                        </Card>
                    ))}
            </div>

            <div className="mt-10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2 text-lg">Loading ledger data...</span>
            </div>
        </div>
    );
}
