# Tahap 1: Build aplikasi React Vite
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Tahap 2: Sajikan dengan Nginx
FROM nginx:alpine
# Menyalin hasil build Vite ke folder publik Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Mengekspos port 80 untuk web
EXPOSE 80

# Menjalankan Nginx
CMD ["nginx", "-g", "daemon off;"]