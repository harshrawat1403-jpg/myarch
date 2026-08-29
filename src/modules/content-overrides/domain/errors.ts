export class InvalidContentOverrideError extends Error {
  constructor(message = "Invalid content value") {
    super(message);
    this.name = "InvalidContentOverrideError";
  }
}
