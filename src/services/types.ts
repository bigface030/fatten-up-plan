import {
  CreateTransactionParams,
  DeleteRecordParams,
  ReadRecordParams,
  TransactionSummary,
} from '../repositories/record/types';
import { DEFAULT_DATE_INTERVALS } from './constants';

export interface CreateTransactionPayload {
  type: 'create';
  params: CreateTransactionParams;
}

export interface DeleteRecordPayload {
  type: 'delete';
  params: DeleteRecordParams;
}

export type Action = 'read_balance' | 'read_statement';

export interface ReadRecordPayload<T> {
  type: 'read';
  action: T;
  params: ReadRecordParams;
}

export type CustomizedMessage =
  | CreateTransactionPayload
  | DeleteRecordPayload
  | ReadRecordPayload<Action>;

export interface CustomizedMessageRequest {
  tokenGroups: string[][];
  userId: string;
  groupId?: string;
}

export interface ReadBalanceResult {
  expenditure: number;
  income: number;
  total: number;
}

export interface ReadBalanceResultWithParams extends ReadBalanceResult {
  params: ReadRecordParams;
}

export type ReadStatementResult = Record<string, TransactionSummary[]>;

interface CreateRecordResponse {
  type: 'create';
  result: TransactionSummary[];
}

interface DeleteRecordResponse {
  type: 'delete';
  result?: TransactionSummary;
}

interface ReadBalanceResponse {
  type: 'read';
  action: 'read_balance';
  result: ReadBalanceResultWithParams;
}

interface ReadStatementResponse {
  type: 'read';
  action: 'read_statement';
  result: ReadStatementResult;
}

type SuccessfulResponse = {
  status: 'success';
  body: CreateRecordResponse | DeleteRecordResponse | ReadBalanceResponse | ReadStatementResponse;
};

type FailedResponse = {
  status: 'failed';
  msg: string;
};

export type CustomizedMessageResponse = SuccessfulResponse | FailedResponse;

export type DefaultDateInterval = (typeof DEFAULT_DATE_INTERVALS)[number];
