import { NextRequest, NextResponse } from "next/server";

import {
    Party,
    PartyType,
    isUsingRealLedgerClient,
    ledgerDb,
} from "@/app/lib/ledger-db";

/**
 * GET /api/ledger/party
 * Get parties (vendors/customers) with optional filters
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Extract query parameters
        const khataId = searchParams.get("khataId");
        const type = searchParams.get("type") as PartyType | null;
        const search = searchParams.get("search");

        // Pagination parameters
        const page = parseInt(searchParams.get("page") || "1");
        const pageSize = parseInt(searchParams.get("pageSize") || "50");
        const skip = (page - 1) * pageSize;

        // Check if using real client
        if (isUsingRealLedgerClient) {
            // Build the where clause for filtering
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const where: any = {};

            if (khataId) {
                where.khataId = parseInt(khataId);
            }

            if (type) {
                where.type = type;
            }

            if (search) {
                where.OR = [
                    {
                        name: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                    {
                        contact: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                    {
                        phoneNumber: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                    {
                        address: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                ];
            }

            // Get parties with pagination
            const [parties, totalCount] = await Promise.all([
                ledgerDb.party.findMany({
                    where,
                    orderBy: {
                        name: "asc",
                    },
                    skip,
                    take: pageSize,
                }),
                ledgerDb.party.count({ where }),
            ]);

            // Format the response
            const formattedParties = parties.map((party: Party) => ({
                id: party.id,
                name: party.name,
                type: party.type,
                khataId: party.khataId,
                contact: party.contact,
                phoneNumber: party.phoneNumber,
                email: party.email,
                address: party.address,
                city: party.city,
                description: party.description,
                customerId: party.customerId,
                vendorId: party.vendorId,
                createdAt: party.createdAt.toISOString(),
                updatedAt: party.updatedAt.toISOString(),
            }));

            return NextResponse.json({
                parties: formattedParties,
                pagination: {
                    total: totalCount,
                    page,
                    pageSize,
                    totalPages: Math.ceil(totalCount / pageSize),
                },
            });
        } else {
            // Return mock data if not using real client
            const mockParties = [
                {
                    id: 1,
                    name: "Textile Suppliers Ltd",
                    type: "VENDOR",
                    khataId: 1,
                    contact: "John Smith",
                    phoneNumber: "123-456-7890",
                    email: "john@textilesuppliers.com",
                    address: "123 Supplier St",
                    city: "Textile City",
                    description: "Thread supplier",
                    vendorId: 1,
                    customerId: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 2,
                    name: "Fashion Retailer",
                    type: "CUSTOMER",
                    khataId: 1,
                    contact: "Sarah Johnson",
                    phoneNumber: "987-654-3210",
                    email: "sarah@fashionretailer.com",
                    address: "456 Fashion Ave",
                    city: "Retail City",
                    description: "Regular cloth customer",
                    vendorId: null,
                    customerId: 1,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 3,
                    name: "Thread Company",
                    type: "VENDOR",
                    khataId: 1,
                    contact: "Mike Wilson",
                    phoneNumber: "555-123-4567",
                    email: "mike@threadcompany.com",
                    address: "789 Thread Rd",
                    city: "Thread City",
                    description: "Premium thread supplier",
                    vendorId: 2,
                    customerId: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            ];

            // Filter mock data if search is provided
            let filteredParties = mockParties;
            if (search) {
                const searchLower = search.toLowerCase();
                filteredParties = mockParties.filter(
                    (party) =>
                        party.name.toLowerCase().includes(searchLower) ||
                        (party.contact &&
                            party.contact
                                .toLowerCase()
                                .includes(searchLower)) ||
                        (party.phoneNumber &&
                            party.phoneNumber.includes(search)) ||
                        (party.address &&
                            party.address.toLowerCase().includes(searchLower)),
                );
            }

            // Filter by type if provided
            if (type) {
                filteredParties = filteredParties.filter(
                    (party) => party.type === type,
                );
            }

            return NextResponse.json({
                parties: filteredParties,
                pagination: {
                    total: filteredParties.length,
                    page: 1,
                    pageSize: filteredParties.length,
                    totalPages: 1,
                },
            });
        }
    } catch (error) {
        console.error("Error fetching parties:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch parties",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

/**
 * POST /api/ledger/party
 * Create a new party (vendor/customer)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.name || body.name.trim() === "") {
            return NextResponse.json(
                { error: "Party name is required" },
                { status: 400 },
            );
        }

        if (!body.type) {
            return NextResponse.json(
                { error: "Party type is required" },
                { status: 400 },
            );
        }

        if (!body.khataId) {
            return NextResponse.json(
                { error: "Khata ID is required" },
                { status: 400 },
            );
        }

        if (isUsingRealLedgerClient) {
            // Create a new party in the database
            const newParty = await ledgerDb.party.create({
                data: {
                    name: body.name.trim(),
                    type: body.type as PartyType,
                    khataId: parseInt(body.khataId),
                    contact: body.contact?.trim() || null,
                    phoneNumber: body.phoneNumber?.trim() || null,
                    email: body.email?.trim() || null,
                    address: body.address?.trim() || null,
                    city: body.city?.trim() || null,
                    description: body.description?.trim() || null,
                    customerId: body.customerId
                        ? parseInt(body.customerId)
                        : null,
                    vendorId: body.vendorId ? parseInt(body.vendorId) : null,
                },
            });

            return NextResponse.json(
                {
                    party: {
                        id: newParty.id,
                        name: newParty.name,
                        type: newParty.type,
                        khataId: newParty.khataId,
                        contact: newParty.contact,
                        phoneNumber: newParty.phoneNumber,
                        email: newParty.email,
                        address: newParty.address,
                        city: newParty.city,
                        description: newParty.description,
                        customerId: newParty.customerId,
                        vendorId: newParty.vendorId,
                        createdAt: newParty.createdAt.toISOString(),
                        updatedAt: newParty.updatedAt.toISOString(),
                    },
                },
                { status: 201 },
            );
        } else {
            // Return mock data if not using real client
            return NextResponse.json(
                {
                    party: {
                        id: Math.floor(Math.random() * 1000) + 4,
                        name: body.name.trim(),
                        type: body.type,
                        khataId: parseInt(body.khataId),
                        contact: body.contact?.trim() || null,
                        phoneNumber: body.phoneNumber?.trim() || null,
                        email: body.email?.trim() || null,
                        address: body.address?.trim() || null,
                        city: body.city?.trim() || null,
                        description: body.description?.trim() || null,
                        customerId: body.customerId
                            ? parseInt(body.customerId)
                            : null,
                        vendorId: body.vendorId
                            ? parseInt(body.vendorId)
                            : null,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                },
                { status: 201 },
            );
        }
    } catch (error) {
        console.error("Error creating party:", error);
        return NextResponse.json(
            {
                error: "Failed to create party",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
