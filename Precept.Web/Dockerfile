# Stage 1: Build the React Application
FROM node:24-alpine AS build
WORKDIR /app

# Install dependencies first for better caching
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application using Vite
RUN npm run build

# Stage 2: Serve the application with NGINX
FROM nginx:alpine AS final

# Remove default NGINX static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy our custom NGINX configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
