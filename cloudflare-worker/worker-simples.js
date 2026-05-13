// Agente Financeiro Worker v13 - MEGA PACOTE COMPLETO a cada 30min
// Tudo junto: snapshot + análise + estudo AO VIVO + sinais + recomendações + gráficos + notícias

const T='8224992163:AAF1B80laJI_P9Re4f6mcAU5F5DRnhmiYG4';
const C='5933857921';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const IDX=['^BVSP','^GSPC','^IXIC','^DJI','^N225','^FTSE','^GDAXI'];
const BR=['PETR4.SA','VALE3.SA','ITUB4.SA','BBAS3.SA','BBDC4.SA','MGLU3.SA','WEGE3.SA','ABEV3.SA','ITSA4.SA','BBSE3.SA','TAEE11.SA','VIVT3.SA','RENT3.SA','SUZB3.SA','EGIE3.SA','PRIO3.SA','RADL3.SA','B3SA3.SA','CSAN3.SA','KLBN11.SA'];
const US=['AAPL','MSFT','GOOGL','AMZN','TSLA','NVDA','META','NFLX','AMD','JPM'];
const ETF=['BOVA11.SA','IVVB11.SA','HASH11.SA','BRAX11.SA'];
const FII=['MXRF11.SA','HGLG11.SA','KNRI11.SA','VISC11.SA','XPLG11.SA'];
const CRI=['BTC-USD','ETH-USD','SOL-USD','BNB-USD','XRP-USD','ADA-USD','DOGE-USD','AVAX-USD'];
const FX=['USDBRL=X','EURBRL=X','GBPBRL=X','JPYBRL=X'];
const COM=['GC=F','CL=F','SI=F'];

const NEWS=[
'https://www.infomoney.com.br/feed/',
'https://br.investing.com/rss/news_25.rss',
'https://www.moneytimes.com.br/feed/',
'https://www.infomoney.com.br/mercados/feed/',
'https://valor.globo.com/valor-investe/rss/',
'https://br.investing.com/rss/news_11.rss',
'https://br.investing.com/rss/news_301.rss',
'https://www.moneytimes.com.br/category/economia/feed/'
];

async function yh(s){
  try{
    const r=await fetch('https://query1.finance.yahoo.com/v8/finance/chart/'+s+'?interval=1d&range=60d',{headers:{'User-Agent':UA}});
    const d=await r.json();
    const x=d&&d.chart&&d.chart.result&&d.chart.result[0];
    if(!x)return null;
    const m=x.meta;
    const q=x.indicators&&x.indicators.quote&&x.indicators.quote[0];
    if(!m||!m.regularMarketPrice||!m.previousClose)return null;
    const o=((q&&q.open)||[]).filter(v=>v!=null);
    const c=((q&&q.close)||[]).filter(v=>v!=null);
    const n=s.replace('.SA','').replace('=X','').replace('-USD','').replace('^','');
    return{s,p:m.regularMarketPrice,c:(m.regularMarketPrice-m.previousClose)/m.previousClose*100,o,cl:c,n};
  }catch(e){return null}
}

async function tg(t){
  await fetch('https://api.telegram.org/bot'+T+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({chat_id:C,text:t,parse_mode:'HTML',disable_web_page_preview:'true'})});
}

async function tp(p,cap){
  await fetch('https://api.telegram.org/bot'+T+'/sendPhoto',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({chat_id:C,photo:p,caption:cap.slice(0,1024),parse_mode:'HTML'})});
}

function pct(c){if(c==null)return'-';return(c>=0?'🟢 +':'🔴 ')+c.toFixed(2)+'%'}
function f2(p){return p?p.toFixed(2):'-'}
function f4(p){return p?p.toFixed(4):'-'}
function intf(p){return p?Math.round(p).toLocaleString('de-DE'):'-'}
function bt(){return new Date(Date.now()-3*3600*1000)}
function ts(){return bt().toISOString().slice(11,16)}

function st(){
  const t=bt(),h=t.getUTCHours(),d=t.getUTCDay();
  if(d===0||d===6)return'fim';
  if(h<10)return'pre';
  if(h<17)return'aberto';
  if(h<18)return'leilao';
  return'fechado';
}

function rsi(c){
  if(c.length<15)return null;
  let g=0,l=0;
  for(let i=c.length-14;i<c.length;i++){const d=c[i]-c[i-1];if(d>0)g+=d;else l-=d}
  if(l===0)return 100;
  return 100-100/(1+g/l);
}

