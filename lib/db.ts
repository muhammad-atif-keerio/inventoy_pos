import { PrismaClient } from "@prisma/client";

import "../types/prismaTypes";

const createPrismaClient = () => {
    const client = new PrismaClient({
        log:
            process.env.NODE_ENV === "development"
                ? ["warn", "error"]
                : ["error"],
        errorFormat: "pretty",
    });

    // Add middleware for connection handling
    client.$use(async (params, next) => {
        try {
            return await next(params);
        } catch (error) {
            // Log the error
            console.error(
                `Database error in ${params.model}.${params.action}:`,
                error,
            );

            // Attempt to reconnect on connection errors
            if (
                error instanceof Error &&
                (error.message.includes("ConnectionReset") ||
                    error.message.includes("connection was forcibly closed"))
            ) {
                console.log(
                    "Connection issue detected, attempting to reconnect...",
                );

                // Allow a moment for connection to recover
                await new Promise((resolve) => setTimeout(resolve, 1000));

                try {
                    // Attempt the operation again
                    return await next(params);
                } catch (retryError) {
                    console.error("Reconnect attempt failed:", retryError);
                    throw retryError;
                }
            }

            throw error;
        }
    });

    return client;
};

const globalForPrisma = globalThis as unknown as {
    prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
