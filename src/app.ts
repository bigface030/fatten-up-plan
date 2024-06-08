import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import https from 'https';
import { readFileSync } from 'fs';
import * as line from '@line/bot-sdk';

import { checkDbVersion } from './db';

const app = express();
const port = process.env.PORT || 443;

const privateKey = readFileSync(process.env.SSL_PRIVATE_KEY as string, 'utf-8');
const certificate = readFileSync(process.env.SSL_CERTIFICATE as string, 'utf-8');
const credentials = { key: privateKey, cert: certificate };

const config = {
  channelSecret: process.env.CHANNEL_SECRET as string,
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN as string,
});

app.get('/', (req, res) => {
  res.sendStatus(200);
});

app.get('/version', async (req, res) => {
  try {
    const result = await checkDbVersion();
    res.send(`DB version: ${result}`);
  } catch (e) {
    res.sendStatus(500);
  }
});

app.use(line.middleware(config));

app.post('/webhook', (req: Request, res: Response) => {
  res.sendStatus(200);
  const reqBody: line.WebhookRequestBody = req.body;
  Promise.all(reqBody.events.map(handleEvent));
});

// handle error thrown by line/bot-sdk middleware
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof line.SignatureValidationFailed) {
    res.status(401).send(err.signature);
    return;
  } else if (err instanceof line.JSONParseError) {
    res.status(400).send(err.raw);
    return;
  }
  next(err);
});

const handleEvent = async (event: line.WebhookEvent) => {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const echo = { type: 'text' as const, text: event.message.text };

  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [echo],
  });
};

const server = https.createServer(credentials, app);

server.listen(port, () => {
  console.log(`> Ready on ${process.env.APP_SERVER_URL}`);
});
