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

export type CustomizedMessage =
  | CreateTransactionPayload
  | DeleteRecordPayload
  | ReadRecordPayload<Action>;

export interface CustomizedMessageRequest {
  tokenGroups: string[][];
  userId: string;
}

export interface CustomizedGroupMessageRequest extends CustomizedMessageRequest {
  groupId: string;
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

export interface CreateRecordResponse {
  type: 'create';
  result: TransactionSummary[];
}

export interface DeleteRecordResponse {
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

export type ReadRecordResponse = ReadBalanceResponse | ReadStatementResponse;

export type SuccessfulResponseBody =
  | CreateRecordResponse
  | DeleteRecordResponse
  | ReadRecordResponse;

type SuccessfulResponse = {
  status: 'success';
  body: SuccessfulResponseBody;
};

type FailedResponse = {
  status: 'failed';
  msg: string;
};

export type CustomizedMessageResponse = SuccessfulResponse | FailedResponse;

export type DefaultDateInterval = (typeof DEFAULT_DATE_INTERVALS)[number];

export const isCreateMsg = (msg: CustomizedMessage): msg is CreateTransactionPayload => {
  return msg.type === 'create';
};
