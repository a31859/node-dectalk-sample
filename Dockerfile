FROM node:14.20.1-bullseye-slim
RUN mkdir -p /usr/src/app/node_modules && chown -R node:node /usr/src/app
RUN mkdir /usr/src/app/db && chown -R node:node /usr/src/app/db
RUN mkdir /usr/src/tmp && chown -R node:node /usr/src/tmp
WORKDIR /usr/src/app
RUN apt update -y
RUN apt install curl libpulse0 -y
COPY package*.json ./
USER node
RUN npm install --production
COPY --chown=node:node . .
EXPOSE 3000
CMD node index.mjs
