// AGENTE FINANCEIRO — Cloudflare Worker v11
// Template literals + linhas curtas para evitar paste-truncado no editor.

const T1='8224992163';
const T2='AAF1B80laJI';
const T3='P9Re4f6mcAU5F5DRnhmiYG4';
const TOKEN=T1+':'+T2+'_'+T3;
const CHAT='5933857921';
const UA='Mozilla/5.0';

const INDICES = [
  {s:'^BVSP',n:'Ibov'},
  {s:'^GSPC',n:'S&P500'},
  {s:'^IXIC',n:'Nasdaq'},
  {s:'^DJI',n:'Dow'},
  {s:'^GDAXI',n:'DAX'},
  {s:'^N225',n:'Nikkei'},
  {s:'^FTSE',n:'FTSE'}
];

const ACOES_BR = [
  {s:'PETR4.SA',n:'PETR4'},
  {s:'VALE3.SA',n:'VALE3'},
  {s:'ITUB4.SA',n:'ITUB4'},
  {s:'BBAS3.SA',n:'BBAS3'},
  {s:'BBDC4.SA',n:'BBDC4'},
  {s:'MGLU3.SA',n:'MGLU3'},
  {s:'WEGE3.SA',n:'WEGE3'},
  {s:'ABEV3.SA',n:'ABEV3'},
  {s:'ITSA4.SA',n:'ITSA4'},
  {s:'BBSE3.SA',n:'BBSE3'},
  {s:'TAEE11.SA',n:'TAEE11'},
  {s:'VIVT3.SA',n:'VIVT3'},
  {s:'RENT3.SA',n:'RENT3'},
  {s:'SUZB3.SA',n:'SUZB3'},
  {s:'EGIE3.SA',n:'EGIE3'},
  {s:'PRIO3.SA',n:'PRIO3'},
  {s:'RADL3.SA',n:'RADL3'},
  {s:'B3SA3.SA',n:'B3SA3'},
  {s:'CSAN3.SA',n:'CSAN3'},
  {s:'KLBN11.SA',n:'KLBN11'}
];

const ACOES_US = [
  {s:'AAPL',n:'AAPL'},
  {s:'MSFT',n:'MSFT'},
  {s:'GOOGL',n:'GOOGL'},
  {s:'AMZN',n:'AMZN'},
  {s:'TSLA',n:'TSLA'},
  {s:'NVDA',n:'NVDA'},
  {s:'META',n:'META'}
];

const ETFS = [
  {s:'BOVA11.SA',n:'BOVA11'},
  {s:'IVVB11.SA',n:'IVVB11'},
  {s:'HASH11.SA',n:'HASH11'},
  {s:'BRAX11.SA',n:'BRAX11'}
];

const FIIS = [
  {s:'MXRF11.SA',n:'MXRF11'},
  {s:'HGLG11.SA',n:'HGLG11'},
  {s:'KNRI11.SA',n:'KNRI11'},
  {s:'VISC11.SA',n:'VISC11'},
  {s:'XPLG11.SA',n:'XPLG11'}
];

const COMMODITIES = [
  {s:'GC=F',n:'Ouro'},
  {s:'CL=F',n:'Petroleo'},
  {s:'SI=F',n:'Prata'}
];

const CRIPTO_YH = [
  {s:'BTC-USD',n:'BTC'},
  {s:'ETH-USD',n:'ETH'},
  {s:'SOL-USD',n:'SOL'},
  {s:'BNB-USD',n:'BNB'},
  {s:'XRP-USD',n:'XRP'},
  {s:'ADA-USD',n:'ADA'},
  {s:'DOGE-USD',n:'DOGE'},
  {s:'AVAX-USD',n:'AVAX'}
];

const FOREX_YH = [
  {s:'USDBRL=X',n:'USD/BRL'},
  {s:'EURBRL=X',n:'EUR/BRL'},
  {s:'GBPBRL=X',n:'GBP/BRL'},
  {s:'JPYBRL=X',n:'JPY/BRL'}
];

