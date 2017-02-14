FROM node:7.4.0
MAINTAINER Michael Clifford <cliffom@gmail.com>

EXPOSE 3000

ADD . /usr/src/app
WORKDIR /usr/src/app
RUN npm i --production

CMD ["npm", "start"]
