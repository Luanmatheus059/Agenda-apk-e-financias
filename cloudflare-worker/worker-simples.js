// Worker v15 - ultra-compacto, paste-safe
const T='8224992163:AAF1B80laJI_P9Re4f6mcAU5F5DRnhmiYG4';
const C='5933857921';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

const IDX=['^BVSP','^GSPC','^IXIC','^DJI','^N225','^FTSE','^GDAXI'];
const BR=['PETR4.SA','VALE3.SA','ITUB4.SA','BBAS3.SA','BBDC4.SA','MGLU3.SA','WEGE3.SA','ABEV3.SA','ITSA4.SA','BBSE3.SA','TAEE11.SA','VIVT3.SA','RENT3.SA','SUZB3.SA','EGIE3.SA','PRIO3.SA','RADL3.SA','B3SA3.SA','CSAN3.SA','KLBN11.SA'];
const US=['AAPL','MSFT','GOOGL','AMZN','TSLA','NVDA','META','NFLX','AMD','JPM'];
const ETF=['BOVA11.SA','IVVB11.SA','HASH11.SA','BRAX11.SA'];
const FII=['MXRF11.SA','HGLG11.SA','KNRI11.SA','VISC11.SA','XPLG11.SA'];
const CRI=['BTC-USD','ETH-USD','SOL-USD','BNB-USD','XRP-USD','ADA-USD','DOGE-USD','AVAX-USD'];
const FX=['USDBRL=X','EURBRL=X','GBPBRL=X','JPYBRL=X'];
const COM=['GC=F','CL=F','SI=F'];

const NW=[
'https://www.infomoney.com.br/feed/',
'https://br.investing.com/rss/news_25.rss',
'https://www.moneytimes.com.br/feed/',
'https://www.infomoney.com.br/mercados/feed/',
'https://valor.globo.com/valor-investe/rss/',
'https://br.investing.com/rss/news_11.rss',
'https://br.investing.com/rss/news_301.rss'
];

async function yh(s){
  try{
    const r=await fetch('https://query1.finance.yahoo.com/v8/finance/chart/'+s+'?interval=1d&range=60d',{headers:{'User-Agent':UA}});
    const d=await r.json();
    const x=d&&d.chart&&d.chart.result&&d.chart.result[0];
    if(!x)return null;
    const m=x.meta,q=x.indicators&&x.indicators.quote&&x.indicators.quote[0];
    if(!m||!m.regularMarketPrice||!m.previousClose)return null;
    const o=((q&&q.open)||[]).filter(v=>v!=null);
    const c=((q&&q.close)||[]).filter(v=>v!=null);
    return{s,p:m.regularMarketPrice,c:(m.regularMarketPrice-m.previousClose)/m.previousClose*100,o,cl:c,n:s.replace('.SA','').replace('=X','').replace('-USD','').replace('^','')};
  }catch(e){return null}
}

async function tg(t){await fetch('https://api.telegram.org/bot'+T+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({chat_id:C,text:t,parse_mode:'HTML',disable_web_page_preview:'true'})})}

async function tp(p,cap){await fetch('https://api.telegram.org/bot'+T+'/sendPhoto',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({chat_id:C,photo:p,caption:cap.slice(0,1024),parse_mode:'HTML'})})}

const pct=c=>c==null?'-':(c>=0?'🟢 +':'🔴 ')+c.toFixed(2)+'%';
const f2=p=>p?p.toFixed(2):'-';
const f4=p=>p?p.toFixed(4):'-';
const intf=p=>p?Math.round(p).toLocaleString('de-DE'):'-';
const bt=()=>new Date(Date.now()-3*3600*1000);
const ts=()=>bt().toISOString().slice(11,16);

function st(){const t=bt(),h=t.getUTCHours(),d=t.getUTCDay();if(d===0||d===6)return'fim';if(h<10)return'pre';if(h<17)return'aberto';if(h<18)return'leilao';return'fechado'}

function rsi(c){if(c.length<15)return null;let g=0,l=0;for(let i=c.length-14;i<c.length;i++){const d=c[i]-c[i-1];if(d>0)g+=d;else l-=d}if(l===0)return 100;return 100-100/(1+g/l)}
const sma=(c,n)=>c.length<n?null:c.slice(-n).reduce((a,b)=>a+b,0)/n;

