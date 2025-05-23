import { Metadata } from "next";

import { ThreadOrderForm } from "./thread-order-form";

export const metadata: Metadata = {
    title: "Thread Order",
    description: "Create a new thread order for your inventory",
};

export default function ThreadOrderPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Thread Order
                </h1>
                <p className="text-muted-foreground">
                    Create a new thread order for your inventory
                </p>
            </div>
            <ThreadOrderForm />
        </div>
    );
}
