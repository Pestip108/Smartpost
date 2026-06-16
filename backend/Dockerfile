FROM node:20

WORKDIR /app

COPY . .

RUN npm install
RUN npx prisma generate

RUN apt-get update && apt-get install -y python3 python3-pip
RUN pip3 install -r requirements.txt

CMD ["node", "src/index.js"]