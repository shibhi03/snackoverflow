# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache libc6-compat
WORKDIR /workspace

# Install workspace dependencies
FROM base AS deps
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci

# Build Next.js standalone bundle
FROM deps AS build
COPY frontend/ ./frontend/

ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN npm --prefix frontend run build

# Minimal Next.js runtime
FROM base AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /workspace/frontend/.next/standalone ./
COPY --from=build /workspace/frontend/.next/static ./frontend/.next/static
RUN mkdir -p ./frontend/public && chown -R appuser:appgroup /workspace

USER appuser

EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "frontend/server.js"]
