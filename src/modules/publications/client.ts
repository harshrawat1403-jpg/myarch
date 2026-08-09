/**
 * Client-safe entry point for the publications module — deliberately
 * separate from `./index.ts`, which re-exports server-only code (route
 * handlers backed by the composition root's `container.ts`, which pulls in
 * Playwright/pptxgenjs for the export pipeline). A "use client" component
 * importing a runtime value (not just a type) from the SAME barrel as that
 * server code forces Next.js to try bundling Playwright for the browser —
 * confirmed the hard way (build failure: "Can't resolve 'tls'", Playwright's
 * own Node-only dependency). Mirrors auth/client.ts's exact same split.
 *
 * `domain/blocks.ts` has zero external dependencies (no Prisma, no Node
 * built-ins) — genuinely safe to run in the browser, which is exactly what
 * this file exists to prove by being the only thing re-exported from it.
 */
export { ACCENT_COLORS, FONT_PAIRINGS, DEFAULT_STYLE, findAccentColor, findFontPairing } from "./domain/blocks";
export type {
  PublicationBlock,
  PublicationContent,
  PublicationStyle,
  PublicationBlockType,
  PublicationDataBindingKind,
} from "./domain/blocks";
