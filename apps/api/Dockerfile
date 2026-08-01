FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/analytics/package.json packages/analytics/package.json
RUN pnpm install --frozen-lockfile=false
COPY . .
RUN pnpm --filter @hevy/analytics build && pnpm --filter @hevy/api prisma:generate && pnpm --filter @hevy/api build

# The Compose development service uses this stage with a bind-mounted workspace.
# It retains tsx and the Prisma CLI so source edits restart the API without an image rebuild.
FROM build AS development
WORKDIR /app

FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/packages/analytics/package.json ./packages/analytics/package.json
COPY --from=build /app/packages/analytics/dist ./packages/analytics/dist
WORKDIR /app/apps/api
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
