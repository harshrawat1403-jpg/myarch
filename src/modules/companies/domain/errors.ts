export class CompanyNotFoundError extends Error {
  constructor() {
    super("Company not found");
    this.name = "CompanyNotFoundError";
  }
}

export class DuplicateCompanyNameError extends Error {
  constructor(name: string) {
    super(`A company named "${name}" already exists`);
    this.name = "DuplicateCompanyNameError";
  }
}

export class CompanyAlreadyActiveError extends Error {
  constructor() {
    super("Company is already active");
    this.name = "CompanyAlreadyActiveError";
  }
}

export class CompanyAlreadyDisabledError extends Error {
  constructor() {
    super("Company is already disabled");
    this.name = "CompanyAlreadyDisabledError";
  }
}
