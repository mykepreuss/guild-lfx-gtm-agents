FROM node:24-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && npm cache clean --force

COPY adapter.mjs contracts.mjs envelope-encryption.mjs http-service.mjs ./
COPY identity.mjs postgres-adapter.mjs server.mjs ./
COPY postgres/migrate.mjs postgres/schema.sql ./postgres/

USER node
CMD ["node", "server.mjs"]
