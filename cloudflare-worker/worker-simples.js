// AGENTE FINANCEIRO — Cloudflare Worker v7
// Anti-repetição + CANDLESTICK chart + análise educacional + notícias frequentes

const T1='8224992163';
const T2='AAF1B80laJI';
const T3='P9Re4f6mcAU5F5DRnhmiYG4';
const TOKEN=T1+':'+T2+'_'+T3;
const CHAT='5933857921';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const ATIVOS = {
  indices: [
    {sym:'^BVSP', name:'Ibov'}, {sym:'^GSPC', name:'S&P500'},
    {sym:'^IXIC', name:'Nasdaq'}, {sym:'^DJI', name:'Dow Jones'},
    {sym:'^GDAXI', name:'DAX'}, {sym:'^N225', name:'Nikkei'},
    {sym:'^FTSE', name:'FTSE100'}
  ],
  acoes_br: [
    {sym:'PETR4.SA',name:'PETR4'},{sym:'VALE3.SA',name:'VALE3'},
    {sym:'ITUB4.SA',name:'ITUB4'},{sym:'BBAS3.SA',name:'BBAS3'},
    {sym:'BBDC4.SA',name:'BBDC4'},{sym:'MGLU3.SA',name:'MGLU3'},
    {sym:'WEGE3.SA',name:'WEGE3'},{sym:'ABEV3.SA',name:'ABEV3'},
    {sym:'ITSA4.SA',name:'ITSA4'},{sym:'BBSE3.SA',name:'BBSE3'},
    {sym:'TAEE11.SA',name:'TAEE11'},{sym:'VIVT3.SA',name:'VIVT3'},
    {sym:'RENT3.SA',name:'RENT3'},{sym:'SUZB3.SA',name:'SUZB3'},
    {sym:'EGIE3.SA',name:'EGIE3'}
  ],
  acoes_us: [
    {sym:'AAPL',name:'AAPL'},{sym:'MSFT',name:'MSFT'},
    {sym:'GOOGL',name:'GOOGL'},{sym:'AMZN',name:'AMZN'},
    {sym:'TSLA',name:'TSLA'},{sym:'NVDA',name:'NVDA'},
    {sym:'META',name:'META'}
  ],
  etfs:[{sym:'BOVA11.SA',name:'BOVA11'},{sym:'IVVB11.SA',name:'IVVB11'},
    {sym:'HASH11.SA',name:'HASH11'},{sym:'BRAX11.SA',name:'BRAX11'}],
  fiis:[{sym:'MXRF11.SA',name:'MXRF11'},{sym:'HGLG11.SA',name:'HGLG11'},
    {sym:'KNRI11.SA',name:'KNRI11'},{sym:'VISC11.SA',name:'VISC11'},
    {sym:'XPLG11.SA',name:'XPLG11'}],
  commodities:[{sym:'GC=F',name:'Ouro'},{sym:'CL=F',name:'Petróleo'},{sym:'SI=F',name:'Prata'}]
};

const CRIPTO=['bitcoin','ethereum','solana','binancecoin','ripple','cardano','dogecoin','avalanche-2'];
const CRIPTO_NAMES={bitcoin:'BTC',ethereum:'ETH',solana:'SOL','binancecoin':'BNB',ripple:'XRP',cardano:'ADA',dogecoin:'DOGE','avalanche-2':'AVAX'};
const FOREX=['USD-BRL','EUR-BRL','GBP-BRL','JPY-BRL'];

// ─── Yahoo: retorna OHLC + closes
async function yh(s, range='5d', interval='1d'){
  try{
    const r = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/'+s+'?interval='+interval+'&range='+range, {headers:{'User-Agent':UA}});
    const d = await r.json();
    const result = d?.chart?.result?.[0];
    if(!result) return null;
    const m = result.meta;
    const q = result.indicators?.quote?.[0];
    const ts = result.timestamp || [];
    const opens = (q?.open||[]).filter(x=>x!=null);
    const highs = (q?.high||[]).filter(x=>x!=null);
    const lows = (q?.low||[]).filter(x=>x!=null);
    const closes = (q?.close||[]).filter(x=>x!=null);
    if(!m?.regularMarketPrice || !m?.previousClose) return null;
    return {p:m.regularMarketPrice, c:(m.regularMarketPrice-m.previousClose)/m.previousClose*100, opens,highs,lows,closes,ts};
  }catch(e){return null}
}

