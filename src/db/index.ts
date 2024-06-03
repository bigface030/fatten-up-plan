import pg from 'pg';

const { Pool, types } = pg;

const db = new Pool();

types.setTypeParser(types.builtins.NUMERIC, Number);

export const checkDbVersion: () => Promise<string> = async () => {
  const res = await db.query('SELECT version();');
  return res.rows[0].version;
};

export default db;
