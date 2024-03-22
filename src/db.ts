import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';

const DB_NAME = '__FORZENDB__.db';

export interface ForzenDb {
  /**
   * Begin a session of database operations. Call endSession once done to finish.
   */
  beginSession(): Promise<void>;

  /**
   * Call this at the end of a set of database operations, after using beginSession to start.
   */
  endSession(): Promise<void>;

  /**
   * Perform a session of database operations in a specified lambda.
   *
   * This method calls beginSession, performs the block, then calls endSession.
   * This method is here for convenience.
   *
   * @param block A lambda containing database operations
   */
  session(block: () => void): Promise<void>;

  /**
   * Execute a sql query or set of queries separated by semicolons.
   * This shouldn't be used for statements that want a value returned.
   *
   * @param sql The sql statement to execute
   */
  exec(sql: string): Promise<void>;

  /**
   * Run a sql query and return a value.
   *
   * @param sql The sql statement to execute
   * @param args The arguments to replace into the sql statement
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run<T>(sql: string, args: any[]): Promise<T>;

  /**
   * Run a sql query and get the first result.
   *
   * @param sql The sql statement to execute
   * @param args The arguments to replace into the sql statement
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get<T>(sql: string, args: any[]): Promise<T>;

  /**
   * Run a sql query and get an array of the results.
   *
   * @param sql The sql statement to execute
   * @param args The arguments to replace into the sql statement
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  all<T>(sql: string, args: any[]): Promise<T[]>;
}

export class ForzenSqliteDb implements ForzenDb {
  private db: Database | null = null;

  async beginSession(): Promise<void> {
    await this.createConnection();
  }

  async endSession(): Promise<void> {
    await this.db?.close();
    this.db = null;
  }

  async session(block: () => void): Promise<void> {
    await this.beginSession();
    await block();
    await this.endSession();
  }

  private async createConnection(): Promise<void> {
    this.db = await open({
      filename: `./${DB_NAME}`,
      driver: sqlite3.Database,
    });
  }

  async exec(sql: string): Promise<void> {
    const isInTransaction = this.db != null;
    try {
      if (!isInTransaction) {
        await this.createConnection();
      }
      await this.db?.exec(sql);
    } catch (error) {
      console.log(`DATABASE ERROR FOR QUERY:\n${sql}`);
      throw error;
    } finally {
      if (!isInTransaction) {
        await this.endSession();
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async run<T>(sql: string, args: any[] = []): Promise<T> {
    const isInTransaction = this.db != null;
    try {
      if (!isInTransaction) {
        await this.createConnection();
      }
      if (!this.db) throw 'DATABASE ERROR';
      return (await this.db.run(sql, args)) as T;
    } catch (error) {
      console.log(`DATABASE ERROR FOR QUERY:\n${sql}`);
      throw error;
    } finally {
      if (!isInTransaction) {
        await this.endSession();
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get<T>(sql: string, args: any[] = []): Promise<T> {
    const isInTransaction = this.db != null;
    try {
      if (!isInTransaction) {
        await this.createConnection();
      }
      if (!this.db) throw 'DATABASE ERROR';
      return (await this.db.run(sql, args)) as T;
    } catch (error) {
      console.log(`DATABASE ERROR FOR QUERY:\n${sql}`);
      throw error;
    } finally {
      if (!isInTransaction) {
        await this.endSession();
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async all<T>(sql: string, args: any[] = []): Promise<T[]> {
    const isInTransaction = this.db != null;
    try {
      if (!isInTransaction) {
        await this.createConnection();
      }
      if (!this.db) throw 'DATABASE ERROR';
      return await this.db.all<T[]>(sql, args);
    } catch (error) {
      console.log(`DATABASE ERROR FOR QUERY:\n${sql}`);
      throw error;
    } finally {
      if (!isInTransaction) {
        await this.endSession();
      }
    }
  }
}
