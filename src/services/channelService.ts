import { UUID } from 'crypto';
import { HTTPFetchError } from '@line/bot-sdk';

import {
  addChannelMembers,
  createChannel,
  getChannelMembers,
  readChannel,
  removeChannelMembers,
} from '@repositories/channel';
import { ValidationError } from '@utils/exceptions';
import MessageApiClient from '@utils/messageApiClient';

interface ChannelServiceParams {
  userId: string;
}

interface GroupChannelServiceParams {
  groupId: string;
}

interface MemberServiceParams {
  channelId: UUID;
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
    await MemberService.validateChannelMembersInGroup([...memberIds, userId], this.groupId);
    const channel = await createChannel({
      channel_name: this.groupId,
      username: userId,
      members: [...memberIds, userId],
    });
    return channel;
  }
}

export class MemberService {
  protected channelId;

  constructor(params: MemberServiceParams) {
    const { channelId } = params;
    this.channelId = channelId;
  }

  public async getGroupMemberIds(groupId: string): Promise<string[]> {
    const memberIds = await getChannelMembers({ channel_id: this.channelId });
    await MemberService.validateChannelMembersInGroup(memberIds, groupId);
    return memberIds;
  }

  public async addChannelMembers(memberIds: string[]): Promise<string[]> {
    return addChannelMembers({ channel_id: this.channelId, members: memberIds });
  }

  public async removeChannelMembers(memberIds: string[]): Promise<(string | undefined)[]> {
    return removeChannelMembers({ channel_id: this.channelId, members: memberIds });
  }

  static async validateChannelMembersInGroup(memberIds: string[], groupId: string): Promise<void> {
    const groupMembers = await MessageApiClient.getGroupMemberCount(groupId);

    if (groupMembers.count !== memberIds.length)
      throw new ValidationError('incorrect channel member count in db', { raw: memberIds });

    const validateIfUserInGroup = (userId: string) =>
      MessageApiClient.getGroupMemberProfile(groupId, userId).catch((err) => {
        if (err instanceof HTTPFetchError && err.status === 404) {
          throw new ValidationError('the user id is not in given group', { raw: userId });
        }
        throw err;
      });

    await Promise.all(memberIds.map(validateIfUserInGroup));
  }
}
