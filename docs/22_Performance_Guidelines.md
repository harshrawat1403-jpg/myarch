# 22 — Performance Guidelines

## Purpose

Provides concrete, actionable guidance for keeping TNPArch fast at its actual scale, with particular attention to the parts of the product that are inherently heavier: image-dense portfolio profiles and brochure generation. Expands on the targets set in `04_Non_Functional_Requirements.md`.

## Scope

Covers frontend rendering performance, database query performance, and background job performance (brochure generation). Does not cover infrastructure-level scaling (out of scope given the confirmed usage scale — see Assumptions).

## Frontend Performance

- **Server Components by default.** Data-heavy, largely static views (student directory listing, profile view) render on the server and ship minimal client JavaScript — directly reducing time-to-interactive on the recruiter directory, which is likely accessed from varied (including mobile/slower) connections.
- **Responsive, optimized images.** Portfolio images (the platform's most performance-sensitive asset, per the brief's portfolio-first emphasis) use Next.js's built-in image optimization: served at appropriate sizes per viewport, lazy-loaded below the fold, with a placeholder/blur-up treatment consistent with the restrained-motion design principle (`12_Design_System.md`) rather than a jarring pop-in.
- **Avoid layout shift.** Skeleton components (`13_Component_Library.md`) match the dimensions of the content they precede, particularly for portfolio image grids where shift is most visually disruptive.
- **Bundle discipline.** Client-side JavaScript is added only where interactivity is genuinely needed (`11_UI_Architecture.md`); no client-side charting/animation library is introduced for what a CSS-only or server-rendered treatment can achieve.

## Database & Query Performance

- **Query scoping is also a performance concern, not just security.** Coordinator batch-scoped queries and recruiter directory searches are indexed on the fields they filter by (`batchId`, skill/software tags) so scoping doesn't degrade into a full-table scan as student counts grow across seasons.
- **Cursor-based pagination** (`10_API_Architecture.md`) on all list endpoints — offset-based pagination degrades on large offsets and is avoided.
- **N+1 query avoidance.** Prisma's `include`/`select` is used deliberately to fetch related data (e.g., a student's public profile plus their batch) in a single query shape, not via loops issuing per-record queries — reviewed specifically on the recruiter directory and admin dashboard, the two highest-traffic list views.
- **Dashboard aggregate statistics** (`04_Non_Functional_Requirements.md` NFR-PERF-04) are computed on demand if fast enough at real data volumes; if not, computed on a short cache with an explicit staleness indicator shown in the UI (consistent with the Title Block's "as of" date field, `12_Design_System.md`) rather than silently serving stale numbers with no indication.

## Background Job Performance (Brochure Generation, Phase 3)

- Brochure PDF/PPTX generation runs as an asynchronous background job (`06_Technology_Stack.md`, `10_API_Architecture.md`), never blocking the HTTP request that triggers it — the Secretary is not left staring at a spinner during a full-department PDF render.
- Target: a full department brochure completes generation in under one minute; if real-world generation exceeds this materially, the job is decomposed (e.g., pre-rendering statistics/images ahead of the final assembly step) rather than the target being quietly abandoned.
- Playwright's headless Chromium instance used for PDF rendering is reused/pooled rather than launched fresh per request, to avoid unnecessary startup overhead on repeated brochure regeneration during editing (Phase 3's editable sections imply iterative re-generation while drafting a brochure).

## Asset Delivery

- Resumes, portfolio images, and brochure exports are served from object storage (`06_Technology_Stack.md`) via signed URLs, not proxied through the application server — keeping the app server free to handle actual request logic rather than acting as a file server.

## What Is Explicitly Not a Performance Priority

- Sub-100ms API response times are not a stated goal; the platform's usage pattern (bursty around placement season, tens of concurrent users at peak, per `04_Non_Functional_Requirements.md` Assumptions) does not justify optimization effort beyond "comfortably fast for a human clicking through an admin tool."
- Horizontal scaling / load balancing across multiple app instances is not a Phase 1–3 concern given the confirmed scale; a single well-sized instance from the chosen hosting platform is sufficient.

## Assumptions

- Real scale remains in the low hundreds of students per batch and a handful of active batches, as established in `04_Non_Functional_Requirements.md` — these guidelines are calibrated to that scale, not generic high-traffic SaaS scale.
- Image assets (portfolio work) are the dominant performance risk in this specific product, more so than typical text/table-heavy admin tooling — guidelines are weighted accordingly.

## Future Considerations

- If the platform expands to other departments or usage scale grows materially, revisit whether dashboard statistics need a proper caching layer (e.g., materialized views or a lightweight cache) rather than on-demand computation.
- If brochure generation volume grows (e.g., generated far more frequently than once per placement season), consider extracting the rendering job into a separate worker process, as anticipated in `05_System_Architecture.md` Future Considerations.
