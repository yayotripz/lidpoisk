# syntax=docker/dockerfile:1.7

# ============================================================
# Stage 1: deps — install all dependencies with bun
# ============================================================
FROM oven/bun:1.3 AS deps
WORKDIR /app

COPY package.json bun.lock* ./
COPY prisma ./prisma

# Install dependencies (including devDeps — needed for build)
RUN bun install --frozen-lockfile || bun install

# ============================================================
# Stage 2: builder — compile Next.js standalone
# ============================================================
FROM oven/bun:1.3 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build Next.js (outputs .next/standalone, .next/static)
RUN bun run build

# Generate Prisma client (used at runtime)
RUN bun run db:generate

# ============================================================
# Stage 3: runner — minimal runtime image
# ============================================================
FROM oven/bun:1.3 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL="file:/var/data/custom.db"

# wget нужен для healthcheck (есть в base image, но на всякий случай)
RUN apt-get update && apt-get install -y --no-install-recommends wget sqlite3 ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy standalone server, static assets, public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma runtime files
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/src/lib ./src/lib
COPY --from=builder --chown=nextjs:nodejs /app/prisma/seed.ts ./prisma/seed.ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Seed DB (3265 leads) — будет скопирован в volume при первом старте
COPY --chown=nextjs:nodejs db/seed.db /app/seed.db

# Persistent volume mount point (Render монтирует сюда disk)
RUN mkdir -p /var/data && chown -R nextjs:nodejs /var/data
VOLUME ["/var/data"]

# Entrypoint: при первом запуске копируем seed.db → /var/data/custom.db
COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["bun", "server.js"]
