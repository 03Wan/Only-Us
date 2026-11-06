const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {connect}=require('./cdp-local.cjs');const pages=require('./design-map.cjs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const output=path.resolve('artifacts/qa-after');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const service=await connect(t=>t.url.includes('/appservice/')),records=[],errors=[];
 for(let ready=0;ready<80;ready++){if(await service.evaluate('typeof wx.getStorageInfoSync === "function" && getCurrentPages().length > 0'))break;await wait(150);}
 const saved=await service.evaluate(`wx.getStorageInfoSync().keys.filter(k=>k.startsWith('only-us:')).map(k=>[k,wx.getStorageSync(k)])`);
 const backupDir=path.resolve('artifacts/qa-private-backups');fs.mkdirSync(backupDir,{recursive:true});fs.writeFileSync(path.join(backupDir,'ui-'+Date.now()+'.json'),JSON.stringify(saved));
 const navigate=async p=>{
  await service.evaluate(`wx.${p.tab===undefined?'reLaunch':'switchTab'}({url:${JSON.stringify('/'+p.route)}});true`);
  for(let i=0;i<60;i++){await wait(100);const key=await service.evaluate(`getCurrentPages().slice(-1)[0]?.data.key`);if(key===p.key)return;}throw new Error('Navigation failed: '+p.key);
 };
 try {
  for(const p of pages){
   try{
    await navigate(p);await wait(900);const render=await connect(t=>t.url.includes('/__pageframe__/'+p.route));
    try{
     for(let ready=0;ready<40;ready++){if(await render.evaluate('!!document.querySelector(".native-screen")'))break;await wait(150);}
     await render.evaluate('window.scrollTo(0,0);true');await wait(250);const actual=await render.evaluate('[innerWidth,innerHeight]');
     const shot=await render.send('Page.captureScreenshot',{format:'png',fromSurface:true});fs.writeFileSync(path.join(output,p.key+'-native.png'),Buffer.from(shot.data,'base64'));
     for(const width of [320,375,390,430,768]){
      await render.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await wait(40);
      const record=await render.evaluate(`(()=>{const root=document.querySelector('.native-screen');if(!root)throw new Error('No rendered native screen');const elements=[...root.querySelectorAll('wx-button,wx-input,wx-textarea,wx-view,wx-text')];const overflow=elements.filter(x=>{const r=x.getBoundingClientRect(),s=getComputedStyle(x);return r.width>0&&r.height>0&&(r.left< -1||r.right>innerWidth+1)&&!['absolute','fixed'].includes(s.position);}).map(x=>({tag:x.tagName,class:x.className,text:x.innerText.slice(0,40),x:x.getBoundingClientRect().left,right:x.getBoundingClientRect().right}));const small=elements.filter(x=>x.childElementCount===0&&x.textContent.trim()&&x.getBoundingClientRect().height>0&&parseFloat(getComputedStyle(x).fontSize)<13.9).map(x=>({text:x.textContent.slice(0,30),size:getComputedStyle(x).fontSize}));return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:root.scrollHeight,overflow,small,body:document.body.innerText.slice(0,55)};})()`);
      records.push({page:p.key,actual,...record});
     }
    }finally{await render.send('Emulation.clearDeviceMetricsOverride').catch(()=>{});render.close();}
    console.log(p.key+': rendered');
   }catch(e){errors.push({page:p.key,error:e.message});console.log(p.key+': '+e.message);}
  }
 }finally{
  await service.evaluate(`wx.reLaunch({url:'/pages/cabin/index'});true`).catch(()=>{});await wait(500);
  await service.evaluate(`(()=>{for(const k of wx.getStorageInfoSync().keys)if(k.startsWith('only-us:'))wx.removeStorageSync(k);for(const [k,v] of ${JSON.stringify(saved)})wx.setStorageSync(k,v);getCurrentPages()[0]?.onShow();return true;})()`).catch(e=>errors.push({restore:e.message}));service.close();
  fs.writeFileSync('docs/qa-ui-results.json',JSON.stringify({success:records.length===65&&errors.length===0&&records.every(r=>!r.overflow.length&&!r.small.length),date:'2026-11-06',method:'WeChat native renderer via CDP; screenshots at actual simulator size, CSS geometry at five widths; original local storage restored',records,errors},null,2));
 }
 console.log(JSON.stringify({pages:records.length/5,errors,overflow:records.filter(r=>r.overflow.length).map(r=>({page:r.page,width:r.width,count:r.overflow.length,details:r.overflow.slice(0,5)})),small:records.filter(r=>r.small.length).map(r=>({page:r.page,width:r.width,count:r.small.length,details:r.small.slice(0,5)}))},null,2));
 assert.equal(errors.length,0);assert.equal(records.filter(r=>r.overflow.length||r.small.length).length,0,'Overflow or unreadable text detected');
})().catch(e=>{console.error(e);process.exitCode=1;});
