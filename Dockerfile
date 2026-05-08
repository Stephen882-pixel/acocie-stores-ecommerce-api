FROM node:22-alpine AS builder

WORKDIR /app


COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

FROM node:22-alpine AS runtime


RUN apk add --no-cache bash wget

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .


RUN chmod +x entrypoint.sh

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 5000

ENTRYPOINT ["./entrypoint.sh"]
