import { ChannelSummary } from '@repositories/channel/types';
import {
  CreateTransactionParams,
  DeleteRecordParams,
  ReadRecordParams,
  TransactionSummary,
} from '../repositories/record/types';
import { DEFAULT_DATE_INTERVALS } from './constants';

export interface CreateTransactionPayload {
  action: 'create_transaction';
  params: CreateTransactionParams;
}

interface DeleteRecordPayload {
  action: 'delete_latest';
  params: DeleteRecordParams;
}

export type Action = 'read_balance' | 'read_statement' | 'read_settlement';

interface ReadRecordPayload<T> {
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

export interface ReadSettlementResult {
  totals: Record<string, number>;
  payments: {
    payer: string;
    receiver: string;
    amount: number;
  }[];
}

interface CreateRecordResponse {
  action: 'create_transaction';
  result: TransactionSummary[];
}

interface DeleteRecordResponse {
  action: 'delete_latest';
  result?: TransactionSummary;
}

interface ReadBalanceResponse {
  action: 'read_balance';
  result: ReadBalanceResultWithParams;
}

interface ReadStatementResponse {
  action: 'read_statement';
  result: ReadStatementResult;
}

interface ReadSettlementResponse {
  action: 'read_settlement';
  result: ReadSettlementResult;
}

type ReadRecordResponse = ReadBalanceResponse | ReadStatementResponse | ReadSettlementResponse;

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
  return msg.action === 'create_transaction';
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
