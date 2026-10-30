# StudentHub web app: build with Node, serve with nginx (which also forwards /api to the API)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# no VITE_API_URL: the app calls /api on its own origin and nginx forwards it
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
