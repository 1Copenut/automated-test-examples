FROM node:18.18.1-slim

RUN apt-get update \
  && apt-get install libgtk2.0-0 libgtk-3-0 libgbm-dev libnotify-dev libnss3 libxss1 libasound2 libxtst6 xauth xvfb --no-install-recommends -y \
  && apt-get upgrade -y \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists*

COPY package*.json ./

RUN npm install

COPY . .

# Add the Cypress permissions
RUN usermod -a -G audio,video node \
  && mkdir -p /app \
  && mkdir -p /cypress/screenshots \
  && mkdir -p /cypress/videos \
  && chown -R node:node /cypress \
  && chown -R node:node /app

USER node

WORKDIR /app
