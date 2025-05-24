// Adapter to map Prisma client to expected interfaces
import { PrismaClient } from "@prisma/ledger-client";
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Khata, Bill, Party, Transaction, BankAccount, Cheque, Inventory,
  BillType, BillStatus, PartyType, TransactionType, ChequeStatus, InventoryType,
  ModelProxy, LedgerDbClient, LedgerError
} from "./ledger-types";

// Create an adapter that maps the prefixed models to the expected interfaces
export class LedgerClientAdapter implements LedgerDbClient {
  private client: PrismaClient;

  constructor() {
    // Initialize the client with more lenient settings for development
    this.client = new PrismaClient({
      log: ["error", "warn"],
      errorFormat: "pretty",
    });
    console.log("LedgerClientAdapter: Created client instance");
  }

  /**
   * Execute operations within a transaction to ensure atomicity
   * @param operations Function containing operations to perform in transaction
   * @returns Result of the transaction
   */
  async withTransaction<T>(operations: (tx: any) => Promise<T>): Promise<T> {
    try {
      return await this.client.$transaction(async (tx) => {
        return await operations(tx);
      });
    } catch (error) {
      throw new LedgerError("Transaction failed", {
        operation: "transaction",
        originalError: error
      });
    }
  }

  // Khata adapter
  get khata() {
    return {
      create: async (args: any) => {
        try {
          const result = await this.client.ledgerKhata.create(args);
          return result as unknown as Khata;
        } catch (error) {
          console.error("Error in khata.create:", error);
          throw error;
        }
      },
      findMany: async (args?: any) => {
        try {
          const results = await this.client.ledgerKhata.findMany(args);
          return results as unknown as Khata[];
        } catch (error) {
          console.error("Error in khata.findMany:", error);
          // In development, we can return mock data
          if (process.env.NODE_ENV !== "production") {
            return this.getMockData("khata", 3) as unknown as Khata[];
          }
          throw error;
        }
      },
      findUnique: async (args: any) => {
        try {
          const result = await this.client.ledgerKhata.findUnique(args);
          return result as unknown as Khata | null;
        } catch (error) {
          console.error("Error in khata.findUnique:", error);
          if (process.env.NODE_ENV !== "production") {
            return this.getMockData("khata", 1)[0] as unknown as Khata;
          }
          throw error;
        }
      },
      findFirst: async (args: any) => {
        try {
          const result = await this.client.ledgerKhata.findFirst(args);
          return result as unknown as Khata | null;
        } catch (error) {
          console.error("Error in khata.findFirst:", error);
          if (process.env.NODE_ENV !== "production") {
            return this.getMockData("khata", 1)[0] as unknown as Khata;
          }
          throw error;
        }
      },
      update: async (args: any) => {
        try {
          const result = await this.client.ledgerKhata.update(args);
          return result as unknown as Khata;
        } catch (error) {
          console.error("Error in khata.update:", error);
          if (process.env.NODE_ENV !== "production") {
            return { id: args.where.id, ...this.getMockData("khata", 1)[0] } as unknown as Khata;
          }
          throw error;
        }
      },
      upsert: async (args: any) => {
        try {
          const result = await this.client.ledgerKhata.upsert(args);
          return result as unknown as Khata;
        } catch (error) {
          console.error("Error in khata.upsert:", error);
          if (process.env.NODE_ENV !== "production") {
            return this.getMockData("khata", 1)[0] as unknown as Khata;
          }
          throw error;
        }
      },
      delete: async (args: any) => {
        try {
          const result = await this.client.ledgerKhata.delete(args);
          return result as unknown as Khata;
        } catch (error) {
          console.error("Error in khata.delete:", error);
          if (process.env.NODE_ENV !== "production") {
            return { id: args.where.id } as unknown as Khata;
          }
          throw error;
        }
      },
      count: async (args?: any) => {
        try {
          return await this.client.ledgerKhata.count(args);
        } catch (error) {
          console.error("Error in khata.count:", error);
          if (process.env.NODE_ENV !== "production") {
            return 3;
          }
          throw error;
        }
      },
    };
  }

  // Bill adapter
  get bill() {
    return this.createModelProxy(this.client.ledgerBill, "bill");
  }

