# TNPArch — production container image.
#
# Two runtime targets share the same build: `web` (the Next.js server,
# using the minimal `output: "standalone"` bundle) and `worker` (the
# background job worker, scripts/run-worker.ts, run via tsx since it's a
# standalone Node script rather than part of the Next.js build).
#
# Build:  docker build --target web    -t tnparch-web    .
#         docker build --target worker -t tnparch-worker .
# See DEPLOYMENT_GUIDE.md for full build/run/deploy instructions.

FROM node:22-alpine AS base
WORKDIR /app
# Prisma's query engine needs OpenSSL on Alpine.
RUN apk add --no-cache openssl

# ---------------------------------------------------------------------------
# deps: install once, reused by both the build and the worker image.
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci

# ---------------------------------------------------------------------------
# builder: generate the Prisma client and produce the Next.js standalone build.
# ---------------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------------------------------------------------------------------------
# web: minimal production web server — only the standalone bundle, static
# assets, and public files. No devDependencies, no source TypeScript.
# ---------------------------------------------------------------------------
FROM base AS web
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
RUN mkdir -p /app/storage/uploads && chown -R nextjs:nodejs /app/storage
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
USER nextjs
EXPOSE 3000
ENV PORT=3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]

# ---------------------------------------------------------------------------
# worker: the background job worker. Needs the full node_modules (tsx,
# Prisma client, ts-node-free direct TS execution) and source tree, not the
# slim standalone bundle — this is a plain long-running Node script, not a
# Next.js request handler.
# ---------------------------------------------------------------------------
FROM base AS worker
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S worker -G nodejs
RUN mkdir -p /app/storage/uploads && chown -R worker:nodejs /app/storage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY package.json ./
COPY prisma ./prisma
COPY scripts ./scripts
COPY src ./src
COPY tsconfig.json ./
USER worker
CMD ["npx", "tsx", "scripts/run-worker.ts"]
