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

const createRecord = async (params: CreateRecordParams): Promise<DbTransaction> => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const record = await client.query(
      `INSERT INTO records (channel_id, activity, description, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *;`,
      [channel_id, params.activity, params.description, username],
    );

    const transaction = await client.query(
      `INSERT INTO transactions (record_id, username, amount, customized_classification, customized_tag)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;`,
      [
        record.rows[0].id,
        username,
        params.amount,
        params.customized_classification,
        params.customized_tag,
      ],
    );

    await client.query('COMMIT');

    return { ...record.rows[0], ...transaction.rows[0] };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

const deleteRecord = async (): Promise<DbTransaction> => {
  const res = await db.query(
    `UPDATE records
    SET deleted_at = CURRENT_TIMESTAMP
    FROM transactions
    WHERE id = (
      SELECT id
      FROM records
      WHERE channel_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    )
    RETURNING *;`,
    [channel_id],
  );
  return res.rows[0];
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

function displayBalance(params: ReadRecordParams, result: ReadBalanceResult) {
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
    const record = await createRecord(params);
    console.log('新增成功');
    displayRecords([record]);
  } else if (type === 'delete') {
    const record = await deleteRecord();
    console.log('刪除成功');
    displayRecords([record]);
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
