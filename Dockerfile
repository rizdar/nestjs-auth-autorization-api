# ─── Stage 1: Build ───────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies untuk build (termasuk devDependencies)
COPY package*.json ./
RUN npm ci

# Copy prisma schema & generate
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy semua source code
COPY . .

# Build NestJS → menghasilkan /app/dist
RUN npm run build

# Verifikasi build berhasil
RUN ls -la dist/

# ─── Stage 2: Production ──────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy prisma & generate client
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy hasil build dari stage 1
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated

# Buat folder uploads
RUN mkdir -p uploads/products

EXPOSE 8000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]