import * as line from '@line/bot-sdk';

import { SYSTEM_COMMANDS } from './constants';
import { MessageHandlerSource, TagConfig } from './types';
import { dictionary, help, intervals, localization, tags } from '../utils/fileUtils';
import recordService from '../services';
import { DbTransaction } from '../repositories/record/types';
import { ReadBalanceResultWithParams, ReadStatementResult } from '../services/types';

const messageEventController = (event: line.MessageEvent) => {
  const msg = event.message as line.TextEventMessage;
  if (event.source.type === 'user') {
    return messageHandler({ text: msg.text, username: event.source.userId });
  }
  return 'invalid message event';
};

export const messageHandler = async (source: MessageHandlerSource): Promise<string> => {
  const { text, username } = source;

  const textInput = text.trim();

  switch (dictionary[textInput]) {
    case SYSTEM_COMMANDS.HELP: {
      return help;
    }
    case SYSTEM_COMMANDS.TAG: {
      return formatTags(classifyTags(tags));
    }
    case SYSTEM_COMMANDS.INTERVAL: {
      return Object.keys(intervals).join(', ');
    }
    default:
      break;
  }

  const tokenGroups = textInput
    .split('\n')
    .map((input) => input.trim().replace(/\s+/g, ' ').split(' '));

  const res = await recordService({ tokenGroups, username });

  if (res.status === 'failed') {
    return localization[res.msg] || res.msg;
  }

  const { type } = res.body;
  if (type === 'create') {
    return displayRecords(res.body.result, localization['create_success']);
  } else if (type === 'delete') {
    return displayRecords([res.body.result], localization['delete_success']);
  } else if (type === 'read') {
    const { action, result } = res.body;
    if (action === 'read_balance') {
      return displayBalance(result);
    } else if (action === 'read_statement') {
      return displayStatement(result);
    }
  }

  return 'invalid record type';
};

const classifyTags = (tags: Record<string, TagConfig>) => {
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

const formatTags = (result: Record<string, Record<string, string[]>>) => {
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

const displayRecords = (records: DbTransaction[], title: string) => {
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

const displayBalance = (result: ReadBalanceResultWithParams) => {
  const { expenditure, income, total, params } = result;
  const { interval } = params;

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

const displayStatement = (result: ReadStatementResult) => {
  const arr: string[] = [];

  for (const [accounting_date, recordArr] of Object.entries(result)) {
    arr.push(accounting_date);
    for (const { activity, amount, customized_tag } of recordArr) {
      arr.push(`${localization[activity]} ${customized_tag} $${amount}`);
    }
  }

  return arr.join('\n');
};

export default messageEventController;
