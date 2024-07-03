import * as db from '../../db';
import {
  DbCreateTransactionParams,
  DbCreateTransferParams,
  DbDeleteRecordParams,
  DbReadRecordParams,
  DbTransaction,
  DbTransfer,
} from './types';

export const createTransactions = (
  paramsList: DbCreateTransactionParams[],
): Promise<DbTransaction[]> => {
  return db.transact(async (query) => {
    return Promise.all(
      paramsList.map(async (params, index) => {
        const {
          channel_id,
          activity,
          description,
          username,
          amount,
          customized_classification,
          customized_tag,
          splits,
        } = params;

        const transaction_order = paramsList.length > 1 ? index + 1 : null;

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

        if (splits && splits?.length > 0) {
          await Promise.all(
            splits.map((split) =>
              query(
                `INSERT INTO splits (record_id, username, amount)
                VALUES ($1, $2, $3);`,
                [record.rows[0].id, split.username, split.amount],
              ),
            ),
          );
        }

        return { ...record.rows[0], ...transaction.rows[0] };
      }),
    );
  });
};

export const createTransfers = (paramsList: DbCreateTransferParams[]): Promise<DbTransfer[]> => {
  if (!paramsList.every((params) => params.splits.length > 0))
    return Promise.reject('admin_error_zero_split_length');

  return db.transact(async (query) => {
    return Promise.all(
      paramsList.map(async (params, index) => {
        const { channel_id, activity, description, username, splits } = params;

        const transaction_order = paramsList.length > 1 ? index + 1 : null;

        const record = await query(
          `INSERT INTO records (channel_id, activity, description, created_by, transaction_order)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *;`,
          [channel_id, activity, description, username, transaction_order],
        );

        const _splits = await Promise.all(
          splits.map((split) =>
            query(
              `INSERT INTO splits (record_id, username, amount)
              VALUES ($1, $2, $3)
              RETURNING *;`,
              [record.rows[0].id, split.username, split.amount],
            ),
          ),
        );

        return { ...record.rows[0], splits: _splits.map((split) => split.rows[0]) };
      }),
    );
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
