FROM node:20-alpine as builder
WORKDIR /home/node
COPY . .

RUN sh -c 'npm i --ignore-scripts && npm run build && rm -rf node_modules'
#RUN sh -c 'npm i --ignore-scripts && rm -rf node_modules'
#RUN sh -c 'npm run build'
#RUN sh -c 'npm i --ignore-scripts --production'

FROM node:20-alpine
CMD ["/usr/local/bin/node", "index.js"]
WORKDIR /home/node
#USER node
#Update
RUN apk update && apk upgrade

# Timezone setting
RUN apk add --no-cache tzdata
ENV TZ=Europe/Helsinki

COPY --from=builder /home/node/index.js .
COPY --from=builder /home/node/dist .
COPY --from=builder /home/node/bin bin
COPY --from=builder /home/node/lib lib
COPY --from=builder /home/node/node_modules node_modules
COPY --from=builder /home/node/package.json .
COPY --from=builder /home/node/package-lock.json .

RUN apk add libaio gcompat
