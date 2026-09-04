export interface StudentApplicant {
  readonly userId: string;
  readonly studentProfileId: string;
  readonly batchId: string;
  readonly fullName: string;
}

export interface ApplicantLookup {
  findByUserId(userId: string): Promise<StudentApplicant | null>;
}

