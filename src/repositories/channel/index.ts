import * as db from '../../db';
import { DbChannel, DbCommonChannelParams } from './types';

export const readChannel = async (params: DbCommonChannelParams): Promise<DbChannel[]> => {
  const channel = await db.query(
    `SELECT id FROM channels WHERE name = $1 AND deleted_at IS NULL;`,
    [params.username],
  );

  return channel.rows;
};

export const createChannel = async (params: DbCommonChannelParams): Promise<DbChannel> => {
  const channel = await db.query(
    `INSERT INTO channels (name, created_by) VALUES ($1, $2) RETURNING *;`,
    [params.username, params.username],
  );

  return channel.rows[0];
};
