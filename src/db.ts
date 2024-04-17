import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';

const DB_NAME = '__FORZENDB__.db';

export interface Entity {
  tableName: string;
}

export enum ColumnType {
  INTEGER = 'INTEGER',
  TEXT = 'TEXT',
  REAL = 'REAL',
}

export interface Column {
  isPrimaryKey: boolean;
  name: string;
  type: ColumnType;
  allowNull: boolean;
}

export class TableDefinition {
  constructor(
    public readonly name: string,
    public readonly columns: Column[],
  ) {}

  static column(
    name: string,
    type: ColumnType,
    allowNull: boolean = true,
    isPrimaryKey: boolean = false,
  ): Column {
    return {
      name: name,
      type: type,
      allowNull: allowNull,
      isPrimaryKey: isPrimaryKey,
    } as Column;
  }
}

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
   * Create a table in the database with the given schema definition.
   *
   * @param table The table definition to make the table from
   * @param allowPreexisting Whether or not it's allowed that the table existed already
   */
  createTable(table: TableDefinition, allowPreexisting: boolean): Promise<void>;

  /**
   * Run a sql query and returns the.
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

  /**
   * Insert an entity into the database.
   *
   * @param entity The entity to insert into the database
   */
  insert(entity: Entity): Promise<void>;
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

  async createTable(table: TableDefinition, allowPreexisting: boolean = true): Promise<void> {
    let sql = 'CREATE TABLE ' + (allowPreexisting ? 'IF NOT EXISTS ' : '') + table.name + ' (';
    sql += table.columns.map((column: Column) => this.makeColumnSqlEntry(column)).join(',');
    sql += ');';
    await this.exec(sql);
  }

  private makeColumnSqlEntry(column: Column): string {
    return (
      `${column.name} ${column.type}` +
      (column.isPrimaryKey ? ' PRIMARY KEY' : '') +
      (column.allowNull ? '' : ' NOT NULL')
    );
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
      return (await this.db.get(sql, args)) as T;
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

  async insert(entity: Entity): Promise<void> {
    const keys = Object.keys(entity).filter((key: string) => key != 'tableName');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keyValueMap: { [key: string]: any } = { ...entity };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sqlArgumentMap: any[] = keys.map((key: string) => keyValueMap[key] as any);

    const qMarks = keys.map(() => '?').join(',');
    const sql = `INSERT INTO ${entity.tableName} ( ${keys.join(',')} ) VALUES (${qMarks})`;
    await this.run(sql, sqlArgumentMap);
  }
}
