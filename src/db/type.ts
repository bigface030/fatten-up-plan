import { UUID } from 'crypto';

export type TransactionActivity = 'expenditure' | 'income';
export type TransferActivity = 'transfer';
export type Activity = TransactionActivity & TransferActivity;

export interface DbRecord {
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

export interface DbTransaction {
  record_id: UUID;
  username: string;
  amount: number;
  customized_classification: string | null;
  customized_tag: string | null;
}

export interface DbSplit {
  record_id: UUID;
  username: string;
  amount: number;
}
