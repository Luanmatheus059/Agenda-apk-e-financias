// AGENTE FINANCEIRO — Cloudflare Worker v10
// v10: candle individual por categoria + pressão compradora/vendedora (estilo XP)
// Anti-repetição total. 58 ativos. Module Worker.

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
  {s:'^DJI',n:'Dow Jones'},
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
  {s:'CL=F',n:'Petróleo'},
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

const NEWS_SOURCES = [
  {u:'https://www.infomoney.com.br/feed/',n:'InfoMoney'},
  {u:'https://br.investing.com/rss/news_25.rss',n:'Investing BR'},
  {u:'https://www.moneytimes.com.br/feed/',n:'MoneyTimes'},
  {u:'https://www.infomoney.com.br/mercados/feed/',n:'InfoMoney Mercados'},
  {u:'https://valor.globo.com/valor-investe/rss/',n:'Valor Investe'},
  {u:'https://br.investing.com/rss/news_11.rss',n:'Investing Commodities'},
  {u:'https://br.investing.com/rss/news_301.rss',n:'Investing Cripto'},
  {u:'https://www.moneytimes.com.br/category/economia/feed/',n:'MoneyTimes Eco'}
];

// ─── Helpers de dados ───

async function yh(sym, range='15d', interval='1d'){
  try{
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + sym + '?interval=' + interval + '&range=' + range;
    const r = await fetch(url, {headers:{'User-Agent':UA}});
    const d = await r.json();
    const result = d?.chart?.result?.[0];
    if(!result) return null;
    const m = result.meta;
    const q = result.indicators?.quote?.[0];
    if(!m?.regularMarketPrice || !m?.previousClose) return null;
    const opens = (q?.open||[]).filter(x => x != null);
    const highs = (q?.high||[]).filter(x => x != null);
    const lows = (q?.low||[]).filter(x => x != null);
    const closes = (q?.close||[]).filter(x => x != null);
    return {
      p: m.regularMarketPrice,
      c: (m.regularMarketPrice - m.previousClose) / m.previousClose * 100,
      opens, highs, lows, closes
    };
  } catch(e){ return null; }
}

async function rssNews(idx){
  try{
    const src = NEWS_SOURCES[idx % NEWS_SOURCES.length];
    const url = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(src.u);
    const r = await fetch(url);
    const d = await r.json();
    return (d.items||[]).slice(0, 5).map(it => {
      let img = it.thumbnail || it.enclosure?.link;
      if(!img && it.description){
        const m = it.description.match(/<img[^>]+src=["']([^"']+)["']/);
        if(m) img = m[1];
      }
      return {title: it.title, link: it.link, source: src.n, image: img, date: it.pubDate};
    });
  } catch(e){ return []; }
}

// ─── Formatadores ───

function pct(c){
  if(c == null) return '-';
  return (c >= 0 ? '🟢 +' : '🔴 ') + c.toFixed(2) + '%';
}

function intf(p){
  if(!p) return '-';
  return Math.round(p).toLocaleString('de-DE');
}

function f2(p){ return p ? p.toFixed(2) : '-'; }
function f4(p){ return p ? p.toFixed(4) : '-'; }

// ─── Telegram ───

