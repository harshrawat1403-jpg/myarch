# 15 — Deployment Strategy

## Purpose

Defines how MYARCH is built, released, and hosted, and lays out the tradeoffs for the hosting target the brief leaves open. This document gives the Secretary what's needed to make that decision, and specifies the pipeline that applies regardless of which target is chosen.

## Scope

Covers environments, CI/CD pipeline, hosting options and tradeoffs, domain/TLS setup for `myarch.in`, and release process. Does not cover application-level security controls (see `14_Security_Architecture.md`) beyond where they intersect with deployment (e.g., secret storage, HTTPS termination).

## Environments

| Environment | Purpose | Data |
|---|---|---|
| Local | Individual development | Seeded synthetic data only, never production data |
| Staging | Pre-production verification, UAT with the Secretary before a release reaches students/recruiters | Synthetic or anonymized data |
| Production | Live system at `myarch.in` | Real student/recruiter data |

Each environment has its own database, its own object storage bucket/prefix, and its own secrets — production credentials are never used locally (`NFR-OPS-03`).

## CI/CD Pipeline (GitHub Actions)

Every pull request triggers:

1. Install dependencies (locked via lockfile — no floating versions).
2. Type-check (`tsc --noEmit`), strict mode enforced.
3. Lint (including the import-boundary rules from `07_Repository_Structure.md`).
4. Unit + integration tests (`21_Testing_Strategy.md`).
5. Dependency security scan (`npm audit` / equivalent) — high/critical findings **block** merge.

Merge to the main branch triggers:

6. The same pipeline, plus
7. Build the production artifact.
8. Deploy to Staging automatically.
9. Deploy to Production **only** on an explicit, manual approval step (never automatic on every merge) — given the sensitivity of the data involved and the small operating team, a human confirms each production release.

Database migrations run as an explicit step in the deploy pipeline (`prisma migrate deploy`), never applied ad hoc against production from a developer machine.

## Hosting Target: Open Decision

The brief lists this as unresolved. The options below are evaluated against MYARCH's actual constraints: a Next.js + PostgreSQL app, modest scale (`04_Non_Functional_Requirements.md` Assumptions), a single-developer operating model, and a department (not institutional IT) as the long-term owner.

| Option | Pros | Cons | Best fit if… |
|---|---|---|---|
| **Railway** | Near-zero DevOps overhead; managed PostgreSQL, environment variables, and HTTPS out of the box; fast to stand up; reasonable cost at this scale | Less control than a VPS; vendor-specific tooling | The department wants the lowest possible ongoing maintenance burden and no dedicated IT support |
| **Render** | Similar managed-platform simplicity to Railway; mature managed PostgreSQL offering; predictable pricing | Similar tradeoffs to Railway; slightly more configuration for background workers | Railway-equivalent choice, evaluated on pricing/region availability at decision time |
| **VPS (e.g., a general-purpose Linux VM)** | Full control; potentially lower long-term cost at steady scale; no vendor platform lock-in | Requires someone to own OS updates, database backups, TLS renewal, and process supervision — real ongoing operational work | The department has (or is willing to build) in-house capacity to own server operations long-term |
| **Department server** | Data stays on infrastructure VNIT/the department already controls; no external hosting cost | Depends entirely on the department's existing server capability (uptime, backup discipline, public HTTPS exposure, firewall/network setup) — unknown without confirmation from Harsh; risks becoming a bottleneck if IT support is limited | The department already operates a reliably maintained, internet-reachable server with someone responsible for its uptime and security patching |

**Recommendation pending confirmation:** Railway (or Render as a close equivalent) for Phase 1–2, specifically because the operating model described in the brief is a single developer (Claude Code) and a rotating student office-bearer (the Secretary) — not a dedicated ops team. A managed platform removes an entire category of operational risk (unpatched OS, expired TLS certificate, undiagnosed downtime) that a VPS or department server would otherwise place on the Secretary personally. If the department server option is confirmed as viable (existing uptime/support commitment), it is the strongest option for keeping data fully in-house long-term, and can be adopted in a later phase once the platform is proven, without a rewrite — the modular monolith architecture in `05_System_Architecture.md` does not lock in a hosting target.

This decision is tracked as open in `18_Open_Questions.md` and must be finalized before Day 14 of the MVP plan (`16_Project_Roadmap.md`).

## Domain & TLS

- Production is served at `myarch.in` (and `www.myarch.in` redirecting to the canonical host).
- TLS certificates are provisioned and auto-renewed by the hosting platform (Railway/Render both handle this natively) or, if self-hosted, via Let's Encrypt with automated renewal — manual certificate renewal is not an acceptable operational model given the small team.
- DNS is managed wherever the domain `myarch.in` is registered; access to that DNS control panel should be held by the Secretary (department-owned), not solely by an individual developer account, to avoid a single point of failure on domain control.

## Rollback Strategy

- Deployments are versioned (each production deploy tied to a specific git commit); rolling back means redeploying the previous known-good commit, not manually reverting files on the server.
- Database migrations are written to be backward-compatible where feasible (additive changes deployed ahead of code that depends on them) so a rollback of application code doesn't require an immediate matching database rollback.

## Assumptions

- The final hosting decision rests with the Secretary and is expected before Phase 1 completion; this document's recommendation is a default to unblock progress, not a decision made on the Secretary's behalf.
- Whichever platform is chosen must support: managed or easily-backed-up PostgreSQL, environment-variable secret storage, and automatic HTTPS — these are treated as non-negotiable regardless of which option is picked.
- A single production region is sufficient; there is no requirement for multi-region deployment given the department's geographically concentrated user base.

## Future Considerations

- If usage or data-sovereignty requirements change (e.g., an institutional mandate to host on VNIT infrastructure), migrating from a managed platform to a department server is expected to be an infrastructure change only, not an application rewrite, because the app has no hard dependency on any single platform's proprietary services.
- Revisit whether staging deployments should also require manual approval if staging ever handles anything beyond synthetic/anonymized data.
