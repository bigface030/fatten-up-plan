type ValueOf<T> = T[keyof T];

export type Entries<T> = [keyof T, ValueOf<T>][];
export type Keys<T> = Array<keyof T>;
export type Values<T> = Array<ValueOf<T>>;