const NEWS_URLS = [
  'https://www.infomoney.com.br/feed/',
  'https://br.investing.com/rss/news_25.rss',
  'https://www.moneytimes.com.br/feed/',
  'https://www.infomoney.com.br/mercados/feed/',
  'https://valor.globo.com/valor-investe/rss/',
  'https://br.investing.com/rss/news_11.rss',
  'https://br.investing.com/rss/news_301.rss',
  'https://www.moneytimes.com.br/category/economia/feed/'
];

const NEWS_NAMES = [
  'InfoMoney',
  'Investing BR',
  'MoneyTimes',
  'InfoMoney Mercados',
  'Valor Investe',
  'Investing Commodities',
  'Investing Cripto',
  'MoneyTimes Economia'
];

async function yh(sym, range, interval) {
  range = range || '15d';
  interval = interval || '1d';
  try {
    const u = 'https://query1.finance.yahoo.com/v8/finance/chart/' + sym + '?interval=' + interval + '&range=' + range;
    const r = await fetch(u, {headers: {'User-Agent': UA}});
    const d = await r.json();
    const res = d && d.chart && d.chart.result && d.chart.result[0];
    if (!res) return null;
    const m = res.meta;
    const q = res.indicators && res.indicators.quote && res.indicators.quote[0];
    if (!m || !m.regularMarketPrice || !m.previousClose) return null;
    const opens = ((q && q.open) || []).filter(function(x){return x != null});
    const closes = ((q && q.close) || []).filter(function(x){return x != null});
    return {
      p: m.regularMarketPrice,
      c: (m.regularMarketPrice - m.previousClose) / m.previousClose * 100,
      opens: opens,
      closes: closes
    };
  } catch (e) { return null; }
}

async function rssNews(idx) {
  try {
    const url = NEWS_URLS[idx % NEWS_URLS.length];
    const name = NEWS_NAMES[idx % NEWS_NAMES.length];
    const r = await fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(url));
    const d = await r.json();
    return ((d && d.items) || []).slice(0, 5).map(function(it) {
      let img = it.thumbnail || (it.enclosure && it.enclosure.link);
      if (!img && it.description) {
        const m = it.description.match(/<img[^>]+src=["']([^"']+)["']/);
        if (m) img = m[1];
      }
      return {title: it.title, link: it.link, source: name, image: img};
    });
  } catch (e) { return []; }
}

function pct(c) {
  if (c == null) return '-';
  return (c >= 0 ? '🟢 +' : '🔴 ') + c.toFixed(2) + '%';
}

function intf(p) {
  if (!p) return '-';
  return Math.round(p).toLocaleString('de-DE');
}

function f2(p) { return p ? p.toFixed(2) : '-'; }
function f4(p) { return p ? p.toFixed(4) : '-'; }

async function tg(text) {
  await fetch('https://api.telegram.org/bot' + TOKEN + '/sendMessage', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      chat_id: CHAT,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: 'true'
    })
  });
}

async function tgPhoto(photo, caption) {
  await fetch('https://api.telegram.org/bot' + TOKEN + '/sendPhoto', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      chat_id: CHAT,
      photo: photo,
      caption: caption.slice(0, 1024),
      parse_mode: 'HTML'
    })
  });
}

function brTime() {
  return new Date(Date.now() - 3 * 3600 * 1000);
}

function timeStr() {
  return brTime().toISOString().slice(11, 16);
}

function marketStatus() {
  const t = brTime();
  const h = t.getUTCHours();
  const d = t.getUTCDay();
  if (d === 0 || d === 6) return 'fim';
  if (h < 10) return 'pre';
  if (h < 17) return 'aberto';
  if (h < 18) return 'leilao';
  return 'fechado';
}

function candleURL(name, opens, closes) {
  const len = Math.min(15, opens.length);
  const op = opens.slice(-len);
  const cl = closes.slice(-len);
  const labels = op.map(function(_, i) { return 'D' + (len - i); });
  const data = cl.map(function(c, i) { return [op[i], c]; });
  const bg = cl.map(function(c, i) { return c >= op[i] ? '#22c55e' : '#ef4444'; });
  const cfg = {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{label: name, data: data, backgroundColor: bg, borderWidth: 1}]
    },
    options: {
      title: {display: true, text: name + ' Velas ' + len + 'd', fontColor: '#d4af37'},
      legend: {display: false}
    }
  };
  return 'https://quickchart.io/chart?bkg=%230a0a0a&w=900&h=500&c=' + encodeURIComponent(JSON.stringify(cfg));
}

