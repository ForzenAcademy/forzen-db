import { ColumnType, Entity, ForzenDb, ForzenSqliteDb, TableDefinition } from '../db';

async function main() {
  const db: ForzenDb = new ForzenSqliteDb();
  db.session(async () => {
    // Make a table and insert with raw SQL
    await db.exec(
      `CREATE TABLE IF NOT EXISTS my_table (
        foo INT,
        bar TEXT
      );`,
    );
    await db.run('INSERT INTO my_table (foo, bar) VALUES (?, ?);', [123, 'abc']);

    // Make a table and insert with more structured objects
    const table = new TableDefinition('my_table_2', [
      TableDefinition.column('foo', ColumnType.INTEGER),
      TableDefinition.column('bar', ColumnType.TEXT),
    ]);
    await db.createTable(table, true);
    const testObj = { tableName: 'my_table_2', foo: 1337, bar: 'potato' } as Entity;
    await db.insert(testObj);

    console.log(await db.get('SELECT * FROM my_table', []));
  });
}

main();
