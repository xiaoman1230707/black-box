# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE=node:24.18.0-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d

FROM ${NODE_IMAGE} AS os-base
RUN apt-get update \
  && apt-get install --yes --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

FROM os-base AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable \
  && corepack prepare pnpm@11.9.0 --activate \
  && printf '%s\n' \
    'allowBuilds:' \
    '  "@nestjs/core": true' \
    '  "@prisma/client": true' \
    '  "@prisma/engines": true' \
    '  "bcrypt": true' \
    '  "prisma": true' \
    '  "sharp": true' \
    '  "unrs-resolver": true' \
    > pnpm-workspace.yaml

FROM base AS build
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY nest-cli.json prisma.config.ts tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
  pnpm exec prisma generate --schema prisma/schema.prisma
COPY src ./src
RUN pnpm build \
  && mkdir -p dist/src/scripts/fixtures/phase4-demo-images \
  && cp -R src/scripts/fixtures/phase4-demo-images/. dist/src/scripts/fixtures/phase4-demo-images/

FROM base AS prod-deps
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --prod --frozen-lockfile \
  && pnpm exec prisma generate --schema prisma/schema.prisma \
  && pnpm store prune

FROM os-base AS runtime
ARG RELEASE_SHA
ARG NODE_IMAGE_INDEX_DIGEST=sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d
ARG NODE_IMAGE_AMD64_DIGEST=sha256:d45d78e7929b46875bbd4e29bea672d5bc48186c6c3588306521c815e78352d6
LABEL org.opencontainers.image.title="black-box-api" \
  org.opencontainers.image.revision=$RELEASE_SHA \
  org.opencontainers.image.base.digest.index=$NODE_IMAGE_INDEX_DIGEST \
  org.opencontainers.image.base.digest.linux-amd64=$NODE_IMAGE_AMD64_DIGEST
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

RUN groupadd --gid 10001 app \
  && useradd --uid 10001 --gid 10001 --no-create-home --shell /usr/sbin/nologin app \
  && mkdir -p /app/uploads \
  && chown -R 10001:10001 /app

COPY --from=prod-deps --chown=10001:10001 /app/node_modules ./node_modules
COPY --from=prod-deps --chown=10001:10001 /app/package.json ./package.json
COPY --from=prod-deps --chown=10001:10001 /app/prisma ./prisma
COPY --from=build --chown=10001:10001 /app/dist ./dist

USER 10001:10001
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api',{signal:AbortSignal.timeout(3000)}).then(r=>{if(!r.ok)throw new Error(String(r.status))}).catch(()=>process.exit(1))"]
CMD ["node", "dist/src/main.js"]
