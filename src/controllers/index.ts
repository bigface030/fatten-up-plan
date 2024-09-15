import * as line from '@line/bot-sdk';

import { SYSTEM_COMMANDS } from './constants';
import { MessageControllerSource } from './types';
import {
  classifyTags,
  createDisplayNameGetter,
  displayBalance,
  displayRecords,
  displaySettlement,
  displayStatement,
  displayTransferReocrd,
  formatTags,
} from './displayUtils';

import { channelHandler, groupRecordHandler, memberHandler, recordHandler } from '../services';
import { dictionary, help, intervals, localization, tags } from '@utils/fileUtils';

export const memberJoinEventController = async (event: line.MemberJoinEvent) => {
  const source = event.source as line.Group;
  const members = event.joined.members.map((member) => member.userId);

  await memberHandler({
    type: 'join',
    groupId: source.groupId,
    members,
  });
};

export const memberLeaveEventController = async (event: line.MemberLeaveEvent) => {
  const source = event.source as line.Group;
  const members = event.left.members.map((member) => member.userId);

  await memberHandler({
    type: 'leave',
    groupId: source.groupId,
    members,
  });
};

export const joinEventController = async (event: line.JoinEvent) => {
  const source = event.source as line.Group;

  const res = await channelHandler({ groupId: source.groupId });

  if (res.status === 'failed') {
    return localization[res.msg] || res.msg;
  }

  return localization['successfully_validate_channel'];
};

export const messageEventRouter = (event: line.MessageEvent) => {
  const msg = event.message as line.TextEventMessage;

  if (event.source.type === 'room') return 'invalid message event';

  if (process.env.GROUP_RECORDING_FEATURE === 'true') {
    // TODO: optimize condition
    const isReplyingChannelRequest = event.source.type === 'group' && msg.text.startsWith('@');
    if (isReplyingChannelRequest) return channelMessageEventController(event);
  }

  return messageEventController(event);
};

const messageEventController = async (event: line.MessageEvent) => {
  const msg = event.message as line.TextEventMessage;

  if (event.source.type === 'user') {
    return messageController({
      type: 'user',
      text: msg.text,
      userId: event.source.userId,
    });
  }

  if (event.source.type === 'group') {
    let text = msg.text;

    // TODO: handle multiple mentionees
    const mentionee = msg.mention?.mentionees?.[0];
    if (mentionee && mentionee.userId) {
      text =
        msg.text.slice(0, mentionee.index) +
        mentionee.userId +
        msg.text.slice(mentionee.index + mentionee.length);
    }

    return messageController({
      type: 'group',
      text,
      groupId: event.source.groupId,
      userId: event.source.userId as string,
    });
  }

  return 'invalid message event';
};

const channelMessageEventController = async (event: line.MessageEvent) => {
  if (event.source.type === 'user' || event.source.type === 'room')
    return 'invalid message source type';

  const msg = event.message as line.TextEventMessage;
  const mentionedUsers = (msg.mention?.mentionees || []).filter(
    (mentionee) => mentionee.type === 'user',
  );

  const res = await channelHandler({
    groupId: event.source.groupId,
    userId: event.source.userId as string,
    members: mentionedUsers.map((user) => user.userId as string),
  });

  if (res.status === 'failed') {
    return localization[res.msg] || res.msg;
  }

  const { type } = res.body;
  if (type === 'create') return localization['successfully_create_channel'];
  if (type === 'validate') return localization['successfully_validate_channel'];
  return 'invalid channel type';
};

export const messageController = async (source: MessageControllerSource): Promise<string> => {
  const { text, userId, type: msgType } = source;

  const textInput = text.trim();

  switch (dictionary[textInput]) {
    case SYSTEM_COMMANDS.HELP: {
      return help;
    }
    case SYSTEM_COMMANDS.TAG: {
      return formatTags(classifyTags(tags));
    }
    case SYSTEM_COMMANDS.INTERVAL: {
      return Object.keys(intervals).join(', ');
    }
    default:
      break;
  }

  const tokenGroups = textInput
    .split('\n')
    .map((input) => input.trim().replace(/\s+/g, ' ').split(' '));

  let res;
  if (msgType === 'group') {
    res = await groupRecordHandler({ tokenGroups, userId, groupId: source.groupId });
  } else {
    res = await recordHandler({ tokenGroups, userId });
  }

  if (res.status === 'failed') {
    return localization[res.msg] || res.msg;
  }

  const { action } = res.body;
  if (action === 'create_transaction') {
    return displayRecords(res.body.result, localization['create_success']);
  } else if (action === 'create_transfer') {
    if (msgType === 'user') return 'admin_error';
    const { groupId } = source;
    return displayTransferReocrd(
      res.body.result,
      localization['create_success'],
      createDisplayNameGetter(groupId),
    );
  } else if (action === 'delete_latest') {
    const result = res.body.result;
    if (!result) return localization['no_records'];
    if (result.activity === 'transfer') {
      if (msgType === 'user') return 'admin_error';
      const { groupId } = source;
      return displayTransferReocrd(
        result,
        localization['delete_success'],
        createDisplayNameGetter(groupId),
      );
    } else {
      return displayRecords([result], localization['delete_success']);
    }
  } else if (action === 'read_balance') {
    return displayBalance(res.body.result);
  } else if (action === 'read_statement') {
    return displayStatement(res.body.result);
  } else if (action === 'read_settlement' && msgType === 'group') {
    try {
      const { groupId } = source;
      return displaySettlement(res.body.result, createDisplayNameGetter(groupId));
    } catch (err) {
      console.error(err);
      return 'api_execution_failed';
    }
  }

  return 'invalid record type';
};
