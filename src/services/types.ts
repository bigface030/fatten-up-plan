import { ChannelSummary } from '@repositories/channel/types';
import { TransactionSummary, TransferSummary } from '../repositories/record/types';
import { DEFAULT_DATE_INTERVALS } from './constants';
import { Activity, TransactionActivity, TransferActivity } from '@db/type';

export interface CreateTransactionPayload {
  action: 'create_transaction';
  params: {
    activity: TransactionActivity;
    description?: string;
    amount: number;
    customized_tag: string;
    customized_classification: string | null;
    accounting_date?: string;
  };
}

export interface CreateTransferPayload {
  action: 'create_transfer';
  params: {
    activity: TransferActivity;
    amount: number;
    receiver_id: string;
    description?: string;
    accounting_date?: string;
  };
}

export interface DeleteRecordPayload {
  action: 'delete_latest';
  params: { activity?: Activity };
}

export type Action = 'read_balance' | 'read_statement' | 'read_settlement';

export interface ReadRecordPayload<T> {
  action: T;
  params: { interval: string[] };
}

export type CustomizedMessage =
  | CreateTransactionPayload
  | CreateTransferPayload
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

export type ReadStatementResult = Record<string, TransactionSummary[]>;

export interface ReadSettlementResult {
  totals: Record<string, number>;
  payments: {
    payer: string;
    receiver: string;
    amount: number;
  }[];
}

export interface CreateTransactionResponse {
  action: 'create_transaction';
  result: TransactionSummary[];
}

export interface CreateTransferResponse {
  action: 'create_transfer';
  result: TransferSummary;
}

// TODO: add transfer
export interface DeleteRecordResponse {
  action: 'delete_latest';
  result?: TransactionSummary;
}

export interface ReadBalanceResponse {
  action: 'read_balance';
  result: ReadBalanceResult & { params: ReadRecordPayload<'read_balance'>['params'] };
}

export interface ReadStatementResponse {
  action: 'read_statement';
  result: ReadStatementResult;
}

export interface ReadSettlementResponse {
  action: 'read_settlement';
  result: ReadSettlementResult & { params: ReadRecordPayload<'read_settlement'>['params'] };
}

type CreateRecordResponse = CreateTransactionResponse | CreateTransferResponse;

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
