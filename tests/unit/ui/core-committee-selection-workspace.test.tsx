import { describe, expect, it } from "vitest";
import {
  interviewCandidates,
  resultsCandidates,
  shortlistDecision,
} from "../../../src/components/selections/core-committee-selection-workspace";

type Candidate = Parameters<typeof shortlistDecision>[0];

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: "candidate",
    applicantUserId: "student",
    candidateName: "Harsh Rawat",
    rollNumber: "BA24ARC052",
    applicationId: "application",
    submittedAt: new Date().toISOString(),
    answers: {},
    applicationStatus: "SUBMITTED",
    status: "ELIGIBLE",
    positions: [{ positionId: "position", title: "Technical Coordinators" }],
    questions: [],
    shortlist: [],
    interviews: [],
    decisions: [],
    ...overrides,
  };
}

describe("Core Committee applicant review decisions", () => {
  it("derives pending, shortlisted, and not-shortlisted states", () => {
    expect(shortlistDecision(candidate())).toBe("PENDING");
    expect(
      shortlistDecision(candidate({ status: "SHORTLISTED", shortlist: [{ positionId: "position", createdAt: "" }] })),
    ).toBe("SHORTLISTED");
    expect(shortlistDecision(candidate({ status: "INELIGIBLE" }))).toBe("NOT_SHORTLISTED");
  });

  it("only exposes shortlisted candidates without an active interview", () => {
    const shortlisted = candidate({
      id: "shortlisted",
      status: "SHORTLISTED",
      shortlist: [{ positionId: "position", createdAt: "" }],
    });
    const scheduled = candidate({
      id: "scheduled",
      status: "SHORTLISTED",
      shortlist: [{ positionId: "position", createdAt: "" }],
      interviews: [
        {
          id: "interview",
          positionId: "position",
          scheduledAt: null,
          durationMinutes: 30,
          mode: "ONLINE",
          location: "https://meet.example.com/core",
          candidateAttended: null,
          candidateInstructions: null,
          completedAt: null,
          status: "SCHEDULED",
        },
      ],
    });
    expect(interviewCandidates([candidate(), candidate({ id: "not-shortlisted", status: "INELIGIBLE" }), shortlisted, scheduled]).map((item) => item.id)).toEqual(["shortlisted"]);
  });

  it("only exposes shortlisted candidates in Results for each position", () => {
    const shortlisted = candidate({
      id: "shortlisted",
      status: "SHORTLISTED",
      shortlist: [{ positionId: "position", createdAt: "" }],
    });
    expect(resultsCandidates([shortlisted, candidate(), candidate({ id: "not-shortlisted", status: "INELIGIBLE" })], "position").map((item) => item.id)).toEqual(["shortlisted"]);
  });
});
