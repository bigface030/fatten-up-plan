import { UUID } from 'crypto';

export interface DbChannel {
  id: UUID;
  name: string;
  metadata: string | null;
  created_at: string | null;
  deleted_at: string | null;
  created_by: string | null;
  deleted_by: string | null;
}

export interface DbCommonChannelParams {
  channel_name: string;
}

export interface DbReadChannelParams extends DbCommonChannelParams {}

export interface DbCreateChannelParams extends DbCommonChannelParams {
  username: string;
}
