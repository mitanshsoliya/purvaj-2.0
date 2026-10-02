# PURVAJ 2.0 - Production Server Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies only (include dev if building needed)
RUN npm ci --only=production

# Copy application source
COPY . .

# Multi-stage lean runtime image
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production \
    PORT=5000

# Install curl for container healthcheck
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy built application and modules from builder
COPY --from=builder --chown=appuser:appgroup /app /app

# Create upload directory with proper permissions
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app/uploads

# Switch to non-root user
USER appuser

# Expose backend port
EXPOSE 5000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/health/live || exit 1

# Start production server
CMD ["node", "src/server.js"]
