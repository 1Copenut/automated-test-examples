FROM node:20.9.0-slim

WORKDIR /app

# Install Cypress prerequisites
RUN apt-get update \
  && apt-get install libgtk2.0-0 libgtk-3-0 libgbm-dev libnotify-dev libnss3 libxss1 libasound2 libxtst6 xauth xvfb --no-install-recommends -y \
  && apt-get upgrade -y \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists*

# Install latest chrome package and update libs
RUN apt-get update \
  && apt-get install -y wget xvfb ca-certificates gnupg \
  --no-install-recommends \
  && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
  && apt-get update \
  && apt-get install -y google-chrome-stable \
  --no-install-recommends \
  && apt-get upgrade -y \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /src/*.deb

COPY package*.json ./

# Add Cypress and directory permissions
RUN usermod -a -G audio,video node \
  && mkdir -p /app \
  && mkdir -p /app/cypress/screenshots \
  && mkdir -p /app/cypress/videos \
  && chown -R node:node /app

USER node

RUN npm install

CMD ["google-chrome-stable"]
