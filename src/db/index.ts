import pg, { ClientBase } from 'pg';

const { Pool, types } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(process.env.NODE_ENV === 'production' && {
    ssl: {
      rejectUnauthorized: false,
    },
  }),
});

types.setTypeParser(types.builtins.NUMERIC, Number);
types.setTypeParser(types.builtins.DATE, (date) => date);

type AppQuery = ClientBase['query'];

type Transact = <T>(fn: (query: AppQuery) => Promise<T>) => Promise<T>;

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