function pressureData(opens, closes) {
  let bull = 0, bear = 0;
  for (let i = 0; i < closes.length; i++) {
    if (closes[i] >= opens[i]) bull++;
    else bear++;
  }
  const total = bull + bear;
  const bullPct = total ? Math.round(bull / total * 100) : 50;
  const bearPct = total ? Math.round(bear / total * 100) : 50;
  return {bull: bull, bear: bear, bullPct: bullPct, bearPct: bearPct};
}

function pressureURL(name, opens, closes) {
  const p = pressureData(opens, closes);
  const cfg = {
    type: 'doughnut',
    data: {
      labels: ['Compradores ' + p.bullPct + '%', 'Vendedores ' + p.bearPct + '%'],
      datasets: [{data: [p.bull, p.bear], backgroundColor: ['#22c55e', '#ef4444']}]
    },
    options: {
      title: {display: true, text: 'Pressao ' + name, fontColor: '#d4af37'},
      legend: {labels: {fontColor: '#fff'}}
    }
  };
  return 'https://quickchart.io/chart?bkg=%230a0a0a&w=700&h=500&c=' + encodeURIComponent(JSON.stringify(cfg));
}

async function sendCandleAtivo(sym, name) {
  const r = await yh(sym, '15d', '1d');
  if (!r || r.opens.length < 3) return;
  const url = candleURL(name, r.opens, r.closes);
  const price = r.p < 10 ? f4(r.p) : f2(r.p);
  const cap = '🕯️ <b>' + name + ' CANDLESTICK</b>\nUltimo: ' + price + ' ' + pct(r.c) + '\nVerde=compradores ganharam';
  await tgPhoto(url, cap);
}

async function sendPressao(sym, name) {
  const r = await yh(sym, '30d', '1d');
  if (!r || r.opens.length < 5) return;
  const p = pressureData(r.opens, r.closes);
  const url = pressureURL(name, r.opens, r.closes);
  let an;
  if (p.bullPct >= 65) an = '🟢 <b>FORCA COMPRADORA</b> dominante. Tendencia altista nos ultimos 30 dias.';
  else if (p.bullPct >= 55) an = '🟢 Leve vantagem de compradores. Mercado pendendo pra alta.';
  else if (p.bearPct >= 65) an = '🔴 <b>FORCA VENDEDORA</b> dominante. Tendencia baixista.';
  else if (p.bearPct >= 55) an = '🔴 Leve vantagem de vendedores. Pressao de venda.';
  else an = '⚪ <b>EQUILIBRIO</b>. Pode romper qualquer lado.';
  const cap = '⚖️ <b>PRESSAO ' + name + '</b>\n\nCompradores: <b>' + p.bullPct + '%</b>\nVendedores: <b>' + p.bearPct + '%</b>\n\n' + an;
  await tgPhoto(url, cap);
}

async function sendIndices() {
  const data = await Promise.all(INDICES.map(function(x) {
    return yh(x.s).then(function(r) { return Object.assign({}, x, r); });
  }));
  let txt = '🌍 <b>INDICES MUNDIAIS — ' + timeStr() + ' BR</b>\n\n';
  for (const x of data) if (x.p) txt += x.n + ': ' + intf(x.p) + ' ' + pct(x.c) + '\n';
  const ibov = data.find(function(x) { return x.n === 'Ibov'; });
  const sp = data.find(function(x) { return x.n === 'S&P500'; });
  const score = ((ibov && ibov.c) || 0) * 0.6 + ((sp && sp.c) || 0) * 0.4;
  txt += '\n🤖 <b>ANALISE MACRO</b>\n';
  if (score > 0.8) txt += '🟢 FORTE ALTA — Risk-on global. Procure pullbacks em qualidade.';
  else if (score > 0.2) txt += '🟢 VIES DE ALTA — DCA programado.';
  else if (score < -0.8) txt += '🔴 FORTE QUEDA — Risk-off. Defensivo: Selic, Ouro.';
  else if (score < -0.2) txt += '🔴 VIES DE QUEDA — Stops apertados.';
  else txt += '⚪ LATERALIDADE — DCA e estudo.';
  await tg(txt);
  await sendCandleAtivo('^BVSP', 'IBOVESPA');
  await sendPressao('^BVSP', 'IBOVESPA');
}

