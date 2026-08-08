export class StudentNotFoundError extends Error {
  constructor() {
    super("Student not found");
    this.name = "StudentNotFoundError";
  }
}

export class DuplicateRollNumberError extends Error {
  constructor(rollNumber: string) {
    super(`A student with roll number "${rollNumber}" already exists`);
    this.name = "DuplicateRollNumberError";
  }
}

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`An account with email "${email}" already exists`);
    this.name = "DuplicateEmailError";
  }
}

export class BatchNotFoundError extends Error {
  constructor() {
    super("Batch not found");
    this.name = "BatchNotFoundError";
  }
}

export class BatchNotAssignableError extends Error {
  constructor(reason: string) {
    super(`Cannot assign student to this batch: ${reason}`);
    this.name = "BatchNotAssignableError";
  }
}

export class StudentAlreadyActiveError extends Error {
  constructor() {
    super("Student is already active");
    this.name = "StudentAlreadyActiveError";
  }
}

export class StudentAlreadyArchivedError extends Error {
  constructor() {
    super("Student is already archived");
    this.name = "StudentAlreadyArchivedError";
  }
}

export class ConfidentialDocumentNotFoundError extends Error {
  constructor() {
    super("Confidential document reference not found");
    this.name = "ConfidentialDocumentNotFoundError";
  }
}

export class EmptyCsvFileError extends Error {
  constructor() {
    super("The uploaded CSV file has no data rows");
    this.name = "EmptyCsvFileError";
  }
}

export class BulkImportRunNotFoundError extends Error {
  constructor() {
    super("Bulk import run not found");
    this.name = "BulkImportRunNotFoundError";
  }
}
