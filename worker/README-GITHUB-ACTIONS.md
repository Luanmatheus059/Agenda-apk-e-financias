# 🤖 Agente 24/7 via GitHub Actions (SEM servidor, SEM custo)

**O caminho mais simples** pra ter o agente rodando 24/7. Usa o GitHub Actions free (~720min/mês de uso, dentro do limite de 2000min grátis).

## ⚡ Setup em 3 minutos

### 1️⃣ Criar Bot do Telegram (2 min)

1. Abre o Telegram
2. Procura **`@BotFather`**, abre o chat
3. Manda `/newbot`
4. Escolhe um nome qualquer (ex: `Meu Agente`)
5. Escolhe um username terminado em `bot` (ex: `meufinbot`)
6. Copia o **TOKEN** que aparece (formato `123456:ABC...`)

### 2️⃣ Pegar seu Chat ID (1 min)

1. Procura seu bot no Telegram (pelo nome que escolheu)
2. Abre e manda `/start` ou `oi`
3. Abre no navegador (troca pelo seu TOKEN):
   ```
   https://api.telegram.org/bot<SEU_TOKEN>/getUpdates
   ```
4. Procura `"chat":{"id":123456789` — esse número é seu **CHAT_ID**

### 3️⃣ Configurar GitHub Secrets (30 seg)

1. Vai em **https://github.com/Luanmatheus059/Agenda-apk-e-financias/settings/secrets/actions**
2. Clica em **New repository secret**
3. Cria dois secrets:
   - **Name:** `TELEGRAM_BOT_TOKEN` · **Value:** (cola seu token)
   - **Name:** `TELEGRAM_CHAT_ID` · **Value:** (cola seu chat ID)

### ✅ Pronto! Rodando 24/7

A partir desse momento:
- **A cada 15 minutos** GitHub roda o agente automaticamente
- Se detectar setup, manda no seu Telegram
- 8h da manhã (seg-sex): resumo diário
- 18h05: resumo de fechamento

## 🧪 Testar agora (sem esperar)

1. Vai em **https://github.com/Luanmatheus059/Agenda-apk-e-financias/actions**
2. Clica em **🤖 Agente Financeiro 24/7** na lista esquerda
3. Clica em **Run workflow** → confirma
4. Espera ~30 segundos
5. Olha seu Telegram — devia ter chegado pelo menos a mensagem de inicialização

## ⚙️ Configurações opcionais (GitHub Variables)

Vai em **Settings → Secrets and variables → Actions → Variables tab** e configura:

| Variável | Padrão | O que faz |
|---|---|---|
| `WATCHLIST` | PETR4,VALE3,ITUB4,BBAS3,MGLU3,WEGE3,B3SA3,BTC,ETH,USD-BRL | Ativos pra monitorar |
| `ALERT_LEVEL` | medium | `low` / `medium` / `high` |
| `NOTIFY_24_7` | true | `false` = só durante pregão |

## 📊 Limite GitHub Actions free

- **2000 minutos/mês grátis**
- A cada 15 min: 1 execução × 96 execuções/dia × 30 dias = 2880 execuções
- Cada execução: ~30s
- Total: 1440 minutos/mês → **dentro do limite**

Se quiser **maior frequência** (a cada 5 min em vez de 15), edita `.github/workflows/agente-24-7.yml`:
```yaml
- cron: '*/5 * * * *'
```
Mas pode passar do limite mensal — ajusta se precisar.

## ❌ Quando GitHub Actions NÃO é suficiente

Se você quer mesmo **a cada 1 minuto sem nenhum atraso**, vai pra um VPS:
- Oracle Cloud Free Tier (ARM gratuito ilimitado) — ver `worker/README.md`
- Ou Render.com, Fly.io, Railway (free tiers)

Pra 90% dos casos, **15 min de atraso é totalmente aceitável**. Setups técnicos não mudam a cada minuto.

## 🐛 Problemas comuns

### "Workflow não roda automaticamente"
GitHub Actions cron tem latência (5-15 min de atraso). Espera mais um pouco. Roda manualmente em "Actions" pra confirmar que funciona.

### "Bot não responde"
Confirma que mandou `/start` pelo menos uma vez. Confere o CHAT_ID.

### "Sem mensagens nenhumas"
- Mercado pode estar em estado neutro (sem setups)
- Ajusta `ALERT_LEVEL=low` em Variables pra receber mais
- Verifica logs do workflow em Actions

### "Quero notificações também sábado/domingo"
`NOTIFY_24_7=true` em Variables. Mas mercado fica fechado então não tem setup novo.

## ⚠️ Disclaimer

Análise técnica baseada em **regras matemáticas clássicas** (RSI, médias móveis). **Não é recomendação financeira**. Nenhum sistema acerta 100% — os melhores fundos do mundo (Renaissance Medallion) têm ~71% de acerto. Use sempre:
- Gestão de risco (2% por trade)
- Stop loss
- Diversificação
# trigger 1778530325
# manual trigger 1778530533
