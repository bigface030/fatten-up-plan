import * as db from '../db';
import { AppQuery } from '../db/type';
import {
  DbCreateRecordParams,
  DbDeleteRecordParams,
  DbReadRecordParams,
  DbTransaction,
} from './types';

const getChannelId =
  (name: string) =>
  async (query: AppQuery): Promise<string> => {
    const channel = await query(`SELECT id FROM channels WHERE name = $1 AND deleted_at IS NULL;`, [
      name,
    ]);

    return channel.rows[0].id;
  };

export const createRecord = (params: DbCreateRecordParams): Promise<DbTransaction> => {
  return db.transact(async (query) => {
    const channel_id = await getChannelId(params.username)(query);

    const record = await query(
      `INSERT INTO records (channel_id, activity, description, created_by)
    VALUES ($1, $2, $3, $4)
    RETURNING *;`,
      [channel_id, params.activity, params.description, params.username],
    );

    const transaction = await query(
      `INSERT INTO transactions (record_id, username, amount, customized_classification, customized_tag)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;`,
      [
        record.rows[0].id,
        params.username,
        params.amount,
        params.customized_classification,
        params.customized_tag,
      ],
    );

    return { ...record.rows[0], ...transaction.rows[0] };
  });
};

export const deleteRecord = (params: DbDeleteRecordParams): Promise<DbTransaction> => {
  return db.transact(async (query: AppQuery) => {
    const channel_id = await getChannelId(params.username)(query);

    const res = await query(
      `UPDATE records
    SET deleted_at = CURRENT_TIMESTAMP
    FROM transactions
    WHERE id = (
      SELECT id
      FROM records
      WHERE channel_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    )
    RETURNING *;`,
      [channel_id],
    );

    return res.rows[0];
  });
};

export const readRecord = (params: DbReadRecordParams): Promise<DbTransaction[]> => {
  return db.transact(async (query: AppQuery) => {
    const { interval } = params;

    const channel_id = await getChannelId(params.username)(query);

    let res;
    if (interval.length > 1) {
      res = await query(
        `SELECT * FROM records
      JOIN transactions ON records.id = transactions.record_id
      WHERE channel_id = $1
      AND accounting_date BETWEEN $2 AND $3
      AND deleted_at IS NULL;`,
        [channel_id, interval[0], interval[1]],
      );
    } else {
      res = await query(
        `SELECT * FROM records
      JOIN transactions ON records.id = transactions.record_id
      WHERE channel_id = $1
      AND accounting_date = $2
      AND deleted_at IS NULL`,
        [channel_id, interval[0]],
      );
    }

    return res.rows;
  });
};
