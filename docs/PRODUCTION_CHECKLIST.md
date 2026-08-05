# Production Readiness Checklist

**Date:** 2026-08-06 (updated same-day during the Production Deployment & Operational Readiness phase)
**Purpose:** The single go/no-go reference for deploying this system against real student data. Combines the Production Readiness Sprint's validation results, accessibility findings (Phase D — no separate document was requested for these), the remaining pre-launch action items that are outside application code, and the subsequent live-database validation performed during the deployment phase.

## Update: live PostgreSQL validation (Production Deployment & Operational Readiness phase)

Every item below marked "no live database available" at the time of the Production Readiness Sprint has since been re-validated against a **real PostgreSQL 16.4 instance** (provisioned specifically for this validation, then torn down — see `DEPLOYMENT_GUIDE.md`'s validation section for full detail):

- The initial Prisma migration was generated and applied (`prisma migrate dev`), and `prisma migrate deploy` — the actual production command — was verified to apply cleanly to a separate, fresh database.
- Login, the approval queue, student search, RBAC enforcement, the recruiter directory, and all four CSV exports were exercised over real HTTP against a real running production server (`next start`) backed by this real database.
- The full notification pipeline was validated end to end for real: approving a draft enqueued a real job, `npx tsx scripts/run-worker.ts --once` claimed it via the real `FOR UPDATE SKIP LOCKED` query and processed it, and both the `Notification` and `Job` rows ended in their correct terminal states.
- Backup (`pg_dump`) and restore (`pg_restore` into a fresh database) were performed for real, with full data-integrity verification.
- `GET /api/health` and `GET /api/health/ready` (both added in this phase) were verified against the live server and live database.

This substantially strengthens the assessment below — the gaps that remain are now genuinely only "needs a real hosting account/domain," not "needs a database to even test against."

## Automated validation gates (Phase F)

All run against the codebase as of this sprint, after every fix below was applied.

| Gate | Result |
|---|---|
| `prisma generate` | ✅ Pass |
| `tsc --noEmit` | ✅ Pass — 0 errors |
| `vitest run` | ✅ Pass — 514/514 tests, 63 test files |
| `eslint .` | ✅ Pass — 0 errors, 0 warnings |
| `next build` (production) | ✅ Pass — all 25 routes compiled (static + dynamic) |
| `npm audit` | ✅ Pass — 0 vulnerabilities |
| Background worker smoke test (`tsx scripts/run-worker.ts --once`) | ✅ At the time of this sprint, resolved all imports/registered the handler/reached the database call with no live database configured. **Superseded**: the subsequent Production Deployment & Operational Readiness phase ran this against a real PostgreSQL instance and confirmed it claims and processes a real job end to end — see the Update section above |
| Notification pipeline (unit + integration) | ✅ `notify() → job enqueued → worker claims → handler sends → Notification marked SENT`, plus retry and dead-letter paths, all covered and passing |
| Exports (all 4: student directory, batch report, public placement, recruiter directory) | ✅ Full pipeline tests passing (use case → CSV → exact column specs), plus DTO whitelist regression tests |
| Recruiter portal | ✅ 25 route-authorization tests, directory/profile/resume DTO whitelist tests, all passing |
| Authentication (login, refresh rotation, logout, `withAuth` middleware) | ✅ Passing, plus this sprint's new rate-limiter and JWT-algorithm hardening |

**At the time of this sprint, no live PostgreSQL instance was available in this development environment**, so every Prisma-backed repository was verified via (1) full TypeScript type-checking against the real Prisma Client, (2) in-memory fakes reproducing each repository's documented contract, and (3) direct code review of the one raw-SQL query in the codebase. **This gap has since been closed**: the Production Deployment & Operational Readiness phase provisioned a real PostgreSQL 16.4 instance and validated migrations, the full application, the worker, and backup/restore directly against it (see the Update section at the top of this document). Running the equivalent validation against your actual staging/production environment before go-live remains good practice — different infrastructure, different configuration — but this is no longer an unvalidated code path.

## Accessibility findings (Phase D)

Reviewed: keyboard navigation, focus management, ARIA labeling, semantic HTML, color contrast against the dark blueprint design tokens, and responsive layout.

**Fixed in this sprint:**

- `FieldError` (shared across every form in the app) had no `role="alert"` — a validation error appearing was not announced to screen reader users. **Fixed.**
- `TableHeaderCell` had no `scope="col"` — screen readers navigating a data table cell-by-cell could not reliably announce which column a cell belonged to. **Fixed** (verified all three usages are inside `<thead>`, so `scope="col"` is correct everywhere it's used).
- The admin/recruiter shell's active nav link was conveyed by color alone (accent tint), with no `aria-current="page"`. **Fixed.**
- The profile-review "request changes" comment field had only a `placeholder` and no associated `<label>` — placeholders are not a reliable accessible-name substitute (they disappear on input and aren't consistently exposed to assistive technology). **Fixed** — a proper `<Label htmlFor>` was added; the existing placeholder and its test selector were left intact.

**Verified sound, no change needed:**

- Color contrast: computed against the actual design tokens in `src/design-system/tokens.css` (not estimated) — primary text (`#ECEAE4`) on background (`#15171B`) is ~15:1 (far exceeds AAA); secondary text (`#8B8F98`) on both background and surface (`#1D2024`) is ~5:1–5.5:1 (passes AA for normal text); primary button text (background color on accent `#4FB8D4`) is ~7.8:1 (exceeds AAA).
- No `dangerouslySetInnerHTML`, so no raw-HTML-driven markup/contrast surprises.
- Native `<button>`/`<Link>`/`<input>`/`<textarea>`/`<select>` elements are used throughout (no custom non-semantic clickable `<div>`s found), so keyboard operability (Tab/Enter/Space) is correct by default everywhere reviewed.
- `<Input>`/`<Textarea>`/`<Select>` all replace the browser's default focus outline with a themed `focus:ring` — reviewed for visibility, not just presence; the ring is high-contrast against both background and surface tokens.

**Deferred (see `TECHNICAL_DEBT.md` for full detail and triggers):**

- No `aria-describedby` linking form fields to their error text (partial fix only — see above).
- No "skip to main content" link.
- `<Button>` doesn't customize its focus-visible style (relies on the browser default, which is compliant but visually inconsistent with the dark theme).

## Before go-live (outside this sprint's scope — infrastructure/ops, not code)

- [x] Run the full test suite, the worker, and a manual smoke test of login → profile approval → notification delivery against a real PostgreSQL instance — done against a temporary local instance during the Production Deployment & Operational Readiness phase (see the Update section above); repeating this against your actual staging environment before go-live is still recommended, since infrastructure/configuration differs.
- [ ] Decide and configure the hosting platform (`docs/planning/18_Open_Questions.md` Q1); confirm HTTPS is enforced end-to-end (NFR-SEC-08) and `NODE_ENV=production` is actually set (the refresh-token cookie's `Secure` flag and several other checks key off this).
- [ ] Decide and configure the production email provider (Q2); implement the chosen `EmailProvider` (SMTP/Resend/SES) — `createEmailProvider()`'s factory switch is the one place this plugs in.
- [ ] Set up scheduled, tested database backups with a documented restore procedure (NFR-SEC-09) before any real student data is loaded.
- [ ] Generate and securely store production values for `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` (distinct, long, random — `.env.example` documents the requirement; never reuse any value used in development/testing).
- [ ] Decide how `npm run worker` (or `npm run worker:once` on a schedule) actually runs in production — a persistent process/container, or an external scheduler/cron hitting the single-pass mode — based on the hosting platform chosen above.
- [ ] Run `npm audit` (or the CI equivalent) as a deploy gate going forward (NFR-SEC-11) — already clean today, but this must stay a standing gate, not a one-time check.
- [ ] Confirm the retention policy for graduated batches (NFR-SEC-12) is decided and, if it requires code (e.g. a scheduled archival job), implemented before the first batch actually graduates under the live system.

## Final production readiness assessment

**Ready to deploy.** The application layer — architecture, authorization, data-privacy boundaries, and the background job infrastructure — passed every automated gate and this sprint's manual security/architecture/performance/accessibility review, with three real, verified security gaps and four real accessibility gaps found and fixed (all listed above and in `SECURITY_AUDIT.md`). The Production Deployment & Operational Readiness phase then closed the one remaining unvalidated path by running migrations, the full application, the notification pipeline, and backup/restore against a real PostgreSQL instance — see the Update section at the top of this document. Nothing found across either phase blocks the code itself from running in production.

**What remains is entirely operational, not architectural:** a chosen hosting platform with HTTPS enforced, a real email provider, and a scheduled (not just tested-once) production backup routine. None of these are things the codebase can self-certify — they require an actual deployment target and a department decision, per `docs/planning/18_Open_Questions.md`. Once those are in place and the "Before go-live" checklist above is fully cleared, this system is ready for production use with real student data.
