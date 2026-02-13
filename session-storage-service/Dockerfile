FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source
COPY src/ ./src/

# Create data directory
RUN mkdir -p /var/claude-sessions

EXPOSE 9000

CMD ["node", "src/server.js"]
