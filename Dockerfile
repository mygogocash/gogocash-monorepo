FROM node:20-alpine AS build
WORKDIR /app

# ติดตั้ง dependencies
COPY package*.json ./
RUN yarn add @nestjs/cli
RUN yarn install

# คัดลอก source code
COPY .env* ./
COPY . .
# build project
RUN yarn build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

# copy package.json สำหรับ production
COPY package*.json ./
RUN yarn install --only=production

# copy ไฟล์ build จาก builder stage
COPY --from=build /app/dist ./dist

# ใช้ start:prod จาก NestJS
CMD ["yarn", "start:prod"]
