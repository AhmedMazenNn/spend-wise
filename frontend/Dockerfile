# Stage 1: Build the Vite frontend React app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install
COPY package*.json ./
RUN npm install

# Copy source and build the application
COPY . .
RUN npm run build


# Stage 2: Serve the production build using Nginx
FROM nginx:alpine

# The Vite build output is in dist/ by default
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy a custom nginx configuration to handle React client-side routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
