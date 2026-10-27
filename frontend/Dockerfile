# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html vite.config.js ./
COPY src/ src/
RUN node --test src/components/SafeMessageContent.test.js src/utils/aiMessages.test.js \
    && npm run build

FROM nginx:1.28-alpine AS runtime-base
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
# Static configuration; do not run the base image's config-editing entrypoint.
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]

# CI receives the static build produced and tested by the frontend job.
FROM runtime-base AS ci-runtime
COPY nginx.conf /etc/nginx/nginx.conf
COPY dist/ /usr/share/nginx/html/

# Keep the default local/Compose build self-contained, including its tests.
FROM runtime-base AS runtime
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /workspace/dist/ /usr/share/nginx/html/