async function sendAcoesBR() {
  const data = await Promise.all(ACOES_BR.map(function(x) {
    return yh(x.s).then(function(r) { return Object.assign({}, x, r); });
  }));
  const valid = data.filter(function(x) { return x.p; });
  valid.sort(function(a, b) { return b.c - a.c; });
  let txt = '📈 <b>ACOES BR — ' + timeStr() + ' BR</b>\n\n';
  txt += '<b>🟢 TOP 5 ALTAS</b>\n';
  for (const x of valid.slice(0, 5)) txt += x.n + ': R$ ' + f2(x.p) + ' ' + pct(x.c) + '\n';
  txt += '\n<b>🔴 TOP 5 QUEDAS</b>\n';
  for (const x of valid.slice(-5).reverse()) txt += x.n + ': R$ ' + f2(x.p) + ' ' + pct(x.c) + '\n';
  await tg(txt);
  if (valid[0]) {
    await sendCandleAtivo(valid[0].s, valid[0].n);
    await sendPressao(valid[0].s, valid[0].n);
  }
}

async function sendAcoesUS() {
  const data = await Promise.all(ACOES_US.map(function(x) {
    return yh(x.s).then(function(r) { return Object.assign({}, x, r); });
  }));
  const valid = data.filter(function(x) { return x.p; });
  valid.sort(function(a, b) { return b.c - a.c; });
  let txt = '🇺🇸 <b>ACOES USA — ' + timeStr() + ' BR</b>\n\n';
  for (const x of data) if (x.p) txt += x.n + ': $' + f2(x.p) + ' ' + pct(x.c) + '\n';
  await tg(txt);
  if (valid[0]) {
    await sendCandleAtivo(valid[0].s, valid[0].n);
    await sendPressao(valid[0].s, valid[0].n);
  }
}

async function sendCripto() {
  const data = await Promise.all(CRIPTO_YH.map(function(x) {
    return yh(x.s).then(function(r) { return Object.assign({}, x, r); });
  }));
  let txt = '₿ <b>CRIPTO 24/7 — ' + timeStr() + ' BR</b>\n\n';
  for (const x of data) {
    if (x.p) txt += x.n + ': $' + (x.p < 10 ? f4(x.p) : intf(x.p)) + ' ' + pct(x.c) + '\n';
  }
  const btc = data.find(function(x) { return x.n === 'BTC'; });
  txt += '\n💡 <b>ANALISE CRIPTO</b>\n';
  if (btc && btc.c > 3) txt += 'BTC forte — altseason possivel.';
  else if (btc && btc.c < -3) txt += 'BTC corrigindo — cuidado com altcoins.';
  else txt += 'BTC equilibrado — atencao em rompimentos.';
  await tg(txt);
  await sendCandleAtivo('BTC-USD', 'BITCOIN');
  await sendPressao('BTC-USD', 'BITCOIN');
}

async function sendForex() {
  const data = await Promise.all(FOREX_YH.map(function(x) {
    return yh(x.s).then(function(r) { return Object.assign({}, x, r); });
  }));
  let txt = '💱 <b>FOREX — ' + timeStr() + ' BR</b>\n\n';
  for (const x of data) if (x.p) txt += x.n + ': R$ ' + f4(x.p) + ' ' + pct(x.c) + '\n';
  const usd = data.find(function(x) { return x.n === 'USD/BRL'; });
  txt += '\n💡 <b>ANALISE</b>\n';
  if (usd && usd.c > 1) txt += 'Dolar disparando — exportadora (VALE3, SUZB3) tende a subir.';
  else if (usd && usd.c < -1) txt += 'Real forte — bom pra importacao.';
  else txt += 'Cambio estavel.';
  await tg(txt);
  await sendCandleAtivo('USDBRL=X', 'USDBRL');
  await sendPressao('USDBRL=X', 'USDBRL');
}

