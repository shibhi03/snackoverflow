# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /workspace

# Install workspace dependencies
FROM base AS deps
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci

# Generate Prisma client and build TypeScript
FROM deps AS build
COPY backend/ ./backend/
RUN npm --prefix backend run prisma:generate && npm --prefix backend run build

# Prune dev dependencies for lean runtime
FROM deps AS prod-deps
RUN npm prune --omit=dev

# Migration & seed stage
FROM base AS migrate
COPY --from=deps /workspace/package.json /workspace/package-lock.json ./
COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/backend/node_modules ./backend/node_modules
COPY --from=build /workspace/backend/prisma ./backend/prisma
COPY --from=build /workspace/backend/package.json ./backend/package.json
COPY --from=build /workspace/backend/node_modules/.prisma ./backend/node_modules/.prisma

WORKDIR /workspace/backend
USER node
ENTRYPOINT ["npx", "prisma", "migrate", "deploy", "--schema=prisma/schema.prisma"]

# Production API runtime
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=4000

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=prod-deps /workspace/package.json ./package.json
COPY --from=prod-deps /workspace/node_modules ./node_modules
COPY --from=prod-deps /workspace/backend/node_modules ./backend/node_modules
COPY --from=build /workspace/backend/dist ./backend/dist
COPY --from=build /workspace/backend/package.json ./backend/package.json
COPY --from=build /workspace/backend/prisma ./backend/prisma
COPY --from=build /workspace/backend/node_modules/.prisma ./backend/node_modules/.prisma

RUN chown -R appuser:appgroup /workspace
WORKDIR /workspace/backend
USER appuser

EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/server.js"]
