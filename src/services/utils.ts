import { COMMANDS } from './constants';
import { Activity, TransactionActivity } from '@db/type';

export const isActivity = (cmd: string): cmd is Activity => {
  return [COMMANDS.EXPENDITURE, COMMANDS.INCOME, COMMANDS.TRANSFER].includes(cmd);
};

export const isTransactionActivity = (cmd: string): cmd is TransactionActivity => {
  return [COMMANDS.EXPENDITURE, COMMANDS.INCOME].includes(cmd);
};
