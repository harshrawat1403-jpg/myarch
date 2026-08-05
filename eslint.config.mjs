import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    // Enforces the module-boundary rule from
    // docs/architecture/07_Repository_Structure.md: code OUTSIDE a feature
    // module may only import that module's public index.ts, never reach
    // into its domain/application/infrastructure/presentation folders
    // directly. This is intentionally scoped to exclude src/modules/**
    // itself: a module composing its OWN layers (e.g. its container.ts
    // wiring infrastructure into use cases, or its route handlers importing
    // that container) is normal internal construction, not a boundary
    // violation — the rule's job is to stop EXTERNAL reach-in, not to ban a
    // module from using its own code.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/modules/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/modules/*/domain/*",
                "@/modules/*/application/*",
                "@/modules/*/infrastructure/*",
                "@/modules/*/presentation/*",
              ],
              message:
                "Import from the module's index.ts instead of reaching into its internal layers (docs/architecture/07_Repository_Structure.md).",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "prisma/migrations/**"],
  },
];

export default eslintConfig;
