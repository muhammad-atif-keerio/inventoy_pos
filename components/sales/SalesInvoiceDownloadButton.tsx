"use client";

import React, { useState } from "react";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SalesInvoiceDownloadButtonProps {
    id: string | number;
    className?: string;
    variant?:
        | "default"
        | "outline"
        | "secondary"
        | "destructive"
        | "ghost"
        | "link";
    size?: "default" | "sm" | "lg" | "icon";
    showIcon?: boolean;
    children?: React.ReactNode;
}

export default function QuickInvoiceDownloadButton({
    id,
    className,
    variant = "default",
    size = "default",
    showIcon = true,
    children,
}: SalesInvoiceDownloadButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        setLoading(true);
        try {
            // First fetch the invoice data to verify it exists
            const response = await fetch(`/api/sales/${id}`);

            if (!response.ok) {
                throw new Error("Failed to fetch invoice data");
            }

            // Then open the download page in a new window
            const downloadUrl = `/invoice-preview/${id}?pdf=true`;
            window.open(downloadUrl, "_blank");

            // Show simple alert instead of toast since we don't have toast component
            setTimeout(() => {
                setLoading(false);
            }, 1000);
        } catch (error) {
            console.error("Error generating invoice:", error);
            alert("Error: Failed to generate invoice PDF. Please try again.");
            setLoading(false);
        }
    };

    return (
        <Button
            variant={variant}
            size={size}
            className={className}
            onClick={handleDownload}
            disabled={loading}
        >
            {loading ? (
                <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Preparing...
                </>
            ) : (
                <>
                    {showIcon && <Download className="mr-2 h-4 w-4" />}
                    {children || "Download Invoice"}
                </>
            )}
        </Button>
    );
}
