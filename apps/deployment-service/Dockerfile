# Stage 1: Build
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npx prisma generate --schema=apps/deployment-service/prisma/schema.prisma && \
    node -e "const fs=require('fs'),p='node_modules/@prisma/client/package.json',pkg=JSON.parse(fs.readFileSync(p,'utf8'));pkg.exports['./deployment']={'require':'./deployment/index.js','import':'./deployment/index.js','default':'./deployment/index.js'};fs.writeFileSync(p,JSON.stringify(pkg,null,2));"

RUN npx nx build deployment-service --prod

FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app
# ENV NODE_ENV=production

COPY --from=builder /app/dist/apps/deployment-service ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3001

CMD ["node", "dist/main.js"]
