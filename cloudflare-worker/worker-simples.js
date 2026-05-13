// AGENTE FINANCEIRO — Cloudflare Worker v8 (compacto)
// Module Worker format — copie TUDO daqui (linhas 1 até fim).

const T1='8224992163';
const T2='AAF1B80laJI';
const T3='P9Re4f6mcAU5F5DRnhmiYG4';
const TOKEN=T1+':'+T2+'_'+T3;
const CHAT='5933857921';
const UA='Mozilla/5.0';

async function yh(s){
  try{
    const r=await fetch('https://query1.finance.yahoo.com/v8/finance/chart/'+s+'?interval=1d&range=15d',{headers:{'User-Agent':UA}});
    const d=await r.json();
    const m=d?.chart?.result?.[0]?.meta;
    const q=d?.chart?.result?.[0]?.indicators?.quote?.[0];
    if(!m?.regularMarketPrice||!m?.previousClose) return null;
    const opens=(q?.open||[]).filter(x=>x!=null);
    const closes=(q?.close||[]).filter(x=>x!=null);
    return {p:m.regularMarketPrice,c:(m.regularMarketPrice-m.previousClose)/m.previousClose*100,opens,closes};
  }catch(e){return null}
}

async function cg(){
  try{
    const r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true');
    return await r.json();
  }catch(e){return {}}
}

async function fx(){
  try{
    const r=await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL');
    return await r.json();
  }catch(e){return {}}
}

async function news(){
  try{
    const sources=['https://www.infomoney.com.br/feed/','https://www.moneytimes.com.br/feed/','https://br.investing.com/rss/news_25.rss'];
    const h=new Date().getUTCHours();
    const url=sources[h%3];
    const r=await fetch('https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(url));
    const d=await r.json();
    return (d.items||[]).slice(0,3);
  }catch(e){return []}
}

function pct(c){return c==null?'-':(c>=0?'🟢 +':'🔴 ')+c.toFixed(2)+'%'}
function intf(p){return p?Math.round(p).toLocaleString('de-DE'):'-'}
function f2(p){return p?p.toFixed(2):'-'}

async function tg(text){
  await fetch('https://api.telegram.org/bot'+TOKEN+'/sendMessage',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({chat_id:CHAT,text,parse_mode:'HTML',disable_web_page_preview:'true'})
  });
}

async function tgPhoto(photo,caption){
  await fetch('https://api.telegram.org/bot'+TOKEN+'/sendPhoto',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({chat_id:CHAT,photo,caption:caption.slice(0,1024),parse_mode:'HTML'})
  });
}

function status(){
  const t=new Date(Date.now()-3*3600*1000);
  const h=t.getUTCHours(),d=t.getUTCDay();
  if(d===0||d===6) return 'fim';
  if(h<10) return 'pre';
  if(h<17) return 'aberto';
  if(h<18) return 'leilao';
  return 'fechado';
}

async function snapshot(){
  const t=new Date(Date.now()-3*3600*1000).toISOString().slice(11,16);
  const [ibov,sp,nasdaq,petr,vale,itub,bbas,wege,c,f]=await Promise.all([
    yh('^BVSP'),yh('^GSPC'),yh('^IXIC'),
    yh('PETR4.SA'),yh('VALE3.SA'),yh('ITUB4.SA'),yh('BBAS3.SA'),yh('WEGE3.SA'),
    cg(),fx()
  ]);
  let txt='📊 <b>SNAPSHOT '+t+' BR</b>\n━━━━━━━━━━━━━━━\n\n';
  txt+='<b>🌍 ÍNDICES</b>\n';
  if(ibov) txt+='Ibov: '+intf(ibov.p)+' '+pct(ibov.c)+'\n';
  if(sp) txt+='S&P500: '+intf(sp.p)+' '+pct(sp.c)+'\n';
  if(nasdaq) txt+='Nasdaq: '+intf(nasdaq.p)+' '+pct(nasdaq.c)+'\n';
  txt+='\n<b>💱 FOREX</b>\n';
  if(f.USDBRL) txt+='USD: R$ '+f2(parseFloat(f.USDBRL.bid))+' '+pct(parseFloat(f.USDBRL.pctChange))+'\n';
  if(f.EURBRL) txt+='EUR: R$ '+f2(parseFloat(f.EURBRL.bid))+' '+pct(parseFloat(f.EURBRL.pctChange))+'\n';
  txt+='\n<b>₿ CRIPTO</b>\n';
  if(c.bitcoin) txt+='BTC: $'+intf(c.bitcoin.usd)+' '+pct(c.bitcoin.usd_24h_change)+'\n';
  if(c.ethereum) txt+='ETH: $'+intf(c.ethereum.usd)+' '+pct(c.ethereum.usd_24h_change)+'\n';
  if(c.solana) txt+='SOL: $'+f2(c.solana.usd)+' '+pct(c.solana.usd_24h_change)+'\n';
  txt+='\n<b>📈 AÇÕES BR</b>\n';
  if(petr) txt+='PETR4: R$ '+f2(petr.p)+' '+pct(petr.c)+'\n';
  if(vale) txt+='VALE3: R$ '+f2(vale.p)+' '+pct(vale.c)+'\n';
  if(itub) txt+='ITUB4: R$ '+f2(itub.p)+' '+pct(itub.c)+'\n';
  if(bbas) txt+='BBAS3: R$ '+f2(bbas.p)+' '+pct(bbas.c)+'\n';
  if(wege) txt+='WEGE3: R$ '+f2(wege.p)+' '+pct(wege.c)+'\n';
  const sc=(ibov?.c||0)*0.5+(sp?.c||0)*0.3+(c.bitcoin?.usd_24h_change||0)*0.2;
  txt+='\n🤖 <b>AGENTE</b>\n';
  if(sc>0.5) txt+='🟢 <b>ALTA</b> — compre em pullback, foco em qualidade.';
  else if(sc<-0.5) txt+='🔴 <b>QUEDA</b> — defenda, stop apertado, sem alavancagem.';
  else txt+='⚪ <b>LATERAL</b> — DCA é a melhor estratégia agora.';
  await tg(txt);
}

