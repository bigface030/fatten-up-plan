import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import * as line from '@line/bot-sdk';

import { version as appVersion } from '../package.json';
import { checkDbVersion } from './db';
import { joinEventController, messageEventController } from './controllers';
import MessageApiClient from '@utils/messageApiClient';

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.sendStatus(200);
});

app.get('/version', async (req, res) => {
  try {
    const dbVersion = await checkDbVersion();
    res.send(`App version: v${appVersion}, DB version: ${dbVersion}`);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

app.use(line.middleware({ channelSecret: process.env.CHANNEL_SECRET as string }));

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
  if (event.type === 'message' && event.message.type === 'text') {
    const text = await messageEventController(event);
    const echo = { type: 'text' as const, text };

    return MessageApiClient.replyMessage({
      replyToken: event.replyToken,
      messages: [echo],
    });
  }

  if (process.env.GROUP_RECORDING_FEATURE === 'true') {
    if (event.type === 'join') {
      const text = await joinEventController(event);
      const echo = { type: 'text' as const, text };

      return MessageApiClient.replyMessage({
        replyToken: event.replyToken,
        messages: [echo],
      });
    }
  }

  return null;
};

app.listen(port, () => {
  console.log(`> Ready on ${process.env.APP_SERVER_URL}`);
});
