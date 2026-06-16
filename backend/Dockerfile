FROM node:20

WORKDIR /app

COPY . .

# Install system deps
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv

# Create virtual environment
RUN python3 -m venv /venv

# Install Python deps inside venv
RUN /venv/bin/pip install --upgrade pip
RUN /venv/bin/pip install -r requirements.txt

# Use venv python at runtime
ENV PATH="/venv/bin:$PATH"

RUN npm install

CMD ["node", "src/index.js"]