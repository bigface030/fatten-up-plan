import { UUID } from 'crypto';

import { createChannel, getChannelMembers, readChannel } from '@repositories/channel';
import { ArrayLengthError, CustomizedError } from '@utils/exceptions';
import MessageApiClient from '@utils/messageApiClient';

interface ChannelServiceParams {
  userId: string;
}

export class ChannelService {
  protected userId;

  constructor(params: ChannelServiceParams) {
    const { userId } = params;
    this.userId = userId;
  }

  // only for single mode
  public getChannelId = async (): Promise<UUID> => {
    let channel = await readChannel({ channel_name: this.userId });
    if (!channel) {
      channel = await createChannel({ channel_name: this.userId, username: this.userId });
    }
    return channel.id;
  };
}

// only for multiple mode
export const getChannelIdFrom = async (groupId: string): Promise<UUID> => {
  const channel = await readChannel({ channel_name: groupId });
  if (!channel?.id) throw new CustomizedError('*user_error_no_channel');
  return channel.id;
};

export const getGroupMemberIds = async (groupId: string, channelId: UUID) => {
  const [groupMembers, channelMembers] = await Promise.all([
    MessageApiClient.getGroupMemberCount(groupId),
    getChannelMembers({ channel_id: channelId }),
  ]);

  if (groupMembers.count !== channelMembers.length)
    throw new ArrayLengthError('incorrect channel member count in db', { array: channelMembers });

  /**
   * @throws {line.JSONParseError}
   */
  const validateIfChannelMemberInGroup = (userId: string) =>
    MessageApiClient.getGroupMemberProfile(groupId, userId);

  await Promise.all(channelMembers.map(validateIfChannelMemberInGroup));

  return channelMembers;
};
