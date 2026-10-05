# 1) Build the React client
FROM node:22-alpine AS client
WORKDIR /client
COPY client/package*.json ./
RUN npm install --no-audit --no-fund
COPY client/ ./
RUN npm run build

# 2) API image that also serves the built client
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production CLIENT_DIST=/app/public PORT=4000
COPY server/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server/src ./src
COPY --from=client /client/dist ./public
USER node
EXPOSE 4000
CMD ["node", "src/server.js"]
