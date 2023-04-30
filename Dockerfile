ARG node_version=18-alpine

FROM node:${node_version} AS build

WORKDIR /app

COPY . .

RUN npm ci && npm run build:server

FROM node:${node_version}

RUN apk update && apk upgrade

WORKDIR /app
USER node

COPY --from=build /app/package.json .
COPY --from=build /app/package-lock.json .
COPY --from=build /app/lib ./lib
COPY --from=build /app/node_modules ./node_modules

ENV PATH /app/node_modules/.bin:$PATH

CMD ["npm", "run", "start:server"]
