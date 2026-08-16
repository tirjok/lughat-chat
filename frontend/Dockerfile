FROM node:24-alpine AS builder

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@11.21.0 --activate

# Workspace root — needed for pnpm-workspace.yaml + pnpm-lock.yaml
WORKDIR /app

# Copy workspace config and root package.json first (layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install workspace dependencies (resolves catalog: refs in frontend/package.json)
RUN pnpm install --frozen-lockfile

# Copy frontend source (build only the frontend workspace package)
COPY frontend/ ./frontend/

# Build the frontend workspace package
RUN cd frontend && pnpm build

# Stage 2: Serve with Nginx + reverse proxy to backend
FROM nginx:alpine AS production

# Remove default nginx config and copy custom config
RUN rm /etc/nginx/conf.d/default.conf
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built Nuxt files
COPY --from=builder /app/frontend/.output/public /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
