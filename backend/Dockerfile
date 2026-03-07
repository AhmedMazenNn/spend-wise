# Use Node.js LTS (20) slim as the base image (more robust DNS than alpine)
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
# We copy from the backend directory
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the backend files
COPY backend/ .

# Expose the API port (7860 is the default for Hugging Face Spaces)
EXPOSE 7860

# Start the Node.js server
CMD ["node", "server.js"]