async function micro(){
  const t=new Date(Date.now()-3*3600*1000).toISOString().slice(11,16);
  const [ibov,c,f]=await Promise.all([yh('^BVSP'),cg(),fx()]);
  let txt='⚡ <b>'+t+' BR</b>\n';
  if(ibov) txt+='Ibov: '+intf(ibov.p)+' '+pct(ibov.c)+'\n';
  if(c.bitcoin) txt+='BTC: $'+intf(c.bitcoin.usd)+' '+pct(c.bitcoin.usd_24h_change)+'\n';
  if(f.USDBRL) txt+='USD: R$ '+f2(parseFloat(f.USDBRL.bid))+' '+pct(parseFloat(f.USDBRL.pctChange))+'\n';
  await tg(txt);
}

async function candle(){
  const r=await yh('^BVSP');
  if(!r||r.opens.length<5) return;
  const n=Math.min(15,r.opens.length);
  const opens=r.opens.slice(-n);
  const closes=r.closes.slice(-n);
  const cfg={type:'bar',data:{labels:opens.map((_,i)=>'D'+(n-i)),datasets:[{label:'Ibov',data:closes.map((c,i)=>[opens[i],c]),backgroundColor:closes.map((c,i)=>c>=opens[i]?'#22c55e':'#ef4444'),borderColor:closes.map((c,i)=>c>=opens[i]?'#16a34a':'#dc2626'),borderWidth:1}]},options:{title:{display:true,text:'🕯️ IBOVESPA — 15 dias',fontColor:'#d4af37',fontSize:18},legend:{display:false},scales:{xAxes:[{ticks:{fontColor:'#888'}}],yAxes:[{ticks:{fontColor:'#fff'}}]}}};
  const url='https://quickchart.io/chart?bkg=%230a0a0a&w=900&h=500&c='+encodeURIComponent(JSON.stringify(cfg));
  await tgPhoto(url,'🕯️ <b>CANDLESTICK IBOV</b>\n15 dias · Verde=alta · Vermelho=queda\nÚltimo: '+intf(r.p)+' '+pct(r.c));
}

async function newsSend(){
  const items=await news();
  for(let i=0;i<items.length;i++){
    const n=items[i];
    const cap='📰 <b>'+(i+1)+'/'+items.length+'</b>\n<b>'+(n.title||'').slice(0,200)+'</b>\n\n🔗 <a href="'+n.link+'">Ler</a>';
    let img=n.thumbnail||n.enclosure?.link;
    if(!img&&n.description){const m=n.description.match(/<img[^>]+src=["']([^"']+)["']/);if(m) img=m[1]}
    if(img){try{await tgPhoto(img,cap)}catch(e){await tg(cap)}}
    else await tg(cap);
  }
}

async function estudo(){
  const topics=[
    {t:'📚 RSI',b:'RSI varia 0-100:\n• >70 sobrecomprado (correção)\n• <30 sobrevendido (recuperação)\n• 40-60 neutro\n\n💡 Use com tendência.'},
    {t:'📚 Dividend Yield',b:'DY = dividendo/preço × 100\n\nTop BR 2026:\n• PETR4 ~12%\n• BBAS3 ~10%\n• TAEE11 ~9%\n• VALE3 ~8%\n\n💡 Cheque payout e dívida.'},
    {t:'📚 Médias Móveis',b:'• Preço > MM20 > MM50 = ALTA\n• Preço < MM20 < MM50 = QUEDA\n• MM20 cruza MM50 ↑ = GOLDEN CROSS\n• MM20 cruza MM50 ↓ = DEATH CROSS'},
    {t:'📚 Diversificação',b:'Carteira balanceada:\n• 60% RV (30% BR, 20% ETF, 10% FII)\n• 30% RF (Selic, CDB, IPCA+)\n• 10% Cripto+Ouro\n\n💡 Rebalanceie a cada 6 meses.'},
    {t:'📚 Compra/Venda',b:'COMPRA:\n• RSI<30 em uptrend\n• Pullback até MM20\n• Notícia + análise técnica\n\nVENDA:\n• RSI>75 sustentado\n• Stop loss atingido\n• Fundamentos mudaram'}
  ];
  const h=new Date().getUTCHours();
  const top=topics[h%topics.length];
  await tg('🎓 <b>ESTUDO</b>\n━━━━━━━━━━━\n\n<b>'+top.t+'</b>\n\n'+top.b);
}

async function run(){
  const s=status();
  const min=new Date().getUTCMinutes();
  if(s==='aberto'){
    if(min===0||min===30) await snapshot();
    else await micro();
    if(min===10||min===40) await newsSend();
    if(min===20) await candle();
    if(min===45) await estudo();
  } else if(s==='pre'){
    if(min===0||min===30) await snapshot();
    else if(min===15||min===45) await newsSend();
    else await micro();
  } else if(s==='leilao'||s==='fechado'){
    if(min===0) await snapshot();
    if(min===15) await candle();
    if(min===30) await newsSend();
    if(min===45) await estudo();
  } else {
    if(min===10) await newsSend();
    if(min===25) await estudo();
    if(min===40) await micro();
  }
}

export default {
  async fetch(request,env,ctx){ await run(); return new Response('OK\n') },
  async scheduled(event,env,ctx){ ctx.waitUntil(run()) }
};
