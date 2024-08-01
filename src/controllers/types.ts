export interface TagConfig {
  transaction_type: string;
  classification: string | null;
}

interface MessageControllerSourceBase {
  text: string;
  userId: string;
}

type UserMessageControllerSource = { type: 'user' } & MessageControllerSourceBase;

type GroupMessageControllerSource = {
  type: 'group';
  groupId: string;
  members: string[];
} & MessageControllerSourceBase;

export type MessageControllerSource = UserMessageControllerSource | GroupMessageControllerSource;
