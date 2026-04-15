# Menggunakan image Node.js versi ringan
FROM node:22-alpine

# Menentukan direktori kerja di dalam container
WORKDIR /app

# Menyalin file package.json dan menginstal dependensi
COPY package*.json ./
RUN npm install

# Menyalin seluruh kode backend
COPY . .

# Mengekspos port yang digunakan backend
EXPOSE 5000

# Perintah untuk menjalankan server
CMD ["npm", "start"]