# Use official Node.js 22 slim runtime
FROM node:22-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production

# Install curl for container health check
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests first for caching
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application files
COPY . .

# Set non-root user permissions
RUN chown -R node:node /app
USER node

# Expose service port
EXPOSE 5003

# Health check hitting /health
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5003/health || exit 1

# Start server
CMD ["npm", "start"]
