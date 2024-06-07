import 'dotenv/config';
import express from 'express';
import https from 'https';
import { readFileSync } from 'fs';
import { checkDbVersion } from './db';

const app = express();
const port = process.env.PORT || 443;

const privateKey = readFileSync(process.env.SSL_PRIVATE_KEY as string, 'utf-8');
const certificate = readFileSync(process.env.SSL_CERTIFICATE as string, 'utf-8');
const credentials = { key: privateKey, cert: certificate };

const token = process.env.LINE_AUTH_TOKEN;

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  }),
);

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

app.post('/webhook', (req, res) => {
  res.send('HTTP POST request sent to the webhook URL!');

  if (req.body.events[0].type === 'message') {
    const dataString = JSON.stringify({
      replyToken: req.body.events[0].replyToken,
      messages: [
        {
          type: 'text',
          text: 'Hello, user',
        },
        {
          type: 'text',
          text: 'May I help you?',
        },
      ],
    });

    const headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    };

    const webhookOptions = {
      hostname: 'api.line.me',
      path: '/v2/bot/message/reply',
      method: 'POST',
      headers: headers,
      body: dataString,
    };

    const request = https.request(webhookOptions, (res) => {
      res.on('data', (d) => {
        process.stdout.write(d);
      });
    });

    request.on('error', (err) => {
      console.error(err);
    });

    request.write(dataString);
    request.end();
  }
});

const server = https.createServer(credentials, app);

server.listen(port, () => {
  console.log(`> Ready on ${process.env.APP_SERVER_URL}`);
});
