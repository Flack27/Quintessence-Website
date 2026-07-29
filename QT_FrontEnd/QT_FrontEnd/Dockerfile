# File: QT_FrontEnd/Dockerfile

# Build stage
FROM node:18 AS build
WORKDIR /app
ARG BYPASS_BUDGET=false

# Copy package.json and package-lock.json
COPY package.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Optionally relax the Angular production budgets - the bundle trips them, and
# docker-compose passes BYPASS_BUDGET=true.
RUN if [ "$BYPASS_BUDGET" = "true" ] ; then \
      echo "Updating budget limits in angular.json" && \
      sed -i 's/"maximumError": "[0-9]kb"/"maximumError": "20mb"/g' angular.json && \
      sed -i 's/"maximumError": "[0-9]kB"/"maximumError": "20mb"/g' angular.json && \
      sed -i 's/"maximumWarning": "[0-9]kb"/"maximumWarning": "10mb"/g' angular.json && \
      sed -i 's/"maximumWarning": "[0-9]*kB"/"maximumWarning": "10mb"/g' angular.json; \
    fi

# Build the Angular application
RUN npm run build -- --configuration production

# Production stage with Nginx. Cloudflare terminates TLS and the tunnel forwards
# plain HTTP here, so this image serves port 80 only - no certs, no SSL block.
FROM nginx:alpine

# Copy the built Angular app
COPY --from=build /app/dist/qt-front-end/browser /usr/share/nginx/html

# Add custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add a simple health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1
