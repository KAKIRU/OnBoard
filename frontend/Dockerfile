FROM node:20-alpine AS build
WORKDIR /app

# build-time env for Vite (overrides .env.* values)
ARG VITE_API_BASE_URL
ARG VITE_WS_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_REDIRECT_URI
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_WS_URL=${VITE_WS_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV VITE_GOOGLE_REDIRECT_URI=${VITE_GOOGLE_REDIRECT_URI}
ENV VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY --from=build /app/dist ./
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
