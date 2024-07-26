/* eslint-disable @typescript-eslint/no-explicit-any */

type ErrorDetails = {
  raw?: any;
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

export class CustomizedError extends Error {
  public raw: any;

  constructor(message: string, { raw }: ErrorDetails = {}) {
    super(message);
    this.name = this.constructor.name;

    Object.assign(this, { raw });
  }
}
