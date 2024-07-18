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
import { ACTIVITIES } from '@db/constants';

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
            RETURNING *, transactions.username AS transaction_username, transactions.amount AS transaction_amount;`,
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
          username: transaction.transaction_username,
          amount: transaction.transaction_amount,
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
                RETURNING *, splits.username AS split_username, splits.amount AS split_amount;`,
              [record.id, split.username, split.amount],
            ).then((res) => res.rows[0]),
          ),
        );

        return {
          id: record.id,
          accounting_date: record.accounting_date,
          activity: record.activity,
          description: record.description || '',
          splits: _splits.map(({ split_username, split_amount }) => ({
            username: split_username,
            amount: split_amount,
          })),
        };
      }),
    );
  });
};

export const deleteLatestRecord = async (
  params: DbDeleteRecordParams,
): Promise<TransactionSummary | TransferSummary | undefined> => {
  const { channel_id, username, activity } = params;

  const records = await db
    .query<DbRecord & DbTransaction & DbSplit>(
      `WITH updated_record AS (
          UPDATE records
          SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
          WHERE id = (
            SELECT id
            FROM records
            WHERE channel_id = $2 AND deleted_at IS NULL AND (activity = $3 OR $3 IS NULL)
            ORDER BY created_at DESC, transaction_order DESC
            LIMIT 1
          )
          RETURNING *
        )
        SELECT
          *,
          transactions.username AS transaction_username,
          transactions.amount AS transaction_amount,
          splits.username AS split_username,
          splits.amount AS split_amount
        FROM updated_record
        LEFT JOIN transactions ON updated_record.id = transactions.record_id AND updated_record.activity IN ($4, $5)
        LEFT JOIN splits ON updated_record.id = splits.record_id AND updated_record.activity = $6;`,
      [username, channel_id, activity, ...ACTIVITIES],
    )
    .then((res) => res.rows);

  const [record] = records;

  if (!record) return undefined;

  if (record.activity === 'expenditure' || record.activity === 'income') {
    return {
      id: record.id,
      accounting_date: record.accounting_date,
      activity: record.activity,
      description: record.description || '',
      username: record.transaction_username,
      amount: record.transaction_amount,
      customized_classification: record.customized_classification || '',
      customized_tag: record.customized_tag || '',
    };
  }

  if (record.activity === 'transfer') {
    return {
      id: record.id,
      accounting_date: record.accounting_date,
      activity: record.activity,
      description: record.description || '',
      splits: records.map(({ split_username, split_amount }) => ({
        username: split_username,
        amount: split_amount,
      })),
    };
  }

  return undefined;
};

export const readRecords = async (params: DbReadRecordParams): Promise<TransactionSummary[]> => {
  const { channel_id, interval } = params;

  const records = await db
    .query<DbRecord & DbTransaction>(
      `SELECT *, transactions.username AS transaction_username, transactions.amount AS transaction_amount FROM records
        JOIN transactions ON records.id = transactions.record_id
        WHERE channel_id = $1
        AND deleted_at IS NULL
        AND (
          accounting_date BETWEEN $2 AND $3
          OR
          accounting_date = $2
        );`,
      [channel_id, interval[0], interval[1]],
    )
    .then((res) => res.rows);

  return records.map((record) => ({
    id: record.id,
    accounting_date: record.accounting_date,
    activity: record.activity,
    description: record.description || '',
    username: record.transaction_username,
    amount: record.transaction_amount,
    customized_classification: record.customized_classification || '',
    customized_tag: record.customized_tag || '',
  }));
};

export const readTransfers = async (params: DbReadRecordParams): Promise<TransferSummary[]> => {
  const { channel_id, interval } = params;

  const splitRecords = await db
    .query<DbRecord & DbSplit>(
      `SELECT *, splits.username AS split_username, splits.amount AS split_amount FROM records
        JOIN splits ON records.id = splits.record_id
        WHERE channel_id = $1
        AND deleted_at IS NULL
        AND (
          accounting_date BETWEEN $2 AND $3
          OR
          accounting_date = $2
        );`,
      [channel_id, interval[0], interval[1]],
    )
    .then((res) => res.rows);

  const allocations = groupBy(splitRecords, (row) => row.id);

  const result: TransferSummary[] = [...allocations].map(([id, records]) => ({
    id,
    accounting_date: records[0].accounting_date,
    activity: records[0].activity,
    description: records[0].description || '',
    splits: records.map(({ split_username, split_amount }) => ({
      username: split_username,
      amount: split_amount,
    })),
  }));

  return result;
};
