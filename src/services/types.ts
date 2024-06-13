import {
  CreateRecordParams,
  DbTransaction,
  DeleteRecordParams,
  ReadRecordParams,
} from '../repositories/types';
import { DEFAULT_DATE_INTERVALS } from './constants';

interface CreateRecordPayload {
  type: 'create';
  params: CreateRecordParams;
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

type SuccessfulRequest = {
  status: 'success';
  body: CreateRecordPayload | DeleteRecordPayload | ReadRecordPayload<Action>;
};

interface FailedRequest {
  status: 'failed';
  msg: string;
}

export type CustomizedMessage = SuccessfulRequest | FailedRequest;

export interface CustomizedMessageRequest {
  input: string[];
  username: string;
}

export interface ReadBalanceResult {
  expenditure: number;
  income: number;
  total: number;
}

export type ReadStatementResult = Record<string, DbTransaction[]>;

export type CreateRecordResponse = CreateRecordPayload & { result: DbTransaction };
export type DeleteRecordResponse = DeleteRecordPayload & { result: DbTransaction };
export type ReadBalanceResponse = ReadRecordPayload<'read_balance'> & {
  result: ReadBalanceResult;
};
export type ReadStatementResponse = ReadRecordPayload<'read_statement'> & {
  result: ReadStatementResult;
};

type SuccessfulResponse = {
  status: 'success';
  body: CreateRecordResponse | DeleteRecordResponse | ReadBalanceResponse | ReadStatementResponse;
};

type FailedResponse = FailedRequest;

export type CustomizedMessageResponse = SuccessfulResponse | FailedResponse;

export type DefaultDateInterval = (typeof DEFAULT_DATE_INTERVALS)[number];
