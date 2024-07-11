import * as db from '../../db';
import {
  DbCreateTransactionParams,
  DbCreateTransferParams,
  DbDeleteRecordParams,
  DbReadRecordParams,
  TransferSummary,
  TransactionSummary,
} from './types';
import { groupBy } from './utils';
import { DbRecord, DbSplit, DbTransaction } from '@db/type';

export const createTransactions = (
  paramsList: DbCreateTransactionParams[],
): Promise<TransactionSummary[]> => {
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

        const record = await query<DbRecord>(
          `INSERT INTO records (channel_id, activity, description, created_by, transaction_order)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *;`,
          [channel_id, activity, description, username, transaction_order],
        ).then((res) => res.rows[0]);

        const transaction = await query<DbTransaction>(
          `INSERT INTO transactions (record_id, username, amount, customized_classification, customized_tag)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *;`,
          [record.id, username, amount, customized_classification, customized_tag],
        ).then((res) => res.rows[0]);

        if (splits && splits?.length > 0) {
          await Promise.all(
            splits.map((split) =>
              query(
                `INSERT INTO splits (record_id, username, amount)
                VALUES ($1, $2, $3);`,
                [record.id, split.username, split.amount],
              ),
            ),
          );
        }

        return {
          id: record.id,
          accounting_date: record.accounting_date,
          activity: record.activity,
          description: record.description || '',
          username: transaction.username,
          amount: transaction.amount,
          customized_classification: transaction.customized_classification || '',
          customized_tag: transaction.customized_tag || '',
        };
      }),
    );
  });
};

export const createTransfers = (
  paramsList: DbCreateTransferParams[],
): Promise<TransferSummary[]> => {
  if (!paramsList.every((params) => params.splits.length > 0))
    return Promise.reject('admin_error_zero_split_length');

  return db.transact(async (query) => {
    return Promise.all(
      paramsList.map(async (params, index) => {
        const { channel_id, activity, description, username, splits } = params;

        const transaction_order = paramsList.length > 1 ? index + 1 : null;

        const record = await query<DbRecord>(
          `INSERT INTO records (channel_id, activity, description, created_by, transaction_order)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *;`,
          [channel_id, activity, description, username, transaction_order],
        ).then((res) => res.rows[0]);

        const _splits = await Promise.all(
          splits.map((split) =>
            query<DbSplit>(
              `INSERT INTO splits (record_id, username, amount)
              VALUES ($1, $2, $3)
              RETURNING *;`,
              [record.id, split.username, split.amount],
            ).then((res) => res.rows[0]),
          ),
        );

        return {
          id: record.id,
          accounting_date: record.accounting_date,
          activity: record.activity,
          description: record.description || '',
          splits: _splits,
        };
      }),
    );
  });
};

export const deleteLatestRecord = async (
  params: DbDeleteRecordParams,
): Promise<TransactionSummary | undefined> => {
  const { channel_id, username, activity } = params;

  let record: DbRecord & DbTransaction;
  if (activity) {
    record = await db
      .query<DbRecord & DbTransaction>(
        `WITH updated_record AS (
        UPDATE records
        SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
        WHERE id = (
          SELECT id
          FROM records
          WHERE channel_id = $2 AND deleted_at IS NULL AND activity = $3
          ORDER BY created_at DESC, transaction_order DESC
          LIMIT 1
        )
        RETURNING *
      )
      SELECT * FROM updated_record
      JOIN transactions ON updated_record.id = transactions.record_id;`,
        [username, channel_id, activity],
      )
      .then((res) => res.rows[0]);
  } else {
    record = await db
      .query<DbRecord & DbTransaction>(
        `WITH updated_record AS (
        UPDATE records
        SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
        WHERE id = (
          SELECT id
          FROM records
          WHERE channel_id = $2 AND deleted_at IS NULL
          ORDER BY created_at DESC, transaction_order DESC
          LIMIT 1
        )
        RETURNING *
      )
      SELECT * FROM updated_record
      JOIN transactions ON updated_record.id = transactions.record_id;`,
        [username, channel_id],
      )
      .then((res) => res.rows[0]);
  }

  return {
    id: record.id,
    accounting_date: record.accounting_date,
    activity: record.activity,
    description: record.description || '',
    username: record.username,
    amount: record.amount,
    customized_classification: record.customized_classification || '',
    customized_tag: record.customized_tag || '',
  };
};

export const readRecords = async (params: DbReadRecordParams): Promise<TransactionSummary[]> => {
  const { channel_id, interval } = params;

  let records: (DbRecord & DbTransaction)[];
  if (interval.length > 1) {
    records = await db
      .query<DbRecord & DbTransaction>(
        `SELECT * FROM records
      JOIN transactions ON records.id = transactions.record_id
      WHERE channel_id = $1
      AND accounting_date BETWEEN $2 AND $3
      AND deleted_at IS NULL;`,
        [channel_id, interval[0], interval[1]],
      )
      .then((res) => res.rows);
  } else {
    records = await db
      .query<DbRecord & DbTransaction>(
        `SELECT * FROM records
      JOIN transactions ON records.id = transactions.record_id
      WHERE channel_id = $1
      AND accounting_date = $2
      AND deleted_at IS NULL`,
        [channel_id, interval[0]],
      )
      .then((res) => res.rows);
  }

  return records.map((record) => ({
    id: record.id,
    accounting_date: record.accounting_date,
    activity: record.activity,
    description: record.description || '',
    username: record.username,
    amount: record.amount,
    customized_classification: record.customized_classification || '',
    customized_tag: record.customized_tag || '',
  }));
};

export const readTransfers = async (params: DbReadRecordParams): Promise<TransferSummary[]> => {
  const { channel_id, interval } = params;

  let splitRecords: (DbRecord & DbSplit)[];
  if (interval.length > 1) {
    splitRecords = await db
      .query<DbRecord & DbSplit>(
        `SELECT * FROM records
      JOIN splits ON records.id = splits.record_id
      WHERE channel_id = $1
      AND accounting_date BETWEEN $2 AND $3
      AND deleted_at IS NULL;`,
        [channel_id, interval[0], interval[1]],
      )
      .then((res) => res.rows);
  } else {
    splitRecords = await db
      .query<DbRecord & DbSplit>(
        `SELECT * FROM records
      JOIN splits ON records.id = splits.record_id
      WHERE channel_id = $1
      AND accounting_date = $2
      AND deleted_at IS NULL`,
        [channel_id, interval[0]],
      )
      .then((res) => res.rows);
  }

  const allocations = groupBy(splitRecords, (row) => row.id);

  const result: TransferSummary[] = [];
  for (const [id, records] of allocations) {
    result.push({
      id: id,
      accounting_date: records[0].accounting_date,
      activity: records[0].activity,
      description: records[0].description || '',
      splits: records.map((record) => ({
        username: record.username,
        amount: record.amount,
      })),
    });
  }

  return result;
};