function sma(c,n){if(c.length<n)return null;return c.slice(-n).reduce((a,b)=>a+b,0)/n}

function candleURL(name,o,cl){
  const n=Math.min(20,o.length),op=o.slice(-n),clo=cl.slice(-n);
  const bg=clo.map((c,i)=>c>=op[i]?'#22c55e':'#ef4444');
  const dt=clo.map((c,i)=>[op[i],c]);
  const lab=op.map((_,i)=>'D'+(n-i));
  const cfg={type:'bar',data:{labels:lab,datasets:[{label:name,data:dt,backgroundColor:bg}]},options:{title:{display:true,text:'🕯️ '+name+' '+n+'d',fontColor:'#d4af37',fontSize:18},legend:{display:false}}};
  return'https://quickchart.io/chart?bkg=%230a0a0a&w=900&h=500&c='+encodeURIComponent(JSON.stringify(cfg));
}

function pressureData(o,cl){
  let bu=0,be=0;
  for(let i=0;i<cl.length;i++){if(cl[i]>=o[i])bu++;else be++}
  const t=bu+be;
  return{bp:t?Math.round(bu/t*100):50,ep:t?Math.round(be/t*100):50,bu,be};
}

function donutURL(name,o,cl){
  const p=pressureData(o,cl);
  const cfg={type:'doughnut',data:{labels:['Compradores '+p.bp+'%','Vendedores '+p.ep+'%'],datasets:[{data:[p.bu,p.be],backgroundColor:['#22c55e','#ef4444']}]},options:{title:{display:true,text:'⚖️ Pressao '+name,fontColor:'#d4af37',fontSize:18},legend:{labels:{fontColor:'#fff'}}}};
  return'https://quickchart.io/chart?bkg=%230a0a0a&w=700&h=500&c='+encodeURIComponent(JSON.stringify(cfg));
}

async function getAll(){
  const all=IDX.concat(BR,US,ETF,FII,CRI,FX,COM);
  const res=await Promise.all(all.map(s=>yh(s)));
  const data={};
  for(let i=0;i<all.length;i++)data[all[i]]=res[i];
  return data;
}

function fmtAtivo(d,prefix,fmt){
  if(!d||!d.p)return d?d.n+': -':'-';
  const p=fmt==='int'?intf(d.p):fmt==='4'?f4(d.p):f2(d.p);
  return d.n+': '+prefix+p+' '+pct(d.c);
}

async function sendMegaSnapshot(data){
  let t='📊 <b>MERCADO MUNDIAL — '+ts()+' BR</b>\n━━━━━━━━━━━━━━━\n\n';
  t+='<b>🌍 ÍNDICES GLOBAIS</b>\n';
  for(const s of IDX){const x=data[s];if(x)t+=fmtAtivo(x,'','int')+'\n'}
  t+='\n<b>💱 FOREX</b>\n';
  for(const s of FX){const x=data[s];if(x)t+=fmtAtivo(x,'R$ ','4')+'\n'}
  t+='\n<b>₿ CRIPTO</b>\n';
  for(const s of CRI){const x=data[s];if(x){const p=x.p<10?f4(x.p):intf(x.p);t+=x.n+': $'+p+' '+pct(x.c)+'\n'}}
  const brSorted=BR.map(s=>data[s]).filter(x=>x&&x.p).sort((a,b)=>b.c-a.c);
  t+='\n<b>📈 TOP 5 BR ALTA</b>\n';
  for(const x of brSorted.slice(0,5))t+='R$ '+f2(x.p)+' '+pct(x.c)+' '+x.n+'\n';
  t+='\n<b>📉 TOP 5 BR QUEDA</b>\n';
  for(const x of brSorted.slice(-5).reverse())t+='R$ '+f2(x.p)+' '+pct(x.c)+' '+x.n+'\n';
  t+='\n<b>🇺🇸 USA</b>\n';
  for(const s of US){const x=data[s];if(x)t+=fmtAtivo(x,'$','2')+'\n'}
  t+='\n<b>📊 ETFs e FIIs</b>\n';
  for(const s of ETF.concat(FII)){const x=data[s];if(x)t+=fmtAtivo(x,'R$ ','2')+'\n'}
  t+='\n<b>🏆 COMMODITIES</b>\n';
  for(const s of COM){const x=data[s];if(x)t+=fmtAtivo(x,'$','2')+'\n'}
  await tg(t);
}

