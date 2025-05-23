"use client";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import { RefreshCcw } from "lucide-react";

interface RefreshIndicatorProps {
    lastRefreshed: Date;
    autoRefresh: boolean;
}

export function RefreshIndicator({
    lastRefreshed,
    autoRefresh,
}: RefreshIndicatorProps) {
    const [formattedTime, setFormattedTime] = useState<string>("");

    // Format the time only on the client side to prevent hydration mismatch
    useEffect(() => {
        setFormattedTime(format(lastRefreshed, "HH:mm:ss"));
    }, [lastRefreshed]);

    return (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <RefreshCcw className="h-3 w-3" />
            <span>Last refreshed: {formattedTime}</span>
            {autoRefresh && (
                <span className="text-xs">(Auto-refresh every 30 seconds)</span>
            )}
        </div>
    );
}
