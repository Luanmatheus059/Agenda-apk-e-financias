// ═══════════════════════════════════════════════════
// 🤖 AGENTE FINANCEIRO 24/7 — worker pra Oracle Cloud Free
// ═══════════════════════════════════════════════════
// Roda em background:
// - A cada N minutos puxa dados de mercado de múltiplas fontes
// - Roda análise técnica (RSI, MM, cruzamentos)
// - Detecta setups NOVOS (não notifica setups que já avisou)
// - Manda push pelo Telegram quando achar algo relevante
// - Resumo diário às 8h (configurável)
// - Resumo de fechamento às 18h
//
// Custo: R$ 0 (Oracle Cloud Free + Telegram Bot grátis)
// ═══════════════════════════════════════════════════

// .env é carregado via --env-file no script start (Node 20.6+)
import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getHistoricalCloses, getSnapshot, isMarketOpen } from './sources.js';
import { analyzeAsset, filterByLevel } from './analyze.js';
import { sendMessage, notifySetup, notifyDailySummary, notifyMarketClose, sendStartup } from './notifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, '..', '.state.json');

const WATCHLIST = (process.env.WATCHLIST || 'PETR4,VALE3,BTC,USD-BRL').split(',').map(s => s.trim()).filter(Boolean);
const INTERVAL = parseInt(process.env.CHECK_INTERVAL_MINUTES || '5');
const ALERT_LEVEL = process.env.ALERT_LEVEL || 'medium';
const NOTIFY_24_7 = process.env.NOTIFY_24_7 === 'true';

let lastSetups = new Set(); // tracking pra não duplicar notificação

async function loadState() {
  try {
    const data = JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
    lastSetups = new Set(data.lastSetups || []);
    console.log(`📂 Estado carregado (${lastSetups.size} setups antigos)`);
  } catch (e) { /* primeiro run */ }
}

async function saveState() {
  await fs.writeFile(STATE_FILE, JSON.stringify({
    lastSetups: [...lastSetups],
    updatedAt: Date.now()
  }, null, 2));
}

async function analyzeWatchlist() {
  if (!NOTIFY_24_7 && !isMarketOpen()) {
    console.log('🌙 Mercado fechado — pulando análise (NOTIFY_24_7=false)');
    return;
  }

  console.log(`🔍 Analisando ${WATCHLIST.length} ativos...`);
  const newSetups = [];
  let analyzed = 0;

  for (const symbol of WATCHLIST) {
    try {
      const { closes, source } = await getHistoricalCloses(symbol);
      if (closes.length < 50) {
        console.log(`  ⚠️  ${symbol}: poucos dados (${closes.length})`);
        continue;
      }
      analyzed++;
      const result = analyzeAsset(symbol, closes);
      if (!result.valid) continue;

      const filtered = filterByLevel(result.setups, ALERT_LEVEL);
      for (const s of filtered) {
        const key = `${symbol}:${s.type}:${new Date().toISOString().slice(0, 10)}`; // dedup por dia
        if (!lastSetups.has(key)) {
          lastSetups.add(key);
          newSetups.push({ symbol, setup: s, indicators: result.indicators });
        }
      }
      // pausa breve pra não martelar APIs
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.error(`  ❌ ${symbol}: ${e.message}`);
    }
  }

  console.log(`✅ ${analyzed}/${WATCHLIST.length} analisados. ${newSetups.length} setups novos.`);

  // limita a 5 notificações por ciclo pra não spammar
  for (const item of newSetups.slice(0, 5)) {
    await notifySetup(item.setup, item.indicators);
    await new Promise(r => setTimeout(r, 1000));
  }
  if (newSetups.length > 5) {
    await sendMessage(`📡 +${newSetups.length - 5} setups adicionais detectados (omitidos pra não spammar).`);
  }

  // limita memória — mantém só os últimos 200
  if (lastSetups.size > 200) {
    lastSetups = new Set([...lastSetups].slice(-100));
  }
  await saveState();
}

async function sendDailySummary() {
  console.log('📊 Gerando resumo diário...');
  const snapshots = await getSnapshot(WATCHLIST.filter(s => /^[A-Z]{4}\d+$/i.test(s)));
  const setupsBySym = {};
  for (const symbol of WATCHLIST) {
    try {
      const { closes } = await getHistoricalCloses(symbol);
      if (closes.length < 50) continue;
      const r = analyzeAsset(symbol, closes);
      setupsBySym[symbol] = filterByLevel(r.setups, 'medium');
    } catch (e) { setupsBySym[symbol] = []; }
  }
  await notifyDailySummary(snapshots, setupsBySym);
}

async function sendCloseSummary() {
  console.log('🏁 Resumo de fechamento...');
  const snapshots = await getSnapshot(WATCHLIST.filter(s => /^[A-Z]{4}\d+$/i.test(s)));
  if (snapshots.length) await notifyMarketClose(snapshots);
}

// ─── boot ───
async function main() {
  const SINGLE_RUN = process.env.SINGLE_RUN === 'true';

  console.log('🤖 Agente Financeiro iniciando...');
  console.log(`   Watchlist: ${WATCHLIST.join(', ')}`);
  console.log(`   Modo: ${SINGLE_RUN ? 'single-run (GitHub Actions cron)' : 'daemon (server)'}`);
  console.log(`   Nível alerta: ${ALERT_LEVEL}`);

  await loadState();

  // Modo single-run: roda uma vez e sai (ideal pra cron externo tipo GitHub Actions)
  if (SINGLE_RUN) {
    try {
      await analyzeWatchlist();
      // Verifica se é hora de mandar resumo diário (entre 8h-9h)
      const h = new Date().getHours();
      const day = new Date().getDay();
      const isWeekday = day >= 1 && day <= 5;
      if (process.env.SEND_DAILY_SUMMARY === 'true' && isWeekday && h === parseInt(process.env.DAILY_SUMMARY_HOUR || '8')) {
        await sendDailySummary();
      }
      // Resumo fechamento entre 18h-19h
      if (isWeekday && h === 18) {
        await sendCloseSummary();
      }
    } catch (e) {
      console.error('Erro no single-run:', e);
      process.exit(1);
    }
    console.log('✅ Single-run concluído.');
    process.exit(0);
  }

  // Modo daemon (servidor sempre ligado)
  try { await sendStartup(); } catch (e) { console.error('Falha startup msg:', e.message); }

  // primeira análise imediata
  await analyzeWatchlist();

  // loop de análise — todo N minutos
  cron.schedule(`*/${INTERVAL} * * * *`, async () => {
    await analyzeWatchlist();
  });
  console.log(`⏰ Cron configurado: análise a cada ${INTERVAL} min`);

  // resumo diário (manhã)
  if (process.env.SEND_DAILY_SUMMARY === 'true') {
    const h = parseInt(process.env.DAILY_SUMMARY_HOUR || '8');
    cron.schedule(`0 ${h} * * 1-5`, async () => {
      await sendDailySummary();
    });
    console.log(`📅 Resumo diário às ${h}h (seg-sex)`);
  }

  // fechamento do mercado às 18h05
  cron.schedule('5 18 * * 1-5', async () => {
    await sendCloseSummary();
  });
  console.log('🏁 Resumo de fechamento às 18h05 (seg-sex)');
}

main().catch(e => {
  console.error('💥 Falha fatal:', e);
  process.exit(1);
});

// Encerra com graça
process.on('SIGTERM', () => { console.log('SIGTERM'); process.exit(0); });
process.on('SIGINT', () => { console.log('SIGINT'); process.exit(0); });
