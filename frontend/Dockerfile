FROM node:23

ENV NODE_ENV=development

WORKDIR /home/app

COPY package*.json ./

RUN npm install

COPY . .

RUN rm -rf /home/app/src/buffer

RUN ln -s /home/app/node_modules/buffer /home/app/src/buffer

EXPOSE 3000

CMD ["npm", "start"]
