# 19 — Decision Log

## Purpose

Records significant architectural and product decisions as they are made, with the date, the alternatives considered, and the reasoning — so that six months from now (or after a Secretary handover), no one has to reverse-engineer *why* something was built a certain way from the code alone.

## Scope

Living document. New entries are appended as decisions are made during planning and implementation; existing entries are never edited to erase what was actually decided at the time — if a decision is later reversed, that reversal is logged as a new entry referencing the old one, not a silent edit.

## Log Format

Each entry: date, decision, alternatives considered, rationale, and status.

---

### 2026-08-05 — Adopt Modular Monolith over Microservices

**Decision:** Build MYARCH as a single Next.js deployment with internal feature-first modules (Clean Architecture layering), not a distributed microservice system.

**Alternatives considered:** Separate frontend + backend services; per-feature microservices.

**Rationale:** Single-developer delivery model, modest scale (`04_Non_Functional_Requirements.md`), and a small operating team make distributed architecture pure overhead with no corresponding benefit. Module boundaries are enforced by folder structure and lint rules, keeping the door open to future extraction without paying the distributed-systems cost now.

**Status:** Decided. See `05_System_Architecture.md`.

---

### 2026-08-05 — Technology Stack: Next.js, PostgreSQL, Prisma, Custom JWT Auth

**Decision:** TypeScript throughout; Next.js (App Router) for frontend and backend; PostgreSQL via Prisma; custom JWT access + refresh token authentication with bcrypt (cost 12+); S3-compatible object storage (Cloudflare R2 recommended); Playwright + pptxgenjs for brochure export (Phase 3).

**Alternatives considered:** Separate Express/NestJS backend; a document database; third-party auth-as-a-service (Auth0/Clerk).

**Rationale:** Full detail and per-choice reasoning in `06_Technology_Stack.md`. Summary: a relational data model (batches, students, applications) fits PostgreSQL naturally; a single codebase fits the single-developer/small-team reality; custom auth matches the brief's explicit mechanics requirement and avoids third-party dependency/cost for a department-scale user base.

**Status:** Decided (email provider and hosting target remain open — see `18_Open_Questions.md`).

---

### 2026-08-05 — Private/Public Profile Separation Is Structural (Separate Tables), Not a Visibility Flag

**Decision:** `StudentPrivateProfile`, `StudentPublicProfile` (published), and `StudentPublicProfileDraft` are three distinct tables/read-paths, not one `Student` table with a visibility flag or per-field permission check.

**Alternatives considered:** Single table with field-level or row-level visibility rules enforced in application logic.

**Rationale:** The brief's core trust guarantee (nothing is visible to a recruiter until explicitly approved, private data is never reachable by a recruiter) is safer as a structural, database-level fact than an application-logic rule that could be bypassed by a future bug. This is the platform's single most important design decision given the confidentiality stakes.

**Status:** Decided. See `08_Database_Design.md`, `14_Security_Architecture.md`.

---

### 2026-08-05 — Design Language: Blueprint/Drafting-Sheet Aesthetic with Reused Title Block Component

**Decision:** Adopt the color palette, typography (General Sans / IBM Plex Sans / IBM Plex Mono), and Title Block motif specified in the brief as the platform's signature, reused design element across dashboards, profiles, drive cards, and statistics panels.

**Alternatives considered:** A generic modern SaaS dashboard aesthetic (explicitly rejected by the brief).

**Rationale:** Differentiates the platform for its specific audience (architecture students/recruiters, visually literate in technical drawings) and gives the product a coherent, non-generic identity from day one rather than accumulating ad hoc styling per screen.

**Status:** Decided. See `12_Design_System.md`, `13_Component_Library.md`.

---

### 2026-08-05 — Background Jobs via Database-Backed Queue for MVP (No Redis)

**Decision:** Use a simple `Job` table polled by a scheduled task for email sending and (later) brochure generation, rather than introducing Redis/BullMQ at MVP stage.

**Alternatives considered:** BullMQ + Redis from the start.

**Rationale:** Avoids an additional infrastructure dependency and cost at a scale where a polled database table is entirely sufficient; revisit only if volume/latency needs outgrow it.

**Status:** Decided for Phase 1–2. See `06_Technology_Stack.md` Future Considerations.

---

### 2026-08-05 — No API Versioning for Phase 1–3

**Decision:** The internal API has no `/v1/` prefix or formal versioning scheme.

**Alternatives considered:** Versioned API from day one.

**Rationale:** The API has exactly one consumer (the MYARCH frontend, same repository, deployed together); versioning solves a problem that doesn't exist yet. Revisit only if an external consumer emerges.

**Status:** Decided. See `10_API_Architecture.md`.

---

## Open Items Not Yet Logged as Decisions

The following remain genuinely undecided and are tracked in `18_Open_Questions.md`, not here, until the Secretary confirms them: deployment hosting target, production email provider, graduated-batch retention policy, and Coordinator count/selection criteria.

## Assumptions

- Entries dated 2026-08-05 reflect decisions made while producing this documentation set, based on the project brief; they are Claude Code's recommended architecture, presented for the Secretary's review, not decisions the Secretary has separately ratified line-by-line. Silence is not assumed to mean agreement — flag any entry here that should be revisited.

## Future Considerations

- As implementation proceeds, this log should gain entries for decisions made *during* coding that aren't foreseeable from documentation alone (e.g., a specific library chosen for a narrow utility need).
