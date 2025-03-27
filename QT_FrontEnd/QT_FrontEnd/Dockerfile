# Build stage
FROM node:18 AS build
WORKDIR /app
ARG BYPASS_BUDGET=false
# Copy package.json and package-lock.json
COPY package*.json ./
RUN npm ci
# Copy the rest of the application
COPY . .
RUN if [ "$BYPASS_BUDGET" = "true" ] ; then \
      echo "Updating budget limits in angular.json" && \
      sed -i 's/"maximumError": "[0-9]*kb"/"maximumError": "20mb"/g' angular.json && \
      sed -i 's/"maximumError": "[0-9]*kB"/"maximumError": "20mb"/g' angular.json && \
      sed -i 's/"maximumWarning": "[0-9]*kb"/"maximumWarning": "10mb"/g' angular.json && \
      sed -i 's/"maximumWarning": "[0-9]*kB"/"maximumWarning": "10mb"/g' angular.json; \
    fi
    
# Build the Angular application
RUN npm run build -- --configuration production

# Production stage
FROM nginx:stable-alpine
# Copy built files from the build stage
COPY --from=build /app/dist/* /usr/share/nginx/html/
# Create SSL directory
RUN mkdir -p /etc/nginx/ssl
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
