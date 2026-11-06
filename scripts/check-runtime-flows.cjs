const fs=require('node:fs');
const assert=require('node:assert/strict');
const {connect}=require('./cdp-local.cjs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const c=await connect(t=>t.url.includes('/appservice/'));
 const checks=[];
 const snapshot=await c.evaluate(`wx.getStorageInfoSync().keys.filter(k=>k.startsWith('only-us:local:v2:')).map(k=>[k,wx.getStorageSync(k)])`);
 const waitPage=async(key)=>{for(let i=0;i<80;i++){const p=await data();if(p.data.key===key)return p;await wait(100);}throw new Error('Page did not settle: '+key);};
 const navigate=async(key,tab=false)=>{await c.evaluate(`new Promise((resolve,reject)=>wx.${tab?'switchTab':'navigateTo'}({url:${JSON.stringify(key)},success:()=>resolve(true),fail:reject}))`);await waitPage(key.split('/').slice(-2)[0]);};
 const perform=(action,value='')=>c.evaluate(`getCurrentPages()[getCurrentPages().length-1].perform(${JSON.stringify(action)},${JSON.stringify(value)});true`);
 const data=()=>c.evaluate(`(()=>{const p=getCurrentPages()[getCurrentPages().length-1];return {route:p.route,data:p.data,depth:getCurrentPages().length}})()`);
 try{
  await navigate('/pages/reunion/index',true);const old=(await data()).data.wishes;
  for(let i=0;i<4;i++)await perform('wish',String(i));
  assert.deepEqual((await data()).data.wishes,old.map(x=>!x));checks.push('Four wishes toggle in runtime');
  await navigate('/pages/moments/index',true);await perform('route','editor');await waitPage('editor');
  await c.evaluate(`(()=>{const p=getCurrentPages().slice(-1)[0];p.setData({content:'响应式回归测试',photo:'/assets/photos/photo-1958af5fb0ef.jpg',photo2:'/assets/photos/photo-382554aedba8.jpg',privateNote:'本机草稿测试',privateEnabled:false});p.persistMoment();return true;})()`);
  await perform('publishMoment');let p=await waitPage('waiting');assert.equal(p.data.content,'响应式回归测试');
  await perform('route','editor');p=await waitPage('editor');assert.equal(p.depth,2);assert.equal(p.data.privateEnabled,false);checks.push('Moment publish, waiting data and return reuse the editor');
  await navigate('/pages/mailbox/index',true);await perform('route','compose');await waitPage('compose');
  await c.evaluate(`getCurrentPages().slice(-1)[0].setData({letterTitle:'回归测试信',content:'写给未来',delivery:'future',openAt:'2000-01-01'});true`);
  await perform('sendLetter');assert.equal((await data()).data.feedbackKind,'error');checks.push('Expired letter date rejected');
  await perform('delivery','now');await perform('sendLetter');await navigate('/pages/mailbox/index',true);await perform('mailTab','sent');assert.equal((await data()).data.sentTitle,'回归测试信');checks.push('Local letter appears in sent mailbox');
  await navigate('/subpackages/connection/bind/index');await c.evaluate(`getCurrentPages().slice(-1)[0].setData({inviteInput:'  star-520-love  '});true`);await perform('join');assert.equal((await data()).data.pairState,'request');checks.push('Demo invitation normalizes whitespace and requires confirmation');
 }finally{
  // Leave no QA edits in the user's local drafts or profile.
  await c.evaluate(`new Promise(resolve=>wx.reLaunch({url:'/pages/cabin/index',complete:()=>resolve(true)}))`);await wait(200);
  await c.evaluate(`(()=>{for(const k of wx.getStorageInfoSync().keys)if(k.startsWith('only-us:local:v2:'))wx.removeStorageSync(k);for(const [k,v]of ${JSON.stringify(snapshot)})wx.setStorageSync(k,v);getCurrentPages()[0].onShow();return true;})()`);c.close();
 }
 fs.writeFileSync('docs/responsive-flow-validation.json',JSON.stringify({date:'2026-11-06',method:'Compiled WeChat AppService runtime; pre-test local data restored',checks},null,2));console.log(checks);
})().catch(e=>{console.error(e);process.exitCode=1;});
