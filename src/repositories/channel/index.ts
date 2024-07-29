import * as db from '@db';
import {
  DbChannel,
  DbCreateChannelParams,
  DbGetChannelMembersParams,
  DbChannelMember,
  DbReadChannelParams,
} from './types';

export const readChannel = async (params: DbReadChannelParams): Promise<DbChannel | undefined> => {
  const channel = await db.query<DbChannel>(
    `SELECT id FROM channels WHERE name = $1 AND deleted_at IS NULL;`,
    [params.channel_name],
  );

  return channel.rows[0];
};

export const createChannel = async (params: DbCreateChannelParams): Promise<DbChannel> => {
  return db.transact(async (query) => {
    const { channel_name, username, members } = params;

    const channel = await query<DbChannel>(
      `INSERT INTO channels (name, created_by) VALUES ($1, $2) RETURNING *;`,
      [channel_name, username],
    ).then((res) => res.rows[0]);

    const users = members || [username];
    const insertMembers = users.map((name) =>
      query<DbChannelMember>(
        `INSERT INTO channel_members (channel_id, username) VALUES ($1, $2);`,
        [channel.id, name],
      ),
    );
    await Promise.all(insertMembers);

    return channel;
  });
};

export const getChannelMembers = async (params: DbGetChannelMembersParams): Promise<string[]> => {
  const members = await db.query<DbChannelMember>(
    `SELECT * FROM channel_members WHERE channel_id = $1`,
    [params.channel_id],
  );

  return members.rows.map((res) => res.username);
};
