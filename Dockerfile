FROM node:24-bookworm-slim
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global npm@11.13.0
COPY package.json package-lock.json ./
COPY backend backend
COPY tools/eslint-glob tools/eslint-glob
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
