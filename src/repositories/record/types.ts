import { Activity, TransactionActivity, TransferActivity } from '@db/type';
import { UUID } from 'crypto';

export interface TransactionSummary {
  id: UUID;
  accounting_date: string; // 2024-05-31
  activity: TransactionActivity;
  description: string;
  username: string;
  amount: number;
  customized_classification: string;
  customized_tag: string;
}

export interface TransferSummary {
  id: UUID;
  accounting_date: string; // 2024-05-31
  activity: TransferActivity;
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

interface DbCommonParams {
  channel_id: UUID;
  username: string;
}

export type DbCreateTransactionParams = DbCommonParams &
  CreateRecordParams<TransactionActivity> & {
    amount: number;
    customized_tag: string;
    customized_classification: string | null;
    accounting_date?: string;
    splits?: Split[];
  };

export type DbCreateTransferParams = DbCommonParams &
  CreateRecordParams<TransferActivity> & { splits: Split[] };

export type DbDeleteRecordParams = DbCommonParams & { activity?: Activity };

export type DbReadRecordParams = DbCommonParams & { interval: string[] };
