require('dotenv').config();

const express = require('express');
const https = require('https');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 443;

const privateKey = fs.readFileSync('ssl-cert/fatten-up-plan.local+4-key.pem', 'utf-8');
const certificate = fs.readFileSync('ssl-cert/fatten-up-plan.local+4.pem', 'utf-8');
const credentials = { key: privateKey, cert: certificate };

app.get('/', (req, res) => {
  res.send('Hello world!');
});

const server = https.createServer(credentials, app);

server.listen(port, () => {
  console.log(`> Ready on ${process.env.APP_SERVER_URL}`);
});