async function coingecko(){
  try{
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids='+CRIPTO.join(',')+'&vs_currencies=usd&include_24hr_change=true');
    const d = await r.json();
    const out={};
    for(const k of CRIPTO) if(d[k]) out[k]={p:d[k].usd, c:d[k].usd_24h_change||0};
    return out;
  }catch(e){return {}}
}

async function forex(){
  try{
    const r = await fetch('https://economia.awesomeapi.com.br/last/'+FOREX.join(','));
    const d = await r.json();
    const out={};
    for(const k of FOREX){
      const key = k.replace('-','');
      if(d[key]) out[k]={p:parseFloat(d[key].bid), c:parseFloat(d[key].pctChange)||0};
    }
    return out;
  }catch(e){return {}}
}

async function getNews(maxItems=4){
  const h = new Date().getUTCHours();
  const m = new Date().getUTCMinutes();
  const ALL=[
    {url:'https://www.infomoney.com.br/feed/',name:'InfoMoney'},
    {url:'https://br.investing.com/rss/news_25.rss',name:'Investing BR'},
    {url:'https://www.moneytimes.com.br/feed/',name:'MoneyTimes'},
    {url:'https://www.infomoney.com.br/mercados/feed/',name:'InfoMoney Merc'},
    {url:'https://valor.globo.com/valor-investe/rss/',name:'Valor'},
    {url:'https://br.investing.com/rss/news_11.rss',name:'Inv Commod'},
    {url:'https://br.investing.com/rss/news_301.rss',name:'Inv Cripto'},
    {url:'https://www.moneytimes.com.br/category/economia/feed/',name:'MT Eco'}
  ];
  // Rotaciona cada execução (hora+min) usando 3 fontes diferentes
  const seed = h*60+m;
  const sources = [ALL[seed%8], ALL[(seed+3)%8], ALL[(seed+5)%8]];
  const all=[];
  for(const s of sources){
    try{
      const r = await fetch('https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(s.url));
      const d = await r.json();
      // Pega 2 mais recentes, embaralha com base no seed
      for(const item of (d.items||[]).slice(0,3)){
        let img = item.thumbnail || item.enclosure?.link;
        if(!img && item.description){
          const m2 = item.description.match(/<img[^>]+src=["']([^"']+)["']/);
          if(m2) img=m2[1];
        }
        all.push({title:item.title, link:item.link, source:s.name, image:img, date:item.pubDate});
      }
    }catch(e){}
  }
  // Dedup por título
  const seen=new Set(), unique=[];
  for(const n of all){
    const k = (n.title||'').toLowerCase().slice(0,60);
    if(!seen.has(k)){seen.add(k);unique.push(n)}
  }
  // Ordena por data desc, retorna top
  unique.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
  return unique.slice(0, maxItems);
}

function pct(c){return c==null?'-':(c>=0?'🟢 +':'🔴 ')+c.toFixed(2)+'%'}
function intf(p){return p?Math.round(p).toLocaleString('de-DE'):'-'}
function f2(p){return p?p.toFixed(2):'-'}

async function send(text){
  await fetch('https://api.telegram.org/bot'+TOKEN+'/sendMessage', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({chat_id:CHAT, text, parse_mode:'HTML', disable_web_page_preview:'true'})
  });
}
async function sendPhoto(photo, caption){
  await fetch('https://api.telegram.org/bot'+TOKEN+'/sendPhoto', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({chat_id:CHAT, photo, caption:caption.slice(0,1024), parse_mode:'HTML'})
  });
}

function marketStatus(){
  const brTime = new Date(Date.now()-3*3600*1000);
  const h = brTime.getUTCHours();
  const day = brTime.getUTCDay();
  if(day===0||day===6) return {s:'fim',label:'📆 Final de semana'};
  if(h<10) return {s:'pre',label:'🌅 Pré-pregão'};
  if(h<17) return {s:'aberto',label:'🟢 Pregão Aberto'};
  if(h<18) return {s:'leilao',label:'🔔 Leilão fechamento'};
  return {s:'fechado',label:'🌙 Pregão fechado'};
}

