import { UUID } from 'crypto';

export interface ChannelSummary {
  id: UUID;
  name: string;
  metadata: string | null;
}

export interface DbCommonChannelParams {
  channel_name: string;
}

export interface DbReadChannelParams extends DbCommonChannelParams {}

export interface DbCreateChannelParams extends DbCommonChannelParams {
  username: string;
  members?: string[];
}

export interface DbGetChannelMembersParams {
  channel_id: UUID;
}

export interface DbAddChannelMembersParams {
  channel_id: UUID;
  members: string[];
}

export interface DbRemoveChannelMembersParams {
  channel_id: UUID;
  members: string[];
}
