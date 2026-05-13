// AGENTE FINANCEIRO — Cloudflare Worker v6
// 54 ATIVOS, detecção mercado aberto/fechado, anti-repetição, mais gráficos

const T1='8224992163';
const T2='AAF1B80laJI';
const T3='P9Re4f6mcAU5F5DRnhmiYG4';
const TOKEN=T1+':'+T2+'_'+T3;
const CHAT='5933857921';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ─── 54 ATIVOS organizados ───
const ATIVOS = {
  indices: [
    {sym:'^BVSP', name:'Ibov', curr:'pts'},
    {sym:'^GSPC', name:'S&P500', curr:'pts'},
    {sym:'^IXIC', name:'Nasdaq', curr:'pts'},
    {sym:'^DJI', name:'Dow Jones', curr:'pts'},
    {sym:'^GDAXI', name:'DAX', curr:'pts'},
    {sym:'^N225', name:'Nikkei', curr:'pts'},
    {sym:'^FTSE', name:'FTSE100', curr:'pts'}
  ],
  acoes_br: [
    {sym:'PETR4.SA', name:'PETR4'}, {sym:'VALE3.SA', name:'VALE3'},
    {sym:'ITUB4.SA', name:'ITUB4'}, {sym:'BBAS3.SA', name:'BBAS3'},
    {sym:'BBDC4.SA', name:'BBDC4'}, {sym:'MGLU3.SA', name:'MGLU3'},
    {sym:'WEGE3.SA', name:'WEGE3'}, {sym:'ABEV3.SA', name:'ABEV3'},
    {sym:'ITSA4.SA', name:'ITSA4'}, {sym:'BBSE3.SA', name:'BBSE3'},
    {sym:'TAEE11.SA', name:'TAEE11'}, {sym:'VIVT3.SA', name:'VIVT3'},
    {sym:'RENT3.SA', name:'RENT3'}, {sym:'SUZB3.SA', name:'SUZB3'},
    {sym:'EGIE3.SA', name:'EGIE3'}
  ],
  acoes_us: [
    {sym:'AAPL', name:'AAPL'}, {sym:'MSFT', name:'MSFT'},
    {sym:'GOOGL', name:'GOOGL'}, {sym:'AMZN', name:'AMZN'},
    {sym:'TSLA', name:'TSLA'}, {sym:'NVDA', name:'NVDA'},
    {sym:'META', name:'META'}
  ],
  etfs: [
    {sym:'BOVA11.SA', name:'BOVA11'}, {sym:'IVVB11.SA', name:'IVVB11'},
    {sym:'HASH11.SA', name:'HASH11'}, {sym:'BRAX11.SA', name:'BRAX11'}
  ],
  fiis: [
    {sym:'MXRF11.SA', name:'MXRF11'}, {sym:'HGLG11.SA', name:'HGLG11'},
    {sym:'KNRI11.SA', name:'KNRI11'}, {sym:'VISC11.SA', name:'VISC11'},
    {sym:'XPLG11.SA', name:'XPLG11'}
  ],
  commodities: [
    {sym:'GC=F', name:'Ouro'}, {sym:'CL=F', name:'Petróleo WTI'},
    {sym:'SI=F', name:'Prata'}
  ]
};
// Total: 7+15+7+4+5+3 = 41 (Yahoo) + 8 cripto + 4 forex = 53 ativos

const CRIPTO_LIST = ['bitcoin','ethereum','solana','binancecoin','ripple','cardano','dogecoin','avalanche-2'];
const FOREX_PAIRS = ['USD-BRL','EUR-BRL','GBP-BRL','JPY-BRL'];

async function yh(s, range='2d', interval='15m'){
  try{
    const r = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/'+s+'?interval='+interval+'&range='+range, {headers:{'User-Agent':UA}});
    const d = await r.json();
    const result = d?.chart?.result?.[0];
    if(!result) return null;
    const m = result.meta;
    const closes = (result.indicators?.quote?.[0]?.close||[]).filter(x=>x!=null);
    if(!m?.regularMarketPrice || !m?.previousClose) return null;
    return {p:m.regularMarketPrice, c:(m.regularMarketPrice-m.previousClose)/m.previousClose*100, closes};
  }catch(e){return null}
}

async function coingecko(){
  try{
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids='+CRIPTO_LIST.join(',')+'&vs_currencies=usd&include_24hr_change=true');
    const d = await r.json();
    const result = {};
    for(const k of CRIPTO_LIST){
      if(d[k]) result[k] = {p:d[k].usd, c:d[k].usd_24h_change||0};
    }
    return result;
  }catch(e){return {}}
}

