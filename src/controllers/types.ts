export interface TagConfig {
  transaction_type: string;
  classification: string | null;
}

export interface MessageHandlerSource {
  text: string;
  userId: string;
  groupId?: string;
}
