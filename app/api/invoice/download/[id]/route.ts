import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: number }> },
) {
    try {
        // Ensure params.id is properly accessed
        const { id } = await params;

        if (isNaN(Number(id))) {
            return NextResponse.json(
                { error: "Invalid sales order ID" },
                { status: 400 },
            );
        }

        // Fetch the complete sales order data with all related information
        const salesOrder = await db.salesOrder.findUnique({
            where: { id: Number(id) },
            include: {
                customer: true,
                threadPurchase: true,
                fabricProduction: true,
                payments: true,
            },
        });

        if (!salesOrder) {
            return NextResponse.json(
                { error: "Sales order not found" },
                { status: 404 },
            );
        }

        // Redirect to the PDF version of the invoice preview page
        // Adding ?pdf=true parameter to indicate PDF generation is needed
        const invoiceUrl = `/invoice-preview/${id}?pdf=true`;
        return NextResponse.redirect(new URL(invoiceUrl, req.nextUrl.origin));
    } catch (error) {
        console.error("Error generating invoice redirection:", error);
        return NextResponse.json(
            { error: "Failed to generate invoice" },
            { status: 500 },
        );
    }
}
