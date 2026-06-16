FROM node:20

RUN apt-get update && apt-get install -y python3 python3-pip

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN pip3 install -r requirements.txt

CMD ["node", "src/index.js"]