import { UUID } from 'crypto';

import { createChannel, getChannelMembers, readChannel } from '@repositories/channel';
import { ArrayLengthError, CustomizedError } from '@utils/exceptions';
import MessageApiClient from '@utils/messageApiClient';

interface ChannelServiceParams {
  userId: string;
}

interface GroupChannelServiceParams {
  groupId: string;
}

export class ChannelService {
  protected userId;

  constructor(params: ChannelServiceParams) {
    const { userId } = params;
    this.userId = userId;
  }

  public getChannelId = async (): Promise<UUID> => {
    let channel = await readChannel({ channel_name: this.userId });
    if (!channel) {
      channel = await createChannel({ channel_name: this.userId, username: this.userId });
    }
    return channel.id;
  };
}

export class GroupChannelService {
  protected groupId;

  constructor(params: GroupChannelServiceParams) {
    const { groupId } = params;
    this.groupId = groupId;
  }

  public getChannelId = async (): Promise<UUID> => {
    const channel = await readChannel({ channel_name: this.groupId });
    if (!channel?.id) throw new CustomizedError('*user_error_no_channel');
    return channel.id;
  };

  public getGroupMemberIds = async (channelId: UUID) => {
    const [groupMembers, channelMembers] = await Promise.all([
      MessageApiClient.getGroupMemberCount(this.groupId),
      getChannelMembers({ channel_id: channelId }),
    ]);

    if (groupMembers.count !== channelMembers.length)
      throw new ArrayLengthError('incorrect channel member count in db', { array: channelMembers });

    /**
     * @throws {line.JSONParseError}
     */
    const validateIfUserInGroup = (userId: string) =>
      MessageApiClient.getGroupMemberProfile(this.groupId, userId);

    await Promise.all(channelMembers.map(validateIfUserInGroup));

    return channelMembers;
  };
}
