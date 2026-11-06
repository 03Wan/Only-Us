const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {connect}=require('./cdp-local.cjs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const service=await connect(t=>t.url.includes('/appservice/')),output=path.resolve('artifacts/ui-polish'),checks=[],layouts=[];
 fs.mkdirSync(output,{recursive:true});let saved,success=false;
 const run=expression=>service.evaluate(expression),data=()=>run('getCurrentPages().slice(-1)[0].data');
 const act=(action,value='')=>run(`getCurrentPages().slice(-1)[0].perform(${JSON.stringify(action)},${JSON.stringify(value)})`);
 const fields=patch=>run(`getCurrentPages().slice(-1)[0].setData(${JSON.stringify(patch)});true`);
 async function navigate(key,secondary=false){const route=secondary?'subpackages/moments/editor':'pages/'+key;await run(`new Promise(resolve=>wx.${secondary?'navigateTo':'switchTab'}({url:'/${route}/index',success:()=>resolve(true),fail:()=>resolve(false)}))`);await wait(800);for(let i=0;i<50;i++){if((await data())?.key===key)return route;await wait(100);}throw new Error('Navigation failed '+key);}
 async function capture(route,name,toast=false){await wait(200);const render=await connect(t=>t.url.includes('/__pageframe__/'+route+'/index'));try{
  if(toast)await run("(()=>{const p=getCurrentPages().slice(-1)[0];globalThis.__polishNoticeTimer=setInterval(()=>p.feedback('抱抱已记下'),500);return true;})()");
  await render.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await wait(120);
  await render.evaluate('window.scrollTo(0,0);true');
  if(toast)await run("getCurrentPages().slice(-1)[0].feedback('抱抱已记下');true");await wait(toast?400:100);
  const shot=await render.send('Page.captureScreenshot',{format:'png',fromSurface:true});fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(shot.data,'base64'));
  for(const [width,height] of [[320,568],[390,844],[430,932]]){
   await render.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});if(toast)await run("getCurrentPages().slice(-1)[0].feedback('抱抱已记下');true");await wait(toast?350:100);
   const result=await render.evaluate(`(()=>{const root=document.querySelector('.feature-overlay')||document.querySelector('.native-screen');const bad=[...root.querySelectorAll('wx-view,wx-text,wx-button,wx-input,wx-textarea')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&!['absolute','fixed'].includes(getComputedStyle(e).position)&&(r.left < -1||r.right > innerWidth+1);}).map(e=>e.className);const save=document.querySelector('.feature-save'),r=save?.getBoundingClientRect(),hit=r&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);const notice=document.querySelector('[class~="index--feedback"]'),n=notice?.getBoundingClientRect();return {width:innerWidth,height:innerHeight,bad,saveClickable:!save||(r.top>=0&&r.bottom<=innerHeight&&(hit===save||save.contains(hit))),notice:n?{opacity:getComputedStyle(notice).opacity,top:n.top,bottom:n.bottom,left:n.left,right:n.right}:null,oldSettingsEntry:!!document.querySelector('.feature-settings-entry')};})()`);
   assert.equal(result.bad.length,0,JSON.stringify(result));assert.equal(result.saveClickable,true,JSON.stringify(result));assert.equal(result.oldSettingsEntry,false);if(toast){assert.ok(result.notice,'Notice must be visible');assert.equal(Number(result.notice.opacity),1,'Notice must be painted');assert.ok(result.notice.top>=88&&result.notice.bottom<height/2);assert.ok(result.notice.left>=0&&result.notice.right<=width);}
   layouts.push({state:name,...result});
  }
 }finally{if(toast)await run("clearInterval(globalThis.__polishNoticeTimer);delete globalThis.__polishNoticeTimer;true");await render.send('Emulation.clearDeviceMetricsOverride').catch(()=>{});render.close();}}
 try{
  for(let i=0;i<80;i++){if(await run("typeof getCurrentPages==='function'&&typeof getCurrentPages().slice(-1)[0]?.perform==='function'").catch(()=>false))break;await wait(150);}
  saved=await run("wx.getStorageInfoSync().keys.filter(k=>k.startsWith('only-us:')).map(k=>[k,wx.getStorageSync(k)])");const backup='artifacts/qa-private-backups';fs.mkdirSync(backup,{recursive:true});fs.writeFileSync(path.join(backup,'polish-'+Date.now()+'.json'),JSON.stringify(saved));
  await navigate('cabin');await act('closeEditor');await capture('pages/cabin','cabin');
  await run("getCurrentPages().slice(-1)[0].selectComponent('#page-header').openSettings();true");await wait(400);assert.equal((await data()).editorKind,'settings');checks.push('顶部设置组件事件可打开面板，正文不再单占一行');
  await act('closeEditor');await act('hug');await capture('pages/cabin','notice',true);await wait(2700);assert.equal((await data()).feedback,'');checks.push('顶部浅色提示在2.4秒后自动消失');
  await act('note');await fields({noteDraft:'今晚十点视频，给你看我新买的书。\n记得早点下班，回家一起慢慢聊。'});await capture('pages/cabin','note-editor');await act('saveFeature');assert.equal((await data()).note,'今晚十点视频，给你看我新买的书。\n记得早点下班，回家一起慢慢聊。');await act('note');assert.match((await data()).noteDraft,/今晚十点/);await act('closeEditor');checks.push('便签使用自定义纸张面板，保存并再次打开可回显');
  const route=await navigate('editor',true);await act('tag');await act('pickTag','#想你的瞬间');await capture(route,'tag-editor');await act('saveFeature');assert.equal((await data()).selectedTag,'#想你的瞬间');checks.push('标签选择面板可保存到日常草稿');success=true;
 }finally{
  try{if(saved){await navigate('cabin');await run(`(()=>{for(const key of wx.getStorageInfoSync().keys)if(key.startsWith('only-us:'))wx.removeStorageSync(key);for(const [key,value]of ${JSON.stringify(saved)})wx.setStorageSync(key,value);getCurrentPages().slice(-1)[0].onShow();getCurrentPages().slice(-1)[0].dismissFeedback();return true;})()`);const restored=await run("wx.getStorageInfoSync().keys.filter(k=>k.startsWith('only-us:')).map(k=>[k,wx.getStorageSync(k)])");assert.deepEqual(new Map(restored),new Map(saved));checks.push('所有原有缓存逐键恢复');}}
  finally{service.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({success,checks,layouts},null,2));}
 }
 console.log(JSON.stringify({success,checks,layoutChecks:layouts.length},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
