FROM node:20-alpine

WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Copia código
COPY src ./src

# Healthcheck (verifica que processo está vivo)
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
  CMD pgrep -f "node.*index.js" >/dev/null || exit 1

ENV NODE_ENV=production

CMD ["node", "--env-file=.env", "src/index.js"]
