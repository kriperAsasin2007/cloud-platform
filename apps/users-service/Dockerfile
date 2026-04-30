FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate --schema=apps/users-service/prisma/schema.prisma && \
    node -e "const fs=require('fs'),p='node_modules/@prisma/client/package.json',pkg=JSON.parse(fs.readFileSync(p,'utf8'));pkg.exports['./users']={'require':'./users/index.js','import':'./users/index.js','default':'./users/index.js'};fs.writeFileSync(p,JSON.stringify(pkg,null,2));"
RUN npx nx build users-service --prod

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY --from=builder /app/dist/apps/users-service ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3005
CMD ["node", "dist/main.js"]
