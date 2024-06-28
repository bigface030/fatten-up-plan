import {
  CreateRecordPayload,
  CustomizedMessage,
  CustomizedMessageRequest,
  CustomizedMessageResponse,
  FailedRequest,
  ReadBalanceResult,
  ReadStatementResult,
  SuccessfulRequest,
  SuccessfulRequestBody,
} from './types';
import { add } from './decimalUtils';
import { createRecords, deleteLatestRecord, readRecords } from '../repositories/record';
import { DbTransaction } from '../repositories/record/types';
import { createChannel, readChannel } from '../repositories/channel';
import { UUID } from 'crypto';
import { validateInput } from './validateInput';

function isSuccessMsg(msg: CustomizedMessage): msg is SuccessfulRequest {
  return msg.status === 'success';
}

function isFailedMsg(msg: CustomizedMessage): msg is FailedRequest {
  return msg.status === 'failed';
}

function isCreateRecordBody(body: SuccessfulRequestBody): body is CreateRecordPayload {
  return body.type === 'create';
}

const recordService = async (
  request: CustomizedMessageRequest,
): Promise<CustomizedMessageResponse> => {
  const { tokenGroups, username } = request;

  if (tokenGroups.length > 5) {
    return { status: 'failed', msg: 'user_error_invalid_multi_line_length' };
  }

  const messages = tokenGroups.map(validateInput);

  const successMsgs = messages.filter(isSuccessMsg);
  const failedMsgs = messages.filter(isFailedMsg);

  if (failedMsgs.length > 0) {
    return failedMsgs[0];
  }

  if (successMsgs.length > 1 && !successMsgs.every((msg) => msg.body.type === 'create')) {
    return { status: 'failed', msg: 'user_error_invalid_multi_line_type' };
  }

  const [msg] = successMsgs;

  try {
    const { type, params } = msg.body;

    const channel_id = await getChannelId(username);

    if (type === 'create') {
      const createRecordParams = successMsgs
        .map((msg) => msg.body)
        .filter(isCreateRecordBody)
        .map((body) => ({ ...body.params, username, channel_id }));
      const records = await createRecords(createRecordParams);
      return { status: 'success', body: { type, result: records } };
    } else if (type === 'delete') {
      const record = await deleteLatestRecord({ ...params, username, channel_id });
      if (!record) return { status: 'failed', msg: 'no_records' };
      return { status: 'success', body: { type, result: record } };
    } else if (type === 'read') {
      const { action } = msg.body;
      const records = await readRecords({ ...params, username, channel_id });
      if (records.length === 0) {
        return { status: 'failed', msg: 'no_records' };
      } else if (action === 'read_balance') {
        return {
          status: 'success',
          body: { type, action, result: { ...operateReadBalance(records), params } },
        };
      } else if (action === 'read_statement') {
        return {
          status: 'success',
          body: { type, action, result: operateReadStatement(records) },
        };
      }
      return { status: 'failed', msg: 'admin_error_invalid_record_action' };
    }

    return { status: 'failed', msg: 'admin_error_invalid_record_type' };
  } catch (e) {
    console.error(e);
    return { status: 'failed', msg: 'db_error_sql_query_execution_failed' };
  }
};

const getChannelId = async (username: string): Promise<UUID> => {
  let [channel] = await readChannel({ username });
  if (!channel) {
    channel = await createChannel({ username });
  }
  return channel.id;
};

const operateReadBalance = (records: DbTransaction[]): ReadBalanceResult => {
  let expenditure_sum = 0,
    income_sum = 0;
  for (const { activity, amount } of records) {
    if (activity === 'expenditure') {
      expenditure_sum = add(expenditure_sum, amount);
    } else if (activity === 'income') {
      income_sum = add(income_sum, amount);
    }
  }

  return {
    expenditure: expenditure_sum,
    income: income_sum,
    total: income_sum - expenditure_sum,
  };
};

const operateReadStatement = (records: DbTransaction[]): ReadStatementResult => {
  const result: ReadStatementResult = {};

  records.forEach((record) => {
    const { accounting_date } = record;
    if (!result[accounting_date]) {
      result[accounting_date] = [record];
    } else {
      result[accounting_date].push(record);
    }
  });

  return result;
};

export default recordService;
