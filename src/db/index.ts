import pg from 'pg';
import { Transact } from './type';

const { Pool, types } = pg;

const config =
  process.env.NODE_ENV === 'production'
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false,
        },
      }
    : {
        connectionString: process.env.DATABASE_URL,
      };

const pool = new Pool(config);

types.setTypeParser(types.builtins.NUMERIC, Number);
types.setTypeParser(types.builtins.DATE, (date) => date);

export const query = pool.query.bind(pool);

export const transact: Transact = async (fn) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await fn(client.query.bind(client));
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export const checkDbVersion: () => Promise<string> = async () => {
  const res = await pool.query('SELECT version();');
  return res.rows[0].version;
};
