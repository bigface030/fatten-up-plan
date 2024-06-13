import 'dotenv/config';

import * as db from './db';
import { TagConfig } from './types';
import { SYSTEM_COMMANDS } from './constants';
import { DbReadRecordParams, DbTransaction } from './repositories/types';
import messageService from './services';
import { dictionary, help, intervals, localization, tags } from './utils/fileUtils';
import { ReadBalanceResult, ReadStatementResult } from './services/types';

const username = process.env.DB_ADMIN_USERNAME as string;

function prompt() {
  process.stdout.write('> ');
}

function displayRecords(records: DbTransaction[]) {
  records.forEach(
    ({
      activity,
      customized_tag,
      amount,
      accounting_date,
      customized_classification,
      description,
    }) => {
      console.log(`${localization[activity]} ${customized_tag} $${amount}`);
      const title = [
        `${localization['date']}: ${accounting_date}`,
        `${localization['category']}: ${customized_classification || localization['null']}`,
        `${localization['description']}: ${description || localization['null']}`,
      ];
      console.log(title.join(', '));
    },
  );
}

function displayBalance(params: DbReadRecordParams, result: ReadBalanceResult) {
  const { interval } = params;

  const { expenditure, income, total } = result;
  const title = [
    `${localization['expenditure']}: $${expenditure}`,
    `${localization['income']}: $${income}`,
    `${localization['total']}: $${total}`,
  ];
  console.log(title.join(', '));
  const subtitle = [
    `${localization['date']}: ${interval.toString()}`,
    `${localization['category']}: ${localization['all']}`,
    `${localization['description']}: ${localization['all']}`,
  ];
  console.log(subtitle.join(', '));
}

function displayStatement(result: ReadStatementResult) {
  for (const [accounting_date, recordArr] of Object.entries(result)) {
    console.log(accounting_date);
    for (const { activity, amount, customized_tag } of recordArr) {
      console.log(`${localization[activity]} ${customized_tag} $${amount}`);
    }
  }
}

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

function printTags(result: Record<string, Record<string, string[]>>) {
  Object.entries(result).forEach(([transaction_type, { none, ...rest }], index) => {
    console.log(`${index + 1}. ${transaction_type}: `);
    if (none) {
      console.log(none.join(', '));
    }
    Object.entries(rest).forEach(([classification, tags], index) => {
      console.log(`(${index + 1}) ${classification}: `);
      console.log(tags.join(', '));
    });
  });
}

prompt();

process.stdin.setEncoding('utf-8');

process.stdin.on('data', async (data: string) => {
  const args = data.replace(/\s+/g, ' ').trim().split(' ');

  if (args[0] === '.version') {
    const version = await db.checkDbVersion();
    console.log(`DB version: ${version}`);
    return prompt();
  }

  if (Object.values(SYSTEM_COMMANDS).includes(dictionary[args[0]])) {
    switch (dictionary[args[0]]) {
      case SYSTEM_COMMANDS.HELP: {
        console.log(help);
        break;
      }
      case SYSTEM_COMMANDS.TAG: {
        const result = classifyTags(tags);
        printTags(result);
        break;
      }
      case SYSTEM_COMMANDS.INTERVAL: {
        const result = Object.keys(intervals).join(', ');
        console.log(result);
        break;
      }
      default:
        break;
    }

    return prompt();
  }

  const res = await messageService({ input: args, username });

  if (res.status === 'failed') {
    const output = localization[res.msg] || res.msg;
    console.log(output);
    return prompt();
  }

  const { type } = res.body;
  if (type === 'create') {
    console.log('新增成功');
    displayRecords([res.body.result]);
  } else if (type === 'delete') {
    console.log('刪除成功');
    displayRecords([res.body.result]);
  } else if (type === 'read') {
    const { params, action, result } = res.body;
    if (action === 'read_balance') {
      displayBalance({ ...params, username }, result);
    } else if (action === 'read_statement') {
      displayStatement(result);
    }
  }

  return prompt();
});
