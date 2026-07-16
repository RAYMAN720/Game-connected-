FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY simulator.js ./
COPY public ./public
RUN mkdir -p /app/data
EXPOSE 4000
CMD ["node","simulator.js"]
