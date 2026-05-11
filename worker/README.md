# 🤖 Agente Financeiro 24/7 — Oracle Cloud Free

Worker Node.js que roda **24 horas por dia, 7 dias por semana**, monitorando o mercado em tempo real e mandando push pelo Telegram quando detecta setups técnicos.

**Custo total: R$ 0,00** (Oracle Cloud Free + Telegram Bot grátis)

## 🎯 O que ele faz

- ✅ Roda 24/7 num servidor (não no seu celular)
- ✅ A cada 5 min puxa dados de PETR4, VALE3, BTC, USD-BRL, etc
- ✅ Detecta setups técnicos: Cruz Dourada, Cruz da Morte, RSI sobrevendido/sobrecomprado, etc
- ✅ **Manda push pro seu Telegram** assim que detecta — chega como notificação normal
- ✅ Resumo diário 8h da manhã (seg-sex)
- ✅ Resumo de fechamento 18h05
- ✅ Não envia notificação repetida (lembra do que já avisou)
- ✅ Múltiplas fontes de dados (Brapi → Stooq → CoinGecko → Yahoo) com fallback automático

## 📋 Passo a passo (15 min)

### 1️⃣ Criar o Bot do Telegram (2 min)

1. Abre o Telegram, procura **`@BotFather`** e abre o chat
2. Manda `/newbot`
3. Escolhe um nome (ex: `Meu Agente Financeiro`)
4. Escolhe um username terminado em `bot` (ex: `meuagentefin_bot`)
5. Copia o **TOKEN** que aparece (formato `123456:ABC-DEF...`)
6. Procura SEU bot no Telegram pelo nome, abre, manda qualquer mensagem (`/start` ou `oi`)

### 2️⃣ Descobrir seu Chat ID (1 min)

Abre no navegador (troca pelo seu TOKEN):
```
https://api.telegram.org/bot<SEU_TOKEN>/getUpdates
```

Procura `"chat":{"id":123456789` — esse número é seu **CHAT_ID**.

### 3️⃣ Criar conta Oracle Cloud Free (5 min)

1. Vai em **https://www.oracle.com/cloud/free/**
2. Clica em **Start for free** → faz cadastro (precisa cartão de crédito mas **não cobra nada** — é só pra verificação)
3. Escolhe **Home Region: South America East (São Paulo)** ou **East US (Ashburn)**
4. Confirma cadastro

### 4️⃣ Criar a VM gratuita (5 min)

1. No painel da Oracle, vai em **Compute → Instances**
2. **Create instance**
3. Configurações:
   - **Name**: `financas-agente`
   - **Image**: Canonical Ubuntu 22.04
   - **Shape**: Clica em **Change shape** → **Ampere** → escolhe `VM.Standard.A1.Flex` com **1 OCPU e 6 GB de RAM** (Free Tier, ARM gratuito ilimitado)
   - **SSH key**: gera par OU faz upload da sua chave pública
4. **Create**
5. Espera ~2 min até a VM ficar "Running"
6. Anota o **Public IP** da VM

### 5️⃣ Configurar a VM (5 min)

Abre o terminal no seu computador (ou Termux no celular) e conecta:

```bash
ssh -i caminho/pra/sua_chave.key ubuntu@SEU_IP_PUBLICO
```

Dentro da VM, instala Docker:

```bash
# Atualiza pacotes
sudo apt update && sudo apt upgrade -y

# Instala Docker + Compose
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Reconecta pra aplicar permissões
exit
ssh -i caminho/pra/sua_chave.key ubuntu@SEU_IP_PUBLICO

# Instala git
sudo apt install -y git
```

### 6️⃣ Deploy do worker (3 min)

Ainda dentro da VM:

```bash
# Clona seu repositório
git clone https://github.com/Luanmatheus059/Agenda-apk-e-financias.git
cd Agenda-apk-e-financias/worker

# Cria o .env com sua config
cp .env.example .env
nano .env
```

No `nano`, edita as 2 linhas:
```
TELEGRAM_BOT_TOKEN=seu_token_aqui
TELEGRAM_CHAT_ID=seu_chat_id_aqui
```

Salva: `Ctrl+O` → Enter → `Ctrl+X`.

Roda:

```bash
docker compose up -d --build
```

Espera 1 min. Depois confere se está rodando:

```bash
docker compose logs -f
```

Deve aparecer:
```
🤖 Agente Financeiro iniciando...
   Watchlist: PETR4, VALE3, ITUB4, ...
   Intervalo: 5 min
✅ Agente Financeiro online (mensagem no seu Telegram)
🔍 Analisando 10 ativos...
✅ 10/10 analisados. 2 setups novos.
```

E no seu Telegram, você recebe a mensagem **"✅ Agente Financeiro online"** + qualquer setup detectado.

## ✅ Pronto. Roda 24/7.

A partir daqui, o worker roda sozinho. Pra ver logs em tempo real:
```bash
docker compose logs -f
```

Pra parar:
```bash
docker compose down
```

Pra atualizar (se você fizer mudanças no código no GitHub):
```bash
cd ~/Agenda-apk-e-financias
git pull
cd worker
docker compose up -d --build
```

## ⚙️ Configurações (no .env)

| Variável | Padrão | O que faz |
|---|---|---|
| `WATCHLIST` | PETR4,VALE3,... | Tickers que monitora |
| `CHECK_INTERVAL_MINUTES` | 5 | Frequência das análises |
| `NOTIFY_24_7` | false | `true` = notifica fora do pregão também |
| `ALERT_LEVEL` | medium | `low` / `medium` / `high` |
| `SEND_DAILY_SUMMARY` | true | Envia resumo às 8h |
| `DAILY_SUMMARY_HOUR` | 8 | Hora do resumo |

## 🐛 Problemas comuns

### "Bot não responde"
- Verifica TOKEN e CHAT_ID no `.env`
- Manda `/start` pro bot manualmente pelo menos uma vez

### "Sem mensagens nenhuma"
- Pode ser que não houve setup esse dia (mercado neutro)
- Tenta baixar `ALERT_LEVEL=low` no .env e reiniciar (`docker compose restart`)
- Verifica logs: `docker compose logs --tail 50`

### "Brapi rate limit"
- Aumenta `CHECK_INTERVAL_MINUTES=10` no .env
- Worker tem fallback automático pra Stooq/Yahoo

### "Quero notificações também sábado/domingo"
- `NOTIFY_24_7=true` no .env
- Mas mercado fica fechado então não vai ter setups novos

## 🔒 Sobre privacidade

- Tudo roda **na sua própria VM**. Nenhum dado vai pra terceiros
- O bot do Telegram só você acessa (CHAT_ID é seu)
- Código fonte aberto, você pode ler tudo

## ⚠️ Disclaimer (importante)

Este agente faz **análise educacional baseada em indicadores técnicos clássicos** (RSI, médias móveis, cruzamentos). **Não é recomendação de investimento.** Mesmo os melhores fundos quantitativos do mundo (Renaissance Medallion) têm ~71% de acerto, não 100%.

Use sempre:
- ✅ Gestão de risco (2% do capital por trade)
- ✅ Stop loss obrigatório
- ✅ Diversificação
- ✅ Estudo dos fundamentos da empresa
- ❌ NUNCA tudo num único ativo
- ❌ NUNCA use dinheiro de emergência pra investir
