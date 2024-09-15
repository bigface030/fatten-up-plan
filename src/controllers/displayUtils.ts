import * as line from '@line/bot-sdk';

import {
  CreateTransactionResponse,
  CreateTransferResponse,
  ReadBalanceResponse,
  ReadSettlementResponse,
  ReadStatementResponse,
} from '@services/types';
import { TagConfig } from './types';
import { localization } from '@utils/fileUtils';
import MessageApiClient from '@utils/messageApiClient';

export const classifyTags = (tags: Record<string, TagConfig>) => {
  const result: Record<string, Record<string, string[]>> = {};

  for (const [tag, { transaction_type, classification }] of Object.entries(tags)) {
    if (!result[transaction_type]) {
      result[transaction_type] = {};
    }
    if (!classification) {
      result[transaction_type]['none'] = result[transaction_type]?.['none']
        ? [...result[transaction_type]['none'], tag]
        : [tag];
    } else {
      result[transaction_type][classification] = result[transaction_type]?.[classification]
        ? [...result[transaction_type][classification], tag]
        : [tag];
    }
  }

  return result;
};

export const formatTags = (result: Record<string, Record<string, string[]>>) => {
  const arr: string[] = [];

  Object.entries(result).forEach(([transaction_type, { none, ...rest }], index) => {
    arr.push(`${index + 1}. ${transaction_type}: `);
    if (none) {
      arr.push(none.join(', '));
    }
    Object.entries(rest).forEach(([classification, tags], index) => {
      arr.push(`(${index + 1}) ${classification}: `);
      arr.push(tags.join(', '));
    });
  });

  return arr.join('\n');
};

export const displayTransferReocrd = async (
  record: CreateTransferResponse['result'],
  title: string,
  displayNameGetter: (userId: string) => Promise<string>,
) => {
  const arr = [title];

  const { splits, accounting_date, description } = record;
  const totalPromises = splits.map(async ({ username, amount }) => {
    const displayName = await displayNameGetter(username);
    const displayAmount = amount >= 0 ? `-$${amount}` : `+$${-amount}`;
    return `${displayName}: ${displayAmount}`;
  });
  const totalOutputs = await Promise.all(totalPromises);
  arr.push(totalOutputs.join(', '));

  const paramOutputs = [
    `${localization['date']}: ${accounting_date}`,
    `${localization['category']}: ${localization['all']}`,
    `${localization['description']}: ${description || localization['null']}`,
  ];
  arr.push(paramOutputs.join(', '));

  return arr.join('\n');
};

export const displayRecords = (records: CreateTransactionResponse['result'], title: string) => {
  if (records.length === 0) return localization['no_records'];

  const arr = [title];

  records.forEach(
    ({
      activity,
      customized_tag,
      amount,
      accounting_date,
      customized_classification,
      description,
    }) => {
      arr.push(`${localization[activity]} ${customized_tag} $${amount}`);
      const title = [
        `${localization['date']}: ${accounting_date}`,
        `${localization['category']}: ${customized_classification || localization['null']}`,
        `${localization['description']}: ${description || localization['null']}`,
      ];
      arr.push(title.join(', '));
    },
  );

  return arr.join('\n');
};

export const displayBalance = (result: ReadBalanceResponse['result']) => {
  const { expenditure, income, total, params } = result;
  const { interval } = params;

  if (expenditure === 0 && income === 0) return localization['no_records'];

  const arr: string[] = [];

  const title = [
    `${localization['expenditure']}: $${expenditure}`,
    `${localization['income']}: $${income}`,
    `${localization['total']}: $${total}`,
  ];
  arr.push(title.join(', '));
  const subtitle = [
    `${localization['date']}: ${interval.toString()}`,
    `${localization['category']}: ${localization['all']}`,
    `${localization['description']}: ${localization['all']}`,
  ];
  arr.push(subtitle.join(', '));

  return arr.join('\n');
};

export const displayStatement = (result: ReadStatementResponse['result']) => {
  const arr: string[] = [];

  if (Object.keys(result).length === 0) return localization['no_records'];

  for (const [accounting_date, recordArr] of Object.entries(result)) {
    arr.push(accounting_date);
    for (const { activity, amount, customized_tag } of recordArr) {
      arr.push(`${localization[activity]} ${customized_tag} $${amount}`);
    }
  }

  return arr.join('\n');
};

export const displaySettlement = async (
  result: ReadSettlementResponse['result'],
  displayNameGetter: (userId: string) => Promise<string>,
) => {
  const { totals, payments, params } = result;
  const { interval } = params;

  const arr: string[] = [];

  const totalPromises = Object.entries(totals).map(async ([userId, amount]) => {
    const displayName = await displayNameGetter(userId);
    const displayAmount = amount >= 0 ? `$${amount}` : `-$${-amount}`;
    return `${displayName}: ${displayAmount}`;
  });
  if (totalPromises.length === 0 && payments.length === 0) return localization['no_records'];
  const totalOutputs = await Promise.all(totalPromises);
  arr.push(totalOutputs.join(', '));

  const paymentPromises = payments.map(async ({ payer: payerId, receiver: receiverId, amount }) => {
    const payer = await displayNameGetter(payerId);
    const receiver = await displayNameGetter(receiverId);

    // TODO: localization
    return `${payer} 欠 ${receiver} $${amount} 元`;
  });
  if (paymentPromises.length === 0) {
    arr.push(localization['settled_up']);
  } else {
    const paymentOutputs = await Promise.all(paymentPromises);
    arr.push(paymentOutputs.join(', '));
  }

  const paramOutputs = [
    `${localization['date']}: ${interval.toString()}`,
    `${localization['category']}: ${localization['all']}`,
    `${localization['description']}: ${localization['all']}`,
  ];
  arr.push(paramOutputs.join(', '));

  return arr.join('\n');
};

const cache = new Map<string, string>();

export const createDisplayNameGetter = (groupId: string) => async (userId: string) => {
  const result = cache.get(userId);
  if (!result) {
    const displayName = await MessageApiClient.getGroupMemberProfile(groupId, userId)
      .then((res) => res.displayName)
      .catch((err) => {
        if (err instanceof line.HTTPFetchError && err.status === 404) return userId;
        throw err;
      });
    cache.set(userId, displayName);
    return displayName;
  }
  return result;
};
