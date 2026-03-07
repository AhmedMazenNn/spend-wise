# Use Node.js LTS (20) slim as the base image (more robust DNS than alpine)
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies inside the container
RUN npm install

# Copy the rest of the backend files
COPY . .

# Expose the API port (7860 is the default for Hugging Face Spaces)
EXPOSE 7860

# Start the Node.js server
CMD ["npm", "start"]
