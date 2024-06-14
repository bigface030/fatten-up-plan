import 'dotenv/config';

import * as db from './db';
import { messageHandler } from './controllers';

const handleData = (data: string) => {
  return messageHandler({ text: data, username: process.env.DB_ADMIN_USERNAME as string });
};

function prompt() {
  process.stdout.write('> ');
}

prompt();

process.stdin.setEncoding('utf-8');

process.stdin.on('data', async (data: string) => {
  if (data === '.version') {
    const version = await db.checkDbVersion();
    console.log(`DB version: ${version}`);
    return prompt();
  }

  const result = await handleData(data);
  console.log(result);

  return prompt();
});