// ─── SNAPSHOT COMPLETO (só a cada 30min) ───
async function sendMegaSnapshot(){
  const ms = marketStatus();
  const t = new Date(Date.now()-3*3600*1000).toISOString().slice(11,16);

  const fetchYh = arr => Promise.all(arr.map(a=>yh(a.sym).then(r=>({...a, ...r}))));
  const [idx, brSh, usSh, etfs, fiis, comm, cg, fx] = await Promise.all([
    fetchYh(ATIVOS.indices), fetchYh(ATIVOS.acoes_br), fetchYh(ATIVOS.acoes_us),
    fetchYh(ATIVOS.etfs), fetchYh(ATIVOS.fiis), fetchYh(ATIVOS.commodities),
    coingecko(), forex()
  ]);

  let txt='📊 <b>MERCADO MUNDIAL — '+t+' BR</b>\n'+ms.label+'\n━━━━━━━━━━━━━━━━━━━\n\n';
  txt+='<b>🌍 ÍNDICES GLOBAIS</b>\n';
  for(const x of idx) if(x.p) txt+=x.name+': '+intf(x.p)+' '+pct(x.c)+'\n';

  const hasForex = Object.keys(fx).length > 0;
  if(hasForex){
    txt+='\n<b>💱 FOREX</b>\n';
    for(const k of FOREX){ if(fx[k]) txt+=k.replace('-','/')+': R$ '+f2(fx[k].p)+' '+pct(fx[k].c)+'\n'; }
  }

  const hasCripto = Object.keys(cg).length > 0;
  if(hasCripto){
    txt+='\n<b>₿ CRIPTOMOEDAS</b>\n';
    for(const k of CRIPTO) if(cg[k]) txt+=CRIPTO_NAMES[k]+': $'+intf(cg[k].p)+' '+pct(cg[k].c)+'\n';
  }

  txt+='\n<b>📈 AÇÕES BR (15)</b>\n';
  for(const x of brSh) if(x.p) txt+=x.name+': R$ '+f2(x.p)+' '+pct(x.c)+'\n';

  if(etfs.some(x=>x.p)){
    txt+='\n<b>📊 ETFs</b>\n';
    for(const x of etfs) if(x.p) txt+=x.name+': R$ '+f2(x.p)+' '+pct(x.c)+'\n';
  }

  if(fiis.some(x=>x.p)){
    txt+='\n<b>🏢 FIIs</b>\n';
    for(const x of fiis) if(x.p) txt+=x.name+': R$ '+f2(x.p)+' '+pct(x.c)+'\n';
  }

  if(comm.some(x=>x.p)){
    txt+='\n<b>🏆 COMMODITIES</b>\n';
    for(const x of comm) if(x.p) txt+=x.name+': $'+f2(x.p)+' '+pct(x.c)+'\n';
  }

  if(usSh.some(x=>x.p)){
    txt+='\n<b>🇺🇸 AÇÕES USA</b>\n';
    for(const x of usSh) if(x.p) txt+=x.name+': $'+f2(x.p)+' '+pct(x.c)+'\n';
  }

  // Análise educacional
  const ibov = idx.find(x=>x.name==='Ibov');
  const spx = idx.find(x=>x.name==='S&P500');
  const btc = cg.bitcoin;
  const score = (ibov?.c||0)*0.5 + (spx?.c||0)*0.3 + (btc?.c||0)*0.2;
  txt+='\n🤖 <b>AGENTE IA — DECISÕES</b>\n';
  if(score>1){
    txt+='🟢 <b>FORTE TENDÊNCIA ALTA GLOBAL</b>\n';
    txt+='📚 <i>O que isso significa:</i>\nIbov, S&P e BTC subindo juntos = "risk-on" — apetite por risco. Investidores institucionais comprando ativos voláteis.\n\n';
    txt+='💡 <i>O que fazer:</i>\n• Comprar em PULLBACK (ajuste de 1-2%), não no topo\n• Foco em qualidade: PETR4 (DY alto), VALE3 (commodity), NVDA (tech leader)\n• Stop de proteção SEMPRE em 3% abaixo da entrada';
  } else if(score>0.3){
    txt+='🟢 <b>VIÉS DE ALTA</b>\n';
    txt+='📚 <i>Cenário positivo mas moderado.</i>\nMercado dando sinais bons mas sem força explosiva.\n\n';
    txt+='💡 <i>O que fazer:</i>\n• DCA (compras programadas semanais)\n• Rebalanceamento gradual pra renda variável\n• Continuar aportes em FIIs (MXRF11, HGLG11)';
  } else if(score<-1){
    txt+='🔴 <b>FORTE TENDÊNCIA QUEDA</b>\n';
    txt+='📚 <i>O que isso significa:</i>\n"Risk-off" — investidores correndo pra ativos seguros. Bolsa global caindo, dólar subindo.\n\n';
    txt+='💡 <i>O que fazer:</i>\n• DEFENSIVO: reduzir exposição em ações\n• REFÚGIO: Tesouro Selic, CDB liquidez diária, Ouro (GC=F)\n• NÃO entre em "queda de faca" — espera estabilizar';
  } else if(score<-0.3){
    txt+='🔴 <b>VIÉS DE QUEDA</b>\n';
    txt+='📚 <i>Cautela.</i>\nMercado fraco mas sem pânico ainda.\n\n';
    txt+='💡 <i>O que fazer:</i>\n• STOPS apertados (-2% nas posições)\n• Sem alavancagem\n• Liquidez reserva pra eventual compra na ponta';
  } else {
    txt+='⚪ <b>LATERALIDADE</b>\n';
    txt+='📚 <i>Mercado equilibrado.</i>\nIndecisão. Pode romper pra qualquer lado.\n\n';
    txt+='💡 <i>O que fazer:</i>\n• DCA é a melhor estratégia aqui\n• Não tente prever direção\n• Aproveita pra estudar setores subvalorizados';
  }

  await send(txt);
}

