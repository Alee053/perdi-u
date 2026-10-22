FROM node:24.22.0-bookworm-slim AS build
WORKDIR /src
ENV HUSKY=0
RUN npm install --global pnpm@10.29.2
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/catalog/package.json packages/catalog/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY apps/api apps/api
COPY packages packages
RUN pnpm exec turbo run build --filter=@perdiu/api \
    && pnpm --filter @perdiu/api deploy --legacy --prod /runtime

FROM node:24.22.0-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /runtime ./
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
