FROM node:18
ENTRYPOINT ["./entrypoint.sh"]
CMD ["/usr/local/bin/node", "index.js"]
WORKDIR /home/node

ENV TNS_ADMIN /home/node
ENV LD_LIBRARY_PATH /home/node/instantclient
ENV ORACLE_WALLET_DIRECTORY /home/node/wallet
ENV ORACLE_CONNECT_TIMEOUT 10

COPY --chown=node:node . build

RUN node -v
RUN apt-get update && apt-get install -y build-essential git sudo libaio1 tzdata
RUN mkdir /data && chown node:node /data
RUN sudo -u node \
    OCI_LIB_DIR=/home/node/build/instantclient \
    OCI_INC_DIR=/home/node/build/instantclient/sdk/include \
    sh -c 'cd build && npm install && npm run build'
RUN sudo -u node cp -r /home/node/build/*.template /home/node/build/entrypoint.sh /home/node/build/instantclient /home/node/build/package.json /home/node/build/dist/* .
RUN sudo -u node rm -rf build
RUN sudo -u node \
    OCI_LIB_DIR=/home/node/instantclient \
    OCI_INC_DIR=/home/node/instantclient/sdk/include \
    npm install --prod \
  && sudo -u node npm cache clean -f \
  && apt-get purge -y build-essential git && apt-get clean \
  && rm -rf tmp/* /var/cache/*

WORKDIR /home/node
USER node
