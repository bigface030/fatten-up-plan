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

type SuccessResponse = CreateRecordResponse | DeleteRecordResponse;

interface FailedResponse {
  status: 'failed';
  msg: string;
}

export type ValidatedResponse = SuccessResponse | FailedResponse;
