ARG node_version=26-alpine

FROM node:${node_version} AS build

WORKDIR /app

COPY . .

RUN npm ci && npm run build:server

FROM node:${node_version}

RUN apk update && apk upgrade

WORKDIR /app

COPY --from=build /app/package.json .
COPY --from=build /app/package-lock.json .
COPY --from=build /app/lib ./lib
COPY --from=build /app/node_modules ./node_modules

# The server writes its statistics here and runs unprivileged, so the directory has to exist and be
# owned by that user before the switch. Without it every write fails with EACCES, which the stats
# store catches and logs, leaving the numbers alive in memory only until the process restarts.
# Declared as a volume mount point so a named volume inherits this ownership on first use.
RUN mkdir -p /app/data && chown -R node:node /app/data
ENV STATS_DIR /app/data

USER node

ENV PATH /app/node_modules/.bin:$PATH

CMD ["npm", "run", "start:server"]
