FROM node:22-alpine
WORKDIR /app
COPY . .
RUN mkdir -p /app/data && chown -R node:node /app
USER node
VOLUME /app/data
EXPOSE 3000
CMD ["node","--no-warnings","server/index.js"]
