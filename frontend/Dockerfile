# Stage 1: Build the Nuxt.js application
FROM node:24-alpine AS builder

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@11.21.0 --activate

WORKDIR /app

# Copy package files first (for better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application (produces .output directory)
RUN pnpm build

# Stage 2: Serve with Nginx + reverse proxy to backend
FROM nginx:alpine AS production

# Remove default nginx config and copy custom config
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built Nuxt files
COPY --from=builder /app/.output/public /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