async function sendETFsFIIs() {
  const etfsP = Promise.all(ETFS.map(function(x) {
    return yh(x.s).then(function(r) { return Object.assign({}, x, r); });
  }));
  const fiisP = Promise.all(FIIS.map(function(x) {
    return yh(x.s).then(function(r) { return Object.assign({}, x, r); });
  }));
  const etfs = await etfsP;
  const fiis = await fiisP;
  const validE = etfs.filter(function(x) { return x.p; });
  validE.sort(function(a, b) { return b.c - a.c; });
  let txt = '📊 <b>ETFs e FIIs — ' + timeStr() + ' BR</b>\n\n<b>📊 ETFs</b>\n';
  for (const x of etfs) if (x.p) txt += x.n + ': R$ ' + f2(x.p) + ' ' + pct(x.c) + '\n';
  txt += '\n<b>🏢 FIIs</b>\n';
  for (const x of fiis) if (x.p) txt += x.n + ': R$ ' + f2(x.p) + ' ' + pct(x.c) + '\n';
  txt += '\n💡 FIIs pagam dividendo MENSAL isento de IR pra PF.';
  await tg(txt);
  if (validE[0]) {
    await sendCandleAtivo(validE[0].s, validE[0].n);
    await sendPressao(validE[0].s, validE[0].n);
  }
}

async function sendCommodities() {
  const data = await Promise.all(COMMODITIES.map(function(x) {
    return yh(x.s).then(function(r) { return Object.assign({}, x, r); });
  }));
  const valid = data.filter(function(x) { return x.p; });
  let txt = '🏆 <b>COMMODITIES — ' + timeStr() + ' BR</b>\n\n';
  for (const x of data) if (x.p) txt += x.n + ': $' + f2(x.p) + ' ' + pct(x.c) + '\n';
  const ouro = data.find(function(x) { return x.n === 'Ouro'; });
  const petr = data.find(function(x) { return x.n === 'Petroleo'; });
  txt += '\n💡 <b>ANALISE</b>\n';
  if (ouro && ouro.c > 1) txt += 'Ouro subindo — aversao a risco global.';
  else if (petr && petr.c > 2) txt += 'Petroleo em alta — PETR4 e PRIO3 tendem a subir.';
  else if (petr && petr.c < -2) txt += 'Petroleo caindo — pressao em PETR4.';
  else txt += 'Commodities equilibradas.';
  await tg(txt);
  if (valid[0]) {
    await sendCandleAtivo(valid[0].s, valid[0].n);
    await sendPressao(valid[0].s, valid[0].n);
  }
}

async function sendRanking() {
  const all = ACOES_BR.concat(ETFS);
  const data = await Promise.all(all.map(function(x) {
    return yh(x.s).then(function(r) { return Object.assign({}, x, r); });
  }));
  const valid = data.filter(function(x) { return x.p; });
  valid.sort(function(a, b) { return b.c - a.c; });
  const top = valid.slice(0, 10);
  const cfg = {
    type: 'horizontalBar',
    data: {
      labels: top.map(function(x) { return x.n; }),
      datasets: [{
        data: top.map(function(x) { return +x.c.toFixed(2); }),
        backgroundColor: top.map(function(x) { return x.c >= 0 ? '#22c55e' : '#ef4444'; })
      }]
    },
    options: {
      title: {display: true, text: 'TOP 10 BR HOJE', fontColor: '#d4af37'},
      legend: {display: false}
    }
  };
  const url = 'https://quickchart.io/chart?bkg=%230a0a0a&w=800&h=500&c=' + encodeURIComponent(JSON.stringify(cfg));
  await tgPhoto(url, '🏆 <b>RANKING ACOES BR HOJE</b>');
}

function rsi(closes, period) {
  period = period || 14;
  if (closes.length < period + 1) return null;
  let g = 0, l = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) g += d;
    else l -= d;
  }
  if (l === 0) return 100;
  return 100 - (100 / (1 + g / l));
}

function sma(closes, n) {
  if (closes.length < n) return null;
  return closes.slice(-n).reduce(function(a, b) { return a + b; }, 0) / n;
}

