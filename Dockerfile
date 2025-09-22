# ใช้ base image ที่มี Node.js
FROM --platform=linux/amd64 node:20.18.0-slim

# กำหนด working directory ใน container
WORKDIR /app

# Copy package.json และ package-lock.json
COPY package*.json ./

# ติดตั้ง dependencies
RUN yarn install

# Copy source code ทั้งหมด
COPY . .

# Build project
RUN yarn build

# กำหนด command สำหรับ run app
CMD [ "node", "dist/main" ]