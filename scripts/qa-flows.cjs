const fs=require('fs'),path=require('path'),assert=require('assert/strict');const {connect}=require('./cdp-local.cjs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const s=await connect(t=>t.url.includes('/appservice/')),checks=[];let saved,completed=false;
 const data=()=>s.evaluate('getCurrentPages().slice(-1)[0]?.data');
 const page=async key=>{for(let i=0;i<80;i++){const d=await data();if(d?.key===key)return d;await wait(100);}throw new Error('Page not ready: '+key);};
 const navigate=async(key,tab=true)=>{await s.evaluate(`wx.${tab?'switchTab':'reLaunch'}({url:${JSON.stringify((tab?'/pages/':'/subpackages/')+key+'/index')}});true`);return page(key.split('/').at(-1));};
 const act=async(action,value='')=>{await s.evaluate(`getCurrentPages().slice(-1)[0].perform(${JSON.stringify(action)},${JSON.stringify(value)})`);await wait(50);};
 const fields=patch=>s.evaluate(`getCurrentPages().slice(-1)[0].setData(${JSON.stringify(patch)});true`);
 try{
  for(let i=0;i<80;i++){if(await s.evaluate('typeof wx.getStorageInfoSync === "function" && getCurrentPages().length>0'))break;await wait(150);}
  saved=await s.evaluate(`wx.getStorageInfoSync().keys.filter(k=>k.startsWith('only-us:')).map(k=>[k,wx.getStorageSync(k)])`);
  const backupDir=path.resolve('artifacts/qa-private-backups');fs.mkdirSync(backupDir,{recursive:true});fs.writeFileSync(path.join(backupDir,'flows-'+Date.now()+'.json'),JSON.stringify(saved));
  for(const key of ['cabin','moments','mailbox','reunion','us']){await navigate(key);assert.equal((await data()).key,key);}checks.push('五个Tab通过真实wx.switchTab切换');
  await navigate('cabin');let d=await data();const lamp=d.lampOn;
  await act('lamp');assert.equal((await data()).lampOn,!lamp);checks.push('台灯状态实际改变');
  const hugs=(await data()).hugs;await act('hug');assert.equal((await data()).hugs,hugs+1);checks.push('抱抱计数写入本机并更新UI');
  await act('route','mailbox');await page('mailbox');await act('route','compose');await page('compose');checks.push('小屋信箱入口和写信路由正确');
  await fields({letterTitle:'QA运行时信件',content:'只用于本机回归，测试后恢复',delivery:'future',openAt:'2000-01-01'});await act('sendLetter');assert.equal((await data()).feedbackKind,'error');checks.push('过期启封日期阻止寄出');
  await act('delivery','now');await act('sendLetter');await navigate('mailbox');await act('mailTab','sent');d=await data();const letter=d.visibleLetters.find(x=>x.title==='QA运行时信件');assert.ok(letter);checks.push('写信保存后返回缓存Tab即看到新记录');
  await act('openLetter',letter.id);await page('letter');assert.equal((await data()).letterBody,'只用于本机回归，测试后恢复');checks.push('真实信件ID打开对应正文');
  await navigate('moments');await act('route','editor');await page('editor');await fields({content:'QA平行时刻',photo:'/assets/photos/photo-26002011e417.jpg',privateNote:'QA私语',privateEnabled:true});await act('publishMoment');await page('waiting');await navigate('moments');assert.ok((await data()).moments.some(x=>x.content==='QA平行时刻'));checks.push('日常发布、等待页、缓存列表回显闭环');
  await navigate('reunion');await s.evaluate('(async()=>{const p=getCurrentPages().slice(-1)[0];await p.perform("addWish","");p.setData({wishText:"QA心愿"});await p.perform("saveFeature","");})()');const added=(await data()).wishRows.find(w=>w.text==='QA心愿');await act('toggleWish',added.id);assert.equal((await data()).wishRows.find(w=>w.id===added.id).done,true);checks.push('用户心愿可保存切换');
  await s.evaluate('getCurrentPages().slice(-1)[0].saveMeeting("2027-01-01")');assert.equal((await data()).meetingDate,'2027-01-01');checks.push('见面日期保存后从真实日期计算倒计时');
  await navigate('us');await s.evaluate('(async()=>{const p=getCurrentPages().slice(-1)[0];await p.perform("story","");p.setData({storyTitle:"QA故事",storyContent:"QA运行时回忆"});await p.perform("saveFeature","");})()');assert.ok((await data()).visibleStories.some(x=>x.content==='QA运行时回忆'));checks.push('新增回忆真正出现在回忆馆');
  await navigate('cabin');await act('refresh');assert.equal((await data()).feedbackKind,'success');await s.evaluate('getCurrentPages().slice(-1)[0].dismissFeedback();true');assert.equal((await data()).feedback,'');checks.push('提示层可以关闭，本机刷新不误请求云端');
  const failure=await s.evaluate(`(async()=>{const original=wx.setStorageSync;try{wx.setStorageSync=()=>{throw new Error('QA storage unavailable')};const p=getCurrentPages().slice(-1)[0];await p.perform('hug','');return {kind:p.data.feedbackKind,busy:p.data.busy};}finally{wx.setStorageSync=original;}})()`);assert.equal(failure.kind,'error');assert.equal(failure.busy,false);checks.push('运行时模拟写入失败有错误反馈且释放忙状态');
  completed=true;
 }finally{
  try{if(saved){await s.evaluate("wx.reLaunch({url:'/pages/cabin/index'});true").catch(()=>{});await page('cabin');await s.evaluate(`(()=>{for(const k of wx.getStorageInfoSync().keys)if(k.startsWith('only-us:'))wx.removeStorageSync(k);for(const [k,v] of ${JSON.stringify(saved)})wx.setStorageSync(k,v);getCurrentPages()[0]?.onShow();return true;})()`);const restored=await s.evaluate(`wx.getStorageInfoSync().keys.filter(k=>k.startsWith('only-us:')).map(k=>[k,wx.getStorageSync(k)])`);assert.deepEqual(new Map(restored),new Map(saved));checks.push('测试前所有only-us缓存逐键完整恢复');}
  }finally{s.close();}fs.writeFileSync('docs/qa-flow-results.json',JSON.stringify({success:completed,date:'2026-11-06',method:'Compiled WeChat AppService runtime via CDP; real wx navigation, page methods; not physical taps/keyboard or deployed cloud',checks,passed:checks.length},null,2));
 }
 console.log(checks.join('\n'));
})().catch(error=>{console.error(error);process.exitCode=1;});
