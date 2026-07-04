FROM node:20-slim

WORKDIR /app

# Copiar dependencias primero (cache de Docker)
COPY package*.json ./
RUN npm ci --only=production

# Copiar el resto del código
COPY . .

EXPOSE 3000

CMD ["node", "app.js"]