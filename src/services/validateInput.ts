import { dictionary, intervals, tags } from '@utils/fileUtils';
import { CustomizedError } from '@utils/exceptions';

import { ACTIONS, COMMANDS, DEFAULT_DATE_INTERVALS } from './constants';
import { formatDate, formatDefaultDateInterval, isValidDateString } from './dateUtils';
import { CustomizedMessage, DeleteRecordPayload, ReadRecordPayload , Action} from './types';
import { isActivity, isTransactionActivity } from './utils';

const validateDeleteCommand = (args: string[]): DeleteRecordPayload => {
  const [, ...commandParams] = args;

  const messageParams = {} as DeleteRecordPayload['params'];

  if (commandParams.length > 1) throw new CustomizedError('user_error_invalid_params_length');

  if (commandParams.length === 1) {
    const activity = dictionary[commandParams[0]];
    if (!isActivity(activity)) throw new CustomizedError('user_error_invalid_params_value');
    messageParams.activity = activity;
  }

  return {
    action: 'delete_latest',
    params: messageParams,
  };
};

const validateReadCommand = (args: string[]): CustomizedMessage => {
  const [command, ...params] = args;

  if (params.length < 1 || params.length > 2)
    throw new CustomizedError('user_error_invalid_params_length');

  const messageParams = {} as ReadRecordPayload<Action>['params'];

  if (DEFAULT_DATE_INTERVALS.includes(intervals[params[0]])) {
    if (params.length > 1) throw new CustomizedError('user_error_invalid_params_length');
    messageParams.interval = formatDefaultDateInterval(intervals[params[0]])
  }

  if (params.every(isValidDateString)) {
    messageParams.interval = params.map(formatDate)
  } else {
    throw new CustomizedError('user_error_invalid_params_value');
  }

  return {
    action: ACTIONS[dictionary[command]],
    params: messageParams,
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
