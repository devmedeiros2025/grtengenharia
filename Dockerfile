FROM node:20-alpine

WORKDIR /app

# Create data directory for SQLite (fallback)
RUN mkdir -p /data

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3002

CMD ["node", "src/server.js"]
