import { Action } from './types';

export const COMMANDS = {
  EXPENDITURE: 'expenditure',
  INCOME: 'income',
  TRANSFER: 'transfer',
  DELETE_LATEST: 'delete_latest',
  LOOK_UP: 'look_up',
  CHECK_DETAIL: 'check_detail',
  SETTLE_UP: 'settle_up',
};

export const DEFAULT_DATE_INTERVALS = [
  'today',
  'yesterday',
  'this_week',
  'last_week',
  'this_month',
  'last_month',
  'this_year',
  'last_year',
] as const;

export const ACTIONS: Record<string, Action> = {
  [COMMANDS.LOOK_UP]: 'read_balance',
  [COMMANDS.CHECK_DETAIL]: 'read_statement',
  [COMMANDS.SETTLE_UP]: 'read_settlement',
};