async function sendSignals() {
  const syms = ACOES_BR.slice(0, 15);
  const data = await Promise.all(syms.map(function(x) {
    return yh(x.s, '60d', '1d').then(function(r) { return Object.assign({}, x, r); });
  }));
  const sinais = [];
  for (const x of data) {
    if (!x.closes || x.closes.length < 20) continue;
    const r = rsi(x.closes);
    const s20 = sma(x.closes, 20);
    const s50 = sma(x.closes, 50);
    let setup, desc;
    if (r && r < 30 && x.c < -1) {
      setup = '🟢 COMPRA — sobrevenda';
      desc = 'RSI ' + Math.round(r) + ' + queda. Reversao provavel.';
    } else if (r && r > 75 && x.c > 1) {
      setup = '🔴 ZONA DE TOPO';
      desc = 'RSI ' + Math.round(r) + ' + alta. Correcao provavel.';
    } else if (s20 && s50 && s20 > s50 * 1.005 && x.p > s20 && x.c > 0.5) {
      setup = '🟢 TENDENCIA ALTA';
      desc = 'MM20 acima MM50. Bull confirmado.';
    } else if (s20 && s50 && s20 < s50 * 0.995 && x.p < s20 && x.c < -0.5) {
      setup = '🔴 TENDENCIA QUEDA';
      desc = 'MM20 abaixo MM50. Fraqueza.';
    }
    if (setup) {
      const long = setup.indexOf('🟢') >= 0;
      const stop = long ? +(x.p * 0.97).toFixed(2) : +(x.p * 1.03).toFixed(2);
      const tgt = long ? +(x.p * 1.05).toFixed(2) : +(x.p * 0.95).toFixed(2);
      const rr = long ? ((tgt - x.p) / (x.p - stop)).toFixed(1) : ((x.p - tgt) / (stop - x.p)).toFixed(1);
      sinais.push({n: x.n, s: x.s, p: x.p, c: x.c, rsi: r, setup: setup, desc: desc, stop: stop, tgt: tgt, rr: rr});
    }
  }
  if (!sinais.length) {
    await tg('⚪ <b>SEM SETUPS TECNICOS</b>\n\nNenhum ativo atende criterios agora.\nMercado equilibrado tecnicamente.');
    return;
  }
  let txt = '🎯 <b>SINAIS TECNICOS — ' + timeStr() + ' BR</b>\n\n' + sinais.length + ' setup(s) detectado(s)\n\n';
  for (const s of sinais.slice(0, 5)) {
    txt += '<b>' + s.n + '</b> R$ ' + s.p.toFixed(2) + ' ' + pct(s.c) + '\n';
    txt += s.setup + ' RSI ' + Math.round(s.rsi) + '\n';
    txt += '<i>' + s.desc + '</i>\n';
    txt += '🛑 ' + s.stop + ' 🎯 ' + s.tgt + ' ⚖️ 1:' + s.rr + '\n\n';
  }
  txt += '⚠️ <i>Educacional. Stop obrigatorio. Max 2% capital.</i>';
  await tg(txt);
  if (sinais[0]) await sendCandleAtivo(sinais[0].s, sinais[0].n);
}

