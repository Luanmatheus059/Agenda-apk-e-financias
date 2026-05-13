const T1='8224992163';
const T2='AAF1B80laJI';
const T3='P9Re4f6mcAU5F5DRnhmiYG4';
const TOKEN=T1+':'+T2+'_'+T3;
const CHAT='5933857921';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function yh(sym, range='15d', interval='1d'){
  try{
    const r = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/'+sym+'?interval='+interval+'&range='+range, {headers:{'User-Agent':UA}});
    const d = await r.json();
    const result = d?.chart?.result?.[0];
    if(!result) return null;
    const m = result.meta;
    const closes = (result.indicators?.quote?.[0]?.close||[]).filter(x=>x!=null);
    if(!m?.regularMarketPrice || !m?.previousClose) return null;
    return {p: m.regularMarketPrice, c: (m.regularMarketPrice-m.previousClose)/m.previousClose*100, closes};
  }catch(e){return null}
}

function rsi(closes, period=14){
  if(closes.length < period+1) return null;
  let gains=0, losses=0;
  for(let i=closes.length-period; i<closes.length; i++){
    const diff = closes[i]-closes[i-1];
    if(diff>0) gains+=diff; else losses-=diff;
  }
  const avg_g = gains/period, avg_l = losses/period;
  if(avg_l===0) return 100;
  return 100 - (100/(1+avg_g/avg_l));
}

function sma(closes, period){
  if(closes.length < period) return null;
  return closes.slice(-period).reduce((a,b)=>a+b,0)/period;
}

async function coingecko(){
  try{
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin&vs_currencies=usd&include_24hr_change=true');
    const d = await r.json();
    return {
      btc: d.bitcoin ? {p:d.bitcoin.usd, c:d.bitcoin.usd_24h_change||0} : null,
      eth: d.ethereum ? {p:d.ethereum.usd, c:d.ethereum.usd_24h_change||0} : null,
      sol: d.solana ? {p:d.solana.usd, c:d.solana.usd_24h_change||0} : null,
      bnb: d.binancecoin ? {p:d.binancecoin.usd, c:d.binancecoin.usd_24h_change||0} : null
    };
  }catch(e){return {}}
}

async function forex(){
  try{
    const r = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL');
    const d = await r.json();
    return {
      usd: d.USDBRL ? {p:parseFloat(d.USDBRL.bid), c:parseFloat(d.USDBRL.pctChange)||0} : null,
      eur: d.EURBRL ? {p:parseFloat(d.EURBRL.bid), c:parseFloat(d.EURBRL.pctChange)||0} : null
    };
  }catch(e){return {}}
}