function candleU(name,o,cl){
  const n=Math.min(20,o.length),op=o.slice(-n),clo=cl.slice(-n);
  const bg=clo.map((c,i)=>c>=op[i]?'#22c55e':'#ef4444');
  const dt=clo.map((c,i)=>[op[i],c]);
  const cfg={type:'bar',data:{labels:op.map((_,i)=>'D'+(n-i)),datasets:[{data:dt,backgroundColor:bg}]},options:{title:{display:true,text:'🕯️ '+name+' '+n+'d',fontColor:'#d4af37',fontSize:18},legend:{display:false}}};
  return'https://quickchart.io/chart?bkg=%230a0a0a&w=900&h=500&c='+encodeURIComponent(JSON.stringify(cfg));
}

function press(o,cl){let bu=0,be=0;for(let i=0;i<cl.length;i++){if(cl[i]>=o[i])bu++;else be++}const t=bu+be;return{bp:t?Math.round(bu/t*100):50,ep:t?Math.round(be/t*100):50,bu,be}}

function donutU(name,o,cl){
  const p=press(o,cl);
  const cfg={type:'doughnut',data:{labels:['Comp '+p.bp+'%','Vend '+p.ep+'%'],datasets:[{data:[p.bu,p.be],backgroundColor:['#22c55e','#ef4444']}]},options:{title:{display:true,text:'⚖️ Pressao '+name,fontColor:'#d4af37',fontSize:18},legend:{labels:{fontColor:'#fff'}}}};
  return'https://quickchart.io/chart?bkg=%230a0a0a&w=700&h=500&c='+encodeURIComponent(JSON.stringify(cfg));
}

async function getAll(){const all=IDX.concat(BR,US,ETF,FII,CRI,FX,COM);const res=await Promise.all(all.map(s=>yh(s)));const d={};for(let i=0;i<all.length;i++)d[all[i]]=res[i];return d}

function fmtL(d,prefix,fmt){if(!d||!d.p)return d?d.n+': -':'';const p=fmt==='int'?intf(d.p):fmt==='4'?f4(d.p):f2(d.p);return d.n+': '+prefix+p+' '+pct(d.c)+'\n'}

async function sendSnap(data){
  let t='📊 <b>MERCADO MUNDIAL — '+ts()+' BR</b>\n━━━━━━━━━━\n\n<b>🌍 ÍNDICES</b>\n';
  for(const s of IDX)t+=fmtL(data[s],'','int');
  t+='\n<b>💱 FOREX</b>\n';for(const s of FX)t+=fmtL(data[s],'R$ ','4');
  t+='\n<b>₿ CRIPTO</b>\n';for(const s of CRI){const x=data[s];if(x)t+=x.n+': $'+(x.p<10?f4(x.p):intf(x.p))+' '+pct(x.c)+'\n'}
  const brS=BR.map(s=>data[s]).filter(x=>x&&x.p).sort((a,b)=>b.c-a.c);
  t+='\n<b>📈 TOP 5 BR ALTA</b>\n';for(const x of brS.slice(0,5))t+='R$ '+f2(x.p)+' '+pct(x.c)+' '+x.n+'\n';
  t+='\n<b>📉 TOP 5 BR QUEDA</b>\n';for(const x of brS.slice(-5).reverse())t+='R$ '+f2(x.p)+' '+pct(x.c)+' '+x.n+'\n';
  t+='\n<b>🇺🇸 USA</b>\n';for(const s of US)t+=fmtL(data[s],'$','2');
  t+='\n<b>📊 ETFs/FIIs</b>\n';for(const s of ETF.concat(FII))t+=fmtL(data[s],'R$ ','2');
  t+='\n<b>🏆 COMMODITIES</b>\n';for(const s of COM)t+=fmtL(data[s],'$','2');
  await tg(t);
}

