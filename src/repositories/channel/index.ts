import * as db from '@db';
import { DbChannel, DbChannelMember } from '@db/type';

import {
  DbCreateChannelParams,
  DbGetChannelMembersParams,
  DbReadChannelParams,
  ChannelSummary,
  DbAddChannelMembersParams,
  DbRemoveChannelMembersParams,
} from './types';

export const readChannel = async (
  params: DbReadChannelParams,
): Promise<ChannelSummary | undefined> => {
  const channel = await db
    .query<DbChannel>(`SELECT id FROM channels WHERE name = $1 AND deleted_at IS NULL;`, [
      params.channel_name,
    ])
    .then((res) => res.rows[0]);

  if (!channel) return undefined;

  return {
    id: channel.id,
    name: channel.name,
    metadata: channel.metadata,
  };
};

export const createChannel = async (params: DbCreateChannelParams): Promise<ChannelSummary> => {
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

    return {
      id: channel.id,
      name: channel.name,
      metadata: channel.metadata,
    };
  });
};

export const getChannelMembers = async (params: DbGetChannelMembersParams): Promise<string[]> => {
  const members = await db.query<DbChannelMember>(
    `SELECT * FROM channel_members WHERE channel_id = $1`,
    [params.channel_id],
  );

  return members.rows.map((res) => res.username);
};

export const addChannelMembers = async (params: DbAddChannelMembersParams): Promise<string[]> => {
  const { channel_id, members } = params;

  const addMembers = members.map((username) =>
    db
      .query<DbChannelMember>(
        `INSERT INTO channel_members (channel_id, username) VALUES ($1, $2) RETURNING *;`,
        [channel_id, username],
      )
      .then((res) => res.rows[0]),
  );
  const result = await Promise.all(addMembers);

  return result.map((res) => res.username);
};

export const removeChannelMembers = async (
  params: DbRemoveChannelMembersParams,
): Promise<(string | undefined)[]> => {
  const { channel_id, members } = params;

  const removeMembers = members.map((username) =>
    db
      .query<DbChannelMember>(
        `DELETE FROM channel_members WHERE channel_id = $1 AND username = $2 RETURNING *;`,
        [channel_id, username],
      )
      .then((res) => res.rows[0]),
  );
  const result = await Promise.all(removeMembers);

  return result.map((res) => res?.username);
};
