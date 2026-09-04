export class FormNotFoundError extends Error {
  constructor() {
    super("Form not found");
    this.name = "FormNotFoundError";
  }
}

export class InvalidFormTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot transition form from ${from} to ${to}`);
    this.name = "InvalidFormTransitionError";
  }
}

export class PublishedFormImmutableError extends Error {
  constructor() {
    super("Published forms are immutable");
    this.name = "PublishedFormImmutableError";
  }
}

export class InvalidFormDefinitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidFormDefinitionError";
  }
}

export class FormCommitteeNotFoundError extends Error {
  constructor() {
    super("Committee not found");
    this.name = "FormCommitteeNotFoundError";
  }
}
