# ── CASI Frontend — Production Dockerfile ─────────────────────────────────────
# Builds the React app and serves it via nginx

FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci --silent

# ✅ Build-time args (important)
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID

# ✅ Make them available to Vite
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID

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
