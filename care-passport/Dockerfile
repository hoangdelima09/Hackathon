# syntax=docker/dockerfile:1.7
# Care Passport app (Next.js). TideCloak itself runs in the `tidecloak` container created by
# `npm run init`. Build AFTER init: data/tidecloak.json is compiled into the client bundle.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM node:22-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN test -f data/tidecloak.json || (echo "data/tidecloak.json is missing: run 'npm run init' first" >&2; exit 1)
RUN npm run build

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json /app/next.config.ts ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
# data/ (adapter JSON + app-db.json) is mounted at runtime, see compose.yaml.
USER node
EXPOSE 4300
CMD ["npm", "run", "start"]
