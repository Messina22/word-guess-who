FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Build the application
FROM base AS builder
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build:client

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code (server runs from source with Bun)
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Copy built client assets
COPY --from=builder /app/dist/client ./dist/client

# Copy config files
COPY --from=builder /app/configs ./configs

# Create data directory for SQLite (will be mounted as volume)
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["bun", "run", "src/server/index.ts"]
