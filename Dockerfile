FROM node:22-alpine AS build
WORKDIR /app
# nest build (tsc) exceeds Node's default container heap
ENV NODE_OPTIONS="--max-old-space-size=4096"

# ติดตั้ง dependencies
COPY package*.json ./
RUN yarn add @nestjs/cli
RUN yarn install

# คัดลอก source code
COPY .env* ./
COPY uploads/ ./
COPY . .
# build project
RUN yarn build

# Stage 2: Production
FROM node:22-alpine
WORKDIR /app

# copy package.json สำหรับ production
COPY package*.json ./
RUN yarn install --only=production

# copy ไฟล์ build จาก builder stage
COPY --from=build /app/dist ./dist

# ใช้ start:prod จาก NestJS
CMD ["yarn", "start:prod"]
