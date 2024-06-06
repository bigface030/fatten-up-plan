import { UUID } from 'crypto';
import { DEFAULT_DATE_INTERVALS } from './constants';

export interface TagConfig {
  transaction_type: string;
  classification: string | null;
}

export interface CreateRecordParams {
  activity: string;
  amount: number;
  description?: string;
  customized_tag?: string;
  customized_classification?: string | null;
}

export interface DeleteRecordParams {}

export interface ReadRecordParams {
  interval: string[];
}
interface CreateRecordPayload {
  type: 'create';
  params: CreateRecordParams;
}

interface DeleteRecordPayload {
  type: 'delete';
  params: DeleteRecordParams;
}

export type Action = 'read_balance' | 'read_statement';

interface ReadRecordPayload {
  type: 'read';
  action: Action;
  params: ReadRecordParams;
}

type SuccessfulRequest = {
  status: 'success';
  body: CreateRecordPayload | DeleteRecordPayload | ReadRecordPayload;
};

interface FailedRequest {
  status: 'failed';
  msg: string;
}

export type Request = SuccessfulRequest | FailedRequest;

interface DbRecord {
  id: UUID;
  channel_id: UUID;
  accounting_date: string; // 2024-05-31
  activity: 'expenditure' | 'income';
  description: string | null;
  created_at: string | null;
  deleted_at: string | null;
  created_by: string | null;
  deleted_by: string | null;
}

export interface DbTransaction extends DbRecord {
  // record_id: UUID;
  username: string;
  amount: number;
  customized_classification: string | null;
  customized_tag: string | null;
}

export interface ReadBalanceResult {
  expenditure: number;
  income: number;
  total: number;
}

export type ReadStatementResult = Record<string, DbTransaction[]>;

export type DefaultDateInterval = (typeof DEFAULT_DATE_INTERVALS)[number];
