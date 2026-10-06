# syntax=docker/dockerfile:1.7

# 1) Admin panel (Angular) — manbadan yig'iladi
FROM node:20-alpine AS panel
WORKDIR /src
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . ./
RUN npx ng build --configuration production

# 2) nginx: panel + widget/landing. /api/** -> olima-api (backend repo, olima_net tarmog'i)
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=panel /src/dist/olima-frontend/browser/ /usr/share/nginx/html/
COPY src/widget/ /usr/share/nginx/html/w/
