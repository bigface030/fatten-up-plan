import 'dotenv/config';
import express from 'express';
import { createServer } from 'https';
import { readFileSync } from 'fs';
import { checkDbVersion } from './db';

const app = express();
const port = process.env.PORT || 443;

const privateKey = readFileSync(process.env.SSL_PRIVATE_KEY as string, 'utf-8');
const certificate = readFileSync(process.env.SSL_CERTIFICATE as string, 'utf-8');
const credentials = { key: privateKey, cert: certificate };

app.get('/', (req, res) => {
  res.send('Hello world!');
});

app.get('/version', async (req, res) => {
  const result = await checkDbVersion();
  res.send(`DB version: ${result}`);
});

const server = createServer(credentials, app);

server.listen(port, () => {
  console.log(`> Ready on ${process.env.APP_SERVER_URL}`);
});