async function getNews(){
  // Rotaciona fontes pelo minuto pra evitar repetição
  const m = new Date().getUTCMinutes();
  let sources;
  if(m % 2 === 0){
    sources = [
      {url:'https://www.infomoney.com.br/feed/', name:'InfoMoney'},
      {url:'https://br.investing.com/rss/news_25.rss', name:'Investing BR'}
    ];
  } else {
    sources = [
      {url:'https://www.moneytimes.com.br/feed/', name:'MoneyTimes'},
      {url:'https://www.infomoney.com.br/mercados/feed/', name:'InfoMoney Mercados'}
    ];
  }
  const all = [];
  for(const s of sources){
    try{
      const r = await fetch('https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(s.url));
      const d = await r.json();
      for(const item of (d.items||[]).slice(0,2)){
        let img = item.thumbnail || item.enclosure?.link;
        if(!img && item.description){
          const m2 = item.description.match(/<img[^>]+src=["']([^"']+)["']/);
          if(m2) img = m2[1];
        }
        all.push({title:item.title, link:item.link, source:s.name, image:img});
      }
    }catch(e){}
  }
  return all;
}

function pct(c){return c==null?'-':(c>=0?'🟢 +':'🔴 ')+c.toFixed(2)+'%'}
function intf(p){return p?Math.round(p).toLocaleString('de-DE'):'-'}

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

async function sendSnapshot(){
  const [ibov, petr, vale, itub, bbas, bova, ivvb, cg, fx] = await Promise.all([
    yh('^BVSP'), yh('PETR4.SA'), yh('VALE3.SA'), yh('ITUB4.SA'), yh('BBAS3.SA'),
    yh('BOVA11.SA'), yh('IVVB11.SA'), coingecko(), forex()
  ]);
  const t = new Date(Date.now()-3*3600*1000).toISOString().slice(11,16);

  let txt = '📊 <b>SNAPSHOT — '+t+' BR</b>\n━━━━━━━━━━━━━━━━━━━\n\n';
  txt += '<b>📊 ÍNDICES + FOREX</b>\n';
  txt += 'Ibov: '+intf(ibov?.p)+' pts '+pct(ibov?.c)+'\n';
  txt += 'USD/BRL: '+(fx.usd?'R$ '+fx.usd.p.toFixed(4):'-')+' '+pct(fx.usd?.c)+'\n';
  txt += 'EUR/BRL: '+(fx.eur?'R$ '+fx.eur.p.toFixed(4):'-')+' '+pct(fx.eur?.c)+'\n\n';

  txt += '<b>₿ CRIPTO (24/7)</b>\n';
  txt += 'BTC: $'+intf(cg.btc?.p)+' '+pct(cg.btc?.c)+'\n';
  txt += 'ETH: $'+intf(cg.eth?.p)+' '+pct(cg.eth?.c)+'\n';
  txt += 'SOL: $'+(cg.sol?cg.sol.p.toFixed(0):'-')+' '+pct(cg.sol?.c)+'\n\n';

  txt += '<b>📈 BLUE CHIPS</b>\n';
  txt += 'PETR4: '+(petr?'R$ '+petr.p.toFixed(2):'-')+' '+pct(petr?.c)+'\n';
  txt += 'VALE3: '+(vale?'R$ '+vale.p.toFixed(2):'-')+' '+pct(vale?.c)+'\n';
  txt += 'ITUB4: '+(itub?'R$ '+itub.p.toFixed(2):'-')+' '+pct(itub?.c)+'\n';
  txt += 'BBAS3: '+(bbas?'R$ '+bbas.p.toFixed(2):'-')+' '+pct(bbas?.c)+'\n\n';

  txt += '<b>📊 ETFs</b>\n';
  txt += 'BOVA11: '+(bova?'R$ '+bova.p.toFixed(2):'-')+' '+pct(bova?.c)+'\n';
  txt += 'IVVB11: '+(ivvb?'R$ '+ivvb.p.toFixed(2):'-')+' '+pct(ivvb?.c)+'\n\n';

  // Análise rica
  const score = (ibov?.c||0) - (fx.usd?.c||0)*0.5 + (cg.btc?.c||0)*0.3;
  txt += '🤖 <b>AGENTE IA</b>\n';
  if(score > 1) txt += '🟢 <b>FORTE TENDÊNCIA ALTA</b>\nIbov subindo + dólar caindo. Cenário muito favorável.\nDica: olhar entradas em pullback em PETR4, VALE3, BBSE3.';
  else if(score > 0.3) txt += '🟢 <b>VIÉS DE ALTA</b>\nMercado positivo. Boa hora pra rebalancear pra renda variável.';
  else if(score < -1) txt += '🔴 <b>FORTE TENDÊNCIA QUEDA</b>\nIbov caindo + dólar subindo. Cenário defensivo.\nDica: reduzir exposição, ir pra renda fixa (Tesouro Selic, CDB liquidez).';
  else if(score < -0.3) txt += '🔴 <b>VIÉS DE QUEDA</b>\nCautela. Stops apertados, evitar alavancagem.';
  else txt += '⚪ <b>LATERAL</b>\nMercado equilibrado. DCA (compras programadas) funciona melhor agora.';

  await send(txt);
}

async function sendSignals(){
  const syms = ['PETR4.SA','VALE3.SA','ITUB4.SA','BBAS3.SA','MGLU3.SA','WEGE3.SA','ABEV3.SA','ITSA4.SA','BBSE3.SA','TAEE11.SA'];
  const results = await Promise.all(syms.map(s=>yh(s, '60d', '1d')));
  const sinais = [];
  for(let i=0; i<syms.length; i++){
    const r = results[i];
    if(!r || r.closes.length<20) continue;
    const rsiVal = rsi(r.closes);
    const s20 = sma(r.closes, 20);
    const s50 = sma(r.closes, 50);
    const sym = syms[i].replace('.SA','');
    let setup, desc;

    if(rsiVal && rsiVal<30 && r.c<-1){
      setup = '🟢 COMPRA — sobrevenda';
      desc = 'RSI '+Math.round(rsiVal)+' (<30) + queda '+r.c.toFixed(1)+'%. Reversão técnica provável.';
    } else if(rsiVal && rsiVal>75 && r.c>1){
      setup = '🔴 ZONA DE TOPO';
      desc = 'RSI '+Math.round(rsiVal)+' (>75) + alta '+r.c.toFixed(1)+'%. Correção provável.';
    } else if(s20 && s50 && s20>s50*1.005 && r.p>s20 && r.c>0.5){
      setup = '🟢 TENDÊNCIA ALTA';
      desc = 'MM20 acima MM50. Preço acima MM20. Confirmação alta.';
    } else if(s20 && s50 && s20<s50*0.995 && r.p<s20 && r.c<-0.5){
      setup = '🔴 TENDÊNCIA QUEDA';
      desc = 'MM20 abaixo MM50. Preço abaixo MM20. Fraqueza confirmada.';
    }

    if(setup){
      const isLong = setup.includes('🟢');
      const stop = isLong ? +(r.p*0.97).toFixed(2) : +(r.p*1.03).toFixed(2);
      const target = isLong ? +(r.p*1.05).toFixed(2) : +(r.p*0.95).toFixed(2);
      const rr = isLong ? ((target-r.p)/(r.p-stop)).toFixed(1) : ((r.p-target)/(stop-r.p)).toFixed(1);
      sinais.push({sym, p:r.p, c:r.c, rsi:rsiVal, setup, desc, stop, target, rr});
    }
  }

  if(!sinais.length) return;
  const t = new Date(Date.now()-3*3600*1000).toISOString().slice(11,16);
  let txt = '🎯 <b>SALA DE SINAIS — '+t+' BR</b>\n━━━━━━━━━━━━━━━━━━━\n\n';
  txt += '🔍 <b>'+sinais.length+' setup(s) detectado(s)</b>\n';
  txt += 'Análise: RSI + MM20 + MM50\n\n';
  for(const s of sinais.slice(0,5)){
    txt += '<b>'+s.sym+'</b> · R$ '+s.p.toFixed(2)+' '+pct(s.c)+'\n';
    txt += s.setup+'\n';
    txt += 'RSI: '+Math.round(s.rsi)+'\n';
    txt += '<i>'+s.desc+'</i>\n';
    txt += '💰 Entry: R$ '+s.p.toFixed(2)+'\n';
    txt += '🛑 Stop: R$ '+s.stop.toFixed(2)+'\n';
    txt += '🎯 Alvo: R$ '+s.target.toFixed(2)+'\n';
    txt += '⚖️ R/R: 1:'+s.rr+'\n\n';
  }
  txt += '⚠️ <i>EDUCACIONAL. Risco máx 2% do capital.</i>';
  await send(txt);
}

async function sendNews(){
  const news = await getNews();
  for(let i=0; i<Math.min(3, news.length); i++){
    const n = news[i];
    const cap = '📰 <b>NOTÍCIA '+(i+1)+'/'+Math.min(3,news.length)+'</b>\n━━━━━━━━━━━━━━━━━━━\n<b>'+n.title.slice(0,250)+'</b>\n\n📡 '+n.source+(n.link?'\n🔗 <a href="'+n.link+'">Ler matéria</a>':'');
    if(n.image){ try{ await sendPhoto(n.image, cap); }catch(e){ await send(cap); } }
    else await send(cap);
  }
}

async function sendChart(){
  const syms = ['PETR4.SA','VALE3.SA','ITUB4.SA','BBAS3.SA','MGLU3.SA','WEGE3.SA','BBDC4.SA','ABEV3.SA','ITSA4.SA','BBSE3.SA'];
  const res = await Promise.all(syms.map(s=>yh(s)));
  const items = syms.map((s,i)=>({sym:s.replace('.SA',''), d:res[i]})).filter(x=>x.d).sort((a,b)=>b.d.c-a.d.c);
  if(!items.length) return;
  const cfg = {
    type:'horizontalBar',
    data:{labels:items.map(x=>x.sym), datasets:[{data:items.map(x=>x.d.c.toFixed(2)), backgroundColor:items.map(x=>x.d.c>=0?'#22c55e':'#ef4444')}]},
    options:{title:{display:true,text:'📊 VARIAÇÃO % HOJE',fontColor:'#d4af37',fontSize:18},legend:{display:false},
      scales:{xAxes:[{ticks:{fontColor:'#fff'}}],yAxes:[{ticks:{fontColor:'#fff'}}]}}
  };
  const url = 'https://quickchart.io/chart?bkg=%230a0a0a&w=800&h=500&c='+encodeURIComponent(JSON.stringify(cfg));
  await sendPhoto(url, '📊 <b>DASHBOARD AO VIVO</b>\n'+items.length+' blue chips ranqueadas');
}

async function run(){
  const min = new Date().getUTCMinutes();
  await sendSnapshot();
  if(min===10 || min===40) await sendSignals();
  if(min===0 || min===30) await sendNews();
  if(min===20 || min===50) await sendChart();
}

export default {
  async fetch(){ await run(); return new Response('OK\n'); },
  async scheduled(ev,env,ctx){ ctx.waitUntil(run()); }
};
