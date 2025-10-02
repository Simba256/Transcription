FROM node:20

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./

# Install dependencies (including dev dependencies for development)
RUN npm ci

# Copy source code
COPY . .

# Expose the port Next.js runs on
EXPOSE 3000

# Start the development server
CMD ["npm", "run", "dev"]