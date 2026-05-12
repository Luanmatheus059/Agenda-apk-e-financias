/**
 * 🚀 AGENTE FINANCEIRO 24/7 — Cloudflare Worker
 *
 * Roda automaticamente a cada 1 minuto, GRÁTIS pra sempre, sem atrasos.
 * Busca cotações ao vivo do Yahoo Finance + manda no Telegram.
 *
 * DEPLOY (3 min):
 * 1. Cria conta grátis em https://workers.cloudflare.com
 * 2. Dashboard → Workers & Pages → Create → Hello World template
 * 3. Apaga o código exemplo e COLA TUDO ABAIXO (1 arquivo, sem dependências)
 * 4. Deploy → Settings → Triggers → Add Cron Trigger: "* * * * *" (cada minuto)
 * 5. Pronto! Telegram recebe mensagens 1/min, 24/7
 *
 * NÃO depende de GitHub Actions, NÃO tem rate limit, NÃO atrasa.
 * Cloudflare free permite 100k execuções/dia (você usaria 1.440/dia).
 */

const TELEGRAM_TOKEN = '8224992163:AAF1B80laJI_P9Re4f6mcAU5F5DRnhmiYG4';
const CHAT_ID = '5933857921';

async function yahooQuote(sym) {
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=15m&range=1d`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!r.ok) return null;
    const d = await r.json();
    const meta = d?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose || meta.previousClose;
    if (price && prev) return { price, chg: (price - prev) / prev * 100 };
  } catch (e) {}
  return null;
}

async function sendTelegram(text) {
  const body = new URLSearchParams({
    chat_id: CHAT_ID,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: 'true'
  });
  try {
    const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    return (await r.json()).ok;
  } catch (e) {
    console.error('Telegram:', e);
    return false;
  }
}

function fmtPct(c) {
  if (c == null) return '-';
  return (c >= 0 ? '🟢 +' : '🔴 ') + c.toFixed(2) + '%';
}
function fmtBR(n) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function buildAndSend() {
  // Horário Brasília
  const nowUTC = new Date();
  const nowBR = new Date(nowUTC.getTime() - 3 * 3600 * 1000);
  const h = nowBR.getUTCHours();
  const day = nowBR.getUTCDay();
  const isOpen = day >= 1 && day <= 5 && h >= 10 && h < 18;
  const dateStr = nowBR.toISOString().split('T')[0].split('-').reverse().join('/');
  const timeStr = String(h).padStart(2, '0') + ':' + String(nowBR.getUTCMinutes()).padStart(2, '0');

  // Busca tudo em paralelo
  const [ibov, usd, btc, eth, petr, vale, itub, bbas] = await Promise.all([
    yahooQuote('^BVSP'),
    yahooQuote('USDBRL=X'),
    yahooQuote('BTC-USD'),
    yahooQuote('ETH-USD'),
    yahooQuote('PETR4.SA'),
    yahooQuote('VALE3.SA'),
    yahooQuote('ITUB4.SA'),
    yahooQuote('BBAS3.SA')
  ]);

  let msg;
  if (isOpen) {
    msg = `📊 <b>SNAPSHOT MERCADO — ${timeStr} BR</b>\n━━━━━━━━━━━━━━━━━━━\n\n🟢 <b>PREGÃO ABERTO</b> · ${dateStr}\n\n<b>📊 ÍNDICES</b>\n`;
    msg += `Ibovespa: <b>${ibov ? Math.round(ibov.price).toLocaleString('de-DE') + ' pts' : '-'}</b> ${fmtPct(ibov?.chg)}\n`;
    msg += `USD/BRL: <b>${usd ? 'R$ ' + usd.price.toFixed(4) : '-'}</b> ${fmtPct(usd?.chg)}\n`;
    msg += `Bitcoin: <b>${btc ? 'US$ ' + Math.round(btc.price).toLocaleString('de-DE') : '-'}</b> ${fmtPct(btc?.chg)}\n\n`;
    msg += `<b>📈 BLUE CHIPS</b>\n`;
    msg += `PETR4: ${petr ? 'R$ ' + petr.price.toFixed(2) : '-'} ${fmtPct(petr?.chg)}\n`;
    msg += `VALE3: ${vale ? 'R$ ' + vale.price.toFixed(2) : '-'} ${fmtPct(vale?.chg)}\n`;
    msg += `ITUB4: ${itub ? 'R$ ' + itub.price.toFixed(2) : '-'} ${fmtPct(itub?.chg)}\n`;
    msg += `BBAS3: ${bbas ? 'R$ ' + bbas.price.toFixed(2) : '-'} ${fmtPct(bbas?.chg)}\n\n`;

    msg += `🤖 <b>AGENTE IA</b>\n`;
    const score = (ibov?.chg || 0) - (usd?.chg || 0) * 0.5 + (btc?.chg || 0) * 0.3;
    if (score > 0.5) msg += `🟢 <b>TENDÊNCIA ALTA</b> — Procurar pontos de entrada em pullbacks.`;
    else if (score < -0.5) msg += `🔴 <b>TENDÊNCIA QUEDA</b> — Defender posições, evitar alavancagem.`;
    else msg += `⚪ <b>LATERALIDADE</b> — DCA funciona melhor.`;

    msg += `\n\n<i>Próximo update em 1min.</i>`;
  } else {
    const status = h < 10 && day <= 5 ? '🌅 Pré-pregão' : day === 0 || day === 6 ? '📆 Final de semana' : '🏁 Pregão fechado';
    msg = `🌙 <b>FORA DO PREGÃO BR — ${timeStr}</b>\n━━━━━━━━━━━━━━━━━━━\n\n${status} · ${dateStr}\nMercado 24/7 continua operando:\n\n`;
    msg += `<b>₿ CRIPTO</b>\n`;
    msg += `Bitcoin: <b>${btc ? 'US$ ' + Math.round(btc.price).toLocaleString('de-DE') : '-'}</b> ${fmtPct(btc?.chg)}\n`;
    msg += `Ethereum: <b>${eth ? 'US$ ' + Math.round(eth.price).toLocaleString('de-DE') : '-'}</b> ${fmtPct(eth?.chg)}\n\n`;
    msg += `<b>💱 FOREX</b>\n`;
    msg += `USD/BRL: <b>${usd ? 'R$ ' + usd.price.toFixed(4) : '-'}</b> ${fmtPct(usd?.chg)}\n\n`;
    msg += `⏰ <b>PRÓXIMO PREGÃO BR</b>\nAbre às 10h00, fecha às 17h00 (BRT).\n\n<i>Próximo update em 1min.</i>`;
  }

  return await sendTelegram(msg);
}

export default {
  // HTTP handler — pra testar via GET ou POST
  async fetch(request, env, ctx) {
    const ok = await buildAndSend();
    return new Response(ok ? 'OK\n' : 'FAIL\n', { status: ok ? 200 : 500 });
  },

  // Cron handler — disparado automaticamente
  async scheduled(event, env, ctx) {
    ctx.waitUntil(buildAndSend());
  }
};