async function sendAnaliseHoje(data){
  const ibov=data['^BVSP'],sp=data['^GSPC'],usd=data['USDBRL=X'],btc=data['BTC-USD'];
  const ic=(ibov&&ibov.c)||0,sc=(sp&&sp.c)||0,uc=(usd&&usd.c)||0,bc=(btc&&btc.c)||0;
  const score=ic*0.5+sc*0.3+bc*0.2;
  let t='🤖 <b>COMO ESTÁ O MERCADO HOJE</b>\n━━━━━━━━━━━━━━━\n\n';
  if(score>1){
    t+='🟢 <b>FORTE TENDÊNCIA ALTA</b>\n\n';
    t+='Ibov ('+pct(ic)+'), S&P ('+pct(sc)+') e BTC ('+pct(bc)+') subindo juntos. Cenário "RISK-ON" — investidores buscando ativos voláteis.\n\n';
    t+='💡 <b>O QUE FAZER:</b>\n';
    t+='• Comprar em PULLBACK (correção de 1-2%), nunca no topo\n';
    t+='• Foco em qualidade: PETR4, VALE3, NVDA, META\n';
    t+='• Stop SEMPRE 3% abaixo da entrada\n';
    t+='• Aumentar exposição em ETFs (BOVA11, IVVB11)';
  }else if(score>0.3){
    t+='🟢 <b>VIÉS DE ALTA MODERADO</b>\n\n';
    t+='Mercado pendendo pra cima sem força explosiva. Ibov '+pct(ic)+'.\n\n';
    t+='💡 <b>O QUE FAZER:</b>\n';
    t+='• DCA (compras programadas semanais)\n';
    t+='• Continuar aportes em FIIs (MXRF11, HGLG11)\n';
    t+='• Manter reserva em Selic';
  }else if(score<-1){
    t+='🔴 <b>FORTE TENDÊNCIA QUEDA</b>\n\n';
    t+='Ibov '+pct(ic)+', S&P '+pct(sc)+'. Cenário "RISK-OFF" — investidores correndo pra ativos seguros.\n\n';
    t+='💡 <b>O QUE FAZER:</b>\n';
    t+='• DEFENSIVO: reduzir exposição em RV\n';
    t+='• Refúgio: Tesouro Selic, CDB, Ouro (GC=F)\n';
    t+='• NÃO entre em "queda de faca" — aguarde estabilização\n';
    t+='• Stops apertados nas posições atuais';
  }else if(score<-0.3){
    t+='🔴 <b>VIÉS DE QUEDA</b>\n\n';
    t+='Mercado fraco mas sem pânico. Ibov '+pct(ic)+'.\n\n';
    t+='💡 <b>O QUE FAZER:</b>\n';
    t+='• Stops apertados (-2%)\n';
    t+='• Sem alavancagem\n';
    t+='• Liquidez reserva pra eventual compra';
  }else{
    t+='⚪ <b>MERCADO LATERALIZADO</b>\n\n';
    t+='Ibov '+pct(ic)+' e S&P '+pct(sc)+' indicam pouca direção. Em lateralidade, o melhor é DCA (compras programadas) ou aguardar definição.\n\n';
    t+='💡 <b>O QUE FAZER:</b>\n';
    t+='• DCA é a estratégia ótima aqui\n';
    t+='• Não tente prever quando vai romper\n';
    t+='• Estude setores subvalorizados\n';
    t+='• Acumule cripto em DCA mensal';
  }
  await tg(t);
}

