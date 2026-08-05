# TNPArch — Department Training & Placement Portal

**Documentation Index**

Department of Architecture & Planning, VNIT Nagpur
Domain: `tnparch.in`
Prepared by: Harsh Rawat, Training & Placement Secretary

## What This Is

TNPArch is a private, department-owned Training & Placement Management Platform for the Department of Architecture & Planning at VNIT Nagpur. It replaces WhatsApp/Excel/email-based placement coordination with a single system of record, built around a strict separation between a student's private academic data and their public, recruiter-facing, portfolio-first profile.

Full context: [`01_Product_Vision.md`](01_Product_Vision.md).

## How This Documentation Is Organized

This `docs/` directory is the complete project foundation, written before any implementation begins. Documents are numbered in reading order and grouped into subdirectories by concern:

```
docs/
├── 01_Product_Vision.md
├── 02_Project_Objectives.md
├── 03_Functional_Requirements.md
├── 04_Non_Functional_Requirements.md
├── architecture/
│   ├── 05_System_Architecture.md
│   ├── 06_Technology_Stack.md
│   └── 07_Repository_Structure.md
├── database/
│   └── 08_Database_Design.md
├── security/
│   ├── 09_User_Roles_and_Permissions.md
│   └── 14_Security_Architecture.md
├── api/
│   └── 10_API_Architecture.md
├── design/
│   ├── 11_UI_Architecture.md
│   ├── 12_Design_System.md
│   └── 13_Component_Library.md
├── deployment/
│   └── 15_Deployment_Strategy.md
├── planning/
│   ├── 16_Project_Roadmap.md
│   ├── 17_Risk_Assessment.md
│   ├── 18_Open_Questions.md
│   └── 19_Decision_Log.md
├── 20_Coding_Standards.md
├── 21_Testing_Strategy.md
├── 22_Performance_Guidelines.md
├── 23_Accessibility_Guidelines.md
├── 24_Git_Workflow.md
├── 25_Contributing_Guide.md
└── CHANGELOG.md
```

## Where To Start

| If you are... | Start with |
|---|---|
| New to the project entirely | `01_Product_Vision.md` → `02_Project_Objectives.md` → `03_Functional_Requirements.md` |
| About to write code | `25_Contributing_Guide.md`, which points you through the rest in the right order |
| The Secretary or a Coordinator, non-technical | `01_Product_Vision.md`, `02_Project_Objectives.md`, `16_Project_Roadmap.md`, `18_Open_Questions.md` |
| Reviewing security posture before go-live | `14_Security_Architecture.md`, `04_Non_Functional_Requirements.md` |
| Looking for what's still undecided | `18_Open_Questions.md` |
| Looking for why a specific decision was made | `19_Decision_Log.md` |

## Current Status

**Version 1.0.0 is complete and released** — this documentation set now describes an implemented, tested, and production-validated system, not just a plan. Implementation followed the phased plan in `16_Project_Roadmap.md`; the full history of what was built, day by day, is in `CHANGELOG.md`. For the current architecture (as opposed to this document set's original pre-implementation design intent), see the top-level `README.md` and `SYSTEM_ARCHITECTURE.md`, `API_REFERENCE.md`, and the other operational documents alongside this one.

Three decisions remain genuinely open, unblocking further only when the department decides — see `18_Open_Questions.md` for full detail:

1. Deployment hosting target (the application deploys unchanged to any Docker-compatible host — see `../DEPLOYMENT_GUIDE.md` — but none has been designated)
2. Production email provider (only a development/logging provider is implemented; adding a real one is a small, additive change once chosen)
3. Graduated batch retention policy (not urgent — no batch has graduated under the live system yet)

Coordinator access criteria (the former Q4) is not an architectural blocker — it is an operating decision the Secretary can make and change at any time via the admin dashboard.

## Responsibility Split

Per the project brief:

- **Claude Code** (this repository's implementation): backend, frontend, authentication, database, APIs, security, deployment, production architecture.
- **ChatGPT** (separate, non-code deliverables): documentation, content writing, brochure content, placement communication templates, QA scenarios, testing checklists, faculty/HOD documents, user-facing help text, workflow planning.

This `docs/` directory is authored on the Claude Code side as the technical project foundation; it is complementary to, not a replacement for, the non-code planning deliverables described above.

## Design Identity (Summary)

Dark, architectural drafting-sheet aesthetic — not a generic SaaS dashboard. Background `#15171B`, panel `#1D2024`, primary text `#ECEAE4`, secondary text `#8B8F98`, accent `#4FB8D4` (Blueprint Cyan). Display type in General Sans, body in IBM Plex Sans, data labels in IBM Plex Mono. Signature reused element: the **Title Block**, a technical-drawing-style metadata panel appearing across dashboards, profiles, drive cards, and statistics panels. Full detail in `design/12_Design_System.md`.

## Maintaining This Documentation

This documentation set should stay current as the platform evolves:

- New/changed decisions → `planning/19_Decision_Log.md`
- New open questions → `planning/18_Open_Questions.md`
- Shipped work → `CHANGELOG.md`
- Structural or scope changes → the relevant numbered document itself, not just this index