// ─── MICRO-UPDATE (5min) — só destaques que MUDARAM ───
async function sendMicroUpdate(){
  const [ibov, btc, usd] = await Promise.all([
    yh('^BVSP'), coingecko(), forex()
  ]);
  const t = new Date(Date.now()-3*3600*1000).toISOString().slice(11,16);
  const ibovStr = ibov ? intf(ibov.p)+' pts '+pct(ibov.c) : '-';
  const btcStr = btc.bitcoin ? '$'+intf(btc.bitcoin.p)+' '+pct(btc.bitcoin.c) : '-';
  const usdStr = usd['USD-BRL'] ? 'R$ '+f2(usd['USD-BRL'].p)+' '+pct(usd['USD-BRL'].c) : '-';

  let txt = '⚡ <b>UPDATE — '+t+' BR</b>\n';
  txt += 'Ibov: '+ibovStr+'\n';
  txt += 'BTC: '+btcStr+'\n';
  txt += 'USD: '+usdStr+'\n\n';
  if(ibov?.c){
    if(ibov.c > 0.5) txt += '💡 Ibov subindo forte ('+ibov.c.toFixed(2)+'%) — momento de tendência';
    else if(ibov.c < -0.5) txt += '⚠️ Ibov caindo ('+ibov.c.toFixed(2)+'%) — proteja posições';
    else txt += '⚪ Movimento lateral — sem ações urgentes';
  }
  await send(txt);
}

