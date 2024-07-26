import * as line from '@line/bot-sdk';

const MessageApiClient = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN as string,
});

export default MessageApiClient;
