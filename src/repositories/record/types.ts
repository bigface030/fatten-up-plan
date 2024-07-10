import { UUID } from 'crypto';

export type TransactionActivity = 'expenditure' | 'income';
export type TransferActivity = 'transfer';
type Activity = TransactionActivity & TransferActivity;

interface DbRecord {
  id: UUID;
  channel_id: UUID;
  accounting_date: string; // 2024-05-31
  activity: Activity;
  description: string | null;
  created_at: string | null;
  deleted_at: string | null;
  created_by: string | null;
  deleted_by: string | null;
  transaction_order: number | null;
}

export interface DbTransaction extends DbRecord {
  // record_id: UUID;
  username: string;
  amount: number;
  customized_classification: string | null;
  customized_tag: string | null;
}

export interface DbSplit extends DbRecord, Split {
  // record_id: UUID;
}

export interface DbTransfer extends DbRecord {
  splits: Split[];
}

interface Split {
  username: string;
  amount: number;
}

interface CreateRecordParams<T> {
  activity: T;
  description?: string;
}

export interface CreateTransactionParams extends CreateRecordParams<TransactionActivity> {
  amount: number;
  customized_tag?: string;
  customized_classification?: string | null;
  splits?: Split[];
}

export interface CreateTransferParams extends CreateRecordParams<TransferActivity> {
  splits: Split[];
}

export interface DeleteRecordParams {
  activity?: Activity;
}

export interface ReadRecordParams {
  interval: string[];
}

interface DbCommonParams {
  channel_id: UUID;
  username: string;
}

export type DbCreateTransactionParams = CreateTransactionParams & DbCommonParams;
export type DbCreateTransferParams = CreateTransferParams & DbCommonParams;
export type DbDeleteRecordParams = DeleteRecordParams & DbCommonParams;
export type DbReadRecordParams = ReadRecordParams & DbCommonParams;
