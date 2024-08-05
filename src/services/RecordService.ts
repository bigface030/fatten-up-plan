import { UUID } from 'crypto';

import { Action, CreateRecordResponse, DeleteRecordResponse, ReadRecordResponse } from './types';
import { operateReadBalance, operateReadStatement } from './operateUtils';
import { divide } from './decimalUtils';

import { createTransactions, deleteLatestRecord, readRecords } from '@repositories/record';
import {
  CreateTransactionParams,
  DeleteRecordParams,
  ReadRecordParams,
  TransactionSummary,
} from '@repositories/record/types';

interface RecordServiceParams {
  userId: string;
  channelId: UUID;
}

interface GroupRecordServiceParams extends RecordServiceParams {
  memberIds: string[];
}

export class RecordService {
  protected userId;
  protected channelId;

  constructor(params: RecordServiceParams) {
    const { userId, channelId } = params;
    this.userId = userId;
    this.channelId = channelId;
  }

  public async createRecords(paramsList: CreateTransactionParams[]): Promise<CreateRecordResponse> {
    const createTransactionParamsList = paramsList.map((params) => ({
      ...params,
      username: this.userId,
      channel_id: this.channelId,
    }));
    const records = await createTransactions(createTransactionParamsList);
    return { type: 'create', result: records };
  }

  public async deleteRecord(params: DeleteRecordParams): Promise<DeleteRecordResponse> {
    const deleteLatestRecordParams = {
      ...params,
      username: this.userId,
      channel_id: this.channelId,
    };
    const record = await deleteLatestRecord(deleteLatestRecordParams);
    return { type: 'delete', result: record as TransactionSummary | undefined };
  }

  public async readRecords(params: ReadRecordParams, action: Action): Promise<ReadRecordResponse> {
    const readRecordsParams = {
      ...params,
      username: this.userId,
      channel_id: this.channelId,
    };
    const records = await readRecords(readRecordsParams);
    const response: Record<Action, ReadRecordResponse> = {
      read_balance: {
        type: 'read',
        action: 'read_balance',
        result: { ...operateReadBalance(records), params },
      },
      read_statement: {
        type: 'read',
        action: 'read_statement',
        result: operateReadStatement(records),
      },
    };
    return response[action];
  }
}

export class GroupRecordService extends RecordService {
  protected memberIds;

  constructor(params: GroupRecordServiceParams) {
    super(params);
    const { memberIds } = params;
    this.memberIds = memberIds;
  }

  public createRecords(paramsList: CreateTransactionParams[]): Promise<CreateRecordResponse> {
    const _paramsList = paramsList.map((params) => {
      const amount = params.activity === 'expenditure' ? -params.amount : params.amount;
      const splitAmount = divide(amount, this.memberIds.length);
      return {
        ...params,
        splits: this.memberIds.map((userId) => ({
          username: userId,
          amount: userId === this.userId ? splitAmount - amount : splitAmount,
        })),
      };
    });
    return super.createRecords(_paramsList);
  }
}
