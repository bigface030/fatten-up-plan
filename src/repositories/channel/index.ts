import * as db from '@db';
import { DbChannel, DbCreateChannelParams, DbReadChannelParams } from './types';

export const readChannel = async (params: DbReadChannelParams): Promise<DbChannel | undefined> => {
  const channel = await db.query(
    `SELECT id FROM channels WHERE name = $1 AND deleted_at IS NULL;`,
    [params.channel_name],
  );

  return channel.rows[0];
};

export const createChannel = async (params: DbCreateChannelParams): Promise<DbChannel> => {
  const channel = await db.query(
    `INSERT INTO channels (name, created_by) VALUES ($1, $2) RETURNING *;`,
    [params.channel_name, params.username],
  );

  return channel.rows[0];
};
