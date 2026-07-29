FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY index.js ./
# WhatsApp session lives in /app/auth — mount a volume here so the
# QR scan survives redeploys:  -v jarvis-auth:/app/auth
VOLUME ["/app/auth"]
EXPOSE 8080
CMD ["node", "index.js"]
