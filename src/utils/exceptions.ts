/* eslint-disable @typescript-eslint/no-explicit-any */

type ErrorDetails = {
  array?: any[];
};

export class ArrayLengthError extends Error {
  public array: any;

  constructor(message: string, { array }: ErrorDetails = {}) {
    super(message);
    this.name = this.constructor.name;

    Object.assign(this, { array });
  }
}
