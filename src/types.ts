export interface TagConfig {
  transaction_type: string;
  classification: string | null;
}

export interface CreateRecordPayload {
  activity: string;
  amount: number;
  customized_tag?: string;
  customized_classification?: string | null;
}

export interface DeleteRecordPayload {}

export interface ReadRecordPayload {
  interval: string[];
}
interface CreateRecordResponse {
  status: 'success';
  type: 'create';
  payload: CreateRecordPayload;
}

interface DeleteRecordResponse {
  status: 'success';
  type: 'delete';
  payload: DeleteRecordPayload;
}

interface ReadRecordResponse {
  status: 'success';
  type: 'read';
  action: string;
  payload: ReadRecordPayload;
}

type SuccessResponse = CreateRecordResponse | DeleteRecordResponse | ReadRecordResponse;

interface FailedResponse {
  status: 'failed';
  msg: string;
}

export type ValidatedResponse = SuccessResponse | FailedResponse;
