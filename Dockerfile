# syntax=docker/dockerfile:1

FROM node:24-trixie-slim AS base
WORKDIR /app
RUN npm install -g pnpm@12.6.0

# Stage 1: Install all dependencies and compile TypeScript
FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
RUN pnpm install --frozen-lockfile
COPY src ./src
RUN pnpm run build

# Stage 2: Install production dependencies only (including sqlite3 native binary)
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Stage 3: Minimal production runtime image
FROM node:24-trixie-slim AS runner
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=8080 \
    DB_STORAGE=/app/data/todo.sqlite

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json openapi.json ./

RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/health || exit 1

CMD ["node", "dist/index.js"]
