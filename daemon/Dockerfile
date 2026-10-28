FROM node:20-alpine

WORKDIR /app

# Cài đặt timezone Việt Nam (ICT / UTC+7) để các mốc cron 21:00 khớp giờ VN
RUN apk add --no-cache tzdata
ENV TZ=Asia/Ho_Chi_Minh

# Copy package files
COPY package.json package-lock.json ./

# Cài đặt dependencies
RUN npm ci --omit=dev && npm install tsx typescript

# Copy mã nguồn daemon và thư viện cần thiết
COPY daemon/ ./daemon/
COPY src/ ./src/
COPY tsconfig.json ./

# Chạy daemon
CMD ["npx", "tsx", "daemon/index.ts"]