async function sendAnalise(data){
  const ib=data['^BVSP'],sp=data['^GSPC'],bc=data['BTC-USD'];
  const ic=(ib&&ib.c)||0,sc=(sp&&sp.c)||0,bcc=(bc&&bc.c)||0;
  const sco=ic*0.5+sc*0.3+bcc*0.2;
  let t='🤖 <b>COMO ESTÁ O MERCADO HOJE</b>\n━━━━━━━━━━\n\n';
  if(sco>1){t+='🟢 <b>FORTE ALTA</b>\nIbov '+pct(ic)+', S&P '+pct(sc)+', BTC '+pct(bcc)+'. Risk-on.\n\n💡 Compre em PULLBACK. Foco: PETR4 VALE3 NVDA META.\nStop sempre 3% abaixo.'}
  else if(sco>0.3){t+='🟢 <b>VIÉS ALTA</b>\nMercado pendendo pra cima. Ibov '+pct(ic)+'.\n\n💡 DCA semanal. Aporte FIIs (MXRF11, HGLG11).'}
  else if(sco<-1){t+='🔴 <b>FORTE QUEDA</b>\nIbov '+pct(ic)+', S&P '+pct(sc)+'. Risk-off.\n\n💡 Defensivo: Tesouro Selic, CDB, Ouro.\nNão entre em queda de faca.'}
  else if(sco<-0.3){t+='🔴 <b>VIÉS QUEDA</b>\nMercado fraco. Ibov '+pct(ic)+'.\n\n💡 Stops apertados (-2%). Sem alavancagem.'}
  else{t+='⚪ <b>LATERALIDADE</b>\nIbov '+pct(ic)+', S&P '+pct(sc)+'. Pouca direção.\n\n💡 DCA é ótimo aqui. Estude setores subvalorizados.'}
  await tg(t);
}

async function sendEstudo(data){
  const it=data['ITSA4.SA'],ib=data['^BVSP'],us=data['USDBRL=X'],pe=data['PETR4.SA'],va=data['VALE3.SA'],mg=data['MGLU3.SA'],mx=data['MXRF11.SA'];
  let t='🎓 <b>ESTUDO AO VIVO — DADOS REAIS</b>\n━━━━━━━━━━\n\n';
  if(it&&it.p){
    const dy=(0.90/it.p*100).toFixed(1);
    t+='💎 <b>DY AO VIVO</b>\nITSA4 R$ '+f2(it.p)+' paga R$0,90/ano = <b>DY '+dy+'%</b>\n100 cotas (R$ '+(it.p*100).toFixed(2)+') → R$90/ano = <b>R$7,50/mês</b> passivo isento IR.\n\n';
  }
  if(mx&&mx.p){
    const dyM=(0.11/mx.p*100).toFixed(2);
    t+='🏢 <b>FII MENSAL</b>\nMXRF11 R$ '+f2(mx.p)+' paga R$0,11/mês = '+dyM+'%/mês ('+(dyM*12).toFixed(1)+'%/ano)\n100 cotas → R$11/mês isento IR.\n\n';
  }
  if(ib&&us){
    t+='📊 <b>DÓLAR × IBOV HOJE</b>\nDólar R$ '+f4(us.p)+' '+pct(us.c)+'. Ibov '+pct(ib.c)+'.\n';
    if(us.c>0.5)t+='<i>Dólar alto: EXPORTADORAS sobem (VALE3 SUZB3). Importadoras (MGLU3) sofrem.</i>\n\n';
    else if(us.c<-0.5)t+='<i>Dólar caindo: IMPORTADORAS aliviam. Exportadoras perdem margem.</i>\n\n';
    else t+='<i>Câmbio estável — sem distorção macro hoje.</i>\n\n';
  }
  t+='📈 <b>RSI AO VIVO</b>\n';
  for(const x of [pe,va,mg].filter(y=>y&&y.cl&&y.cl.length>15)){
    const r=Math.round(rsi(x.cl));
    let s;
    if(r>70)s='🔴 SOBRECOMPRADO — possível correção';
    else if(r<30)s='🟢 SOBREVENDIDO — possível reversão';
    else s='⚪ neutro';
    t+=x.n+' RSI <b>'+r+'</b> → '+s+'\n';
  }
  await tg(t);
}

