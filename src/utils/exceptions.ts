/* eslint-disable @typescript-eslint/no-explicit-any */

type ErrorDetails = {
  raw?: any;
};

export class ValidationError extends Error {
  public raw: any;

  constructor(message: string, { raw }: ErrorDetails = {}) {
    super(message);
    this.name = this.constructor.name;

    Object.assign(this, { raw });
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
