import { datesFor, isValidDateString } from './dateUtils';
import { ACTIONS, COMMANDS, DEFAULT_DATE_INTERVALS } from './constants';
import {
  CustomizedMessage,
  CustomizedMessageRequest,
  CustomizedMessageResponse,
  ReadBalanceResult,
  ReadStatementResult,
} from './types';
import { add } from './decimalUtils';
import { createRecord, deleteRecord, readRecord } from '../repositories/record';
import { DbTransaction } from '../repositories/record/types';
import { dictionary, intervals, tags } from '../utils/fileUtils';
import { createChannel, readChannel } from '../repositories/channel';
import { UUID } from 'crypto';

const recordService = async (
  request: CustomizedMessageRequest,
): Promise<CustomizedMessageResponse> => {
  const msg = validateInput(request.input);
  if (msg.status === 'failed') {
    return msg;
  }

  try {
    const { type, params } = msg.body;
    const channel_id = await getChannelId(request.username);
    if (type === 'create') {
      const record = await createRecord({ ...params, username: request.username, channel_id });
      return { status: 'success', body: { type, params, result: record } };
    } else if (type === 'delete') {
      const record = await deleteRecord({ ...params, username: request.username, channel_id });
      return { status: 'success', body: { type, params, result: record } };
    } else if (type === 'read') {
      const { action } = msg.body;
      const records = await readRecord({ ...params, username: request.username, channel_id });
      if (records.length === 0) {
        return { status: 'failed', msg: 'no_records' };
      } else if (action === 'read_balance') {
        return {
          status: 'success',
          body: { type, params, action, result: operateReadBalance(records) },
        };
      } else if (action === 'read_statement') {
        return {
          status: 'success',
          body: { type, params, action, result: operateReadStatement(records) },
        };
      }
      return { status: 'failed', msg: 'invalid record action' };
    }

    return { status: 'failed', msg: 'invalid record type' };
  } catch (e) {
    console.error(e);
    return { status: 'failed', msg: 'sql query excuted error' };
  }
};

const validateInput = (args: string[]): CustomizedMessage => {
  if (!dictionary[args[0]] && !tags[args[0]])
    return {
      status: 'failed',
      msg: 'Invalid command',
    };

  if (dictionary[args[0]] === COMMANDS.DELETE_LATEST) {
    if (args.length > 1) {
      return {
        status: 'failed',
        msg: 'Invalid params length',
      };
    }
    return {
      status: 'success',
      body: {
        type: 'delete',
        params: {},
      },
    };
  }

  if ([COMMANDS.LOOK_UP, COMMANDS.CHECK_DETAIL].includes(dictionary[args[0]])) {
    const command = dictionary[args[0]];
    const params = args.slice(1);
    if (DEFAULT_DATE_INTERVALS.includes(intervals[params[0]])) {
      if (params.length > 1) {
        return {
          status: 'failed',
          msg: 'Invalid params length',
        };
      }
      return {
        status: 'success',
        body: {
          type: 'read',
          action: ACTIONS[command],
          params: {
            interval: datesFor(intervals[params[0]]),
          },
        },
      };
    }
    if (params.length < 1 || params.length > 2) {
      return {
        status: 'failed',
        msg: 'Invalid params length',
      };
    }
    if (!params.every(isValidDateString)) {
      return {
        status: 'failed',
        msg: 'Invalid params value',
      };
    }
    return {
      status: 'success',
      body: {
        type: 'read',
        action: ACTIONS[command],
        params: {
          interval: datesFor(params),
        },
      },
    };
  }

  if (!tags[args[0]])
    return {
      status: 'failed',
      msg: 'Invalid tag',
    };

  const activity = dictionary[tags[args[0]].transaction_type],
    customized_tag = args[0],
    customized_classification = tags[args[0]].classification,
    amount = Math.abs(Number(args[1])),
    description = args[2];

  if (args.length > 3) {
    return {
      status: 'failed',
      msg: 'Invalid params length',
    };
  }

  if (isNaN(amount))
    return {
      status: 'failed',
      msg: 'Invalid amount',
    };

  if (![COMMANDS.EXPENDITURE, COMMANDS.INCOME].includes(activity))
    return {
      status: 'failed',
      msg: 'Admin configs setting error',
    };

  return {
    status: 'success',
    body: {
      type: 'create',
      params: {
        activity,
        customized_tag,
        customized_classification,
        amount,
        description,
      },
    },
  };
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
