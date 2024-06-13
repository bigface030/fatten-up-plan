import { UUID } from 'crypto';

interface DbRecord {
  id: UUID;
  channel_id: UUID;
  accounting_date: string; // 2024-05-31
  activity: 'expenditure' | 'income';
  description: string | null;
  created_at: string | null;
  deleted_at: string | null;
  created_by: string | null;
  deleted_by: string | null;
}

export interface DbTransaction extends DbRecord {
  // record_id: UUID;
  username: string;
  amount: number;
  customized_classification: string | null;
  customized_tag: string | null;
}

export interface CreateRecordParams {
  activity: string;
  amount: number;
  description?: string;
  customized_tag?: string;
  customized_classification?: string | null;
}

export interface DeleteRecordParams {}

export interface ReadRecordParams {
  interval: string[];
}

interface DbCommonParams {
  username: string;
}

export type DbCreateRecordParams = CreateRecordParams & DbCommonParams;
export type DbDeleteRecordParams = DeleteRecordParams & DbCommonParams;
export type DbReadRecordParams = ReadRecordParams & DbCommonParams;
