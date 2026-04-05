# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate --schema=apps/scheduler-service/prisma/schema.prisma
RUN npx nx build scheduler-service --prod

FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app
# ENV NODE_ENV=production

COPY --from=builder /app/dist/apps/scheduler-service ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3002

CMD ["node", "dist/main.js"]
