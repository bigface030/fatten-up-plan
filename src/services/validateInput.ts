import { TransactionActivity } from '@db/type';
import { dictionary, intervals, tags } from '../utils/fileUtils';
import { ACTIONS, COMMANDS, DEFAULT_DATE_INTERVALS } from './constants';
import { formatDate, formatDefaultDateInterval, isValidDateString } from './dateUtils';
import { CustomizedMessage } from './types';

export const validateInput = (args: string[]): CustomizedMessage => {
  const [command, ...params] = args;

  if (!dictionary[command] && !tags[command])
    return {
      status: 'failed',
      msg: 'user_error_invalid_command',
    };

  if (dictionary[command] === COMMANDS.DELETE_LATEST) {
    if (params.length > 0) {
      return {
        status: 'failed',
        msg: 'user_error_invalid_params_length',
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

  if ([COMMANDS.LOOK_UP, COMMANDS.CHECK_DETAIL].includes(dictionary[command])) {
    if (params.length < 1 || params.length > 2) {
      return {
        status: 'failed',
        msg: 'user_error_invalid_params_length',
      };
    }
    if (DEFAULT_DATE_INTERVALS.includes(intervals[params[0]])) {
      if (params.length > 1) {
        return {
          status: 'failed',
          msg: 'user_error_invalid_params_length',
        };
      }
      return {
        status: 'success',
        body: {
          type: 'read',
          action: ACTIONS[dictionary[command]],
          params: {
            interval: formatDefaultDateInterval(intervals[params[0]]),
          },
        },
      };
    }
    if (!params.every(isValidDateString)) {
      return {
        status: 'failed',
        msg: 'user_error_invalid_params_value',
      };
    }
    return {
      status: 'success',
      body: {
        type: 'read',
        action: ACTIONS[dictionary[command]],
        params: {
          interval: params.map(formatDate),
        },
      },
    };
  }

  if ([COMMANDS.EXPENDITURE, COMMANDS.INCOME].includes(dictionary[command])) {
    if (params.length < 3 || params.length > 4) {
      return {
        status: 'failed',
        msg: 'user_error_invalid_params_length',
      };
    }
    const [dateString] = params;
    if (!isValidDateString(dateString)) {
      return {
        status: 'failed',
        msg: 'user_error_invalid_params_value',
      };
    }
    const customized_tag = params[1];
    if (!tags[customized_tag]) {
      return {
        status: 'failed',
        msg: 'user_error_invalid_params_value',
      };
    }
    const activity = dictionary[tags[customized_tag].transaction_type] as TransactionActivity;
    if (activity !== dictionary[command]) {
      return {
        status: 'failed',
        msg: 'user_error_invalid_params_value',
      };
    }
    const amount = Math.abs(Number(params[2]));
    if (isNaN(amount)) {
      return {
        status: 'failed',
        msg: 'user_error_invalid_params_value',
      };
    }
    return {
      status: 'success',
      body: {
        type: 'create',
        params: {
          activity,
          customized_tag,
          customized_classification: tags[customized_tag].classification,
          amount,
          description: params[3],
          accounting_date: formatDate(dateString),
        },
      },
    };
  }

  if (!tags[command])
    return {
      status: 'failed',
      msg: 'admin_error_invalid_tag',
    };

  if (params.length < 1 || params.length > 2)
    return {
      status: 'failed',
      msg: 'user_error_invalid_params_length',
    };

  const amount = Math.abs(Number(params[0]));
  if (isNaN(amount))
    return {
      status: 'failed',
      msg: 'user_error_invalid_params_value',
    };

  const activity = dictionary[tags[command].transaction_type] as TransactionActivity;
  if (![COMMANDS.EXPENDITURE, COMMANDS.INCOME].includes(activity))
    return {
      status: 'failed',
      msg: 'admin_error_config_setting',
    };

  return {
    status: 'success',
    body: {
      type: 'create',
      params: {
        activity,
        customized_tag: command,
        customized_classification: tags[command].classification,
        amount,
        description: params[1],
      },
    },
  };
};