async function tg(text){
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

async function tgPhoto(photo, caption){
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

// ─── Tempo / mercado ───

function brTime(){ return new Date(Date.now() - 3 * 3600 * 1000); }
function timeStr(){ return brTime().toISOString().slice(11, 16); }

function marketStatus(){
  const t = brTime();
  const h = t.getUTCHours();
  const d = t.getUTCDay();
  if(d === 0 || d === 6) return 'fim';
  if(h < 10) return 'pre';
  if(h < 17) return 'aberto';
  if(h < 18) return 'leilao';
  return 'fechado';
}

// ─── Gráficos via QuickChart ───

function candleURL(name, opens, closes, n=15){
  const len = Math.min(n, opens.length);
  const op = opens.slice(-len);
  const cl = closes.slice(-len);
  const cfg = {
    type: 'bar',
    data: {
      labels: op.map((_, i) => 'D' + (len - i)),
      datasets: [{
        label: name,
        data: cl.map((c, i) => [op[i], c]),
        backgroundColor: cl.map((c, i) => c >= op[i] ? '#22c55e' : '#ef4444'),
        borderColor: cl.map((c, i) => c >= op[i] ? '#16a34a' : '#dc2626'),
        borderWidth: 1
      }]
    },
    options: {
      title: {display: true, text: '🕯️ ' + name + ' — Velas (' + len + 'd)', fontColor: '#d4af37', fontSize: 18},
      legend: {display: false},
      scales: {
        xAxes: [{ticks: {fontColor: '#888'}}],
        yAxes: [{ticks: {fontColor: '#fff'}}]
      }
    }
  };
  return 'https://quickchart.io/chart?bkg=%230a0a0a&w=900&h=500&c=' + encodeURIComponent(JSON.stringify(cfg));
}

function pressureURL(name, opens, closes){
  let bull = 0, bear = 0;
  for(let i = 0; i < closes.length; i++){
    if(closes[i] >= opens[i]) bull++;
    else bear++;
  }
  const total = bull + bear;
  const bullPct = total ? (bull / total * 100).toFixed(0) : 50;
  const bearPct = total ? (bear / total * 100).toFixed(0) : 50;
  const cfg = {
    type: 'doughnut',
    data: {
      labels: ['Compradores (' + bullPct + '%)', 'Vendedores (' + bearPct + '%)'],
      datasets: [{
        data: [bull, bear],
        backgroundColor: ['#22c55e', '#ef4444'],
        borderColor: ['#16a34a', '#dc2626'],
        borderWidth: 2
      }]
    },
    options: {
      title: {
        display: true,
        text: '⚖️ PRESSÃO ' + name + ' — ' + total + ' dias',
        fontColor: '#d4af37',
        fontSize: 18
      },
      legend: {labels: {fontColor: '#fff', fontSize: 14}}
    }
  };
  return {
    url: 'https://quickchart.io/chart?bkg=%230a0a0a&w=700&h=500&c=' + encodeURIComponent(JSON.stringify(cfg)),
    bullPct, bearPct
  };
}

async function sendCandleAtivo(sym, name){
  const r = await yh(sym, '15d', '1d');
  if(!r || r.opens.length < 3) return;
  const url = candleURL(name, r.opens, r.closes);
  const cap = '🕯️ <b>' + name + ' — CANDLESTICK</b>\nÚltimo: ' + (r.p < 10 ? f4(r.p) : f2(r.p)) + ' ' + pct(r.c) + '\nVerde=compradores ganharam · Vermelho=vendedores ganharam';
  await tgPhoto(url, cap);
}

async function sendPressao(sym, name){
  const r = await yh(sym, '30d', '1d');
  if(!r || r.opens.length < 5) return;
  const {url, bullPct, bearPct} = pressureURL(name, r.opens, r.closes);
  let analise = '';
  if(bullPct >= 65) analise = '🟢 <b>FORÇA COMPRADORA</b> dominante. Tendência altista nos últimos 30 dias.';
  else if(bullPct >= 55) analise = '🟢 Leve vantagem de compradores. Mercado pendendo pra alta.';
  else if(bearPct >= 65) analise = '🔴 <b>FORÇA VENDEDORA</b> dominante. Tendência baixista. Cautela!';
  else if(bearPct >= 55) analise = '🔴 Leve vantagem de vendedores. Pressão de venda.';
  else analise = '⚪ <b>EQUILÍBRIO</b>. Compradores e vendedores empatados — pode romper qualquer lado.';
  const cap = '⚖️ <b>PRESSÃO ' + name + '</b>\n\nCompradores: <b>' + bullPct + '%</b>\nVendedores: <b>' + bearPct + '%</b>\n\n' + analise;
  await tgPhoto(url, cap);
}

// ─── Categorias (cada minuto manda 1) ───

async function sendIndices(){
  const data = await Promise.all(INDICES.map(x => yh(x.s).then(r => ({...x, ...r}))));
  let txt = '🌍 <b>ÍNDICES MUNDIAIS — ' + timeStr() + ' BR</b>\n━━━━━━━━━━━\n\n';
  for(const x of data) if(x.p) txt += x.n + ': ' + intf(x.p) + ' ' + pct(x.c) + '\n';
  const ibov = data.find(x => x.n === 'Ibov');
  const sp = data.find(x => x.n === 'S&P500');
  const score = (ibov?.c || 0) * 0.6 + (sp?.c || 0) * 0.4;
  txt += '\n🤖 <b>ANÁLISE MACRO</b>\n';
  if(score > 0.8) txt += '🟢 <b>FORTE ALTA</b>\nMercados em sincronia positiva. Risk-on global.\n💡 Procure pullbacks em qualidade (VALE3, PETR4, NVDA).';
  else if(score > 0.2) txt += '🟢 <b>VIÉS DE ALTA</b>\nTendência positiva moderada.\n💡 DCA programado, sem pressa.';
  else if(score < -0.8) txt += '🔴 <b>FORTE QUEDA</b>\nRisk-off. Investidores buscando refúgio.\n💡 Defensivo: Tesouro Selic, Ouro.';
  else if(score < -0.2) txt += '🔴 <b>VIÉS DE QUEDA</b>\nMercado fraco mas sem pânico.\n💡 Stops apertados, liquidez reserva.';
  else txt += '⚪ <b>LATERALIDADE</b>\nIndecisão. Pode romper qualquer lado.\n💡 DCA é a melhor estratégia.';
  await tg(txt);
  await sendCandleAtivo('^BVSP', 'IBOVESPA');
  await sendPressao('^BVSP', 'IBOVESPA');
}

async function sendAcoesBR(){
  const data = await Promise.all(ACOES_BR.map(x => yh(x.s).then(r => ({...x, ...r}))));
  const valid = data.filter(x => x.p);
  valid.sort((a, b) => b.c - a.c);
  let txt = '📈 <b>AÇÕES BR — ' + timeStr() + ' BR</b>\n━━━━━━━━━━━\n\n';
  txt += '<b>🟢 TOP 5 ALTAS</b>\n';
  for(const x of valid.slice(0, 5)) txt += x.n + ': R$ ' + f2(x.p) + ' ' + pct(x.c) + '\n';
  txt += '\n<b>🔴 TOP 5 QUEDAS</b>\n';
  for(const x of valid.slice(-5).reverse()) txt += x.n + ': R$ ' + f2(x.p) + ' ' + pct(x.c) + '\n';
  const top = valid[0];
  if(top && top.c > 1) txt += '\n💡 <b>' + top.n + '</b> liderando +' + top.c.toFixed(2) + '% — fluxo comprador.';
  await tg(txt);
  if(top) await sendCandleAtivo(top.s, top.n);
  if(top) await sendPressao(top.s, top.n);
}

async function sendAcoesUS(){
  const data = await Promise.all(ACOES_US.map(x => yh(x.s).then(r => ({...x, ...r}))));
  const valid = data.filter(x => x.p);
  valid.sort((a, b) => b.c - a.c);
  let txt = '🇺🇸 <b>AÇÕES USA — ' + timeStr() + ' BR</b>\n━━━━━━━━━━━\n\n';
  for(const x of data) if(x.p) txt += x.n + ': $' + f2(x.p) + ' ' + pct(x.c) + '\n';
  const nvda = data.find(x => x.n === 'NVDA');
  const tsla = data.find(x => x.n === 'TSLA');
  txt += '\n💡 <b>TECH UPDATE</b>\n';
  if(nvda?.c > 2) txt += 'NVDA puxando IA forte (+' + nvda.c.toFixed(2) + '%) — boa pro setor.';
  else if(tsla?.c > 2) txt += 'TSLA em alta — narrativa EV voltando.';
  else txt += 'Tech equilibrado — sem catalisador claro.';
  await tg(txt);
  const top = valid[0];
  if(top) await sendCandleAtivo(top.s, top.n);
  if(top) await sendPressao(top.s, top.n);
}

async function sendCripto(){
  const data = await Promise.all(CRIPTO_YH.map(x => yh(x.s).then(r => ({...x, ...r}))));
  const valid = data.filter(x => x.p);
  valid.sort((a, b) => b.c - a.c);
  let txt = '₿ <b>CRIPTO 24/7 — ' + timeStr() + ' BR</b>\n━━━━━━━━━━━\n\n';
  for(const x of data){
    if(x.p) txt += x.n + ': $' + (x.p < 10 ? f4(x.p) : intf(x.p)) + ' ' + pct(x.c) + '\n';
  }
  const btc = data.find(x => x.n === 'BTC');
  txt += '\n💡 <b>ANÁLISE CRIPTO</b>\n';
  if(btc?.c > 3) txt += 'BTC forte — altseason possível, ETH/SOL tendem a seguir.';
  else if(btc?.c < -3) txt += 'BTC corrigindo — altcoins tendem a cair mais.';
  else txt += 'BTC equilibrado — atenção em rompimentos de suporte/resistência.';
  await tg(txt);
  await sendCandleAtivo('BTC-USD', 'BITCOIN');
  await sendPressao('BTC-USD', 'BITCOIN');
}

async function sendForex(){
  const data = await Promise.all(FOREX_YH.map(x => yh(x.s).then(r => ({...x, ...r}))));
  let txt = '💱 <b>FOREX — ' + timeStr() + ' BR</b>\n━━━━━━━━━━━\n\n';
  for(const x of data) if(x.p) txt += x.n + ': R$ ' + f4(x.p) + ' ' + pct(x.c) + '\n';
  const usd = data.find(x => x.n === 'USD/BRL');
  txt += '\n💡 <b>ANÁLISE FOREX</b>\n';
  if(usd?.c > 1) txt += 'Dólar disparando — proteja exposição BR, exportadora (VALE3, SUZB3) tende a subir.';
  else if(usd?.c < -1) txt += 'Real forte — bom pra importação, ruim pra exportadora.';
  else txt += 'Câmbio estável — sem distorção macro hoje.';
  await tg(txt);
  await sendCandleAtivo('USDBRL=X', 'USD/BRL');
  await sendPressao('USDBRL=X', 'USD/BRL');
}

async function sendETFsFIIs(){
  const [etfs, fiis] = await Promise.all([
    Promise.all(ETFS.map(x => yh(x.s).then(r => ({...x, ...r})))),
    Promise.all(FIIS.map(x => yh(x.s).then(r => ({...x, ...r}))))
  ]);
  const validE = etfs.filter(x => x.p);
  validE.sort((a, b) => b.c - a.c);
  let txt = '📊 <b>ETFs & FIIs — ' + timeStr() + ' BR</b>\n━━━━━━━━━━━\n\n';
  txt += '<b>📊 ETFs</b>\n';
  for(const x of etfs) if(x.p) txt += x.n + ': R$ ' + f2(x.p) + ' ' + pct(x.c) + '\n';
  txt += '\n<b>🏢 FIIs</b>\n';
  for(const x of fiis) if(x.p) txt += x.n + ': R$ ' + f2(x.p) + ' ' + pct(x.c) + '\n';
  txt += '\n💡 FIIs pagam dividendo MENSAL isento de IR pra pessoa física.';
  await tg(txt);
  const topETF = validE[0];
  if(topETF) await sendCandleAtivo(topETF.s, topETF.n);
  if(topETF) await sendPressao(topETF.s, topETF.n);
}

async function sendCommodities(){
  const data = await Promise.all(COMMODITIES.map(x => yh(x.s).then(r => ({...x, ...r}))));
  const valid = data.filter(x => x.p);
  let txt = '🏆 <b>COMMODITIES — ' + timeStr() + ' BR</b>\n━━━━━━━━━━━\n\n';
  for(const x of data) if(x.p) txt += x.n + ': $' + f2(x.p) + ' ' + pct(x.c) + '\n';
  const ouro = data.find(x => x.n === 'Ouro');
  const petr = data.find(x => x.n === 'Petróleo');
  txt += '\n💡 <b>ANÁLISE</b>\n';
  if(ouro?.c > 1) txt += 'Ouro subindo — sinal de aversão a risco global.';
  else if(petr?.c > 2) txt += 'Petróleo em alta — PETR4 e PRIO3 tendem a subir.';
  else if(petr?.c < -2) txt += 'Petróleo caindo — pressão em PETR4.';
  else txt += 'Commodities equilibradas — sem stress macro.';
  await tg(txt);
  if(valid[0]) await sendCandleAtivo(valid[0].s, valid[0].n);
  if(valid[0]) await sendPressao(valid[0].s, valid[0].n);
}

async function sendRanking(){
  const all = [...ACOES_BR, ...ETFS];
  const data = await Promise.all(all.map(x => yh(x.s).then(r => ({...x, ...r}))));
  const valid = data.filter(x => x.p);
  valid.sort((a, b) => b.c - a.c);
  const top10 = valid.slice(0, 10);
  const cfg = {
    type: 'horizontalBar',
    data: {
      labels: top10.map(x => x.n),
      datasets: [{
        data: top10.map(x => +x.c.toFixed(2)),
        backgroundColor: top10.map(x => x.c >= 0 ? '#22c55e' : '#ef4444')
      }]
    },
    options: {
      title: {display: true, text: '🏆 TOP 10 BR HOJE', fontColor: '#d4af37', fontSize: 18},
      legend: {display: false},
      scales: {xAxes: [{ticks: {fontColor: '#fff'}}], yAxes: [{ticks: {fontColor: '#fff'}}]}
    }
  };
  const url = 'https://quickchart.io/chart?bkg=%230a0a0a&w=800&h=500&c=' + encodeURIComponent(JSON.stringify(cfg));
  await tgPhoto(url, '🏆 <b>RANKING AÇÕES BR HOJE</b>');
}

// ─── Sinais técnicos ───

function rsi(closes, period = 14){
  if(closes.length < period + 1) return null;
  let g = 0, l = 0;
  for(let i = closes.length - period; i < closes.length; i++){
    const d = closes[i] - closes[i - 1];
    if(d > 0) g += d;
    else l -= d;
  }
  if(l === 0) return 100;
  return 100 - (100 / (1 + g / l));
}

function sma(closes, n){
  if(closes.length < n) return null;
  return closes.slice(-n).reduce((a, b) => a + b, 0) / n;
}

async function sendSignals(){
  const syms = ACOES_BR.slice(0, 15);
  const data = await Promise.all(syms.map(x => yh(x.s, '60d', '1d').then(r => ({...x, ...r}))));
  const sinais = [];
  for(const x of data){
    if(!x.closes || x.closes.length < 20) continue;
    const r = rsi(x.closes);
    const s20 = sma(x.closes, 20);
    const s50 = sma(x.closes, 50);
    let setup, desc;
    if(r && r < 30 && x.c < -1){
      setup = '🟢 COMPRA — sobrevenda';
      desc = 'RSI ' + Math.round(r) + ' + queda ' + x.c.toFixed(1) + '%. Reversão técnica provável.';
    } else if(r && r > 75 && x.c > 1){
      setup = '🔴 ZONA DE TOPO';
      desc = 'RSI ' + Math.round(r) + ' + alta ' + x.c.toFixed(1) + '%. Correção provável.';
    } else if(s20 && s50 && s20 > s50 * 1.005 && x.p > s20 && x.c > 0.5){
      setup = '🟢 TENDÊNCIA ALTA';
      desc = 'MM20 > MM50 alinhadas. Bull confirmado.';
    } else if(s20 && s50 && s20 < s50 * 0.995 && x.p < s20 && x.c < -0.5){
      setup = '🔴 TENDÊNCIA QUEDA';
      desc = 'MM20 < MM50. Fraqueza estrutural.';
    }
    if(setup){
      const long = setup.includes('🟢');
      const stop = long ? +(x.p * 0.97).toFixed(2) : +(x.p * 1.03).toFixed(2);
      const tgt = long ? +(x.p * 1.05).toFixed(2) : +(x.p * 0.95).toFixed(2);
      const rr = long ? ((tgt - x.p) / (x.p - stop)).toFixed(1) : ((x.p - tgt) / (stop - x.p)).toFixed(1);
      sinais.push({n: x.n, s: x.s, p: x.p, c: x.c, rsi: r, setup, desc, stop, tgt, rr});
    }
  }
  if(!sinais.length){
    await tg('⚪ <b>SEM SETUPS TÉCNICOS</b>\n\nNenhum ativo BR atende critérios rigorosos agora (RSI <30/>75 ou MM cruzada).\n\n💡 Mercado equilibrado — bom momento pra estudar.');
    return;
  }
  let txt = '🎯 <b>SINAIS TÉCNICOS — ' + timeStr() + ' BR</b>\n━━━━━━━━━━━\n\n' + sinais.length + ' setup(s) detectado(s)\n\n';
  for(const s of sinais.slice(0, 5)){
    txt += '<b>' + s.n + '</b> · R$ ' + s.p.toFixed(2) + ' ' + pct(s.c) + '\n';
    txt += s.setup + ' · RSI ' + Math.round(s.rsi) + '\n';
    txt += '<i>' + s.desc + '</i>\n';
    txt += '🛑 R$ ' + s.stop + ' · 🎯 R$ ' + s.tgt + ' · ⚖️ 1:' + s.rr + '\n\n';
  }
  txt += '⚠️ <i>Educacional. Stop obrigatório. Máx 2% capital por trade.</i>';
  await tg(txt);
  if(sinais[0]) await sendCandleAtivo(sinais[0].s, sinais[0].n);
}

async function sendNews(rotationIdx){
  const items1 = await rssNews(rotationIdx);
  const items2 = await rssNews(rotationIdx + 4);
  const all = [...items1, ...items2];
  const seen = new Set();
  const unique = all.filter(it => {
    const k = (it.title || '').toLowerCase().slice(0, 60);
    if(seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const top = unique.slice(0, 3);
  for(let i = 0; i < top.length; i++){
    const n = top[i];
    const cap = '📰 <b>NOTÍCIA ' + (i + 1) + '/' + top.length + '</b>\n━━━━━━━━━━━\n<b>' + (n.title || '').slice(0, 220) + '</b>\n\n📡 ' + n.source + '\n🔗 <a href="' + n.link + '">Ler matéria completa</a>';
    if(n.image){
      try{ await tgPhoto(n.image, cap); }
      catch(e){ await tg(cap); }
    } else {
      await tg(cap);
    }
  }
}

const ESTUDOS = [
  {
    t: '📚 RSI — Termômetro do mercado',
    b: 'RSI varia de 0-100:\n\n' +
       '• <b>RSI > 70</b> = sobrecomprado → correção provável\n' +
       '• <b>RSI < 30</b> = sobrevendido → recuperação\n' +
       '• <b>RSI 40-60</b> = neutro\n\n' +
       '💡 Em tendência forte de alta, RSI 50 já é compra.\n' +
       'Em queda forte, RSI 50 é venda.'
  },
  {
    t: '📚 Dividend Yield',
    b: 'DY = (dividendo anual / preço) × 100\n\n' +
       'Top DY BR 2026:\n' +
       '• PETR4: ~12%\n' +
       '• BBAS3: ~10%\n' +
       '• TAEE11: ~9%\n' +
       '• VALE3: ~8%\n' +
       '• ITSA4: ~7%\n\n' +
       '💡 DY alto não basta — cheque payout e dívida.'
  },
  {
    t: '📚 Médias Móveis',
    b: 'MM = média do preço de N períodos:\n\n' +
       '• Preço > MM20 > MM50 = ALTA confirmada\n' +
       '• Preço < MM20 < MM50 = QUEDA confirmada\n' +
       '• MM20 cruza MM50 ↑ = GOLDEN CROSS\n' +
       '• MM20 cruza MM50 ↓ = DEATH CROSS'
  },
  {
    t: '📚 Diversificação',
    b: 'Carteira balanceada padrão:\n\n' +
       '<b>60% Renda Variável</b>\n' +
       '  - 30% Ações BR\n' +
       '  - 20% ETFs\n' +
       '  - 10% FIIs\n\n' +
       '<b>30% Renda Fixa</b>\n' +
       '  - Tesouro Selic\n' +
       '  - CDB 120% CDI\n\n' +
       '<b>10% Cripto + Ouro</b>\n\n' +
       '💡 Rebalanceie a cada 6 meses.'
  },
  {
    t: '📚 Quando comprar / vender',
    b: '<b>COMPRA:</b>\n' +
       '• RSI < 30 em uptrend\n' +
       '• Pullback até MM20\n' +
       '• Notícia + análise favorável\n\n' +
       '<b>VENDA:</b>\n' +
       '• RSI > 75 sustentado\n' +
       '• Stop loss atingido\n' +
       '• Fundamentos mudaram\n\n' +
       '💡 NUNCA average down sem motivo.'
  },
  {
    t: '📚 Risk/Reward',
    b: 'R/R = (alvo - entrada) / (entrada - stop)\n\n' +
       'Exemplo: PETR4 a R$ 30\n' +
       '• Alvo: R$ 33 (+10%)\n' +
       '• Stop: R$ 29 (-3,3%)\n' +
       '• R/R: 3 / 1 = <b>1:3</b>\n\n' +
       '💡 NUNCA opere R/R abaixo de 1:2.'
  },
  {
    t: '📚 Análise Fundamentalista',
    b: 'Indicadores chave:\n\n' +
       '• <b>P/L</b>: preço / lucro\n' +
       '• <b>P/VP</b>: preço / valor patrim.\n' +
       '• <b>ROE</b>: > 15% é bom\n' +
       '• <b>Dívida/EBITDA</b>: <3 é saudável\n' +
       '• <b>Margem líquida</b>: > 10% é forte'
  },
  {
    t: '📚 Como funciona o pregão',
    b: 'B3 em dias úteis:\n\n' +
       '• <b>09h45-10h00</b>: Pré-abertura\n' +
       '• <b>10h00-17h00</b>: Pregão\n' +
       '• <b>17h00-17h25</b>: Leilão fim\n' +
       '• <b>17h25-18h00</b>: After-market\n\n' +
       '💡 Maior volume na abertura e fechamento.'
  },
  {
    t: '📚 Pressão Compradora x Vendedora',
    b: 'O donut que você recebe mostra:\n\n' +
       '• <b>Verde</b>: % dias dos últimos 30 em ALTA\n' +
       '• <b>Vermelho</b>: % dias em QUEDA\n\n' +
       '💡 > 65% verde = tendência forte de alta.\n' +
       '> 65% vermelho = pressão baixista clara.'
  },
  {
    t: '📚 Candlestick — Lendo as velas',
    b: 'Cada vela mostra 1 dia:\n\n' +
       '• <b>Verde</b>: fechou acima abertura\n' +
       '• <b>Vermelho</b>: fechou abaixo abertura\n' +
       '• <b>Corpo grande</b>: força do movimento\n' +
       '• <b>Pavio longo</b>: rejeição do preço\n\n' +
       '💡 3 verdes = momentum forte.'
  }
];

async function sendEstudo(){
  const t = brTime();
  const idx = (t.getUTCHours() * 60 + t.getUTCMinutes()) % ESTUDOS.length;
  const top = ESTUDOS[idx];
  await tg('🎓 <b>ESTUDO DO MERCADO</b>\n━━━━━━━━━━━\n\n<b>' + top.t + '</b>\n\n' + top.b);
}

// ─── Router por minuto ───

async function run(){
  const status = marketStatus();
  const min = new Date().getUTCMinutes();

  // FIM DE SEMANA — sem cotações de bolsa, só cripto + notícias + estudos
  if(status === 'fim'){
    if(min === 0) await sendCripto();
    else if(min === 15) await sendNews(0);
    else if(min === 30) await sendEstudo();
    else if(min === 45) await sendNews(2);
    return;
  }

  // PRÉ-PREGÃO — preparar pra abertura
  if(status === 'pre'){
    if(min === 0) await sendIndices();
    else if(min === 10) await sendNews(0);
    else if(min === 20) await sendCripto();
    else if(min === 30) await sendForex();
    else if(min === 40) await sendNews(3);
    else if(min === 50) await sendEstudo();
    return;
  }

  // FECHADO / LEILÃO — sem cotações ao vivo
  if(status === 'leilao' || status === 'fechado'){
    if(min === 0) await sendRanking();
    else if(min === 15) await sendNews(1);
    else if(min === 30) await sendEstudo();
    else if(min === 45) await sendNews(5);
    else if(min === 5 || min === 25 || min === 50) await sendCripto();
    return;
  }

  // MERCADO ABERTO — rotação completa
  if(min === 0) await sendIndices();
  else if(min === 5) await sendAcoesBR();
  else if(min === 10) await sendNews(0);
  else if(min === 15) await sendCripto();
  else if(min === 20) await sendForex();
  else if(min === 25) await sendETFsFIIs();
  else if(min === 30) await sendSignals();
  else if(min === 35) await sendAcoesUS();
  else if(min === 40) await sendNews(4);
  else if(min === 45) await sendCommodities();
  else if(min === 50) await sendRanking();
  else if(min === 55) await sendEstudo();
}

export default {
  async fetch(request, env, ctx){
    await run();
    return new Response('OK\n');
  },
  async scheduled(event, env, ctx){
    ctx.waitUntil(run());
  }
};
