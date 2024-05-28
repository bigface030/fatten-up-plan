import { checkDbVersion } from './db';

function prompt() {
  process.stdout.write('> ');
}

prompt();

process.stdin.setEncoding('utf-8');

process.stdin.on('data', async (data: string) => {
  const input = data.trim();

  if (input === '.version') {
    const result = await checkDbVersion();
    console.log(`DB version: ${result}`);
  }

  prompt();
});
