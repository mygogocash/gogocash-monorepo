FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json yarn.lock ./
RUN yarn install --frozen-lockfile 

COPY . .
RUN yarn build

FROM node:20-alpine AS runner
WORKDIR /app

# Create a non-root user and switch to it for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

COPY --from=builder --chown=nodejs:nodejs /app ./

EXPOSE 3000
CMD ["npm", "start"]
