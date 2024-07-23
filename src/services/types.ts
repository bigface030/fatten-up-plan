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

interface DeleteRecordPayload {
  type: 'delete';
  params: DeleteRecordParams;
}

export type Action = 'read_balance' | 'read_statement';

interface ReadRecordPayload<T> {
  type: 'read';
  action: T;
  params: ReadRecordParams;
}

export type SuccessfulRequestBody =
  | CreateTransactionPayload
  | DeleteRecordPayload
  | ReadRecordPayload<Action>;

export type SuccessfulRequest = {
  status: 'success';
  body: SuccessfulRequestBody;
};

export interface FailedRequest {
  status: 'failed';
  msg: string;
}

export type CustomizedMessage = SuccessfulRequest | FailedRequest;

export interface CustomizedMessageRequest {
  tokenGroups: string[][];
  username: string;
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

type FailedResponse = FailedRequest;

export type CustomizedMessageResponse = SuccessfulResponse | FailedResponse;

export type DefaultDateInterval = (typeof DEFAULT_DATE_INTERVALS)[number];
