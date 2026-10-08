# Based on vercel/next.js examples/with-docker. Adds a `dev` target for local
# hot reload and ships bundled scripts + migrations in the runner image.
ARG NODE_VERSION=24-slim

FROM node:${NODE_VERSION} AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS dev
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]

FROM deps AS builder
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/dist-scripts ./dist-scripts
COPY --from=builder --chown=node:node /app/src/db/migrations ./src/db/migrations
USER node
EXPOSE 3000
CMD ["node", "server.js"]
