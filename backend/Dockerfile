FROM node:23-slim

WORKDIR /home/app

# # Proxy + SSL workaround for mitmproxy
# ENV HTTP_PROXY=http://host.docker.internal:8080
# ENV HTTPS_PROXY=http://host.docker.internal:8080
# ENV NODE_TLS_REJECT_UNAUTHORIZED=0

# RUN npm config set strict-ssl false
# RUN npm config set registry http://registry.npmjs.org/

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 4000

CMD ["npm", "start"]