// ─── CANDLESTICK CHART (gráfico de velas verdes/vermelhas) ───
async function sendCandlestick(sym='^BVSP', name='IBOVESPA'){
  const r = await yh(sym, '15d', '1d');
  if(!r || r.opens.length<5) return;
  const n = Math.min(15, r.opens.length);
  const opens = r.opens.slice(-n);
  const highs = r.highs.slice(-n);
  const lows = r.lows.slice(-n);
  const closes = r.closes.slice(-n);
  // Cria dataset estilo candle usando duas barras: corpo + sombra
  const cfg = {
    type:'bar',
    data:{
      labels:Array(n).fill('').map((_,i)=>'D'+(n-i)),
      datasets:[{
        label:name,
        data: closes.map((c,i)=>[opens[i], c]),
        backgroundColor: closes.map((c,i)=>c>=opens[i]?'#22c55e':'#ef4444'),
        borderColor: closes.map((c,i)=>c>=opens[i]?'#16a34a':'#dc2626'),
        borderWidth:1
      }]
    },
    options:{
      title:{display:true,text:'🕯️ '+name+' — Velas (15 dias)',fontColor:'#d4af37',fontSize:18},
      legend:{display:false},
      scales:{xAxes:[{ticks:{fontColor:'#888'}}],yAxes:[{ticks:{fontColor:'#fff'}}]}
    }
  };
  const url = 'https://quickchart.io/chart?bkg=%230a0a0a&w=900&h=500&c='+encodeURIComponent(JSON.stringify(cfg));
  await sendPhoto(url, '🕯️ <b>CANDLESTICK '+name+'</b>\n15 dias · Verde=alta, Vermelho=queda\nÚltimo: '+intf(r.p)+' '+pct(r.c));
}

// ─── SINAIS TÉCNICOS ───
function rsi(closes, period=14){
  if(closes.length<period+1) return null;
  let g=0,l=0;
  for(let i=closes.length-period;i<closes.length;i++){
    const d=closes[i]-closes[i-1];
    if(d>0) g+=d; else l-=d;
  }
  if(l===0) return 100;
  return 100-(100/(1+g/l));
}
function sma(closes,n){return closes.length<n?null:closes.slice(-n).reduce((a,b)=>a+b,0)/n;}

async function sendSignals(){
  const syms=['PETR4.SA','VALE3.SA','ITUB4.SA','BBAS3.SA','MGLU3.SA','WEGE3.SA','ABEV3.SA','ITSA4.SA','BBSE3.SA','TAEE11.SA','BBDC4.SA','SUZB3.SA','VIVT3.SA','BOVA11.SA','IVVB11.SA'];
  const results = await Promise.all(syms.map(s=>yh(s,'60d','1d')));
  const sinais=[];
  for(let i=0;i<syms.length;i++){
    const r=results[i];
    if(!r||r.closes.length<20) continue;
    const rsiV=rsi(r.closes), s20=sma(r.closes,20), s50=sma(r.closes,50);
    const sym=syms[i].replace('.SA','');
    let setup,desc;
    if(rsiV&&rsiV<30&&r.c<-1){setup='🟢 COMPRA — sobrevenda';desc='RSI '+Math.round(rsiV)+' (<30) + queda '+r.c.toFixed(1)+'%. Reversão técnica provável em 1-3 dias.';}
    else if(rsiV&&rsiV>75&&r.c>1){setup='🔴 ZONA DE TOPO';desc='RSI '+Math.round(rsiV)+' (>75) + alta '+r.c.toFixed(1)+'%. Correção provável.';}
    else if(s20&&s50&&s20>s50*1.005&&r.p>s20&&r.c>0.5){setup='🟢 TENDÊNCIA ALTA';desc='MM20 cruzou MM50. Confirmação de bull market.';}
    else if(s20&&s50&&s20<s50*0.995&&r.p<s20&&r.c<-0.5){setup='🔴 TENDÊNCIA QUEDA';desc='MM20 cruzou MM50 pra baixo. Fraqueza estrutural.';}
    if(setup){
      const long=setup.includes('🟢');
      const stop=long?+(r.p*0.97).toFixed(2):+(r.p*1.03).toFixed(2);
      const target=long?+(r.p*1.05).toFixed(2):+(r.p*0.95).toFixed(2);
      const rr=long?((target-r.p)/(r.p-stop)).toFixed(1):((r.p-target)/(stop-r.p)).toFixed(1);
      sinais.push({sym,p:r.p,c:r.c,rsi:rsiV,setup,desc,stop,target,rr});
    }
  }
  if(!sinais.length){
    await send('⚪ <b>SEM SETUPS TÉCNICOS</b>\n\nNenhum ativo atende critério rigoroso agora (RSI <30/>75 + MM cruzada). Mercado equilibrado tecnicamente.\n\n💡 <i>Bom momento pra estudar e planejar próximas entradas.</i>');
    return;
  }
  const t=new Date(Date.now()-3*3600*1000).toISOString().slice(11,16);
  let txt='🎯 <b>SALA DE SINAIS — '+t+' BR</b>\n━━━━━━━━━━━━━━━━━━━\n\n🔍 <b>'+sinais.length+' setup(s)</b> · RSI + MM\n\n';
  for(const s of sinais.slice(0,5)){
    txt+='<b>'+s.sym+'</b> · R$ '+s.p.toFixed(2)+' '+pct(s.c)+'\n'+s.setup+' · RSI '+Math.round(s.rsi)+'\n<i>'+s.desc+'</i>\n💰 R$ '+s.p.toFixed(2)+' · 🛑 R$ '+s.stop.toFixed(2)+' · 🎯 R$ '+s.target.toFixed(2)+' · ⚖️ 1:'+s.rr+'\n\n';
  }
  txt+='⚠️ <i>Educacional. Stop sempre. Máx 2% capital.</i>';
  await send(txt);
}

