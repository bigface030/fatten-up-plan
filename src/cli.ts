import 'dotenv/config';
import { readFileSync } from 'fs';

import * as db from './db';
import {
  TagConfig,
  Request,
  ReadBalanceResult,
  DefaultDateInterval,
  ReadStatementResult,
} from './types';
import { ACTIONS, COMMANDS, DEFAULT_DATE_INTERVALS, SYSTEM_COMMANDS } from './constants';
import { add } from './utils/decimal';
import { datesFor, isValidDateString } from './dateUtils';
import { createRecord, deleteRecord, readRecord } from './repositories';
import { DbReadRecordParams, DbTransaction } from './repositories/types';

const username = process.env.DB_ADMIN_USERNAME as string;

function prompt() {
  process.stdout.write('> ');
}

const dictionary: Record<string, string> = JSON.parse(
  readFileSync('static/dictionary.json', 'utf-8'),
);

const tags: Record<string, TagConfig> = JSON.parse(readFileSync('static/tags.json', 'utf-8'));

const intervals: Record<string, DefaultDateInterval> = JSON.parse(
  readFileSync('static/intervals.json', 'utf-8'),
);

const localization: Record<string, string> = JSON.parse(
  readFileSync('static/localization.json', 'utf-8'),
);

const help = readFileSync('static/help.txt', 'utf-8');

const validateInput = (args: string[]): Request => {
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

const operateReadBalance = (records: DbTransaction[]): ReadBalanceResult => {
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

const operateReadStatement = (records: DbTransaction[]): ReadStatementResult => {
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

  const req = validateInput(args);
  if (req.status === 'failed') {
    console.log(req.msg);
    return prompt();
  }

  const { type, params } = req.body;
  if (type === 'create') {
    const record = await createRecord({ ...params, username });
    console.log('新增成功');
    displayRecords([record]);
  } else if (type === 'delete') {
    const record = await deleteRecord({ ...params, username });
    console.log('刪除成功');
    displayRecords([record]);
  } else if (type === 'read') {
    const { action } = req.body;
    const records = await readRecord({ ...params, username });
    if (records.length === 0) {
      console.log(localization['no_records']);
    } else if (action === 'read_balance') {
      const result = operateReadBalance(records);
      displayBalance({ ...params, username }, result);
    } else if (action === 'read_statement') {
      const result = operateReadStatement(records);
      displayStatement(result);
    }
  }

  return prompt();
});
