import { DEFAULT_DATE_INTERVALS } from './constants';
import {
  CreateRecordParams,
  DbTransaction,
  DeleteRecordParams,
  ReadRecordParams,
} from './repositories/types';

export interface TagConfig {
  transaction_type: string;
  classification: string | null;
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

export interface ReadBalanceResult {
  expenditure: number;
  income: number;
  total: number;
}

export type ReadStatementResult = Record<string, DbTransaction[]>;

export type DefaultDateInterval = (typeof DEFAULT_DATE_INTERVALS)[number];
