import { Activity, TransactionActivity, TransferActivity } from '@db/type';
import { UUID } from 'crypto';

export interface TransactionSummary {
  id: UUID;
  accounting_date: string; // 2024-05-31
  activity: Activity;
  description: string;
  username: string;
  amount: number;
  customized_classification: string;
  customized_tag: string;
}

export interface TransferSummary {
  id: UUID;
  accounting_date: string; // 2024-05-31
  activity: Activity;
  description: string;
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
  customized_tag: string;
  customized_classification: string | null;
  accounting_date?: string;
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
