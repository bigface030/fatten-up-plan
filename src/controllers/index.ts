import * as line from '@line/bot-sdk';

import { SYSTEM_COMMANDS } from './constants';
import { MessageControllerSource } from './types';
import {
  classifyTags,
  displayBalance,
  displayRecords,
  displaySettlement,
  displayStatement,
  formatTags,
} from './displayUtils';

import { channelHandler, groupRecordHandler, memberHandler, recordHandler } from '../services';
import { dictionary, help, intervals, localization, tags } from '@utils/fileUtils';
import MessageApiClient from '@utils/messageApiClient';

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

export const messageEventController = (event: line.MessageEvent) => {
  const msg = event.message as line.TextEventMessage;

  if (event.source.type === 'user') {
    return messageController({
      type: 'user',
      text: msg.text,
      userId: event.source.userId,
    });
  }

  if (process.env.GROUP_RECORDING_FEATURE === 'true') {
    if (event.source.type === 'group') {
      const mentionedUsers = (msg.mention?.mentionees || []).filter(
        (mentionee) => mentionee.type === 'user',
      );
      return messageController({
        type: 'group',
        text: msg.text,
        groupId: event.source.groupId,
        userId: event.source.userId as string,
        members: mentionedUsers.map((user) => user.userId as string),
      });
    }
  }

  return 'invalid message event';
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
    const { members, groupId } = source;

    // TODO: optimize condition
    if (members.length > 0) {
      res = await channelHandler({ members, groupId, userId });
    } else {
      res = await groupRecordHandler({ tokenGroups, userId, groupId });
    }
  } else {
    res = await recordHandler({ tokenGroups, userId });
  }

  if (res.status === 'failed') {
    return localization[res.msg] || res.msg;
  }

  if (res.type === 'record') {
    const { action } = res.body;
    if (action === 'create_transaction') {
      return displayRecords(res.body.result, localization['create_success']);
    } else if (action === 'delete_latest') {
      const result = res.body.result;
      if (!result) return localization['no_records'];
      if (result.activity === 'transfer') {
        // TODO: display transfer record
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
        const cache = new Map<string, string>();
        const handler = async (userId: string) => {
          const result = cache.get(userId);
          if (!result) {
            const displayName = await MessageApiClient.getGroupMemberProfile(groupId, userId)
              .then((res) => res.displayName)
              .catch((err) => {
                if (err instanceof line.HTTPFetchError && err.status === 404) return userId;
                throw err;
              });
            cache.set(userId, displayName);
            return displayName;
          }
          return result;
        };
        return displaySettlement(res.body.result, handler);
      } catch (err) {
        console.error(err);
        return 'api_execution_failed';
      }
    }

    return 'invalid record type';
  }

  if (res.type === 'channel') {
    const { type } = res.body;
    if (type === 'create') {
      return localization['successfully_create_channel'];
    }
    if (type === 'validate') {
      return localization['successfully_validate_channel'];
    }

    return 'invalid channel type';
  }

  return 'invalid res type';
};
