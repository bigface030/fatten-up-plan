import { ClientBase } from 'pg';

export type AppQuery = ClientBase['query'];

export type Transact = <T>(fn: (query: AppQuery) => Promise<T>) => Promise<T>;
