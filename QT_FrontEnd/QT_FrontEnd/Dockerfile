# File path: QT_FrontEnd/Dockerfile

# Build stage
FROM node:18 AS build
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the Angular application
RUN npm run build -- --configuration production

# Production stage with Nginx
FROM nginx:alpine
COPY --from=build /app/dist/qt-front-end /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