async function sendSinais(data,limit){
  const sin=[];
  for(const s of BR){
    const x=data[s];if(!x||!x.cl||x.cl.length<20)continue;
    const r=rsi(x.cl),s20=sma(x.cl,20),s50=sma(x.cl,50);
    let setup,why;
    if(r&&r<30&&x.c<-1){setup='🟢 COMPRA SOBREVENDA';why='RSI '+Math.round(r)+'. Reversão técnica em 1-3 dias.'}
    else if(r&&r>75&&x.c>1){setup='🔴 VENDA TOPO';why='RSI '+Math.round(r)+'. Esgotamento comprador.'}
    else if(s20&&s50&&s20>s50*1.005&&x.p>s20&&x.c>0.5){setup='🟢 ACUMULAR ALTA';why='MM20>MM50. Bull confirmado.'}
    else if(s20&&s50&&s20<s50*0.995&&x.p<s20&&x.c<-0.5){setup='🔴 EVITAR QUEDA';why='MM20<MM50. Fraqueza estrutural.'}
    if(setup){
      const lg=setup.indexOf('🟢')>=0;
      const stp=lg?+(x.p*0.97).toFixed(2):+(x.p*1.03).toFixed(2);
      const tgt=lg?+(x.p*1.05).toFixed(2):+(x.p*0.95).toFixed(2);
      sin.push({n:x.n,p:x.p,c:x.c,setup,why,stp,tgt});
    }
  }
  sin.sort((a,b)=>(b.setup.indexOf('🟢')>=0?1:0)-(a.setup.indexOf('🟢')>=0?1:0));
  let t='🎯 <b>SINAIS COMPRA/VENDA — '+ts()+'</b>\n━━━━━━━━━━\n\n';
  if(!sin.length)t+='⚪ Sem setups técnicos rigorosos. Aguarde definição.';
  else{
    for(const s of sin.slice(0,limit)){
      t+='<b>'+s.setup+' — '+s.n+'</b>\nR$ '+s.p.toFixed(2)+' '+pct(s.c)+'\n<i>'+s.why+'</i>\n🛑 R$ '+s.stp.toFixed(2)+' 🎯 R$ '+s.tgt.toFixed(2)+'\n\n';
    }
    t+='⚠️ <i>Educacional. Stop obrigatório. Max 2% capital.</i>';
  }
  await tg(t);
}

async function sendRec(data){
  const pe=data['PETR4.SA'],va=data['VALE3.SA'],it=data['ITSA4.SA'],hg=data['HGLG11.SA'],nv=data['NVDA'],me=data['META'],bc=data['BTC-USD'],iv=data['IVVB11.SA'];
  let t='💰 <b>ONDE INVESTIR AGORA</b>\n━━━━━━━━━━\n\n<b>📈 RV BR (40%)</b>\n';
  if(pe){const r=Math.round(rsi(pe.cl||[]))||0;t+=r>65?'• PETR4 R$ '+f2(pe.p)+' ⚠️ RSI '+r+' aguarde pullback\n':'• PETR4 R$ '+f2(pe.p)+' ✓ acumular\n'}
  if(va)t+='• VALE3 R$ '+f2(va.p)+' ✓ DCA exportadora\n';
  if(it){const dy=(0.90/it.p*100).toFixed(1);t+='• ITSA4 R$ '+f2(it.p)+' ✓ DY '+dy+'%\n'}
  if(hg)t+='• HGLG11 R$ '+f2(hg.p)+' ✓ FII tijolo R$1,03/mês\n';
  t+='\n<b>🇺🇸 RV USA (20%)</b>\n';
  if(nv)t+='• NVDA $'+f2(nv.p)+' líder IA, comprar pullback\n';
  if(me)t+='• META $'+f2(me.p)+' AI ads, alvo $650\n';
  if(iv)t+='• IVVB11 R$ '+f2(iv.p)+' S&P em reais\n';
  t+='\n<b>💰 RF (30%)</b>\n• Tesouro Selic — reserva 100% CDI\n• CDB 120% CDI bancos médios\n• Tesouro IPCA+ 2035 longo prazo\n';
  t+='\n<b>₿ CRIPTO (10%)</b>\n';
  if(bc)t+='• BTC $'+intf(bc.p)+' '+pct(bc.c)+'\n';
  t+='• HASH11 (ETF cripto BR) ✓ isento IR R$35k/mês\n';
  await tg(t);
}

async function sendCandle(name,sym,data){const x=data[sym];if(!x||!x.o||x.o.length<3)return;const p=x.p<10?f4(x.p):intf(x.p);await tp(candleU(name,x.o,x.cl),'🕯️ <b>'+name+'</b>\n'+p+' '+pct(x.c)+'\nVerde=comprador · Vermelho=vendedor')}

