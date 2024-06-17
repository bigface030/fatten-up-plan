import { dictionary, intervals, tags } from '../utils/fileUtils';
import { ACTIONS, COMMANDS, DEFAULT_DATE_INTERVALS } from './constants';
import { datesFor, isValidDateString } from './dateUtils';
import { CustomizedMessage } from './types';

export const validateInput = (args: string[]): CustomizedMessage => {
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
