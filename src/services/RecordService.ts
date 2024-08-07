import { UUID } from 'crypto';

import { ReadBalanceResultWithParams } from './types';
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

  public createRecords(paramsList: CreateTransactionParams[]) {
    const createTransactionParamsList = paramsList.map((params) => ({
      ...params,
      username: this.userId,
      channel_id: this.channelId,
    }));
    return createTransactions(createTransactionParamsList);
  }

  public async deleteRecord(params: DeleteRecordParams) {
    const deleteLatestRecordParams = {
      ...params,
      username: this.userId,
      channel_id: this.channelId,
    };
    const record = await deleteLatestRecord(deleteLatestRecordParams);
    return record as TransactionSummary | undefined;
  }

  public async readBalance(params: ReadRecordParams) {
    const readRecordsParams = {
      ...params,
      username: this.userId,
      channel_id: this.channelId,
    };
    const records = await readRecords(readRecordsParams);
    return { ...operateReadBalance(records), params } as ReadBalanceResultWithParams;
  }

  public async readStatement(params: ReadRecordParams) {
    const readRecordsParams = {
      ...params,
      username: this.userId,
      channel_id: this.channelId,
    };
    const records = await readRecords(readRecordsParams);
    return operateReadStatement(records);
  }
}

export class GroupRecordService extends RecordService {
  protected memberIds;

  constructor(params: GroupRecordServiceParams) {
    super(params);
    const { memberIds } = params;
    this.memberIds = memberIds;
  }

  public createRecords(paramsList: CreateTransactionParams[]) {
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
