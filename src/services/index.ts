import {
  ChannelResponseBody,
  CustomizedChannelRequest,
  CustomizedGroupRecordRequest,
  CustomizedRecordRequest,
  CustomizedMessage,
  CustomizedResponse,
  RecordResponseBody,
  isCreateMsg,
  RecordResponse,
  ChannelResponse,
  CustomizedMemberRequest,
  MemberResponseBody,
  MemberResponse,
} from './types';
import { createInputValidator, validationRules } from './validateInput';
import { ChannelService, GroupChannelService, MemberService } from './channelService';
import { GroupRecordService, RecordService } from './RecordService';

import { CustomizedError, ValidationError } from '@utils/exceptions';

const convertTokensToMessages = (tokenGroups: string[][]) => {
  const MAXIMUM_TOKEN_GROUP_LENGTH = 5;

  if (tokenGroups.length > MAXIMUM_TOKEN_GROUP_LENGTH)
    throw new CustomizedError('user_error_invalid_multi_line_length');

  const validateInput = createInputValidator(validationRules);
  const messages = tokenGroups.map(validateInput);

  if (messages.length > 1 && !messages.every(isCreateMsg))
    throw new CustomizedError('user_error_invalid_multi_line_type');

  return messages;
};

const processRecordCRUD = async (
  messages: CustomizedMessage[],
  service: RecordService,
): Promise<RecordResponseBody> => {
  const [msg] = messages;
  const { type } = msg;

  if (type === 'create') {
    const createRecordsParams = messages.filter(isCreateMsg).map((msg) => msg.params);
    const result = await service.createRecords(createRecordsParams);
    return { type, result };
  } else if (type === 'delete') {
    const result = await service.deleteRecord(msg.params);
    return { type, result };
  } else if (type === 'read') {
    const { action } = msg;
    if (action === 'read_balance') {
      const result = await service.readBalance(msg.params);
      return { type, action, result };
    } else if (action === 'read_statement') {
      const result = await service.readStatement(msg.params);
      return { type, action, result };
    }
  }

  throw new CustomizedError('admin_error_invalid_record_type');
};

const handleRecordRequest = async (request: CustomizedRecordRequest) => {
  const { tokenGroups, userId } = request;

  const messages = convertTokensToMessages(tokenGroups);

  const CS = new ChannelService({ userId });
  let channel = await CS.readChannel();
  if (!channel) {
    channel = await CS.createChannel();
  }

  const RS = new RecordService({ userId, channelId: channel.id });
  return processRecordCRUD(messages, RS);
};

const handleGroupRecordRequest = async (request: CustomizedGroupRecordRequest) => {
  const { tokenGroups, userId, groupId } = request;

  const CS = new GroupChannelService({ groupId });
  const channel = await CS.readChannel();
  if (!channel) throw new CustomizedError('user_error_invalid_msg_on_none_channel');

  const MS = new MemberService({ channelId: channel.id });
  const memberIds = await MS.getGroupMemberIds(groupId);

  const messages = convertTokensToMessages(tokenGroups);

  const RS = new GroupRecordService({ userId, channelId: channel.id, memberIds });
  return processRecordCRUD(messages, RS);
};

const handleChannelRequest = async (
  request: CustomizedChannelRequest,
): Promise<ChannelResponseBody> => {
  const { members, userId, groupId } = request;

  const CS = new GroupChannelService({ groupId });

  const channel = await CS.readChannel();
  if (channel) {
    const MS = new MemberService({ channelId: channel.id });
    const memberIds = await MS.getGroupMemberIds(groupId);
    return {
      type: 'validate',
      result: { ...channel, members: memberIds },
    };
  }

  if (!members || !userId) throw new CustomizedError('greeting_to_create_channel');

  const result = await CS.createChannel(members, userId);
  return {
    type: 'create',
    result: { ...result, members },
  };
};

const handleMemberRequest = async (
  request: CustomizedMemberRequest,
): Promise<MemberResponseBody> => {
  const { groupId, members, type } = request;

  const CS = new GroupChannelService({ groupId });

  const channel = await CS.readChannel();
  if (!channel) throw new CustomizedError('user_error_invalid_msg_on_none_channel');

  const MS = new MemberService({ channelId: channel.id });
  if (type === 'join') {
    const result = await MS.addChannelMembers(members);
    return { type, members: result };
  } else {
    const result = await MS.removeChannelMembers(members);
    return { type, members: result.filter((res): res is string => !!res) };
  }
};

const errorHandler = async <T>(fn: () => Promise<T>): Promise<CustomizedResponse<T>> => {
  try {
    const response = await fn();
    return { status: 'success', ...response };
  } catch (e) {
    if (e instanceof CustomizedError) {
      return { status: 'failed', msg: e.message };
    } else if (e instanceof ValidationError) {
      console.error(e);
      return { status: 'failed', msg: 'admin_error_validate_channel_members' };
    } else {
      console.error(e);
      return { status: 'failed', msg: 'db_error_sql_query_execution_failed' };
    }
  }
};

export const recordHandler = (request: CustomizedRecordRequest) =>
  errorHandler(async (): Promise<RecordResponse> => {
    const res = await handleRecordRequest(request);
    return { type: 'record', body: res };
  });

export const groupRecordHandler = (request: CustomizedGroupRecordRequest) =>
  errorHandler(async (): Promise<RecordResponse> => {
    const res = await handleGroupRecordRequest(request);
    return { type: 'record', body: res };
  });

export const channelHandler = (request: CustomizedChannelRequest) =>
  errorHandler(async (): Promise<ChannelResponse> => {
    const res = await handleChannelRequest(request);
    return { type: 'channel', body: res };
  });

export const memberHandler = (request: CustomizedMemberRequest) =>
  errorHandler(async (): Promise<MemberResponse> => {
    const res = await handleMemberRequest(request);
    return { type: 'member', body: res };
  });
