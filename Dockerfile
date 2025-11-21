FROM node:22-alpine
CMD ["/usr/local/bin/node", "index.js"]
WORKDIR /home/node

COPY --chown=node:node . build

RUN apk add -U --no-cache --virtual .build-deps git build-base sudo \
  && sudo -u node sh -c 'cd build && npm install && npm run build' \
  && sudo -u node cp -r build/package.json build/dist/* . \
  && sudo -u node npm install --prod \
  && sudo -u node npm cache clean -f \
  && apk del .build-deps \
  && rm -rf build tmp/* /var/cache/apk/*

USER node

#FROM node:20-alpine as builder
#WORKDIR /home/node
#COPY . .

#RUN sh -c 'npm i --ignore-scripts && npm run build && rm -rf node_modules'
#RUN sh -c 'npm i --ignore-scripts && rm -rf node_modules'
#RUN sh -c 'npm run build'
#RUN sh -c 'npm i --ignore-scripts --production'

#FROM node:20-alpine
#CMD ["/usr/local/bin/node", "index.js"]
#WORKDIR /home/node
#USER node
#Update
#RUN apk update && apk upgrade

# Timezone setting
#RUN apk add --no-cache tzdata
#ENV TZ=Europe/Helsinki

#COPY --from=builder /home/node/index.js .
#COPY --from=builder /home/node/dist .
#COPY --from=builder /home/node/bin bin
#COPY --from=builder /home/node/lib lib
#COPY --from=builder /home/node/node_modules node_modules
#COPY --from=builder /home/node/package.json .
#COPY --from=builder /home/node/package-lock.json .

#RUN apk add libaio gcompat
