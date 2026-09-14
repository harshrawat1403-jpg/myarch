# 17 — Risk Assessment

## Purpose

Identifies what is most likely to threaten MYARCH's success — technically, operationally, and organizationally — and how each risk is mitigated or accepted. This is a working document: risks should be revisited as the project progresses, not written once and forgotten.

## Scope

Covers Phase 1 (highest scrutiny, given the fixed 2-week timeline) through Phase 4. Purely technical risks with a direct architectural mitigation are cross-referenced to the document that addresses them; organizational/process risks are addressed here directly.

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | 2-week MVP schedule slips due to mid-sprint scope changes | Medium | High | Day 1 data-model/role freeze is treated as binding (`16_Project_Roadmap.md`); any new request during the sprint is logged in `18_Open_Questions.md` for Phase 2+, not absorbed into MVP |
| R2 | Private/Public profile boundary is violated by a future code change (accidental data leak to a Recruiter) | Low (with mitigation) | Very High | Structural table separation, not a flag (`08_Database_Design.md`); authorization tests specifically targeting this boundary are the highest-priority test suite (`21_Testing_Strategy.md`) |
| R3 | Single developer (Claude Code) means no independent code review in the traditional sense | Medium | Medium | Compensated by strict typing (`NFR-MAINT-02`), automated test coverage on authorization boundaries, and CI gates (lint/type-check/tests/audit) blocking merge — process substitutes for a second human reviewer |
| R4 | Secretary/Coordinator turnover (annual/biennial) leaves no one who understands the system | Medium | High | This documentation set itself is the primary mitigation — `25_Contributing_Guide.md` and `07_Repository_Structure.md` are written assuming a new maintainer with no prior context |
| R5 | Deployment target undecided going into Day 13–14 of the MVP schedule | Medium | High | `15_Deployment_Strategy.md` gives a default recommendation (Railway/Render) precisely so the schedule isn't blocked on the decision; flagged in `18_Open_Questions.md` for early confirmation |
| R6 | Email provider undecided; Day 11 (notifications) has no working send path | Medium | Medium | `EmailProvider` interface (`06_Technology_Stack.md`) allows a placeholder/console provider in the interim so Day 11 work isn't blocked; production provider must be confirmed before go-live |
| R7 | Real student data (Day 12 testing) surfaces data quality issues (missing CGPA, malformed contact info) not caught by synthetic test data | High | Medium | Import/entry validation is deliberately per-row with a detailed error report (FR-STUD-05) rather than all-or-nothing, so data issues surface early and specifically rather than as a blocked bulk operation |
| R8 | Retention policy for graduated batches remains undecided past go-live | High (currently unresolved) | Medium | Schema supports the policy without redesign once decided (`08_Database_Design.md`); however, an indefinitely undecided policy risks accumulating data the department never intended to keep — should be resolved within Phase 1–2, not left open indefinitely |
| R9 | Recruiter trust: a portfolio-first, unfamiliar profile format may need buy-in from recruiters used to PDF resumes | Medium | Medium | Recruiter portal retains resume download (FR-RECRUIT-04) alongside the portfolio view, so recruiters aren't forced to abandon a familiar format immediately — portfolio-first is additive, not a hard replacement, during the transition |
| R10 | Department server (if ultimately chosen for hosting) lacks dedicated IT/ops support, risking downtime or delayed security patching | Medium | High | `15_Deployment_Strategy.md` explicitly recommends a managed platform (Railway/Render) unless the department confirms real operational capacity for self-hosting |
| R11 | Brochure export (Phase 3) fidelity to Canva/PowerPoint doesn't meet the department's expectation for further manual editing | Medium | Medium | Requirement is scoped explicitly (`FR-BROCH-05`) as "structurally editable," with the exact expectation clarified as an open question (`18_Open_Questions.md`) before Phase 3 implementation begins, to avoid building to a wrong assumption |
| R12 | Coordinator count/selection criteria undefined, risking either too few Coordinators (bottlenecking approvals) or too many (diluting accountability) | Medium | Low–Medium | System places no hard limit (`09_User_Roles_and_Permissions.md`), leaving this a Secretary operating decision rather than a system constraint; flagged in `18_Open_Questions.md` for the Secretary's judgment |

## Severity Definitions

- **Impact — Very High**: a confidentiality breach of student private data (the platform's core trust guarantee).
- **Impact — High**: MVP fails to ship on schedule, or a security/operational gap blocks safe production use.
- **Impact — Medium**: a feature underperforms expectations or requires rework, without compromising the core trust guarantee or overall timeline.
- **Impact — Low**: an operational inconvenience with a straightforward workaround.

## Assumptions

- This risk register reflects known risks as of the brief and initial architecture decisions; it does not anticipate risks that only become visible once real implementation or real student data is in play (Day 12 testing is expected to surface additional risks not listed here).
- R1–R12 are ranked by informed judgment against the brief's stated constraints, not a formal quantitative risk model — appropriate given the project's scale and single-developer delivery model.

## Future Considerations

- After Day 12 (real-data testing) and after the first live placement season, this register should be revisited: some risks here will be resolved, and new risks specific to real usage (e.g., recruiter adoption friction, actual data volume) will likely emerge and should be added.
- If the platform expands beyond one department (`01_Product_Vision.md` future considerations), this entire risk register should be redone rather than extended, since the risk profile of a multi-tenant system differs substantially from a single-department tool.
