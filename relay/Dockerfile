FROM node:20-alpine

# Install official ffmpeg and ca-certificates for RTMPS TLS
RUN apk add --no-cache ffmpeg ca-certificates

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy relay server code
COPY relay ./relay

EXPOSE 10000

ENV PORT=10000
ENV NODE_ENV=production

CMD ["node", "relay/server.js"]
