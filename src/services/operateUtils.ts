import { TransactionSummary, TransferSummary } from '@repositories/record/types';

import { ReadBalanceResult, ReadSettlementResult, ReadStatementResult } from './types';
import { add } from './decimalUtils';

export const operateReadBalance = (records: TransactionSummary[]): ReadBalanceResult => {
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

export const operateReadStatement = (records: TransactionSummary[]): ReadStatementResult => {
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

export const operateReadSettlement = (
  splitList: TransferSummary['splits'][],
): ReadSettlementResult => {
  const totals: Record<string, number> = {};
  for (const splits of splitList) {
    for (const { username, amount } of splits) {
      if (totals[username]) {
        totals[username] += amount;
      } else {
        totals[username] = amount;
      }
    }
  }

  const receivers = Object.entries(totals)
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);

  const payers = Object.entries(totals)
    .filter(([, amount]) => amount < 0)
    .sort((a, b) => a[1] - b[1]);

  const payments: ReadSettlementResult['payments'] = [];
  while (receivers.length > 0 && payers.length > 0) {
    const [receiver, receiveAmount] = receivers.shift() as [string, number];
    const [payer, payAmount] = payers.shift() as [string, number];
    if (receiveAmount > -payAmount) {
      payments.push({ payer, receiver, amount: -payAmount });
      receivers.unshift([receiver, receiveAmount + payAmount]);
    } else if (receiveAmount < -payAmount) {
      payments.push({ payer, receiver, amount: receiveAmount });
      payers.unshift([payer, receiveAmount + payAmount]);
    } else {
      payments.push({ payer, receiver, amount: receiveAmount });
    }
  }

  return { totals, payments };
};
