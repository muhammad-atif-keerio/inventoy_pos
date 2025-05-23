"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Loader2 } from "lucide-react";

export default function NewThreadOrderPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to the proper order creation page
        router.push("/thread-orders/order");
    }, [router]);

    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
                <p className="text-muted-foreground">
                    Redirecting to order form...
                </p>
            </div>
        </div>
    );
}
