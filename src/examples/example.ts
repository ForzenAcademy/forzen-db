import { ForzenDb, ForzenSqliteDb } from '../db';

async function main() {
  const db: ForzenDb = new ForzenSqliteDb();
  db.session(async () => {
    await db.exec(
      `CREATE TABLE IF NOT EXISTS my_table (
        foo INT,
        bar TEXT
      );`,
    );
    await db.run('INSERT INTO my_table (foo, bar) VALUES (?, ?);', [123, 'abc']);
  });
}

main();
