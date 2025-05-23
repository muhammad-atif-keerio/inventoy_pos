import { NextRequest, NextResponse } from "next/server";

// This is a redirect endpoint to maintain backward compatibility
export async function POST(request: NextRequest) {
    try {
        // Get the query parameters and origin
        const url = new URL(request.url);
        const queryParams = url.search;
        const origin = url.origin;

        // Clone the request to forward it
        const requestBody = await request.json();

        // Create the absolute URL to the correct endpoint
        const targetUrl = `${origin}/api/inventory/thread-purchase${queryParams}`;
        console.log("[add-thread-purchase] Forwarding request to:", targetUrl);

        // Forward to the correct endpoint
        const response = await fetch(targetUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });

        console.log("[add-thread-purchase] Response status:", response.status);

        if (response.ok) {
            // Check if the response is JSON before parsing
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const data = await response.json();
                return NextResponse.json(data, { status: response.status });
            } else {
                // If not JSON but still a success, return a basic success message
                return NextResponse.json(
                    {
                        success: true,
                        message: "Operation completed successfully",
                    },
                    { status: response.status },
                );
            }
        } else {
            // For error responses, try to capture useful error information
            const contentType = response.headers.get("content-type");
            let errorDetails = "";

            try {
                if (contentType && contentType.includes("application/json")) {
                    const errorJson = await response.json();
                    errorDetails = JSON.stringify(errorJson);
                } else {
                    const text = await response.text();
                    errorDetails =
                        text.substring(0, 100) +
                        (text.length > 100 ? "..." : "");
                }
            } catch (parseError) {
                errorDetails = `Could not parse error response: ${parseError}`;
            }

            console.error(
                `[add-thread-purchase] Error from target endpoint: ${response.status}`,
                errorDetails,
            );

            return NextResponse.json(
                {
                    error: "Error processing inventory update",
                    status: response.status,
                    details: errorDetails,
                },
                { status: 500 },
            );
        }
    } catch (error) {
        console.error("[add-thread-purchase] Exception:", error);
        return NextResponse.json(
            {
                error: "Failed to process request",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
