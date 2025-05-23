/**
 * Add required timestamp fields to Prisma create operations
 * @param data The data object being passed to Prisma create
 * @returns The same data with createdAt and updatedAt added
 */
export function addRequiredFields<T extends object>(
    data: T,
): T & { updatedAt: Date; createdAt?: Date } {
    return {
        ...data,
        updatedAt: new Date(),
        // Only add createdAt if it doesn't already exist
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(!(data as any).createdAt ? { createdAt: new Date() } : {}),
    };
}

/**
 * Creates a proper connect object for relations
 * @param id The ID to connect
 * @returns The connect object for Prisma
 */
export function createConnectObject(id: number | null | undefined) {
    return id ? { connect: { id } } : undefined;
}
