# Stage 1: Build the Nuxt.js application
FROM node:20-alpine AS builder

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate

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

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config for SPA + reverse proxy
RUN cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
    listen 80;
    server_name _;

    # Increase max body size for larger text payloads (up to 3000 chars)
    client_max_body_size 50m;

    # Proxy API requests to backend container
    location /api/ {
        proxy_pass http://backend:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Prevent 504 Gateway Timeout for long TTS synthesis (up to ~10min)
        proxy_read_timeout 1800s;
        proxy_send_timeout 1800s;
        proxy_connect_timeout 10s;

        # Disable buffering for large audio responses
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Proxy downloads to backend container
    location /downloads/ {
        proxy_pass http://backend:8090;
        proxy_set_header Host $host;

        # Large file support
        proxy_read_timeout 1800s;
        proxy_send_timeout 1800s;
        proxy_buffering off;
    }

    # Proxy health check to backend container
    location /health {
        proxy_pass http://backend:8090;
        proxy_set_header Host $host;
        proxy_read_timeout 30s;
    }

    # Local health check endpoint (for docker-compose)
    location /nginx-health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # SPA fallback - serve index.html for all routes
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;

        # Static asset caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF

# Copy built Nuxt files
COPY --from=builder /app/.output/public /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