  // Party adapter
  get party() {
    return this.createModelProxy(this.client.ledgerParty, "party");
  }

  // Transaction adapter
  get transaction() {
    return this.createModelProxy(this.client.ledgerTransaction, "transaction");
  }

  // BankAccount adapter
  get bankAccount() {
    return this.createModelProxy(this.client.ledgerBankAccount, "bankAccount");
  }

  // Cheque adapter
  get cheque() {
    return this.createModelProxy(this.client.ledgerCheque, "cheque");
  }

  // Inventory adapter
  get inventory() {
    return this.createModelProxy(this.client.ledgerInventory, "inventory");
  }

  // Helper method to create model proxies
  private createModelProxy(model: any, modelName: string) {
    return {
      create: async (args: any) => {
        try {
          return await model.create(args);
        } catch (error) {
          console.error(`Error in ${modelName}.create:`, error);
          if (process.env.NODE_ENV !== "production") {
            return { id: 1, ...args.data };
          }
          throw error;
        }
      },
      findMany: async (args?: any) => {
        try {
          return await model.findMany(args);
        } catch (error) {
          console.error(`Error in ${modelName}.findMany:`, error);
          if (process.env.NODE_ENV !== "production") {
            return this.getMockData(modelName, 5);
          }
          throw error;
        }
      },
      findUnique: async (args: any) => {
        try {
          return await model.findUnique(args);
        } catch (error) {
          console.error(`Error in ${modelName}.findUnique:`, error);
          if (process.env.NODE_ENV !== "production") {
            return this.getMockData(modelName, 1)[0];
          }
          throw error;
        }
      },
      findFirst: async (args: any) => {
        try {
          return await model.findFirst(args);
        } catch (error) {
          console.error(`Error in ${modelName}.findFirst:`, error);
          if (process.env.NODE_ENV !== "production") {
            return this.getMockData(modelName, 1)[0];
          }
          throw error;
        }
      },
      update: async (args: any) => {
        try {
          return await model.update(args);
        } catch (error) {
          console.error(`Error in ${modelName}.update:`, error);
          if (process.env.NODE_ENV !== "production") {
            return { id: args.where.id, ...args.data };
          }
          throw error;
        }
      },
      upsert: async (args: any) => {
        try {
          return await model.upsert(args);
        } catch (error) {
          console.error(`Error in ${modelName}.upsert:`, error);
          if (process.env.NODE_ENV !== "production") {
            return { id: 1, ...args.create };
          }
          throw error;
        }
      },
      delete: async (args: any) => {
        try {
          return await model.delete(args);
        } catch (error) {
          console.error(`Error in ${modelName}.delete:`, error);
          if (process.env.NODE_ENV !== "production") {
            return { id: args.where.id };
          }
          throw error;
        }
      },
      count: async (args?: any) => {
        try {
          return await model.count(args);
        } catch (error) {
          console.error(`Error in ${modelName}.count:`, error);
          if (process.env.NODE_ENV !== "production") {
            return 5;
          }
          throw error;
        }
      },
    };
  }