async function forex(){
  try{
    const r = await fetch('https://economia.awesomeapi.com.br/last/'+FOREX_PAIRS.join(','));
    const d = await r.json();
    const out = {};
    for(const [k,v] of Object.entries(d)){
      out[k] = {p:parseFloat(v.bid), c:parseFloat(v.pctChange)||0};
    }
    return out;
  }catch(e){return {}}
}

// 8 fontes de notícias rotacionando por hora
async function getNews(){
  const h = new Date().getUTCHours();
  const ALL_SOURCES = [
    {url:'https://www.infomoney.com.br/feed/', name:'InfoMoney'},
    {url:'https://br.investing.com/rss/news_25.rss', name:'Investing BR'},
    {url:'https://www.moneytimes.com.br/feed/', name:'MoneyTimes'},
    {url:'https://www.infomoney.com.br/mercados/feed/', name:'InfoMoney Merc'},
    {url:'https://valor.globo.com/valor-investe/rss/', name:'Valor'},
    {url:'https://br.investing.com/rss/news_11.rss', name:'Investing Commod'},
    {url:'https://br.investing.com/rss/news_301.rss', name:'Investing Cripto'},
    {url:'https://www.moneytimes.com.br/category/economia/feed/', name:'MoneyTimes Eco'}
  ];
  // Pega 2 fontes baseado na hora (8 fontes × 12h ciclo)
  const idx = (h*2) % ALL_SOURCES.length;
  const sources = [ALL_SOURCES[idx], ALL_SOURCES[(idx+4)%ALL_SOURCES.length]];
  const all = [];
  for(const s of sources){
    try{
      const r = await fetch('https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(s.url));
      const d = await r.json();
      for(const item of (d.items||[]).slice(0,2)){
        let img = item.thumbnail || item.enclosure?.link;
        if(!img && item.description){
          const m = item.description.match(/<img[^>]+src=["']([^"']+)["']/);
          if(m) img = m[1];
        }
        all.push({title:item.title, link:item.link, source:s.name, image:img});
      }
    }catch(e){}
  }
  return all;
}

function pct(c){return c==null?'-':(c>=0?'🟢 +':'🔴 ')+c.toFixed(2)+'%'}
function intf(p){return p?Math.round(p).toLocaleString('de-DE'):'-'}
function f2(p){return p?p.toFixed(2):'-'}

async function send(text){
  await fetch('https://api.telegram.org/bot'+TOKEN+'/sendMessage', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({chat_id:CHAT, text, parse_mode:'HTML'})
  });
}
async function sendPhoto(photo, caption){
  await fetch('https://api.telegram.org/bot'+TOKEN+'/sendPhoto', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({chat_id:CHAT, photo, caption:caption.slice(0,1024), parse_mode:'HTML'})
  });
}

// ─── Detecta status do mercado ───
function marketStatus(){
  const now = new Date();
  const brTime = new Date(now.getTime()-3*3600*1000);
  const h = brTime.getUTCHours();
  const min = brTime.getUTCMinutes();
  const day = brTime.getUTCDay(); // 0=dom, 6=sab
  if(day===0 || day===6) return {status:'fim_de_semana', label:'📆 Final de semana'};
  if(h<10) return {status:'pre_pregao', label:'🌅 Pré-pregão'};
  if(h<17 || (h===17 && min<0)) return {status:'aberto', label:'🟢 Pregão Aberto'};
  if(h<18) return {status:'leilao', label:'🔔 Leilão fechamento'};
  return {status:'fechado', label:'🌙 Pregão fechado'};
}

