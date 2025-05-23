import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// Simple revalidation endpoint to clear cache for specific paths
export async function GET(request: NextRequest) {
    try {
        // Get the path to revalidate from the query parameters
        const searchParams = request.nextUrl.searchParams;
        const path = searchParams.get("path");

        // Validate the path parameter
        if (!path) {
            return NextResponse.json(
                { error: "No path provided for revalidation" },
                { status: 400 },
            );
        }

        // Optional secret for production environments
        const secret = searchParams.get("secret");
        const expectedSecret =
            process.env.REVALIDATION_TOKEN ||
            process.env.NEXT_PUBLIC_REVALIDATION_TOKEN;

        // In production, verify the secret
        if (
            process.env.NODE_ENV === "production" &&
            expectedSecret &&
            secret !== expectedSecret
        ) {
            return NextResponse.json(
                { error: "Invalid revalidation token" },
                { status: 401 },
            );
        }

        // Revalidate the path
        revalidatePath(path);

        console.log(`[Revalidate] Cache revalidated for path: ${path}`);

        return NextResponse.json({ revalidated: true, path }, { status: 200 });
    } catch (error) {
        console.error("[Revalidate] Error during revalidation:", error);

        return NextResponse.json(
            {
                revalidated: false,
                error: "Failed to revalidate path",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
