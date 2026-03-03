# Use Node.js LTS (20) as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies inside the container
RUN npm install

# Copy the rest of the backend files
COPY . .

# Expose the API port
EXPOSE 8000

# Start the Node.js server
CMD ["npm", "start"]
