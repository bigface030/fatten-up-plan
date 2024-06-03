export interface TagConfig {
  transaction_type: string;
  classification: string | null;
}

export interface CreateRecordParams {
  activity: string;
  amount: number;
  customized_tag?: string;
  customized_classification?: string | null;
}

export interface DeleteRecordParams {}

export interface ReadRecordParams {
  interval: string[];
}
interface CreateRecordPayload {
  type: 'create';
  params: CreateRecordParams;
}

interface DeleteRecordPayload {
  type: 'delete';
  params: DeleteRecordParams;
}

interface ReadRecordPayload {
  type: 'read';
  action: string;
  params: ReadRecordParams;
}

type SuccessfulRequest = {
  status: 'success';
  body: CreateRecordPayload | DeleteRecordPayload | ReadRecordPayload;
};

interface FailedRequest {
  status: 'failed';
  msg: string;
}

export type Request = SuccessfulRequest | FailedRequest;
