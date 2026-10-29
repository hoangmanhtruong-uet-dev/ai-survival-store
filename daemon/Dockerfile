FROM node:22-alpine

WORKDIR /app

# Cài đặt timezone Việt Nam (ICT / UTC+7) và các công cụ cần thiết cho daemon (git, bash, curl)
RUN apk add --no-cache tzdata git bash curl
ENV TZ=Asia/Ho_Chi_Minh

# Copy package files
COPY package.json package-lock.json ./

# Cài đặt dependencies (bao gồm tsx, typescript và ws)
RUN npm ci --omit=dev && npm install tsx typescript ws

# Copy mã nguồn daemon và thư viện cần thiết
COPY daemon/ ./daemon/
COPY agent/ ./agent/
COPY docs/ ./docs/
COPY src/ ./src/
COPY tsconfig.json ./

# Chạy daemon
CMD ["npx", "tsx", "daemon/index.ts"]