// ─── SNAPSHOT MEGA (todos os 54 ativos) ───
async function sendMegaSnapshot(){
  const ms = marketStatus();
  const t = new Date(Date.now()-3*3600*1000).toISOString().slice(11,16);

  // Busca tudo em paralelo
  const fetchYh = arr => Promise.all(arr.map(a=>yh(a.sym).then(r=>({...a, ...r}))));
  const [idx, brShares, usShares, etfs, fiis, comm, cg, fx] = await Promise.all([
    fetchYh(ATIVOS.indices),
    fetchYh(ATIVOS.acoes_br),
    fetchYh(ATIVOS.acoes_us),
    fetchYh(ATIVOS.etfs),
    fetchYh(ATIVOS.fiis),
    fetchYh(ATIVOS.commodities),
    coingecko(),
    forex()
  ]);

  let txt = '📊 <b>MERCADO MUNDIAL — '+t+' BR</b>\n'+ms.label+'\n━━━━━━━━━━━━━━━━━━━\n\n';

  txt += '<b>🌍 ÍNDICES GLOBAIS</b>\n';
  for(const x of idx) txt += x.name+': '+intf(x.p)+' '+pct(x.c)+'\n';

  txt += '\n<b>💱 FOREX</b>\n';
  if(fx['USD-BRL']) txt += 'USD/BRL: R$ '+f2(fx['USD-BRL'].p)+' '+pct(fx['USD-BRL'].c)+'\n';
  if(fx['EUR-BRL']) txt += 'EUR/BRL: R$ '+f2(fx['EUR-BRL'].p)+' '+pct(fx['EUR-BRL'].c)+'\n';
  if(fx['GBP-BRL']) txt += 'GBP/BRL: R$ '+f2(fx['GBP-BRL'].p)+' '+pct(fx['GBP-BRL'].c)+'\n';
  if(fx['JPY-BRL']) txt += 'JPY/BRL: R$ '+f2(fx['JPY-BRL'].p)+' '+pct(fx['JPY-BRL'].c)+'\n';

  txt += '\n<b>₿ CRIPTOMOEDAS</b>\n';
  const cgNames = {bitcoin:'BTC',ethereum:'ETH',solana:'SOL','binancecoin':'BNB',ripple:'XRP',cardano:'ADA',dogecoin:'DOGE','avalanche-2':'AVAX'};
  for(const k of CRIPTO_LIST){
    if(cg[k]) txt += cgNames[k]+': $'+intf(cg[k].p)+' '+pct(cg[k].c)+'\n';
  }

  txt += '\n<b>📈 AÇÕES BR (15)</b>\n';
  for(const x of brShares) txt += x.name+': R$ '+f2(x.p)+' '+pct(x.c)+'\n';

  txt += '\n<b>📊 ETFs</b>\n';
  for(const x of etfs) txt += x.name+': R$ '+f2(x.p)+' '+pct(x.c)+'\n';

  txt += '\n<b>🏢 FIIs</b>\n';
  for(const x of fiis) txt += x.name+': R$ '+f2(x.p)+' '+pct(x.c)+'\n';

  txt += '\n<b>🏆 COMMODITIES</b>\n';
  for(const x of comm) txt += x.name+': $'+f2(x.p)+' '+pct(x.c)+'\n';

  txt += '\n<b>🇺🇸 AÇÕES USA</b>\n';
  for(const x of usShares) txt += x.name+': $'+f2(x.p)+' '+pct(x.c)+'\n';

  // Análise IA
  const ibov = idx.find(x=>x.name==='Ibov');
  const spx = idx.find(x=>x.name==='S&P500');
  const score = (ibov?.c||0)*0.5 + (spx?.c||0)*0.3 + (cg.bitcoin?.c||0)*0.2;
  txt += '\n🤖 <b>AGENTE IA — VISÃO MUNDIAL</b>\n';
  if(score>1) txt += '🟢 <b>FORTE TENDÊNCIA ALTA GLOBAL</b>\nBolsas globais em rali. Boa hora pra entradas em pullback. PETR4, VALE3, ações tech (NVDA, MSFT).';
  else if(score>0.3) txt += '🟢 <b>VIÉS DE ALTA</b>\nMercados positivos. Rebalancear pra renda variável.';
  else if(score<-1) txt += '🔴 <b>FORTE QUEDA GLOBAL</b>\nCenário defensivo. Cash + Tesouro Selic + ouro.';
  else if(score<-0.3) txt += '🔴 <b>VIÉS DE QUEDA</b>\nCautela. Stops apertados.';
  else txt += '⚪ <b>LATERALIDADE</b>\nMercado equilibrado. DCA programado.';

  await send(txt);
}

// ─── Sinais técnicos ───
function rsi(closes, period=14){
  if(closes.length<period+1) return null;
  let g=0, l=0;
  for(let i=closes.length-period; i<closes.length; i++){
    const d = closes[i]-closes[i-1];
    if(d>0) g+=d; else l-=d;
  }
  if(l===0) return 100;
  return 100-(100/(1+g/l));
}
function sma(closes, n){ return closes.length<n?null:closes.slice(-n).reduce((a,b)=>a+b,0)/n; }

