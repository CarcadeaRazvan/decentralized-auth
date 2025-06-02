FROM node:23

ENV NODE_ENV=development

# Proxy + SSL workaround
# ENV HTTP_PROXY=http://host.docker.internal:8080
# ENV HTTPS_PROXY=http://host.docker.internal:8080
# ENV NODE_TLS_REJECT_UNAUTHORIZED=0

WORKDIR /home/app

# RUN npm config set strict-ssl false
# RUN npm config set registry http://registry.npmjs.org/

COPY package*.json ./

RUN npm install

COPY . .

# Hotfix for buffer import
RUN rm -rf /home/app/src/buffer
RUN ln -s /home/app/node_modules/buffer /home/app/src/buffer

EXPOSE 3000

CMD ["npm", "start"]
