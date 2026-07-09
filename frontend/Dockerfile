FROM node:20-slim
WORKDIR /app

# 1. Copiamos los archivos de configuración
COPY package*.json ./

# 2. Instalamos TODAS las dependencias (necesitamos las de desarrollo para compilar React)
RUN npm ci

# 3. Copiamos el resto del código (tus componentes, archivos estáticos, etc.)
COPY . .

# 4. ¡LA LÍNEA MÁGICA QUE FALTA! Compilamos React para generar la carpeta /dist
RUN npm run build

# 5. Exponemos el puerto y arrancamos el servidor
EXPOSE 10000
CMD ["node", "app.js"]
