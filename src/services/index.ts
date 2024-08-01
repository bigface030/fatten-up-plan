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
} from './types';
import { validateInput } from './validateInput';
import { ChannelService, GroupChannelService } from './channelService';
import { GroupRecordService, RecordService } from './RecordService';

import { CustomizedError } from '@utils/exceptions';

const convertTokensToMessages = (tokenGroups: string[][]) => {
  const MAXIMUM_TOKEN_GROUP_LENGTH = 5;

  if (tokenGroups.length > MAXIMUM_TOKEN_GROUP_LENGTH)
    throw new CustomizedError('user_error_invalid_multi_line_length');

  const messages = tokenGroups.map(validateInput);

  if (messages.length > 1 && !messages.every(isCreateMsg))
    throw new CustomizedError('user_error_invalid_multi_line_type');

  return messages;
};

const processRecordCRUD = (messages: CustomizedMessage[], service: RecordService) => {
  const [msg] = messages;
  const { type } = msg;

  if (type === 'create') {
    const createRecordsParams = messages.filter(isCreateMsg).map((msg) => msg.params);
    return service.createRecords(createRecordsParams);
  } else if (type === 'delete') {
    return service.deleteRecord(msg.params);
  } else if (type === 'read') {
    return service.readRecords(msg.params, msg.action);
  }

  throw new CustomizedError('admin_error_invalid_record_type');
};

const handleRecordRequest = async (
  request: CustomizedRecordRequest,
): Promise<RecordResponseBody> => {
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

export const handleGroupRecordRequest = async (
  request: CustomizedGroupRecordRequest,
): Promise<RecordResponseBody> => {
  const { tokenGroups, userId, groupId } = request;

  const CS = new GroupChannelService({ groupId });
  const channel = await CS.readChannel();
  if (!channel) throw new CustomizedError('user_error_invalid_msg_on_none_channel');
  const memberIds = await CS.getMemberIds(channel.id);

  const messages = convertTokensToMessages(tokenGroups);

  const RS = new GroupRecordService({ userId, channelId: channel.id, memberIds });
  return processRecordCRUD(messages, RS);
};

export const handleChannelRequest = async (
  request: CustomizedChannelRequest,
): Promise<ChannelResponseBody> => {
  const { members, userId, groupId } = request;

  const CS = new GroupChannelService({ groupId });

  const channel = await CS.readChannel();
  if (channel) {
    const memberIds = await CS.getMemberIds(channel.id);
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

const errorHandler = async <T>(fn: () => Promise<T>): Promise<CustomizedResponse<T>> => {
  try {
    const response = await fn();
    return { status: 'success', ...response };
  } catch (e) {
    if (e instanceof CustomizedError) {
      return { status: 'failed', msg: e.message };
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