async function sendDonut(name,sym,data){
  const x=data[sym];
  if(!x||!x.o||x.o.length<5)return;
  const p=press(x.o,x.cl);
  let an;
  if(p.bp>=65)an='🟢 FORÇA COMPRADORA';
  else if(p.bp>=55)an='🟢 Leve vantagem comp';
  else if(p.ep>=65)an='🔴 FORÇA VENDEDORA';
  else if(p.ep>=55)an='🔴 Leve vantagem vend';
  else an='⚪ Equilíbrio';
  await tp(donutU(name,x.o,x.cl),'⚖️ <b>PRESSÃO '+name+'</b>\nComp: '+p.bp+'% Vend: '+p.ep+'%\n'+an);
}

async function sendNoticias(qtd,off){
  const got=[];
  for(let i=0;i<4;i++){
    try{
      const url=NW[(off+i)%NW.length];
      const r=await fetch('https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(url));
      const d=await r.json();
      for(const it of (d&&d.items||[]).slice(0,2)){
        let img=it.thumbnail||(it.enclosure&&it.enclosure.link);
        if(!img&&it.description){const m=it.description.match(/<img[^>]+src=["']([^"']+)["']/);if(m)img=m[1]}
        got.push({t:it.title,l:it.link,i:img,d:it.pubDate});
      }
    }catch(e){}
  }
  const seen=new Set(),uniq=[];
  for(const n of got){const k=(n.t||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,40);if(k&&!seen.has(k)){seen.add(k);uniq.push(n)}}
  uniq.sort((a,b)=>new Date(b.d||0)-new Date(a.d||0));
  for(let i=0;i<Math.min(qtd,uniq.length);i++){
    const n=uniq[i];
    const cap='📰 <b>NOTÍCIA '+(i+1)+'/'+qtd+'</b>\n<b>'+(n.t||'').slice(0,200)+'</b>\n🔗 <a href="'+n.l+'">Ler matéria</a>';
    if(n.i){try{await tp(n.i,cap)}catch(e){await tg(cap)}}else await tg(cap);
  }
}

const ROT=[['^BVSP','IBOV'],['BTC-USD','BITCOIN'],['USDBRL=X','USD/BRL'],['NVDA','NVIDIA'],['PETR4.SA','PETR4'],['VALE3.SA','VALE3'],['ETH-USD','ETH'],['GC=F','OURO'],['META','META'],['HASH11.SA','HASH11'],['IVVB11.SA','IVVB11'],['MXRF11.SA','MXRF11']];

async function pacoteMega(data){
  await sendSnap(data);
  await sendAnalise(data);
  await sendEstudo(data);
  await sendSinais(data,5);
  await sendRec(data);
  await sendCandle('IBOV','^BVSP',data);
  await sendCandle('BITCOIN','BTC-USD',data);
  await sendCandle('USD/BRL','USDBRL=X',data);
  await sendCandle('NVIDIA','NVDA',data);
  await sendDonut('IBOV','^BVSP',data);
  await sendDonut('BTC','BTC-USD',data);
  await sendNoticias(3,0);
}

async function pacotePad(data,m){
  await sendSnap(data);
  await sendAnalise(data);
  await sendEstudo(data);
  await sendSinais(data,3);
  const rot=ROT[Math.floor(m/5)%ROT.length];
  await sendCandle(rot[1],rot[0],data);
  await sendDonut(rot[1],rot[0],data);
  await sendNoticias(1,Math.floor(m/5)%NW.length);
}

async function run(){
  const s=st(),m=new Date().getUTCMinutes();
  if(m%5!==0)return;
  if(s==='fim'){
    if(m===0||m===30){const d=await getAll();await sendSnap(d);await sendEstudo(d);await sendNoticias(2,0);}
    return;
  }
  const d=await getAll();
  if(m===0||m===30)await pacoteMega(d);
  else await pacotePad(d,m);
}

export default{
  async fetch(r,e,c){return new Response('Agente v15 ativo. Cron 5min: mega 30/30min + padrao outros.')},
  async scheduled(e,n,c){c.waitUntil(run())}
};
