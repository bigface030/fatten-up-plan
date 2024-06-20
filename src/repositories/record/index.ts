import * as db from '../../db';
import {
  DbCreateRecordParams,
  DbDeleteRecordParams,
  DbReadRecordParams,
  DbTransaction,
} from './types';

export const createRecord = (params: DbCreateRecordParams): Promise<DbTransaction> => {
  return db.transact(async (query) => {
    const {
      channel_id,
      activity,
      description,
      username,
      amount,
      customized_classification,
      customized_tag,
    } = params;

    const record = await query(
      `INSERT INTO records (channel_id, activity, description, created_by)
    VALUES ($1, $2, $3, $4)
    RETURNING *;`,
      [channel_id, activity, description, username],
    );

    const transaction = await query(
      `INSERT INTO transactions (record_id, username, amount, customized_classification, customized_tag)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;`,
      [record.rows[0].id, username, amount, customized_classification, customized_tag],
    );

    return { ...record.rows[0], ...transaction.rows[0] };
  });
};

export const deleteRecord = async (params: DbDeleteRecordParams): Promise<DbTransaction> => {
  const { channel_id } = params;

  const res = await db.query(
    `WITH updated_record AS (
      UPDATE records
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = (
        SELECT id
        FROM records
        WHERE channel_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      )
      RETURNING *
    )
    SELECT * FROM updated_record
    JOIN transactions ON updated_record.id = transactions.record_id;`,
    [channel_id],
  );

  return res.rows[0];
};

export const readRecord = async (params: DbReadRecordParams): Promise<DbTransaction[]> => {
  const { channel_id, interval } = params;

  let res;
  if (interval.length > 1) {
    res = await db.query(
      `SELECT * FROM records
      JOIN transactions ON records.id = transactions.record_id
      WHERE channel_id = $1
      AND accounting_date BETWEEN $2 AND $3
      AND deleted_at IS NULL;`,
      [channel_id, interval[0], interval[1]],
    );
  } else {
    res = await db.query(
      `SELECT * FROM records
      JOIN transactions ON records.id = transactions.record_id
      WHERE channel_id = $1
      AND accounting_date = $2
      AND deleted_at IS NULL`,
      [channel_id, interval[0]],
    );
  }

  return res.rows;
};
