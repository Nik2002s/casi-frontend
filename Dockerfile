# ── CASI Frontend — Production Dockerfile ─────────────────────────────────────
# Builds the React app and serves it via nginx

FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci --silent

COPY . .
RUN npm run build

# ── Serve stage ───────────────────────────────────────────────────────────────
FROM nginx:alpine AS serve

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# nginx config: SPA routing + proxy /api → backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost/api/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
