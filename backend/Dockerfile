FROM node:24-bookworm-slim AS build
WORKDIR /cli
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/src ./src
COPY backend/tsconfig.json ./
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /cli
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /cli/dist ./dist
ENV NO_UPDATE_NOTIFIER=1 XDG_CONFIG_HOME=/home/node/.config
RUN mkdir -p /workspace /home/node/.config && chown -R node:node /workspace /home/node/.config
USER node
WORKDIR /workspace
ENTRYPOINT ["node", "/cli/dist/index.js"]
CMD ["--help"]
