# OnQ API — build from repo root: docker build -f apps/api/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY prisma ./prisma
RUN npm ci
COPY apps/api ./apps/api
COPY tsconfig.base.json* ./
RUN npx prisma generate && npm run build:api

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY package.json ./
EXPOSE 4000
# Apply migrations, then serve.
CMD ["sh", "-c", "npx prisma migrate deploy && node apps/api/dist/index.js"]
