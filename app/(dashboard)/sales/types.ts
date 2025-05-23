import { Customer, Payment, PaymentMode, Prisma } from "@prisma/client";

// Define a more flexible type for our PDF generation that can handle both
// the database model and the UI model
export interface SalesOrderWithCustomer {
    id: number | string;
    orderNumber: string;
    orderDate: Date | string;
    customerName: string;
    customerId: string | number;
    customerPhone?: string;
    customerEmail?: string;
    quantitySold: number;
    unitPrice: number | Prisma.Decimal;
    totalSale: number | Prisma.Decimal;
    discount?: number | Prisma.Decimal | null;
    tax?: number | Prisma.Decimal | null;
    deliveryDate?: Date | string | null;
    deliveryAddress?: string | null;
    remarks?: string | null;
    paymentMode?: PaymentMode | null;
    customer?: Customer | null;
    items?: {
        id: string | number;
        name?: string;
        description?: string;
        quantity: number;
        unitPrice: Prisma.Decimal | number;
    }[];
    payments?:
        | Payment[]
        | {
              id: number;
              amount: number | Prisma.Decimal;
              mode: PaymentMode;
              transactionDate: string | Date;
              referenceNumber?: string;
              description?: string;
              chequeTransaction?: {
                  id: number;
                  chequeNumber: string;
                  bank: string;
                  branch?: string;
                  chequeAmount: number | Prisma.Decimal;
                  chequeStatus: string;
                  clearanceDate?: string | Date;
              } | null;
          }[];
}
