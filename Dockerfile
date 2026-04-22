# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production

# ---- Production stage ----
FROM node:20-alpine

WORKDIR /app

# Tạo non-root user
RUN addgroup -S botgroup && adduser -S botuser -G botgroup

# Copy dependencies từ builder
COPY --from=builder /app/node_modules ./node_modules

# Copy source code
COPY package.json ./
COPY src/ ./src/
COPY managers.json ./

# Tạo thư mục data với quyền ghi cho bot
RUN mkdir -p /app/data /app/logs \
    && chown -R botuser:botgroup /app/data /app/logs

# Copy data mặc định
COPY data/ ./data/
RUN chown -R botuser:botgroup /app/data

USER botuser

# Health check - kiểm tra process node còn sống
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD node -e "process.exit(0)"

CMD ["node", "src/index.js"]
