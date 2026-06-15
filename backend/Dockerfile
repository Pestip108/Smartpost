FROM node:22-bookworm

# Install Python 3 and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy all source files first (including prisma schema)
COPY . .

# Install dependencies (this will run prisma generate via postinstall)
RUN npm ci

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
