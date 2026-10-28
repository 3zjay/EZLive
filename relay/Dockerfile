FROM node:20-alpine

# Install official ffmpeg
RUN apk add --no-cache ffmpeg

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