async function sendNews(rotationIdx) {
  const itemsA = await rssNews(rotationIdx);
  const itemsB = await rssNews(rotationIdx + 4);
  const all = itemsA.concat(itemsB);
  const seen = new Set();
  const unique = all.filter(function(it) {
    const k = (it.title || '').toLowerCase().slice(0, 60);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const top = unique.slice(0, 3);
  for (let i = 0; i < top.length; i++) {
    const n = top[i];
    const cap = '📰 <b>NOTICIA ' + (i + 1) + '/' + top.length + '</b>\n<b>' + (n.title || '').slice(0, 220) + '</b>\n\n📡 ' + n.source + '\n🔗 <a href="' + n.link + '">Ler materia</a>';
    if (n.image) {
      try { await tgPhoto(n.image, cap); } catch (e) { await tg(cap); }
    } else {
      await tg(cap);
    }
  }
}

const ESTUDOS = [];
ESTUDOS.push({t: '📚 RSI', b: 'RSI varia 0-100:\n- >70 sobrecomprado\n- <30 sobrevendido\n- 40-60 neutro\n💡 Em uptrend forte, RSI 50 ja e compra.'});
ESTUDOS.push({t: '📚 Dividend Yield', b: 'DY = dividendo / preco x 100\nTop BR:\n- PETR4 12%\n- BBAS3 10%\n- TAEE11 9%\n- VALE3 8%\n💡 Cheque payout e divida.'});
ESTUDOS.push({t: '📚 Medias Moveis', b: 'MM = media de N periodos.\n- Preco>MM20>MM50 ALTA\n- Preco<MM20<MM50 QUEDA\n- MM20 cruza MM50 cima = GOLDEN CROSS\n- Cruza baixo = DEATH CROSS'});
ESTUDOS.push({t: '📚 Diversificacao', b: 'Carteira balanceada:\n60% RV (30% Acoes 20% ETF 10% FII)\n30% RF (Selic, CDB, IPCA+)\n10% Cripto+Ouro\n💡 Rebalanceie a cada 6 meses.'});
ESTUDOS.push({t: '📚 Quando comprar', b: 'COMPRA:\n- RSI<30 em uptrend\n- Pullback ate MM20\n- Noticia + tecnica favoravel\nVENDA:\n- RSI>75 sustentado\n- Stop atingido\n- Fundamentos mudaram'});
ESTUDOS.push({t: '📚 Risk/Reward', b: 'R/R = (alvo - entrada) / (entrada - stop)\nEx: PETR4 R$30\nAlvo R$33 (+10%)\nStop R$29 (-3,3%)\nR/R = 1:3\n💡 NUNCA opere abaixo de 1:2.'});
ESTUDOS.push({t: '📚 Fundamentalista', b: 'Indicadores:\n- P/L preco/lucro\n- P/VP preco/patrimonio\n- ROE >15% bom\n- Divida/EBITDA <3 saudavel\n- Margem >10% forte'});
ESTUDOS.push({t: '📚 Pregao B3', b: '09h45-10h00 pre-abertura\n10h00-17h00 pregao\n17h00-17h25 leilao fim\n17h25-18h00 after-market\n💡 Maior volume na abertura e fechamento.'});
ESTUDOS.push({t: '📚 Pressao C/V', b: 'O donut mostra:\n- Verde = % dias em alta (30d)\n- Vermelho = % dias em queda\n💡 >65% verde = tendencia forte de alta.\n>65% vermelho = pressao baixista.'});
ESTUDOS.push({t: '📚 Candlestick', b: 'Cada vela = 1 dia:\n- Verde fechou acima abertura\n- Vermelho fechou abaixo\n- Corpo grande = forca\n- Pavio longo = rejeicao\n💡 3 verdes seguidas = momentum forte.'});

async function sendEstudo() {
  const t = brTime();
  const idx = (t.getUTCHours() * 60 + t.getUTCMinutes()) % ESTUDOS.length;
  const top = ESTUDOS[idx];
  await tg('🎓 <b>ESTUDO DO MERCADO</b>\n\n<b>' + top.t + '</b>\n\n' + top.b);
}

async function run() {
  const status = marketStatus();
  const min = new Date().getUTCMinutes();
  if (status === 'fim') {
    if (min === 0) await sendCripto();
    else if (min === 15) await sendNews(0);
    else if (min === 30) await sendEstudo();
    else if (min === 45) await sendNews(2);
    return;
  }
  if (status === 'pre') {
    if (min === 0) await sendIndices();
    else if (min === 10) await sendNews(0);
    else if (min === 20) await sendCripto();
    else if (min === 30) await sendForex();
    else if (min === 40) await sendNews(3);
    else if (min === 50) await sendEstudo();
    return;
  }
  if (status === 'leilao' || status === 'fechado') {
    if (min === 0) await sendRanking();
    else if (min === 15) await sendNews(1);
    else if (min === 30) await sendEstudo();
    else if (min === 45) await sendNews(5);
    else if (min === 5 || min === 25 || min === 50) await sendCripto();
    return;
  }
  if (min === 0) await sendIndices();
  else if (min === 5) await sendAcoesBR();
  else if (min === 10) await sendNews(0);
  else if (min === 15) await sendCripto();
  else if (min === 20) await sendForex();
  else if (min === 25) await sendETFsFIIs();
  else if (min === 30) await sendSignals();
  else if (min === 35) await sendAcoesUS();
  else if (min === 40) await sendNews(4);
  else if (min === 45) await sendCommodities();
  else if (min === 50) await sendRanking();
  else if (min === 55) await sendEstudo();
}

export default {
  async fetch(request, env, ctx) {
    await run();
    return new Response('OK');
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(run());
  }
};
