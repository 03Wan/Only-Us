const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {connect}=require('./cdp-local.cjs');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const service=await connect(t=>t.url.includes('/appservice/')),output=path.resolve('artifacts/card-refinements'),checks=[],layouts=[];
 fs.mkdirSync(output,{recursive:true});let saved,success=false;
 const run=expression=>service.evaluate(expression),data=()=>run('getCurrentPages().slice(-1)[0].data');
 const act=(action,value='')=>run(`getCurrentPages().slice(-1)[0].perform(${JSON.stringify(action)},${JSON.stringify(value)})`);
 async function nav(key){const route=key==='compose'?'subpackages/mail/compose':'pages/'+key;await run(`new Promise(resolve=>wx.${key==='compose'?'navigateTo':'switchTab'}({url:'/${route}/index',success:()=>resolve(true),fail:()=>resolve(false)}))`);for(let i=0;i<80;i++){if((await data())?.key===key){await wait(500);return route;}await wait(100);}throw new Error('Navigation '+key);}
 async function renderer(key){return connect(t=>t.url.includes('/__pageframe__/'+(key==='compose'?'subpackages/mail/compose':'pages/'+key)+'/index'));}
 async function position(r,selector){await r.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'});true`);await wait(150);}
 async function tap(r,selector){await position(r,selector);const p=await r.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);for(const type of ['mousePressed','mouseReleased'])await r.send('Input.dispatchMouseEvent',{type,x:p.x,y:p.y,button:'left',clickCount:1});await wait(350);}
 async function shot(r,name){await run('getCurrentPages().slice(-1)[0].dismissFeedback();true');await wait(100);const image=await r.send('Page.captureScreenshot',{format:'png',fromSurface:true});fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(image.data,'base64'));}
 async function layout(r,name,selector){for(const [width,height]of [[320,568],[390,844],[430,932]]){await r.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await position(r,selector);const result=await r.evaluate(`(()=>{const root=document.querySelector(${JSON.stringify(selector)}),rect=root.getBoundingClientRect();const bad=[root,...root.querySelectorAll('wx-view,wx-text,wx-button,wx-picker')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&(r.left< -1||r.right>innerWidth+1)}).map(e=>e.className);return {width:innerWidth,height:innerHeight,bad,cardHeight:rect.height};})()`);assert.deepEqual(result.bad,[],JSON.stringify(result));layouts.push({state:name,...result});}await r.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await position(r,selector);}
 try{
  saved=await run("wx.getStorageInfoSync().keys.filter(k=>k.startsWith('only-us:')).map(k=>[k,wx.getStorageSync(k)])");const backup='artifacts/qa-private-backups';fs.mkdirSync(backup,{recursive:true});fs.writeFileSync(path.join(backup,'cards-'+Date.now()+'.json'),JSON.stringify(saved));
  await nav('compose');let r=await renderer('compose');try{
   await r.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
   await act('delivery','future');await tap(r,'[data-action="delivery"][data-value="now"]');assert.equal((await data()).delivery,'now');
   assert.equal(await r.evaluate("document.querySelector('.delivery-option-selected').getAttribute('data-value')"),'now');assert.equal(await r.evaluate("!!document.querySelector('.delivery-date-picker')"),false);assert.equal(await r.evaluate("!!document.querySelector('.delivery-now-note')"),true);
   await layout(r,'delivery-now','.delivery-options');await shot(r,'delivery-now');
   await tap(r,'[data-action="delivery"][data-value="future"]');assert.equal((await data()).delivery,'future');assert.equal(await r.evaluate("document.querySelectorAll('wx-picker[data-field=\"openAt\"]').length"),1);assert.equal(await r.evaluate("document.querySelector('.delivery-option-selected').getAttribute('data-value')"),'future');await layout(r,'delivery-future','.delivery-options');await shot(r,'delivery-future');checks.push('真实鼠标点击切换两种投递方式，勾选与配色同步，只有未来开启显示一个日期选择器');
  }finally{await r.send('Emulation.clearDeviceMetricsOverride').catch(()=>{});r.close();}
  await nav('us');
  for(const [field,date]of [['firstMet','2023-11-17'],['anniversary','2024-05-20'],['hundredDate','2024-08-28'],['yearDate','2025-05-21']])await run(`getCurrentPages().slice(-1)[0].onDate({currentTarget:{dataset:{field:${JSON.stringify(field)}}},detail:{value:${JSON.stringify(date)}}})`);
  r=await renderer('us');try{
   assert.equal(await r.evaluate("document.querySelectorAll('.milestone-grid>wx-picker').length"),4);await layout(r,'milestones','.milestone-grid');await shot(r,'milestones');
   const main=await connect(t=>t.url.includes('electron-project.html'));
   try{for(const field of ['firstMet','anniversary','hundredDate','yearDate']){
    await tap(r,'.milestone-'+field);
    try{assert.equal(await main.evaluate("[...document.querySelectorAll('.weui-picker__action')].some(e=>e.textContent.trim()==='确定')"),true,field+' must open native date picker');}
    finally{await main.evaluate("(()=>{const cancel=[...document.querySelectorAll('.weui-picker__action')].find(e=>e.textContent.trim()==='取消');cancel?.click();return !!cancel;})()");await wait(350);}
   }}finally{main.close();}
   checks.push('四张纪念日卡片实际点击均弹出原生日期选择器，取消不改动日期');
  }finally{await r.send('Emulation.clearDeviceMetricsOverride').catch(()=>{});r.close();}
  await nav('cabin');await nav('us');let d=await data();assert.equal(d.hundredDate,'2024-08-28');assert.equal(d.yearDate,'2025-05-21');checks.push('四张整卡绑定原生日期选择器，分别保存后切换页面仍显示独立日期');
  await nav('cabin');await act('settings');r=await renderer('cabin');try{await layout(r,'settings','.feature-sheet-settings');await shot(r,'settings');assert.equal(await r.evaluate("document.querySelectorAll('.settings-group .settings-item').length"),8);await tap(r,'.settings-item[data-value="profile"]');assert.equal((await data()).editorKind,'');for(let i=0;i<50&&(await data()).key!=='profile';i++)await wait(100);assert.equal((await data()).key,'profile');checks.push('设置面板八个入口采用图标分组，实际点击小屋资料可进入编辑页');}finally{await r.send('Emulation.clearDeviceMetricsOverride').catch(()=>{});r.close();}
  await nav('cabin');await run("getCurrentPages().slice(-1)[0].setData({meetingDate:''});true");r=await renderer('cabin');try{await layout(r,'meeting-empty','.cabin-meeting-card');await shot(r,'meeting-empty');await run("getCurrentPages().slice(-1)[0].saveMeeting('2027-01-01')");await layout(r,'meeting-dated','.cabin-meeting-card');await shot(r,'meeting-dated');await tap(r,'.cabin-meeting-card');for(let i=0;i<50&&(await data()).key!=='reunion';i++)await wait(100);assert.equal((await data()).key,'reunion');checks.push('见面卡片空状态和倒计时分层展示，整卡点击可进入相见页面');}finally{await r.send('Emulation.clearDeviceMetricsOverride').catch(()=>{});r.close();}
  success=true;
 }finally{
  try{if(saved){await nav('cabin');await run(`(()=>{for(const key of wx.getStorageInfoSync().keys)if(key.startsWith('only-us:'))wx.removeStorageSync(key);for(const [key,value]of ${JSON.stringify(saved)})wx.setStorageSync(key,value);const p=getCurrentPages().slice(-1)[0];p.onShow();p.dismissFeedback();return true;})()`);const restored=await run("wx.getStorageInfoSync().keys.filter(k=>k.startsWith('only-us:')).map(k=>[k,wx.getStorageSync(k)])");assert.deepEqual(new Map(restored),new Map(saved));checks.push('所有原有本机缓存已逐键恢复');}}
  finally{service.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({success,checks,layouts},null,2));}
 }
 console.log(JSON.stringify({success,checks,layoutChecks:layouts.length},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