async function sendEstudoAoVivo(data){
  const itsa=data['ITSA4.SA'],ibov=data['^BVSP'],usd=data['USDBRL=X'],petr=data['PETR4.SA'],vale=data['VALE3.SA'],mglu=data['MGLU3.SA'],mxrf=data['MXRF11.SA'];
  let t='🎓 <b>ESTUDO AO VIVO COM DADOS REAIS</b>\n━━━━━━━━━━━━━━━\n\n';
  if(itsa&&itsa.p){
    const dy=(0.90/itsa.p*100).toFixed(1);
    const cotas100=(itsa.p*100).toFixed(2);
    const passivo=(90/12).toFixed(2);
    t+='💎 <b>DIVIDEND YIELD AO VIVO</b>\n';
    t+='ITSA4 (Itaúsa) a R$ '+f2(itsa.p)+'. Paga ~R$0,90/ano em dividendos.\n';
    t+='DY = (0,90 / '+f2(itsa.p)+') × 100 = <b>'+dy+'%</b>\n';
    t+='Comprou 100 cotas? R$ '+cotas100+' investidos.\n';
    t+='Recebe ~R$90/ano = <b>R$ '+passivo+'/mês</b> PASSIVO isento IR.\n\n';
  }
  if(mxrf&&mxrf.p){
    const dyMensal=(0.11/mxrf.p*100).toFixed(2);
    const passivoFII=(mxrf.p*100*0.11/mxrf.p).toFixed(2);
    t+='🏢 <b>FII MENSAL AO VIVO</b>\n';
    t+='MXRF11 a R$ '+f2(mxrf.p)+'. Paga ~R$0,11/mês.\n';
    t+='DY mensal: '+dyMensal+'% — anualizado ~'+(dyMensal*12).toFixed(1)+'%\n';
    t+='100 cotas (R$ '+(mxrf.p*100).toFixed(2)+') = R$ '+passivoFII+'/mês isento IR.\n\n';
  }
  if(ibov&&usd){
    t+='📊 <b>DÓLAR E IBOV CORRELAÇÃO HOJE</b>\n';
    t+='Dólar R$ '+f4(usd.p)+' '+pct(usd.c)+'. Ibov '+pct(ibov.c)+'.\n';
    if(usd.c>0.5)t+='Dólar alto = <b>EXPORTADORAS sobem</b> (VALE3, SUZB3). Importadoras (MGLU3) sofrem.\n\n';
    else if(usd.c<-0.5)t+='Dólar caindo = <b>IMPORTADORAS aliviam</b>. Exportadoras perdem margem.\n\n';
    else t+='Câmbio estável — sem distorção macro relevante hoje.\n\n';
  }
  t+='📈 <b>RSI AO VIVO TOP MOVERS</b>\n';
  for(const x of [petr,vale,mglu].filter(y=>y&&y.cl&&y.cl.length>15)){
    const r=Math.round(rsi(x.cl));
    let st2;
    if(r>70)st2='🔴 SOBRECOMPRADO — possível correção';
    else if(r<30)st2='🟢 SOBREVENDIDO — possível reversão!';
    else if(r>60)st2='⚪ neutro alto';
    else if(r<40)st2='⚪ neutro baixo';
    else st2='⚪ neutro';
    t+=x.n+' RSI <b>'+r+'</b> → '+st2+'\n';
  }
  t+='\n<i>RSI &gt;70 = sobrecomprado (vende), &lt;30 = sobrevendido (compra).</i>';
  await tg(t);
}

async function sendSinais(data){
  const sin=[];
  for(const s of BR){
    const x=data[s];
    if(!x||!x.cl||x.cl.length<20)continue;
    const r=rsi(x.cl),s20=sma(x.cl,20),s50=sma(x.cl,50);
    let setup,desc,why;
    if(r&&r<30&&x.c<-1){
      setup='🟢 COMPRA — SOBREVENDA';
      desc='RSI '+Math.round(r)+' (<30) + queda '+x.c.toFixed(1)+'%';
      why='Reversão técnica provável em 1-3 dias. Compradores entram em sobrevenda.';
    }else if(r&&r>75&&x.c>1){
      setup='🔴 VENDA — ZONA DE TOPO';
      desc='RSI '+Math.round(r)+' (>75) + alta '+x.c.toFixed(1)+'%';
      why='Esgotamento comprador. Realize lucro ou stop tight.';
    }else if(s20&&s50&&s20>s50*1.005&&x.p>s20&&x.c>0.5){
      setup='🟢 ACUMULAR — TENDÊNCIA ALTA';
      desc='MM20 > MM50 alinhadas + preço acima MM20';
      why='Bull market confirmado. Compre em pullbacks até MM20.';
    }else if(s20&&s50&&s20<s50*0.995&&x.p<s20&&x.c<-0.5){
      setup='🔴 EVITAR — TENDÊNCIA QUEDA';
      desc='MM20 < MM50 + preço abaixo MM20';
      why='Fraqueza estrutural. Evite até romper resistência.';
    }
    if(setup){
      const lg=setup.indexOf('🟢')>=0;
      const stp=lg?+(x.p*0.97).toFixed(2):+(x.p*1.03).toFixed(2);
      const tgt=lg?+(x.p*1.05).toFixed(2):+(x.p*0.95).toFixed(2);
      const rr=lg?((tgt-x.p)/(x.p-stp)).toFixed(1):((x.p-tgt)/(stp-x.p)).toFixed(1);
      sin.push({n:x.n,p:x.p,c:x.c,r,setup,desc,why,stp,tgt,rr});
    }
  }
  sin.sort((a,b)=>{const av=a.setup.indexOf('🟢')>=0?1:0,bv=b.setup.indexOf('🟢')>=0?1:0;return bv-av});
  let t='🎯 <b>SINAIS DE COMPRA/VENDA — '+ts()+'</b>\n━━━━━━━━━━━━━━━\n\n';
  if(!sin.length){t+='⚪ Sem setups técnicos rigorosos no momento.\nMercado equilibrado. Aguarde definição.';}
  else{
    for(const s of sin.slice(0,5)){
      t+='<b>'+s.setup+'</b>\n';
      t+='Ativo: <b>'+s.n+'</b> · R$ '+s.p.toFixed(2)+' '+pct(s.c)+'\n';
      t+=s.desc+'\n';
      t+='<i>'+s.why+'</i>\n';
      t+='💰 Entry: R$ '+s.p.toFixed(2)+'\n';
      t+='🛑 Stop: R$ '+s.stp.toFixed(2)+'\n';
      t+='🎯 Alvo: R$ '+s.tgt.toFixed(2)+'\n';
      t+='⚖️ R/R: 1:'+s.rr+'\n\n';
    }
    t+='⚠️ <i>Educacional. Stop obrigatório. Máx 2% do capital por trade.</i>';
  }
  await tg(t);
}

