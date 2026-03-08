# Use Node.js LTS (20) full image for better networking stability
FROM node:20

# Set working directory
WORKDIR /app


# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies (including production-only for smaller footprint)
RUN npm install

# Copy the rest of the backend files
COPY . .

# Expose the API port (7860 is the default for Hugging Face Spaces)
EXPOSE 7860

# Ensure server binds to all interfaces
ENV HOST=0.0.0.0

# Start the Node.js server
CMD ["node", "server.js"]