async function sendNews(){
  const news = await getNews(4);
  for(let i=0;i<news.length;i++){
    const n=news[i];
    const cap='📰 <b>NOTÍCIA '+(i+1)+'/'+news.length+'</b>\n━━━━━━━━━━━━━━━━━━━\n<b>'+n.title.slice(0,250)+'</b>\n\n📡 '+n.source+(n.link?'\n🔗 <a href="'+n.link+'">Ler matéria</a>':'');
    if(n.image){try{await sendPhoto(n.image,cap)}catch(e){await send(cap)}}
    else await send(cap);
  }
}

// ─── Estudo profundo (educacional) ───
async function sendEstudo(){
  const topics = [
    {t:'📚 RSI — Como ler o "termômetro" do mercado',
     b:'O RSI (Relative Strength Index) varia de 0 a 100:\n\n• <b>RSI > 70</b> = sobrecomprado → possível correção\n• <b>RSI < 30</b> = sobrevendido → possível recuperação\n• <b>RSI 40-60</b> = neutralidade\n\n💡 <i>Use RSI junto com tendência. Em alta forte, RSI 50 já é compra; em queda forte, RSI 50 é venda.</i>'},
    {t:'📚 Dividend Yield — Renda passiva',
     b:'DY = (dividendo anual / preço da ação) × 100\n\nExemplo: ITSA4 paga R$0,90/ano, custa R$11,80 → DY 7,6%\n\n💡 <i>DY alto não é tudo: cheque payout, dívida e histórico. PETR4 já pagou 30% mas é volátil.</i>\n\nTop DY BR 2026: PETR4 (12%), BBAS3 (10%), TAEE11 (9%), VALE3 (8%).'},
    {t:'📚 Médias Móveis — MM20 vs MM50',
     b:'MM (Média Móvel) suaviza o preço e mostra tendência:\n\n• <b>Preço > MM20 > MM50</b> = TENDÊNCIA ALTA confirmada\n• <b>Preço < MM20 < MM50</b> = TENDÊNCIA QUEDA confirmada\n• <b>MM20 cruza MM50 pra cima</b> = "GOLDEN CROSS" (sinal de compra forte)\n• <b>MM20 cruza MM50 pra baixo</b> = "DEATH CROSS" (sinal de venda)\n\n💡 <i>Funcionam melhor em ações de alta liquidez (Ibov, blue chips).</i>'},
    {t:'📚 Diversificação — Não bote tudo num lugar',
     b:'Carteira BALANCEADA padrão:\n\n• 60% Renda Variável (BR + USA)\n  - 30% Ações BR (PETR4, VALE3, ITUB4)\n  - 20% ETFs (BOVA11, IVVB11, HASH11)\n  - 10% FIIs (MXRF11, HGLG11)\n\n• 30% Renda Fixa\n  - Tesouro Selic (reserva)\n  - CDB 120% CDI\n  - Tesouro IPCA+\n\n• 10% Cripto + Ouro\n  - 5% BTC\n  - 3% ETH\n  - 2% Ouro (GC=F)\n\n💡 <i>Rebalanceie a cada 6 meses.</i>'},
    {t:'📚 Quando comprar? Quando vender?',
     b:'<b>SINAIS DE COMPRA:</b>\n• RSI < 30 em ativo de tendência alta\n• Preço caiu 5%+ em 1 dia com volume\n• Pullback até MM20 em uptrend\n• Notícia positiva + análise técnica favorável\n\n<b>SINAIS DE VENDA:</b>\n• RSI > 75 sustentado\n• Stop loss atingido (sempre respeite!)\n• Mudança de fundamentos (lucro caindo, dívida subindo)\n• Sua tese de investimento mudou\n\n💡 <i>NUNCA faça AVERAGE DOWN em ativo caindo sem motivo claro.</i>'}
  ];
  const h = new Date().getUTCHours();
  const topic = topics[h % topics.length];
  await send('🎓 <b>ESTUDO DO DIA</b>\n━━━━━━━━━━━━━━━━━━━\n\n<b>'+topic.t+'</b>\n\n'+topic.b);
}

