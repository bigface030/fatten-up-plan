import { UUID } from 'crypto';
import { createChannel, getChannelMembers, readChannel } from '@repositories/channel';
import { ArrayLengthError } from '@utils/exceptions';
import MessageApiClient from '@utils/messageApiClient';

// only for single mode
export const getChannelId = async (channel_name: string, username: string): Promise<UUID> => {
  let channel = await readChannel({ channel_name });
  if (!channel) {
    channel = await createChannel({ channel_name, username });
  }
  return channel.id;
};

// only for multiple mode
export const getChannelIdFrom = async (channel_name: string): Promise<UUID> => {
  const channel = await readChannel({ channel_name });
  if (!channel?.id) throw Error('user_error_no_channel');
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
