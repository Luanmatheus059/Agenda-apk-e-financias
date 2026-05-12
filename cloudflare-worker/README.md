# 🚀 Cloudflare Worker — Agente Financeiro 24/7

Roda **sozinho a cada 1 minuto, 24/7, grátis pra sempre**.

Não depende de GitHub Actions, sem rate limit, sem atrasos.

## Deploy em 3 minutos (sem terminal, só clica)

### 1. Cria conta Cloudflare
- Vai em https://dash.cloudflare.com/sign-up
- Cria conta grátis

### 2. Cria o Worker
- Dashboard → **Workers & Pages** → **Create application** → **Create Worker**
- Nome: `agente-financeiro` (ou qualquer outro)
- Clica em **Deploy** (vai criar com código padrão "Hello World")

### 3. Cola o código
- Na tela do worker, clica em **Edit code** (canto superior direito)
- Apaga TUDO que tá lá
- Cola o conteúdo do arquivo [`worker.js`](./worker.js)
- Clica **Deploy** no canto superior direito

### 4. Adiciona o Cron Trigger (a parte mágica)
- Volta pra página do worker (botão "Back" do canto)
- Aba **Settings** → **Triggers**
- Em **Cron Triggers** → **Add Cron Trigger**
- Cron: `* * * * *` (5 asteriscos com espaço = cada minuto)
- Save

### 5. Pronto

Em até 1 minuto a primeira mensagem chega no Telegram. Daí pra frente, a cada minuto, 24/7.

## Como testar antes do cron disparar

Na página do worker, copia a URL (algo como `https://agente-financeiro.SEU-USER.workers.dev`)
e abre no navegador. Vai disparar uma mensagem imediata pro Telegram.

## Custos

- Plano gratuito Cloudflare Workers:
  - 100.000 requisições/dia
  - 10ms CPU/req
- Você vai usar 1.440 req/dia (1/min) = **1.4% da quota**
- **Custo: R$ 0,00 pra sempre**