async function sendChart(){
  const syms=['PETR4.SA','VALE3.SA','ITUB4.SA','BBAS3.SA','MGLU3.SA','WEGE3.SA','BBDC4.SA','ABEV3.SA','ITSA4.SA','BBSE3.SA'];
  const res=await Promise.all(syms.map(s=>yh(s)));
  const items=syms.map((s,i)=>({sym:s.replace('.SA',''),d:res[i]})).filter(x=>x.d).sort((a,b)=>b.d.c-a.d.c);
  if(!items.length) return;
  const cfg={type:'horizontalBar',data:{labels:items.map(x=>x.sym),datasets:[{data:items.map(x=>x.d.c.toFixed(2)),backgroundColor:items.map(x=>x.d.c>=0?'#22c55e':'#ef4444')}]},options:{title:{display:true,text:'📊 RANKING AÇÕES BR',fontColor:'#d4af37',fontSize:18},legend:{display:false},scales:{xAxes:[{ticks:{fontColor:'#fff'}}],yAxes:[{ticks:{fontColor:'#fff'}}]}}};
  const url='https://quickchart.io/chart?bkg=%230a0a0a&w=800&h=500&c='+encodeURIComponent(JSON.stringify(cfg));
  await sendPhoto(url,'📊 <b>RANKING AÇÕES BR HOJE</b>\nVerde=alta, Vermelho=queda');
}

// ─── RUN COM LÓGICA ANTI-REPETIÇÃO ───
async function run(){
  const ms = marketStatus();
  const min = new Date().getUTCMinutes();

  // Mercado ABERTO (10h-17h dia útil)
  if(ms.s==='aberto'){
    // Snapshot completo SÓ a cada 30min
    if(min===0 || min===30) await sendMegaSnapshot();
    // Micro-update nos outros minutos (5, 10, 15, 20, 25, 35, 40, 45, 50, 55)
    else await sendMicroUpdate();
    // Sinais a cada hora
    if(min===15) await sendSignals();
    // Notícias a cada 20min (com imagens)
    if(min===10 || min===40) await sendNews();
    // Candlestick chart 2x por dia (10h00 e 14h00 UTC = 7h e 11h BR)
    if(min===20) await sendCandlestick('^BVSP','IBOVESPA');
    // Ranking 2x ao dia
    if(min===50) await sendChart();
  }
  // PRÉ-PREGÃO (8h-10h)
  else if(ms.s==='pre'){
    if(min===0 || min===30) await sendMegaSnapshot();
    else if(min===15 || min===45) await sendNews();
    else await sendMicroUpdate();
  }
  // LEILÃO / FECHADO
  else if(ms.s==='leilao' || ms.s==='fechado'){
    if(min===0) await sendMegaSnapshot();
    if(min===15) await sendCandlestick('^BVSP','IBOVESPA');
    if(min===30) await sendNews();
    if(min===45) await sendEstudo();
  }
  // FIM DE SEMANA
  else {
    if(min===0) await send('🌙 <b>FIM DE SEMANA</b>\nBolsa fechada. Cripto + estudos + notícias da semana.');
    if(min===10) await sendNews();
    if(min===25) await sendEstudo();
    if(min===40) await sendMicroUpdate(); // cripto + forex
    // Sem charts de bolsa no fim de semana
  }
}

export default {
  async fetch(){ await run(); return new Response('OK\n'); },
  async scheduled(ev,env,ctx){ ctx.waitUntil(run()); }
};
