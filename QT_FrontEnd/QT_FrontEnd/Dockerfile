# File: QT_FrontEnd/QT_FrontEnd/Dockerfile
#
# The build context is the repo root (set in docker-compose.yml), not this
# folder, because one nginx image serves two frontends:
#   /        the Angular site       (QT_FrontEnd/QT_FrontEnd)
#   /guides  the Codex, React/Vite  (codex)
# All COPY paths below are therefore relative to the repo root.

# ---- Stage 1: the Angular site ----
FROM node:18 AS angular-build
WORKDIR /app
ARG BYPASS_BUDGET=false

COPY QT_FrontEnd/QT_FrontEnd/package.json ./
RUN npm install

COPY QT_FrontEnd/QT_FrontEnd/ ./

# Optionally relax the Angular production budgets - the bundle trips them, and
# docker-compose passes BYPASS_BUDGET=true.
RUN if [ "$BYPASS_BUDGET" = "true" ] ; then \
      echo "Updating budget limits in angular.json" && \
      sed -i 's/"maximumError": "[0-9]kb"/"maximumError": "20mb"/g' angular.json && \
      sed -i 's/"maximumError": "[0-9]kB"/"maximumError": "20mb"/g' angular.json && \
      sed -i 's/"maximumWarning": "[0-9]kb"/"maximumWarning": "10mb"/g' angular.json && \
      sed -i 's/"maximumWarning": "[0-9]*kB"/"maximumWarning": "10mb"/g' angular.json; \
    fi

RUN npm run build -- --configuration production

# ---- Stage 2: the Codex ----
# vite.config.ts sets base "/guides/" and outDir "dist/guides", so the build
# output already has the right shape and the right internal URLs - it drops
# straight into the html root below with no rewriting.
FROM node:18 AS codex-build
WORKDIR /codex

COPY codex/package.json codex/package-lock.json ./
RUN npm ci

COPY codex/ ./
RUN npm run build

# ---- Stage 3: nginx ----
# Cloudflare terminates TLS and the tunnel forwards plain HTTP here, so this
# image serves port 80 only - no certs, no SSL block.
FROM nginx:alpine

COPY --from=angular-build /app/dist/qt-front-end/browser /usr/share/nginx/html
COPY --from=codex-build /codex/dist/guides /usr/share/nginx/html/guides

COPY QT_FrontEnd/QT_FrontEnd/nginx.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1
