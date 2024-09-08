import { dictionary, intervals, tags } from '@utils/fileUtils';
import { CustomizedError } from '@utils/exceptions';

import { ACTIONS, COMMANDS, DEFAULT_DATE_INTERVALS } from './constants';
import { formatDate, formatDefaultDateInterval, isValidDateString } from './dateUtils';
import { CustomizedMessage } from './types';
import { isActivity, isTransactionActivity } from './utils';

const validateDeleteCommand = (args: string[]): CustomizedMessage => {
  const [, ...params] = args;

  if (params.length > 1) throw new CustomizedError('user_error_invalid_params_length');

  if (params.length === 0) {
    return { action: 'delete_latest', params: {} };
  }

  const activityInput = params[0];
  const activity = dictionary[activityInput];
  if (!isActivity(activity)) throw new CustomizedError('user_error_invalid_params_value');

  return {
    action: 'delete_latest',
    params: { activity },
  };
};

const validateReadCommand = (args: string[]): CustomizedMessage => {
  const [command, ...params] = args;

  if (params.length < 1 || params.length > 2)
    throw new CustomizedError('user_error_invalid_params_length');

  if (DEFAULT_DATE_INTERVALS.includes(intervals[params[0]])) {
    if (params.length > 1) throw new CustomizedError('user_error_invalid_params_length');

    return {
      action: ACTIONS[dictionary[command]],
      params: {
        interval: formatDefaultDateInterval(intervals[params[0]]),
      },
    };
  }

  if (!params.every(isValidDateString))
    throw new CustomizedError('user_error_invalid_params_value');

  return {
    action: ACTIONS[dictionary[command]],
    params: {
      interval: params.map(formatDate),
    },
  };
};

const validateFullyCreateCommand = (args: string[]): CustomizedMessage => {
  const [command, ...params] = args;

  if (params.length < 3 || params.length > 4)
    throw new CustomizedError('user_error_invalid_params_length');

  const [dateString] = params;
  if (!isValidDateString(dateString)) throw new CustomizedError('user_error_invalid_params_value');

  const customized_tag = params[1];
  if (!tags[customized_tag]) throw new CustomizedError('user_error_invalid_params_value');
  const activity = tags[customized_tag].transaction_type;
  const _activity = dictionary[activity];
  if (!isTransactionActivity(_activity)) throw new CustomizedError('admin_error_config_setting');
  if (activity !== command) throw new CustomizedError('user_error_invalid_params_value');

  const amount = Math.abs(Number(params[2]));
  if (isNaN(amount)) throw new CustomizedError('user_error_invalid_params_value');

  return {
    action: 'create_transaction',
    params: {
      activity: _activity,
      customized_tag,
      customized_classification: tags[customized_tag].classification,
      amount,
      description: params[3],
      accounting_date: formatDate(dateString),
    },
  };
};

const validateSimplyCreateCommand = (args: string[]): CustomizedMessage => {
  const [command, ...params] = args;

  if (!tags[command]) throw new CustomizedError('user_error_invalid_command');

  if (params.length < 1 || params.length > 2)
    throw new CustomizedError('user_error_invalid_params_length');

  const amount = Math.abs(Number(params[0]));
  if (isNaN(amount)) throw new CustomizedError('user_error_invalid_params_value');

  const activity = tags[command].transaction_type;
  const _activity = dictionary[activity];
  if (!isTransactionActivity(_activity)) throw new CustomizedError('admin_error_config_setting');

  return {
    action: 'create_transaction',
    params: {
      activity: _activity,
      customized_tag: command,
      customized_classification: tags[command].classification,
      amount,
      description: params[1],
    },
  };
};

const validateTransferCommand = (args: string[]): CustomizedMessage => {
  const [, ...params] = args;

  if (params.length < 1 || params.length > 2)
    throw new CustomizedError('user_error_invalid_params_length');

  const amount = Math.abs(Number(params[0]));
  if (isNaN(amount)) throw new CustomizedError('user_error_invalid_params_value');

  return {
    action: 'create_transfer',
    params: {
      activity: 'transfer',
      amount,
      receiver_id: params[1],
    },
  };
};

type Condition = (command: string) => boolean;
type Validation = (args: string[]) => CustomizedMessage;
export type ValidationRules = Map<Condition, Validation>;

export const validationRules: ValidationRules = new Map([
  [(command) => command === COMMANDS.DELETE_LATEST, validateDeleteCommand],
  [(command) => [COMMANDS.LOOK_UP, COMMANDS.CHECK_DETAIL].includes(command), validateReadCommand],
  [
    (command) => [COMMANDS.EXPENDITURE, COMMANDS.INCOME].includes(command),
    validateFullyCreateCommand,
  ],
  [() => true, validateSimplyCreateCommand],
]);

export const groupValidationRules: ValidationRules = new Map([
  [(command) => command === COMMANDS.DELETE_LATEST, validateDeleteCommand],
  [
    (command) => [COMMANDS.LOOK_UP, COMMANDS.CHECK_DETAIL, COMMANDS.SETTLE_UP].includes(command),
    validateReadCommand,
  ],
  [
    (command) => [COMMANDS.EXPENDITURE, COMMANDS.INCOME].includes(command),
    validateFullyCreateCommand,
  ],
  [(command) => command === COMMANDS.TRANSFER, validateTransferCommand],
  [() => true, validateSimplyCreateCommand],
]);

export const createInputValidator = (rules: ValidationRules) => (args: string[]) => {
  const [command] = args;

  if (!dictionary[command] && !tags[command])
    throw new CustomizedError('user_error_invalid_command');

  for (const [isMatched, validate] of rules) {
    if (isMatched(dictionary[command])) return validate(args);
  }

  throw new CustomizedError('admin_error_no_rule_founded');
};
