export class InvalidCalendarRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCalendarRangeError";
  }
}
