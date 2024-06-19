import 'dotenv/config';

import { version as appVersion } from '../package.json';
import * as db from './db';
import { messageHandler } from './controllers';

const handleInput = (input: string) => {
  return messageHandler({ text: input, username: process.env.DB_ADMIN_USERNAME as string });
};

function prompt() {
  process.stdout.write('> ');
}

prompt();

process.stdin.setEncoding('utf-8');

process.stdin.on('data', async (data: string) => {
  const input = data.trim();

  if (input === '.version') {
    const dbVersion = await db.checkDbVersion();
    console.log(`App version: v${appVersion}, DB version: ${dbVersion}`);
    return prompt();
  }

  const result = await handleInput(input);
  console.log(result);

  return prompt();
});
