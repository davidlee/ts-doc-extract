// Sample TypeScript file for testing extraction

/**
 * User configuration interface
 */
export interface UserConfig {
  // Username for login
  username: string;

  /* Email address */
  email: string;

  /**
   * Optional role
   */
  role?: string;
}

/**
 * User type alias
 */
export type User = {
  id: string;
  name: string;
};

// API endpoint constant
export const API_URL = 'https://api.example.com';

/**
 * Greets a user by name
 * @param name - The user's name
 * @param greeting - Optional greeting message
 * @returns A greeting string
 */
export function greet(name: string, greeting: string = 'Hello'): string {
  return `${greeting}, ${name}!`;
}

/**
 * Async function example
 * @param userId - User ID to fetch
 * @returns Promise resolving to user data
 */
export async function fetchUser(userId: string): Promise<User> {
  return { id: userId, name: 'Test User' };
}

// Database connection class
export class DatabaseClient {
  private connectionString: string;

  /**
   * Create a new database client
   * @param connectionString - Database connection string
   */
  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  // Connect to database
  async connect(): Promise<void> {
    // Implementation
  }

  /**
   * Execute a query
   * @param sql - SQL query string
   * @returns Query results
   */
  async query<T>(sql: string): Promise<T[]> {
    return [];
  }

  /* Private helper method */
  private _parseConnection(): void {
    // Implementation
  }
}

/**
 * Status enum
 */
export enum Status {
  Active = 'active',
  Inactive = 'inactive',
  Pending = 'pending',
}