  // Generate mock data for different model types
  private getMockData(modelType: string, count: number): any[] {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // Create an array of mock items
    const items = [];
    for (let i = 0; i < count; i++) {
      const baseData = {
        id: i + 1,
        createdAt: yesterday,
        updatedAt: now,
      };

      let itemData: any = {};

      switch (modelType) {
        case "khata":
          itemData = {
            name: `Mock Khata ${i + 1}`,
            description: `This is a mock khata entry ${i + 1}`,
          };
          break;

        case "bill":
          itemData = {
            billNumber: `BILL-${i + 1}`,
            khataId: 1,
            partyId: i + 1,
            billDate: yesterday,
            dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
            amount: 1000 * (i + 1),
            paidAmount: 500 * (i + 1),
            description: `Mock Bill ${i + 1}`,
            billType: BillType.PURCHASE,
            status: i % 2 === 0 ? BillStatus.PENDING : BillStatus.PAID,
          };
          break;

        case "party":
          itemData = {
            name: `Mock Party ${i + 1}`,
            type: i % 2 === 0 ? PartyType.VENDOR : PartyType.CUSTOMER,
            khataId: 1,
            contact: `Contact Person ${i + 1}`,
            phoneNumber: "123-456-7890",
            email: `party${i + 1}@example.com`,
            address: `123 Mock Street ${i + 1}`,
            city: "Mock City",
            description: `Mock Party ${i + 1}`,
          };
          break;

        case "transaction":
          itemData = {
            khataId: 1,
            transactionDate: yesterday,
            amount: 1000 * (i + 1),
            description: `Mock Transaction ${i + 1}`,
            transactionType: TransactionType.CASH_PAYMENT,
          };
          break;

        case "bankAccount":
          itemData = {
            accountName: `Mock Account ${i + 1}`,
            accountNumber: `ACC-${10000 + i}`,
            bankName: "Mock Bank",
            branchName: "Mock Branch",
            khataId: 1,
            balance: 10000 * (i + 1),
            description: `Mock Bank Account ${i + 1}`,
          };
          break;

        case "cheque":
          itemData = {
            chequeNumber: `CH-${10000 + i}`,
            bankAccountId: 1,
            amount: 1000 * (i + 1),
            issueDate: yesterday,
            dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
            status: ChequeStatus.PENDING,
            description: `Mock Cheque ${i + 1}`,
            isReplacement: false,
          };
          break;

        case "inventory":
          itemData = {
            name: `Mock Item ${i + 1}`,
            inventoryType: InventoryType.WAREHOUSE,
            quantity: 100 * (i + 1),
            unit: "pcs",
            description: `Mock Inventory Item ${i + 1}`,
            location: "Mock Warehouse",
          };
          break;
        
        default:
          itemData = {
            name: `Mock Item ${i + 1}`,
            description: `Mock ${modelType} ${i + 1}`,
          };
      }

      items.push({ ...baseData, ...itemData });
    }

    return items;
  }

  // Connection methods
  async $connect(): Promise<void> {
    try {
      await this.client.$connect();
      console.log("LedgerClientAdapter: Connected to database");
    } catch (error) {
      console.error("LedgerClientAdapter: Failed to connect to database:", error);
      console.log("LedgerClientAdapter: Will use mock data in development mode");
      
      // In production, throw the error
      if (process.env.NODE_ENV === 'production') {
        throw new LedgerError("Failed to connect to ledger database", {
          operation: "connect",
          originalError: error
        });
      }
    }
  }
  
  async $disconnect(): Promise<void> {
    try {
      await this.client.$disconnect();
      console.log("LedgerClientAdapter: Disconnected from database");
    } catch (error) {
      console.error("LedgerClientAdapter: Error disconnecting from database:", error);
      
      // In production, throw the error
      if (process.env.NODE_ENV === 'production') {
        throw new LedgerError("Failed to disconnect from ledger database", {
          operation: "disconnect",
          originalError: error
        });
      }
    }
  }

  /**
   * Check database connection status
   * @returns True if connected, false otherwise
   */
  async checkConnection(): Promise<boolean> {
    try {
      // Use a simple query to check connection
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error("LedgerClientAdapter: Connection check failed:", error);
      return false;
    }
  }

  /**
   * Attempt to reconnect to the database with exponential backoff
   * @param retryCount Current retry attempt
   * @param maxRetries Maximum number of retry attempts
   * @returns True if reconnection succeeded
   */
  async reconnect(retryCount = 0, maxRetries = 3): Promise<boolean> {
    if (retryCount >= maxRetries) {
      console.error(`LedgerClientAdapter: Failed to reconnect after ${maxRetries} attempts`);
      return false;
    }

    try {
      // Wait with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      console.log(`LedgerClientAdapter: Reconnection attempt ${retryCount + 1}/${maxRetries} in ${delay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Try to connect
      await this.$disconnect().catch(() => {}); // Ignore disconnect errors
      await this.$connect();
      
      // Verify connection works
      const isConnected = await this.checkConnection();
      if (isConnected) {
        console.log("LedgerClientAdapter: Successfully reconnected to database");
        return true;
      }
      
      // Connection verification failed, retry
      return this.reconnect(retryCount + 1, maxRetries);
    } catch (error) {
      console.error(`LedgerClientAdapter: Error during reconnection attempt ${retryCount + 1}:`, error);
      return this.reconnect(retryCount + 1, maxRetries);
    }
  }
} 