async function sendRecomendacoes(data){
  const petr=data['PETR4.SA'],vale=data['VALE3.SA'],itsa=data['ITSA4.SA'],hglg=data['HGLG11.SA'],nvda=data['NVDA'],meta=data['META'],btc=data['BTC-USD'],eth=data['ETH-USD'],ivvb=data['IVVB11.SA'],ouro=data['GC=F'];
  let t='💰 <b>ONDE INVESTIR AGORA</b>\n━━━━━━━━━━━━━━━\n\n';
  t+='<b>📈 RENDA VARIÁVEL BR (40%)</b>\n';
  if(petr){const r=petr.cl?Math.round(rsi(petr.cl)):0;if(r>65)t+='• PETR4 R$ '+f2(petr.p)+' ⚠️ RSI '+r+' — aguardar pullback\n';else t+='• PETR4 R$ '+f2(petr.p)+' ✓ acumular\n'}
  if(vale)t+='• VALE3 R$ '+f2(vale.p)+' ✓ DCA exportadora\n';
  if(itsa){const dy=(0.90/itsa.p*100).toFixed(1);t+='• ITSA4 R$ '+f2(itsa.p)+' ✓ DY '+dy+'% mensal\n'}
  if(hglg)t+='• HGLG11 R$ '+f2(hglg.p)+' ✓ FII tijolo, paga ~R$1,03/mês\n';
  t+='\n<b>🇺🇸 RV USA (20%)</b>\n';
  if(nvda)t+='• NVDA $'+f2(nvda.p)+' — líder IA, comprar pullback\n';
  if(meta)t+='• META $'+f2(meta.p)+' — AI ads, alvo $650\n';
  if(ivvb)t+='• IVVB11 R$ '+f2(ivvb.p)+' — S&P em reais (sem ter conta lá fora)\n';
  t+='\n<b>💰 RENDA FIXA (30%)</b>\n';
  t+='• Tesouro Selic — reserva emergência, 100% CDI\n';
  t+='• CDB 120% CDI bancos médios (FGC até R$250k)\n';
  t+='• Tesouro IPCA+ 2035 — proteção inflação longo prazo\n';
  t+='\n<b>₿ CRIPTO (8%)</b>\n';
  if(btc)t+='• BTC $'+intf(btc.p)+' '+pct(btc.c)+'\n';
  if(eth)t+='• ETH $'+intf(eth.p)+' '+pct(eth.c)+' (MM50 suporte chave)\n';
  t+='• HASH11 (ETF cripto BR) ✓ isento IR até R$35k/mês\n';
  t+='\n<b>🏆 COMMODITIES (2%)</b>\n';
  if(ouro)t+='• Ouro $'+f2(ouro.p)+' '+pct(ouro.c)+' — proteção em crise\n';
  t+='\n💡 <i>Rebalanceie a cada 6 meses. Sempre aporte mensal regular (DCA).</i>';
  await tg(t);
}

