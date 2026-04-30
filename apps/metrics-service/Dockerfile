# Stage 1: Build
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npx prisma generate --schema=apps/metrics-service/prisma/schema.prisma && \
    node -e "const fs=require('fs'),p='node_modules/@prisma/client/package.json',pkg=JSON.parse(fs.readFileSync(p,'utf8'));pkg.exports['./metrics']={'require':'./metrics/index.js','import':'./metrics/index.js','default':'./metrics/index.js'};fs.writeFileSync(p,JSON.stringify(pkg,null,2));"

RUN npx nx build metrics-service --prod

# Stage 2: Run
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY --from=builder /app/dist/apps/metrics-service ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3004

CMD ["node", "dist/main.js"]
