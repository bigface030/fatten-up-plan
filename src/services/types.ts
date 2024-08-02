import { ChannelSummary } from '@repositories/channel/types';
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

export interface CustomizedRecordRequest {
  tokenGroups: string[][];
  userId: string;
}

export interface CustomizedGroupRecordRequest extends CustomizedRecordRequest {
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

export type RecordResponseBody = CreateRecordResponse | DeleteRecordResponse | ReadRecordResponse;

export type RecordResponse = {
  type: 'record';
  body: RecordResponseBody;
};

type SuccessfulResponse<T> = { status: 'success' } & T;

type FailedResponse = {
  status: 'failed';
  msg: string;
};

export type CustomizedResponse<T> = SuccessfulResponse<T> | FailedResponse;

export type DefaultDateInterval = (typeof DEFAULT_DATE_INTERVALS)[number];

export const isCreateMsg = (msg: CustomizedMessage): msg is CreateTransactionPayload => {
  return msg.type === 'create';
};

export interface CustomizedChannelRequest {
  groupId: string;
  members?: string[];
  userId?: string;
}

export interface ChannelResponseBody {
  type: 'validate' | 'create';
  result: ChannelSummary & { members: string[] };
}

export interface ChannelResponse {
  type: 'channel';
  body: ChannelResponseBody;
}

export interface CustomizedMemberRequest {
  type: 'join' | 'leave';
  groupId: string;
  members: string[];
}

export interface MemberResponseBody {
  type: 'join' | 'leave';
  members: string[];
}

export interface MemberResponse {
  type: 'member';
  body: MemberResponseBody;
}
