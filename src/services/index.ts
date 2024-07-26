import {
  CreateTransactionPayload,
  CustomizedMessage,
  CustomizedMessageRequest,
  CustomizedMessageResponse,
} from './types';
import { validateInput } from './validateInput';
import { ChannelService } from './channelService';
import { RecordService } from './RecordService';

import { CustomizedError } from '@utils/exceptions';

const isCreateMsg = (msg: CustomizedMessage): msg is CreateTransactionPayload => {
  return msg.type === 'create';
};

const MAXIMUM_TOKEN_GROUP_LENGTH = 5;

const recordHandler = async (
  request: CustomizedMessageRequest,
): Promise<CustomizedMessageResponse> => {
  try {
    const { tokenGroups, userId } = request;

    if (tokenGroups.length > MAXIMUM_TOKEN_GROUP_LENGTH)
      throw new CustomizedError('user_error_invalid_multi_line_length');

    const messages = tokenGroups.map(validateInput);

    if (messages.length > 1 && !messages.every(isCreateMsg))
      throw new CustomizedError('user_error_invalid_multi_line_type');

    const CS = new ChannelService({ userId });

    const channelId = await CS.getChannelId();

    const RS = new RecordService({ userId, channelId });

    const [msg] = messages;
    const { type } = msg;
    if (type === 'create') {
      return RS.createRecords(messages.filter(isCreateMsg));
    } else if (type === 'delete') {
      return RS.deleteRecord(msg);
    } else if (type === 'read') {
      return RS.readRecords(msg);
    }

    throw new CustomizedError('admin_error_invalid_record_type');
  } catch (e) {
    if (e instanceof CustomizedError) {
      return { status: 'failed', msg: e.message };
    } else {
      console.error(e);
      return { status: 'failed', msg: 'db_error_sql_query_execution_failed' };
    }
  }
};

export default recordHandler;