async function sendSignals(){
  const syms = ['PETR4.SA','VALE3.SA','ITUB4.SA','BBAS3.SA','MGLU3.SA','WEGE3.SA','ABEV3.SA','ITSA4.SA','BBSE3.SA','TAEE11.SA','BBDC4.SA','SUZB3.SA','VIVT3.SA'];
  const results = await Promise.all(syms.map(s=>yh(s,'60d','1d')));
  const sinais = [];
  for(let i=0;i<syms.length;i++){
    const r = results[i];
    if(!r||r.closes.length<20) continue;
    const rsiV=rsi(r.closes), s20=sma(r.closes,20), s50=sma(r.closes,50);
    const sym=syms[i].replace('.SA','');
    let setup, desc;
    if(rsiV&&rsiV<30&&r.c<-1){ setup='🟢 COMPRA — sobrevenda'; desc='RSI '+Math.round(rsiV)+' (<30) + queda '+r.c.toFixed(1)+'%. Reversão provável.'; }
    else if(rsiV&&rsiV>75&&r.c>1){ setup='🔴 ZONA DE TOPO'; desc='RSI '+Math.round(rsiV)+' (>75) + alta '+r.c.toFixed(1)+'%. Correção provável.'; }
    else if(s20&&s50&&s20>s50*1.005&&r.p>s20&&r.c>0.5){ setup='🟢 TENDÊNCIA ALTA'; desc='MM20>MM50, preço>MM20. Confirmação alta.'; }
    else if(s20&&s50&&s20<s50*0.995&&r.p<s20&&r.c<-0.5){ setup='🔴 TENDÊNCIA QUEDA'; desc='MM20<MM50, preço<MM20. Fraqueza.'; }
    if(setup){
      const long=setup.includes('🟢');
      const stop=long?+(r.p*0.97).toFixed(2):+(r.p*1.03).toFixed(2);
      const target=long?+(r.p*1.05).toFixed(2):+(r.p*0.95).toFixed(2);
      const rr=long?((target-r.p)/(r.p-stop)).toFixed(1):((r.p-target)/(stop-r.p)).toFixed(1);
      sinais.push({sym,p:r.p,c:r.c,rsi:rsiV,setup,desc,stop,target,rr});
    }
  }
  if(!sinais.length) return;
  const t=new Date(Date.now()-3*3600*1000).toISOString().slice(11,16);
  let txt='🎯 <b>SALA DE SINAIS — '+t+' BR</b>\n━━━━━━━━━━━━━━━━━━━\n\n🔍 <b>'+sinais.length+' setup(s)</b> · RSI + MM20 + MM50\n\n';
  for(const s of sinais.slice(0,6)){
    txt+='<b>'+s.sym+'</b> · R$ '+s.p.toFixed(2)+' '+pct(s.c)+'\n'+s.setup+' · RSI '+Math.round(s.rsi)+'\n<i>'+s.desc+'</i>\n💰 R$ '+s.p.toFixed(2)+' · 🛑 R$ '+s.stop.toFixed(2)+' · 🎯 R$ '+s.target.toFixed(2)+' · ⚖️ 1:'+s.rr+'\n\n';
  }
  txt+='⚠️ <i>EDUCACIONAL. Stop sempre. Máx 2% capital.</i>';
  await send(txt);
}

// ─── Notícias ───
async function sendNews(){
  const news = await getNews();
  for(let i=0;i<Math.min(3,news.length);i++){
    const n=news[i];
    const cap='📰 <b>NOTÍCIA '+(i+1)+'/'+Math.min(3,news.length)+'</b>\n━━━━━━━━━━━━━━━━━━━\n<b>'+n.title.slice(0,250)+'</b>\n\n📡 '+n.source+(n.link?'\n🔗 <a href="'+n.link+'">Ler</a>':'');
    if(n.image){try{await sendPhoto(n.image,cap)}catch(e){await send(cap)}}
    else await send(cap);
  }
}

// ─── Dashboard chart ───
async function sendChart(){
  const syms=['PETR4.SA','VALE3.SA','ITUB4.SA','BBAS3.SA','MGLU3.SA','WEGE3.SA','BBDC4.SA','ABEV3.SA','ITSA4.SA','BBSE3.SA'];
  const res=await Promise.all(syms.map(s=>yh(s)));
  const items=syms.map((s,i)=>({sym:s.replace('.SA',''),d:res[i]})).filter(x=>x.d).sort((a,b)=>b.d.c-a.d.c);
  if(!items.length) return;
  const cfg={type:'horizontalBar',data:{labels:items.map(x=>x.sym),datasets:[{data:items.map(x=>x.d.c.toFixed(2)),backgroundColor:items.map(x=>x.d.c>=0?'#22c55e':'#ef4444')}]},options:{title:{display:true,text:'📊 VARIAÇÃO % HOJE',fontColor:'#d4af37',fontSize:18},legend:{display:false},scales:{xAxes:[{ticks:{fontColor:'#fff'}}],yAxes:[{ticks:{fontColor:'#fff'}}]}}};
  const url='https://quickchart.io/chart?bkg=%230a0a0a&w=800&h=500&c='+encodeURIComponent(JSON.stringify(cfg));
  await sendPhoto(url,'📊 <b>RANKING AÇÕES BR</b>\n'+items.length+' blue chips ordenadas');
}

