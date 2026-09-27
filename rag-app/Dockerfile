#Etapa de build
from node:24-alpine as build
workdir /app
copy package*.json ./
run npm ci
copy . .
run npm run build

#Etapa de ejecucion
from node:24-alpine
workdir /app
env NODE_ENV=production
copy package*.json ./
run npm ci --omit=dev
copy --from=build /app/dist ./dist
expose 4000

cmd ["node", "dist/main.js"]