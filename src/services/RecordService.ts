import { UUID } from 'crypto';

import {
  Action,
  CreateTransactionPayload,
  CustomizedMessageResponse,
  DeleteRecordPayload,
  ReadRecordPayload,
} from './types';
import { operateReadBalance, operateReadStatement } from './operateUtils';

import { createTransactions, deleteLatestRecord, readRecords } from '@repositories/record';
import { TransactionSummary } from '@repositories/record/types';

interface RecordServiceParams {
  userId: string;
  channelId: UUID;
}

export class RecordService {
  protected userId;
  protected channelId;

  constructor(params: RecordServiceParams) {
    const { userId, channelId } = params;
    this.userId = userId;
    this.channelId = channelId;
  }

  public createRecords = async (
    messages: CreateTransactionPayload[],
  ): Promise<CustomizedMessageResponse> => {
    const createTransactionParams = messages.map((body) => ({
      ...body.params,
      username: this.userId,
      channel_id: this.channelId,
    }));
    const records = await createTransactions(createTransactionParams);
    return { status: 'success', body: { type: 'create', result: records } };
  };

  public deleteRecord = async (
    message: DeleteRecordPayload,
  ): Promise<CustomizedMessageResponse> => {
    const { type, params } = message;
    const record = await deleteLatestRecord({
      ...params,
      username: this.userId,
      channel_id: this.channelId,
    });
    return {
      status: 'success',
      body: { type, result: record as TransactionSummary | undefined },
    };
  };

  public readRecords = async (
    message: ReadRecordPayload<Action>,
  ): Promise<CustomizedMessageResponse> => {
    const { type, params, action } = message;
    const records = await readRecords({
      ...params,
      username: this.userId,
      channel_id: this.channelId,
    });
    const response: Record<Action, CustomizedMessageResponse> = {
      read_balance: {
        status: 'success',
        body: { type, action: 'read_balance', result: { ...operateReadBalance(records), params } },
      },
      read_statement: {
        status: 'success',
        body: { type, action: 'read_statement', result: operateReadStatement(records) },
      },
    };
    return response[action];
  };
}
