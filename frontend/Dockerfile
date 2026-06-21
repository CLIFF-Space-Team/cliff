## CLIFF frontend container — Next.js 14 standalone build.

FROM node:18-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund


FROM node:18-alpine AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build


FROM node:18-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

RUN addgroup --system --gid 1001 cliff \
 && adduser --system --uid 1001 cliff

COPY --from=builder /app/public ./public
COPY --from=builder --chown=cliff:cliff /app/.next/standalone ./
COPY --from=builder --chown=cliff:cliff /app/.next/static ./.next/static

USER cliff
EXPOSE 3000

CMD ["node", "server.js"]
