# Stage 1: Install deps
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Injection dyal les variables l-Next.js f l-code JavaScript (Browser)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Injection dyal l'URL interne dyal Docker bach l-Proxy y-qraha f l-Build
ARG BACKEND_URL
ENV BACKEND_URL=$BACKEND_URL

# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# 🔥 FIX: Port redinah 3827 hna bach Next.js ylanci fih
ENV PORT 3827

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Mode Standalone dyal Next.js
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
# 🔥 FIX: Expose 3827
EXPOSE 3827
CMD ["node", "server.js"]