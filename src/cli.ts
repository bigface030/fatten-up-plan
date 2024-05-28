import 'dotenv/config';
import { readFileSync } from 'fs';

import db, { checkDbVersion } from './db';
import { CreateRecordPayload, TagConfig, ValidatedResponse } from './types';
import { COMMANDS } from './constants';

const channel_id = process.env.DB_TEST_CHANNEL_ID as string;
const username = process.env.DB_ADMIN_USERNAME as string;

function prompt() {
  process.stdout.write('> ');
}

const dictionary: Record<string, string> = JSON.parse(readFileSync('src/dictionary.json', 'utf-8'));

const tags: Record<string, TagConfig> = JSON.parse(readFileSync('src/tags.json', 'utf-8'));

const validateInput = (input: string): ValidatedResponse => {
  const args = input.split(' ');

  if (!dictionary[args[0]] && !tags[args[0]])
    return {
      status: 'failed',
      msg: 'Invalid command',
    };

  if (dictionary[args[0]] === COMMANDS.DELETE_LATEST)
    return {
      status: 'success',
      type: 'delete',
      payload: {},
    };

  if (!tags[args[0]])
    return {
      status: 'failed',
      msg: 'Invalid tag',
    };

  const activity = dictionary[tags[args[0]].transaction_type],
    customized_tag = args[0],
    customized_classification = tags[args[0]].classification,
    amount = Math.abs(Number(args[1]));

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
    type: 'create',
    payload: {
      activity,
      customized_tag,
      customized_classification,
      amount,
    },
  };
};

const createRecord = async (payload: CreateRecordPayload) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const res = await client.query(
      `INSERT INTO records (channel_id, activity, created_by)
          VALUES ($1, $2, $3)
          RETURNING id;`,
      [channel_id, payload.activity, username],
    );

    await client.query(
      `INSERT INTO transactions (record_id, username, amount, customized_classification, customized_tag)
          VALUES ($1, $2, $3, $4, $5);`,
      [
        res.rows[0].id,
        username,
        payload.amount,
        payload.customized_classification,
        payload.customized_tag,
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

prompt();

process.stdin.setEncoding('utf-8');

process.stdin.on('data', async (data: string) => {
  const input = data.replace(/\s+/g, ' ').trim();

  if (input === '.version') {
    const result = await checkDbVersion();
    console.log(`DB version: ${result}`);
    return prompt();
  }

  const result = validateInput(input);
  if (result.status === 'failed') return prompt();

  const { type, payload } = result;
  if (type === 'create') {
    await createRecord(payload);
    console.log('Successfully create!');
  } else if (type === 'delete') {
    await deleteRecord();
    console.log('Successfully delete!');
  }

  return prompt();
});
