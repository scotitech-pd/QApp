# OnQ web — build from repo root: docker build -f apps/web/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY prisma ./prisma
RUN npm ci
COPY apps/web ./apps/web
COPY tsconfig.base.json ./
ARG NEXT_PUBLIC_API_BASE_URL=https://onq.scotitech.com
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
# Maps key is compiled into the browser bundle (normal for Maps JS); the
# Google Cloud referrer restriction is what secures it.
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=""
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
RUN npm run build:web

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/package.json ./apps/web/
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
EXPOSE 3000
CMD ["sh", "-c", "cd apps/web && ../../node_modules/.bin/next start --port 3000"]
