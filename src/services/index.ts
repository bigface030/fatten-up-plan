import {
  CustomizedGroupMessageRequest,
  CustomizedMessage,
  CustomizedMessageRequest,
  CustomizedMessageResponse,
  SuccessfulResponseBody,
  isCreateMsg,
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

const handleRecordRequest = async (request: CustomizedMessageRequest) => {
  const { tokenGroups, userId } = request;

  const messages = convertTokensToMessages(tokenGroups);

  const CS = new ChannelService({ userId });
  let channelId = await CS.getChannelId();
  if (!channelId) {
    channelId = await CS.createChannel();
  }

  const RS = new RecordService({ userId, channelId });
  return processRecordCRUD(messages, RS);
};

export const handleGroupRecordRequest = async (request: CustomizedGroupMessageRequest) => {
  const { tokenGroups, userId, groupId } = request;

  const CS = new GroupChannelService({ groupId, userId });
  const channelId = await CS.getChannelId();
  if (!channelId) throw new CustomizedError('*user_error_no_channel');
  const memberIds = await CS.getGroupMemberIds(channelId);

  const messages = convertTokensToMessages(tokenGroups);

  const RS = new GroupRecordService({ userId, channelId, memberIds });
  return processRecordCRUD(messages, RS);
};

const errorHandler = async (
  fn: () => Promise<SuccessfulResponseBody>,
): Promise<CustomizedMessageResponse> => {
  try {
    const response = await fn();
    return { status: 'success', body: response };
  } catch (e) {
    if (e instanceof CustomizedError) {
      return { status: 'failed', msg: e.message };
    } else {
      console.error(e);
      return { status: 'failed', msg: 'db_error_sql_query_execution_failed' };
    }
  }
};

const recordHandler = (request: CustomizedMessageRequest) => {
  return errorHandler(() => handleRecordRequest(request));
};

export default recordHandler;