async function sendCandlePack(data){
  const candidates=[{s:'^BVSP',n:'IBOVESPA'},{s:'BTC-USD',n:'BITCOIN'},{s:'USDBRL=X',n:'USD/BRL'},{s:'NVDA',n:'NVIDIA'}];
  const brSorted=BR.map(s=>data[s]).filter(x=>x&&x.p).sort((a,b)=>Math.abs(b.c)-Math.abs(a.c));
  if(brSorted[0])candidates.push({s:brSorted[0].s,n:brSorted[0].n+' (top mover BR)'});
  candidates.push({s:'GC=F',n:'OURO'});
  for(const c of candidates){
    const x=data[c.s];
    if(!x||!x.o||x.o.length<3)continue;
    const url=candleURL(c.n,x.o,x.cl);
    const p=x.p<10?f4(x.p):intf(x.p);
    await tp(url,'🕯️ <b>'+c.n+'</b>\nÚltimo: '+p+' '+pct(x.c)+'\nVerde = compradores ganharam · Vermelho = vendedores');
  }
}

async function sendDonutPack(data){
  const candidates=[{s:'^BVSP',n:'IBOV'},{s:'BTC-USD',n:'BTC'}];
  for(const c of candidates){
    const x=data[c.s];
    if(!x||!x.o||x.o.length<5)continue;
    const p=pressureData(x.o,x.cl);
    const url=donutURL(c.n,x.o,x.cl);
    let an;
    if(p.bp>=65)an='🟢 FORÇA COMPRADORA DOMINANTE. Tendência altista nos últimos 30 dias.';
    else if(p.bp>=55)an='🟢 Leve vantagem compradores. Mercado pendendo pra alta.';
    else if(p.ep>=65)an='🔴 FORÇA VENDEDORA DOMINANTE. Tendência baixista nos últimos 30 dias.';
    else if(p.ep>=55)an='🔴 Leve vantagem vendedores. Pressão de venda.';
    else an='⚪ EQUILÍBRIO. Mercado em definição.';
    await tp(url,'⚖️ <b>PRESSÃO '+c.n+' — 30 dias</b>\nCompradores: <b>'+p.bp+'%</b>\nVendedores: <b>'+p.ep+'%</b>\n\n'+an);
  }
}

async function sendNoticias(){
  const got=[];
  for(const idx of [0,1,2,3]){
    try{
      const url=NEWS[idx%NEWS.length];
      const r=await fetch('https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(url));
      const d=await r.json();
      const items=(d&&d.items||[]).slice(0,2);
      for(const it of items){
        let img=it.thumbnail||(it.enclosure&&it.enclosure.link);
        if(!img&&it.description){const m=it.description.match(/<img[^>]+src=["']([^"']+)["']/);if(m)img=m[1]}
        got.push({t:it.title,l:it.link,i:img,d:it.pubDate});
      }
    }catch(e){}
  }
  const seen=new Set(),uniq=[];
  for(const n of got){
    const k=(n.t||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,40);
    if(k&&!seen.has(k)){seen.add(k);uniq.push(n)}
  }
  uniq.sort((a,b)=>new Date(b.d||0)-new Date(a.d||0));
  for(let i=0;i<Math.min(3,uniq.length);i++){
    const n=uniq[i];
    const cap='📰 <b>NOTÍCIA '+(i+1)+'/3 — REAL TIME</b>\n━━━━━━━━━━━━━━━\n<b>'+(n.t||'').slice(0,220)+'</b>\n\n🔗 <a href="'+n.l+'">Ler matéria completa</a>';
    if(n.i){try{await tp(n.i,cap)}catch(e){await tg(cap)}}else await tg(cap);
  }
}

async function pacoteCompleto(){
  const data=await getAll();
  await sendMegaSnapshot(data);
  await sendAnaliseHoje(data);
  await sendEstudoAoVivo(data);
  await sendSinais(data);
  await sendRecomendacoes(data);
  await sendCandlePack(data);
  await sendDonutPack(data);
  await sendNoticias();
}

async function pacoteFimSemana(){
  const data=await getAll();
  await sendMegaSnapshot(data);
  await sendEstudoAoVivo(data);
  await sendNoticias();
}

async function run(){
  const s=st(),m=new Date().getUTCMinutes();
  if(m!==0&&m!==30)return;
  if(s==='fim'){await pacoteFimSemana();return}
  await pacoteCompleto();
}

export default{
  async fetch(r,e,c){return new Response('Agente Financeiro v13 ativo. Cron 30min via scheduled. Pacote completo 2x/hora.')},
  async scheduled(e,n,c){c.waitUntil(run())}
};
