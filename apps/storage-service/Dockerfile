# Stage 1: Build
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npx prisma generate --schema=apps/storage-service/prisma/schema.prisma && \
    node -e "const fs=require('fs'),p='node_modules/@prisma/client/package.json',pkg=JSON.parse(fs.readFileSync(p,'utf8'));pkg.exports['./storage']={'require':'./storage/index.js','import':'./storage/index.js','default':'./storage/index.js'};fs.writeFileSync(p,JSON.stringify(pkg,null,2));"

RUN npx nx build storage-service --prod

# Stage 2: Run
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY --from=builder /app/dist/apps/storage-service ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3006

CMD ["node", "dist/main.js"]
