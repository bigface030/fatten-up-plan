import { UUID } from 'crypto';
import { ACTIVITIES } from './constants';

export type TransactionActivity = (typeof ACTIVITIES)[0] | (typeof ACTIVITIES)[1];
export type TransferActivity = (typeof ACTIVITIES)[2];
export type Activity = TransactionActivity | TransferActivity;

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
  transaction_username: string;
  transaction_amount: number;
  customized_classification: string | null;
  customized_tag: string | null;
}

export interface DbSplit {
  record_id: UUID;
  split_username: string;
  split_amount: number;
}

export interface DbChannel {
  id: UUID;
  name: string;
  metadata: string | null;
  created_at: string | null;
  deleted_at: string | null;
  created_by: string | null;
  deleted_by: string | null;
}

export interface DbChannelMember {
  channel_id: UUID;
  username: string;
}