// ─── Cripto chart 7 dias ───
async function sendCriptoChart(){
  try{
    const r = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7');
    const d = await r.json();
    const prices = (d.prices||[]).map(p=>p[1]);
    if(prices.length<5) return;
    const labels = prices.map((_,i)=>'').slice(0,30);
    const samples = prices.filter((_,i)=>i%Math.ceil(prices.length/30)===0);
    const cfg = {type:'line',data:{labels:samples.map(()=>''),datasets:[{label:'BTC/USD 7d',data:samples,borderColor:'#f59e0b',backgroundColor:'rgba(245,158,11,0.15)',fill:true,pointRadius:0,borderWidth:2,tension:0.4}]},options:{title:{display:true,text:'₿ BITCOIN — Últimos 7 dias (USD)',fontColor:'#d4af37',fontSize:18},legend:{display:false},scales:{xAxes:[{display:false}],yAxes:[{ticks:{fontColor:'#fff'}}]}}};
    const url='https://quickchart.io/chart?bkg=%230a0a0a&w=800&h=400&c='+encodeURIComponent(JSON.stringify(cfg));
    await sendPhoto(url,'₿ <b>BITCOIN 7 DIAS</b>\nGráfico atualizado em tempo real');
  }catch(e){}
}

// ─── Resumo semanal (sábado/domingo) ───
async function sendWeekly(){
  const t = new Date(Date.now()-3*3600*1000).toISOString().slice(0,10);
  await send('📅 <b>RESUMO DA SEMANA — '+t+'</b>\n━━━━━━━━━━━━━━━━━━━\n\n🌙 Mercado fechado (fim de semana)\n\nCripto e forex continuam operando 24/7. Bolsa BR retorna segunda 10h.\n\n<b>📰 Notícias da semana:</b>\nO que aconteceu vai impactar a abertura de segunda. Acompanhe abaixo:');
  await sendNews();
}

// ─── Run com lógica de mercado ───
async function run(){
  const ms = marketStatus();
  const min = new Date().getUTCMinutes();

  // MERCADO ABERTO (segunda a sexta, 10h-17h BR)
  if(ms.status==='aberto'){
    await sendMegaSnapshot();
    if(min===10 || min===40) await sendSignals();
    if(min===5 || min===35) await sendNews();
    if(min===20) await sendChart();
    if(min===50) await sendCriptoChart();
  }
  // PRÉ-PREGÃO (8h-10h)
  else if(ms.status==='pre_pregao'){
    await sendMegaSnapshot();
    if(min===0 || min===30) await sendNews();
  }
  // LEILÃO/FECHAMENTO (17h-18h)
  else if(ms.status==='leilao' || ms.status==='fechado'){
    await sendMegaSnapshot();
    if(min===0) await sendChart();
    if(min===30) await sendNews();
  }
  // FIM DE SEMANA (sáb, dom)
  else {
    // Mercado bolsa fechado — só cripto + notícias
    if(min===0 || min===30) await sendWeekly();
    else if(min===15 || min===45) await sendCriptoChart();
    else {
      // Mini snapshot só com cripto + forex
      const cg = await coingecko();
      const fx = await forex();
      const t = new Date(Date.now()-3*3600*1000).toISOString().slice(11,16);
      let txt = '🌙 <b>FIM DE SEMANA — '+t+' BR</b>\n━━━━━━━━━━━━━━━━━━━\nBolsa BR fechada. Cripto operando 24/7:\n\n';
      const cgNames = {bitcoin:'BTC',ethereum:'ETH',solana:'SOL','binancecoin':'BNB',ripple:'XRP',cardano:'ADA',dogecoin:'DOGE','avalanche-2':'AVAX'};
      for(const k of CRIPTO_LIST){ if(cg[k]) txt += cgNames[k]+': $'+intf(cg[k].p)+' '+pct(cg[k].c)+'\n'; }
      if(fx['USD-BRL']) txt += '\nUSD/BRL: R$ '+f2(fx['USD-BRL'].p)+' '+pct(fx['USD-BRL'].c);
      await send(txt);
    }
  }
}

export default {
  async fetch(){ await run(); return new Response('OK\n'); },
  async scheduled(ev,env,ctx){ ctx.waitUntil(run()); }
};
