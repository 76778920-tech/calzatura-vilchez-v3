FROM node:20-alpine

RUN npm install -g firebase-tools@13

WORKDIR /workspace

COPY firebase.json .firebaserc ./

COPY calzatura-vilchez/functions/package*.json ./calzatura-vilchez/functions/
RUN cd calzatura-vilchez/functions && npm install --omit=dev

COPY calzatura-vilchez/functions/index.js ./calzatura-vilchez/functions/index.js

EXPOSE 4000 5001 9099

CMD ["firebase", "emulators:start", "--only", "auth,functions", \
     "--project", "calzaturavilchez-ab17f", \
     "--import=/workspace/emulator-data", \
     "--export-on-exit=/workspace/emulator-data"]
