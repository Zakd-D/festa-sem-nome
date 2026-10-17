# FESTA SEM NOME — imagem de produção
# Node 22 + Express; three.js vem de node_modules e é servido em /vendor
FROM node:22-alpine

ENV NODE_ENV=production
# no contêiner o servidor PRECISA escutar em 0.0.0.0
ENV HOST=0.0.0.0
# PORT NÃO entra aqui: o Render injeta a porta em runtime (ele sobrescreve) e o
# health check aponta para ela. Localmente, docker-compose.yml passa PORT=3018.

WORKDIR /app

# dependências primeiro (cache de camada)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# aplicação
COPY server.js ./
COPY public ./public
COPY tools ./tools

# dados mutáveis (lista de convidados). Em host efêmero some no redeploy:
# monte um volume aqui para persistir.
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3018

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3018}/api/health" || exit 1

CMD ["node", "server.js"]
