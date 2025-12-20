import postgres from 'postgres';

let sql;

export function getDb() {
  if (!sql) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL not set');
    }
    sql = postgres(connectionString, {
      ssl: 'require',
      max: 1
    });
  }
  return sql;
}

export default getDb;
