import 'dotenv/config';
import { readFileSync } from 'fs';

import db, { checkDbVersion } from './db';
import {
  CreateRecordParams,
  ReadRecordParams,
  TagConfig,
  Request,
  DbTransaction,
  ReadBalanceResult,
  DefaultDateInterval,
  ReadStatementResult,
} from './types';
import { ACTIONS, COMMANDS, DEFAULT_DATE_INTERVALS } from './constants';
import { Entries } from './utils/type';
import { add } from './utils/decimal';
import { datesFor, isValidDateString } from './dateUtils';

const channel_id = process.env.DB_TEST_CHANNEL_ID as string;
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

const createRecord = async (params: CreateRecordParams) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const res = await client.query(
      `INSERT INTO records (channel_id, activity, description, created_by)
          VALUES ($1, $2, $3, $4)
          RETURNING id;`,
      [channel_id, params.activity, params.description, username],
    );

    await client.query(
      `INSERT INTO transactions (record_id, username, amount, customized_classification, customized_tag)
          VALUES ($1, $2, $3, $4, $5);`,
      [
        res.rows[0].id,
        username,
        params.amount,
        params.customized_classification,
        params.customized_tag,
      ],
    );

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

const deleteRecord = () => {
  return db.query(
    `UPDATE records
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = (
      SELECT id
      FROM records
      WHERE channel_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    );`,
    [channel_id],
  );
};

const readRecord = async (params: ReadRecordParams): Promise<DbTransaction[]> => {
  const { interval } = params;

  let res;
  if (interval.length > 1) {
    res = await db.query(
      `SELECT * FROM records
      JOIN transactions ON records.id = transactions.record_id
      WHERE accounting_date BETWEEN $1 AND $2
      AND deleted_at IS NULL`,
      [interval[0], interval[1]],
    );
  } else {
    res = await db.query(
      `SELECT * FROM records
      JOIN transactions ON records.id = transactions.record_id
      WHERE accounting_date = $1
      AND deleted_at IS NULL`,
      [interval[0]],
    );
  }
  return res.rows;
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
    const { accounting_date, activity, customized_tag, amount } = record;
    if (!result[accounting_date]) {
      result[accounting_date] = [{ activity, customized_tag, amount }];
    } else {
      result[accounting_date].push({ activity, customized_tag, amount });
    }
  });

  return result;
};

function displayBalance(params: ReadRecordParams, result: ReadBalanceResult) {
  const _params = {
    date: params.interval || [],
  };

  const res: Record<string, string> = {};
  for (const [prop, value] of Object.entries(result) as Entries<typeof result>) {
    const propName = localization[prop];
    res[propName] = value.toString();
  }
  for (const [prop, value] of Object.entries(_params) as Entries<typeof _params>) {
    const propName = localization[prop];
    res[propName] = value.toString();
  }

  console.log(res);
}

function displayStatement(result: ReadStatementResult) {
  for (const [date, recordArr] of Object.entries(result)) {
    console.log(date);
    for (const { activity, amount, customized_tag } of recordArr) {
      console.log(`${localization[activity]} ${customized_tag} ${amount}`);
    }
  }
}

prompt();

process.stdin.setEncoding('utf-8');

process.stdin.on('data', async (data: string) => {
  const args = data.replace(/\s+/g, ' ').trim().split(' ');

  if (args[0] === '.version') {
    const version = await checkDbVersion();
    console.log(`DB version: ${version}`);
    return prompt();
  }

  const req = validateInput(args);
  if (req.status === 'failed') {
    console.log(req.msg);
    return prompt();
  }

  const { type, params } = req.body;
  if (type === 'create') {
    await createRecord(params);
    console.log('Successfully create!');
  } else if (type === 'delete') {
    await deleteRecord();
    console.log('Successfully delete!');
  } else if (type === 'read') {
    const { action } = req.body;
    const records = await readRecord(params);
    if (action === 'read_balance') {
      const result = operateReadBalance(records);
      displayBalance(params, result);
    } else if (action === 'read_statement') {
      const result = operateReadStatement(records);
      displayStatement(result);
    }
  }

  return prompt();
});
