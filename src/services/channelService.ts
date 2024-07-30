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
  userId: string;
}

export class ChannelService {
  protected userId;

  constructor(params: ChannelServiceParams) {
    const { userId } = params;
    this.userId = userId;
  }

  public async getChannelId(): Promise<UUID | undefined> {
    const channel = await readChannel({ channel_name: this.userId });
    return channel?.id;
  }

  public async createChannel(): Promise<UUID> {
    const channel = await createChannel({ channel_name: this.userId, username: this.userId });
    return channel.id;
  }
}

export class GroupChannelService {
  protected groupId;
  protected userId;

  constructor(params: GroupChannelServiceParams) {
    const { groupId, userId } = params;
    this.groupId = groupId;
    this.userId = userId;
  }

  public async getChannelId(): Promise<UUID | undefined> {
    const channel = await readChannel({ channel_name: this.groupId });
    return channel?.id;
  }

  public async getGroupMemberIds(channelId: UUID): Promise<string[]> {
    const memberIds = await getChannelMembers({ channel_id: channelId });
    await this.validateChannelMembersInGroup(memberIds);
    return memberIds;
  }

  public async createChannel(memberIds: string[]): Promise<UUID> {
    await this.validateChannelMembersInGroup(memberIds);
    const channel = await createChannel({
      channel_name: this.groupId,
      username: this.userId,
      members: memberIds,
    });
    return channel.id;
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

  public async addChannelMembers(memberIds: string[]): Promise<string[]> {
    const channelId = (await this.getChannelId()) as UUID;
    return addChannelMembers({
      channel_id: channelId,
      members: memberIds,
    });
  }

  public async removeChannelMembers(memberIds: string[]): Promise<(string | undefined)[]> {
    const channelId = (await this.getChannelId()) as UUID;
    return removeChannelMembers({
      channel_id: channelId,
      members: memberIds,
    });
  }
}
