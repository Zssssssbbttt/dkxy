FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package*.json ./
RUN npm ci
COPY . .
COPY scripts/init-db.sh ./scripts/
RUN chmod +x ./scripts/init-db.sh
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ./scripts/init-db.sh && npm run start
