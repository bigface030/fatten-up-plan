import {
  CreateTransactionPayload,
  CustomizedMessage,
  CustomizedMessageRequest,
  CustomizedMessageResponse,
  ReadBalanceResult,
  ReadStatementResult,
} from './types';
import { add } from './decimalUtils';
import { createTransactions, deleteLatestRecord, readRecords } from '../repositories/record';
import { validateInput } from './validateInput';
import { TransactionSummary } from '@repositories/record/types';
import { getChannelId } from './channelService';
import { CustomizedError } from '@utils/exceptions';

const MAXIMUM_TOKEN_GROUP_LENGTH = 5;

const recordService = async (
  request: CustomizedMessageRequest,
): Promise<CustomizedMessageResponse> => {
  try {
    const { tokenGroups, username, channelName } = request;

    if (tokenGroups.length > MAXIMUM_TOKEN_GROUP_LENGTH)
      throw new CustomizedError('user_error_invalid_multi_line_length');

    const messages = tokenGroups.map(validateInput);

    if (messages.length > 1 && !messages.every(isCreateMsg))
      throw new CustomizedError('user_error_invalid_multi_line_type');

    const [msg] = messages;

    const { type, params } = msg;

    const channel_id = await getChannelId(channelName, username);

    if (type === 'create') {
      const createTransactionParams = messages
        .filter(isCreateMsg)
        .map((body) => ({ ...body.params, username, channel_id }));
      const records = await createTransactions(createTransactionParams);
      return { status: 'success', body: { type, result: records } };
    } else if (type === 'delete') {
      const record = await deleteLatestRecord({ ...params, username, channel_id });
      return {
        status: 'success',
        body: { type, result: record as TransactionSummary | undefined },
      };
    } else if (type === 'read') {
      const { action } = msg;
      const records = await readRecords({ ...params, username, channel_id });
      if (action === 'read_balance') {
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
      throw new CustomizedError('admin_error_invalid_record_action');
    }

    throw new CustomizedError('admin_error_invalid_record_type');
  } catch (e) {
    if (e instanceof CustomizedError) {
      return { status: 'failed', msg: e.message };
    } else {
      console.error(e);
      return { status: 'failed', msg: 'db_error_sql_query_execution_failed' };
    }
  }
};

const isCreateMsg = (msg: CustomizedMessage): msg is CreateTransactionPayload => {
  return msg.type === 'create';
};

const operateReadBalance = (records: TransactionSummary[]): ReadBalanceResult => {
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

const operateReadStatement = (records: TransactionSummary[]): ReadStatementResult => {
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
