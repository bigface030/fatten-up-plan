import { UUID } from 'crypto';

import { operateReadBalance, operateReadSettlement, operateReadStatement } from './operateUtils';
import { divide } from './decimalUtils';

import {
  createTransactions,
  deleteLatestRecord,
  readRecords,
  readTransfers,
} from '@repositories/record';
import { TransactionSummary } from '@repositories/record/types';
import { CreateTransactionPayload, DeleteRecordPayload, ReadRecordPayload } from './types';

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

  public createRecords(paramsList: CreateTransactionPayload['params'][]) {
    const createTransactionParamsList = paramsList.map((params) => ({
      ...params,
      username: this.userId,
      channel_id: this.channelId,
    }));
    return createTransactions(createTransactionParamsList);
  }

  public async deleteRecord(params: DeleteRecordPayload['params']) {
    const deleteLatestRecordParams = {
      ...params,
      username: this.userId,
      channel_id: this.channelId,
    };
    const record = await deleteLatestRecord(deleteLatestRecordParams);
    return record as TransactionSummary | undefined;
  }

  public async readBalance(params: ReadRecordPayload<'read_balance'>['params']) {
    const readRecordsParams = {
      ...params,
      username: this.userId,
      channel_id: this.channelId,
    };
    const records = await readRecords(readRecordsParams);
    return operateReadBalance(records);
  }

  public async readStatement(params: ReadRecordPayload<'read_statement'>['params']) {
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

  public createRecords(paramsList: CreateTransactionPayload['params'][]) {
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

  public async readSettlement(params: ReadRecordPayload<'read_settlement'>['params']) {
    const readRecordsParams = {
      ...params,
      username: this.userId,
      channel_id: this.channelId,
    };
    const records = await readTransfers(readRecordsParams);
    const result = operateReadSettlement(records.map((record) => record.splits));

    return result;
  }
}
