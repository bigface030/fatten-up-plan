import * as db from '../../db';
import {
  DbCreateRecordParams,
  DbDeleteRecordParams,
  DbReadRecordParams,
  DbTransaction,
} from './types';

export const createRecords = (paramsList: DbCreateRecordParams[]): Promise<DbTransaction[]> => {
  return db.transact(async (query) => {
    const results = [];
    let transaction_order = paramsList.length > 1 ? 1 : null;

    for (const params of paramsList) {
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
        `INSERT INTO records (channel_id, activity, description, created_by, transaction_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;`,
        [channel_id, activity, description, username, transaction_order],
      );

      const transaction = await query(
        `INSERT INTO transactions (record_id, username, amount, customized_classification, customized_tag)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;`,
        [record.rows[0].id, username, amount, customized_classification, customized_tag],
      );

      results.push({ ...record.rows[0], ...transaction.rows[0] });

      transaction_order && transaction_order++;
    }

    return results;
  });
};

export const deleteLatestRecord = async (
  params: DbDeleteRecordParams,
): Promise<DbTransaction | undefined> => {
  const { channel_id } = params;

  const res = await db.query(
    `WITH updated_record AS (
      UPDATE records
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = (
        SELECT id
        FROM records
        WHERE channel_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC, transaction_order DESC
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

export const readRecords = async (params: DbReadRecordParams): Promise<DbTransaction[]> => {
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
