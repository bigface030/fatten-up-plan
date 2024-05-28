import pg from 'pg';

const { Pool } = pg;

const db = new Pool();

export const checkDbVersion: () => Promise<string> = async () => {
  const res = await db.query('SELECT version();');
  return res.rows[0].version;
};

export default db;
