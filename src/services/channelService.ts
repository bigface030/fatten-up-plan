import { UUID } from 'crypto';

import {
  addChannelMembers,
  createChannel,
  getChannelMembers,
  readChannel,
  removeChannelMembers,
} from '@repositories/channel';
import { ArrayLengthError } from '@utils/exceptions';
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

  public async readChannel() {
    return readChannel({ channel_name: this.userId });
  }

  public async createChannel() {
    return createChannel({ channel_name: this.userId, username: this.userId });
  }
}

export class GroupChannelService {
  protected groupId;

  constructor(params: GroupChannelServiceParams) {
    const { groupId } = params;
    this.groupId = groupId;
  }

  public async readChannel() {
    return readChannel({ channel_name: this.groupId });
  }

  public async createChannel(memberIds: string[], userId: string) {
    await this.validateChannelMembersInGroup([...memberIds, userId]);
    const channel = await createChannel({
      channel_name: this.groupId,
      username: userId,
      members: [...memberIds, userId],
    });
    return channel;
  }

  public async getMemberIds(channelId: UUID): Promise<string[]> {
    const memberIds = await getChannelMembers({ channel_id: channelId });
    await this.validateChannelMembersInGroup(memberIds);
    return memberIds;
  }

  private async validateChannelMembersInGroup(memberIds: string[]): Promise<void> {
    const groupMembers = await MessageApiClient.getGroupMemberCount(this.groupId);

    if (groupMembers.count !== memberIds.length)
      throw new ArrayLengthError('incorrect channel member count in db', { array: memberIds });

    /**
     * @throws {line.JSONParseError}
     */
    const validateIfUserInGroup = (userId: string) =>
      MessageApiClient.getGroupMemberProfile(this.groupId, userId);

    await Promise.all(memberIds.map(validateIfUserInGroup));
  }

  public async addChannelMembers(channelId: UUID, memberIds: string[]): Promise<string[]> {
    return addChannelMembers({
      channel_id: channelId,
      members: memberIds,
    });
  }

  public async removeChannelMembers(
    channelId: UUID,
    memberIds: string[],
  ): Promise<(string | undefined)[]> {
    return removeChannelMembers({
      channel_id: channelId,
      members: memberIds,
    });
  }
}
