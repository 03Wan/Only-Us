const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),sharp=require('sharp');
const {connect}=require('./cdp-local.cjs');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const service=await connect(t=>t.url.includes('/appservice/')),output=path.resolve('artifacts/cabin-update'),checks=[],layouts=[],brightness={};fs.mkdirSync(output,{recursive:true});let saved,success=false,originalVisual;
 const run=expression=>service.evaluate(expression),data=()=>run('getCurrentPages().slice(-1)[0].data');
 const act=(action,value='')=>run(`getCurrentPages().slice(-1)[0].perform(${JSON.stringify(action)},${JSON.stringify(value)})`);
 async function nav(key){await run(`new Promise(resolve=>wx.switchTab({url:'/pages/${key}/index',success:()=>resolve(true),fail:()=>resolve(false)}))`);for(let i=0;i<60;i++){if((await data()).key===key){await wait(400);return;}await wait(100);}throw Error('Navigation '+key);}
 async function renderer(key){return connect(t=>t.url.includes('/__pageframe__/pages/'+key+'/index'));}
 async function tap(r,selector){await wait(250);const p=await r.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),b=e.getBoundingClientRect(),x=b.x+b.width/2,y=b.y+b.height/2,hit=document.elementFromPoint(x,y);return {x,y,clickable:hit===e||e.contains(hit),hit:hit?.className}})()`);assert.equal(p.clickable,true,selector+' is covered by '+p.hit);const point={x:p.x,y:p.y};await r.send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});for(const type of ['mousePressed','mouseReleased'])await r.send('Input.dispatchMouseEvent',{type,...point,button:'left',clickCount:1});await wait(350);}
 async function shot(r,name){await run('getCurrentPages().slice(-1)[0].dismissFeedback();true');await wait(100);const result=await r.send('Page.captureScreenshot',{format:'png',fromSurface:true});fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(result.data,'base64'));return Buffer.from(result.data,'base64');}
 async function swipeMapper(r){
  // Embedded Electron webviews offset CDP touch coordinates on Windows.
  await r.evaluate("window.__scrollProbes=[];window.__probeListener=e=>window.__scrollProbes.push({x:e.touches[0].clientX,y:e.touches[0].clientY});window.addEventListener('touchstart',window.__probeListener,{capture:true});true");
  for(const p of [{x:0,y:0},{x:100,y:100}]){await r.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await r.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});}
  const probes=await r.evaluate("window.removeEventListener('touchstart',window.__probeListener,{capture:true});window.__scrollProbes");assert.equal(probes.length,2);
  const sx=(probes[1].x-probes[0].x)/100,sy=(probes[1].y-probes[0].y)/100;
  return (x,y)=>({x:(x-probes[0].x)/sx,y:(y-probes[0].y)/sy});
 }
 async function swipe(r,map,box,up=true){const x=box.x+box.width*.5,start=box.y+box.height*(up?.82:.2),distance=box.height*(up?-.6:.6);await r.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[map(x,start)]});for(let i=1;i<=14;i++){await r.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[map(x,start+distance*i/14)]});await wait(20);}await r.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(300);}
 const scrollState=r=>r.evaluate("(()=>{const host=document.querySelector('.feature-sheet-scroll'),main=host.querySelectorAll('div')[1],b=host.getBoundingClientRect(),last=document.querySelector('.settings-item[data-value=bind]').getBoundingClientRect(),header=document.querySelector('.feature-sheet-header').getBoundingClientRect();return {top:main.scrollTop,height:main.clientHeight,total:main.scrollHeight,box:{x:b.x,y:b.y,width:b.width,height:b.height},last:{top:last.top,bottom:last.bottom},headerTop:header.top,pageTop:scrollY};})()");
 try{
  await nav('cabin');originalVisual=await run("({daytime:getCurrentPages().slice(-1)[0].data.daytime,lampOn:getCurrentPages().slice(-1)[0].data.lampOn})");
  saved=await run("wx.getStorageInfoSync().keys.filter(k=>k.startsWith('only-us:')).map(k=>[k,wx.getStorageSync(k)])");fs.mkdirSync('artifacts/qa-private-backups',{recursive:true});fs.writeFileSync('artifacts/qa-private-backups/cabin-update-'+Date.now()+'.json',JSON.stringify(saved));
  for(const key of ['cabin']){
   await nav(key);const r=await renderer(key);try{
    await r.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
    for(const [width,height]of [[320,568],[390,844],[430,932]]){
     await act('closeEditor');await r.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await act('settings');await wait(220);const before=await scrollState(r);assert.ok(before.total>before.height,'Settings must have a constrained scroll viewport');const map=await swipeMapper(r);
     for(let i=0;i<4;i++){const current=await scrollState(r);if(current.top+current.height>=current.total-2)break;await swipe(r,map,current.box,true);}
     const bottom=await scrollState(r);assert.ok(bottom.top>0,'Real upward swipe must scroll');assert.ok(bottom.last.top>=bottom.box.y&&bottom.last.bottom<=bottom.box.y+bottom.box.height+2,'Last setting fully visible');assert.ok(Math.abs(bottom.headerTop-before.headerTop)<1,'Header stays fixed');assert.ok(Math.abs(bottom.pageTop-before.pageTop)<1,'Background stays fixed');
     if(key==='cabin'&&width===390)await shot(r,'settings-scrolled');await swipe(r,map,bottom.box,false);const returned=await scrollState(r);assert.ok(returned.top<bottom.top,'Downward swipe must scroll back');layouts.push({state:'settings-'+key,width,height,before,bottom,returned});
    }
   }finally{await r.send('Emulation.setTouchEmulationEnabled',{enabled:false}).catch(()=>{});await r.send('Emulation.clearDeviceMetricsOverride').catch(()=>{});r.close();await act('closeEditor');}
  }
  checks.push('设置面板在三种手机尺寸均通过实际触摸手势向下浏览和返回顶部，最后一项完整可见，背景不滚动');
  await nav('cabin');let r=await renderer('cabin');try{
   await r.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
   await r.evaluate("document.querySelector('.cabin-summary').scrollIntoView({block:'start'});window.scrollBy(0,-105);true");await wait(200);await shot(r,'summary');
   for(const daytime of [true,false])for(const lampOn of [true,false]){
    await run(`getCurrentPages().slice(-1)[0].setData({daytime:${daytime},lampOn:${lampOn}});true`);await r.evaluate("document.querySelector('#roomContainer').scrollIntoView({block:'center'});true");await wait(220);
    const name=(daytime?'day':'night')+'-'+(lampOn?'on':'off'),png=await shot(r,name),rect=await r.evaluate("(()=>{const b=document.querySelector('#roomContainer').getBoundingClientRect();return {left:Math.ceil(b.x+b.width*.08),top:Math.ceil(b.y+b.height*.1),width:Math.floor(b.width*.84),height:Math.floor(b.height*.8),source:document.querySelector('#cabinBgImage').getAttribute('src')};})()");assert.ok(rect.source.includes(daytime?'cabin-day.jpg':'cabin-night.jpg'));const {source,...crop}=rect;const stats=await sharp(await sharp(png).extract(crop).toBuffer()).stats();brightness[name]=stats.channels.slice(0,3).reduce((sum,c)=>sum+c.mean,0)/3;
   }
   assert.ok(brightness['day-off']>brightness['night-on']*1.2,JSON.stringify(brightness));assert.ok(Math.abs(brightness['day-on']-brightness['day-off'])/brightness['day-off']<.1,JSON.stringify(brightness));assert.ok(brightness['night-off']<brightness['night-on']*.9,JSON.stringify(brightness));checks.push('太阳白天与月亮夜景使用独立插画，白天关灯保持明亮，夜间整体更暗，夜间开灯保留局部暖光');
   await r.evaluate("document.querySelector('.cabin-affection-bar').scrollIntoView({block:'center'});true");await wait(150);const opening=tap(r,'.cabin-affection-choose');const main=await connect(t=>t.url.includes('electron-project.html'));try{let chosen=false;for(let i=0;i<30&&!chosen;i++){chosen=await main.evaluate("(()=>{const e=[...document.querySelectorAll('.weui-actionsheet__cell')].find(e=>e.textContent.trim()==='温柔摸摸头');e?.click();return !!e;})()");if(!chosen)await wait(100);}assert.equal(chosen,true,'Native action picker offers head pat');await opening;}finally{main.close();}
   await wait(200);assert.equal((await data()).affectionKind,'headPat');const count=(await data()).affectionCount;await tap(r,'#hugButton');assert.equal((await data()).affectionCount,count+1);await shot(r,'head-pat');checks.push('实际点击换动作并从原生菜单选择摸头，主按钮文案与次数同步更新');
  }finally{await r.send('Emulation.clearDeviceMetricsOverride').catch(()=>{});r.close();}
  const date='2024-06-01';await run(`getCurrentPages().slice(-1)[0].onDate({currentTarget:{dataset:{field:'anniversary'}},detail:{value:'${date}'}})`);const days=(await data()).loveDays;await nav('us');assert.equal((await data()).loveDays,days);await nav('cabin');assert.equal((await data()).anniversary,date);assert.equal((await data()).loveDays,days);checks.push('小屋相伴天数与我们纪念日共用日期，修改后跨页面立即同步');
  await act('route','mood');for(let i=0;i<60&&(await data()).key!=='mood';i++)await wait(100);await wait(350);r=await connect(t=>t.url.includes('/__pageframe__/subpackages/connection/mood/index'));try{
   await r.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await r.evaluate("document.querySelector('.mood-grid').scrollIntoView({block:'center'});true");await wait(150);await tap(r,'.mood-option[data-value="开心"]');assert.equal((await data()).mood,'开心');assert.equal(await r.evaluate("document.querySelector('.mood-option-selected').getAttribute('data-value')"),'开心');
   await r.evaluate("document.querySelector('.mood-quick-options').scrollIntoView({block:'center'});true");await wait(150);await tap(r,'.mood-quick-chip:nth-child(2)');assert.equal((await data()).moodNote,'在听你推荐的歌，想你。');
   for(const [width,height]of [[320,568],[390,844],[430,932]]){await r.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await wait(100);const result=await r.evaluate("[...document.querySelectorAll('.mood-quick-chip')].map(e=>{const t=e.querySelector('wx-text'),b=e.getBoundingClientRect();return {left:b.left,right:b.right,textHeight:t.getBoundingClientRect().height,whiteSpace:getComputedStyle(t).whiteSpace}})");for(const chip of result){assert.equal(chip.whiteSpace,'nowrap');assert.ok(chip.textHeight<25&&chip.left>=0&&chip.right<=width+1,JSON.stringify(chip));}layouts.push({state:'mood-quick-chips',width,height,chips:result});}
   await r.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await r.evaluate("window.scrollTo(0,0);true");await wait(150);await shot(r,'mood');await r.evaluate("document.querySelector('.mood-save-button').scrollIntoView({block:'center'});true");await wait(150);await tap(r,'.mood-save-button');for(let i=0;i<60&&(await data()).key!=='cabin';i++)await wait(100);assert.equal((await data()).key,'cabin');assert.equal((await data()).mood,'开心');assert.equal((await data()).moodNote,'在听你推荐的歌，想你。');checks.push('实际点击心情卡、快捷短句和保存，选中态及正文立即变化，保存后返回小屋回显；三种宽度短句不拆行');
  }finally{await r.send('Emulation.clearDeviceMetricsOverride').catch(()=>{});r.close();}
  success=true;
 }finally{
  try{if(saved){await nav('cabin');await run(`(()=>{for(const key of wx.getStorageInfoSync().keys)if(key.startsWith('only-us:'))wx.removeStorageSync(key);for(const [key,value]of ${JSON.stringify(saved)})wx.setStorageSync(key,value);const p=getCurrentPages().slice(-1)[0];p.onShow();const selected=wx.getStorageSync('only-us:local:v2:affectionKind')||'hug';p.setData({...${JSON.stringify(originalVisual)},affectionKind:selected,editorKind:''});p.featureRefresh();p.dismissFeedback();return true;})()`);const restored=await run("wx.getStorageInfoSync().keys.filter(k=>k.startsWith('only-us:')).map(k=>[k,wx.getStorageSync(k)])");assert.deepEqual(new Map(restored),new Map(saved));checks.push('所有用户原有缓存及日夜开灯状态逐键恢复');}}
  finally{service.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({success,checks,layouts,brightness},null,2));}
 }
 console.log(JSON.stringify({success,checks,layouts:layouts.length,brightness},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
