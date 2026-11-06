const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {connect}=require('./cdp-local.cjs'),pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const s=await connect(t=>t.url.includes('/appservice/')),output=path.resolve('artifacts/data-only'),checks=[];fs.mkdirSync(output,{recursive:true});let saved,success=false;
 const run=expression=>s.evaluate(expression),data=()=>run('getCurrentPages().slice(-1)[0].data');
 async function nav(key,route='pages/'+key){await run(`new Promise(resolve=>wx.${route.startsWith('pages/')?'switchTab':'navigateTo'}({url:'/${route}/index',success:()=>resolve(true),fail:()=>resolve(false)}))`);await pause(700);for(let i=0;i<60;i++){if((await data())?.key===key)return route;await pause(100);}throw new Error('Navigation '+key);}
 async function capture(route,name){const r=await connect(t=>t.url.includes('/__pageframe__/'+route+'/index'));try{await r.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await r.evaluate('window.scrollTo(0,0);true');await pause(200);const shot=await r.send('Page.captureScreenshot',{format:'png',fromSurface:true});fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(shot.data,'base64'));}finally{await r.send('Emulation.clearDeviceMetricsOverride').catch(()=>{});r.close();}}
 try{
  for(let i=0;i<80;i++){if(await run("typeof getCurrentPages==='function'&&typeof getCurrentPages().slice(-1)[0]?.perform==='function'").catch(()=>false))break;await pause(150);}
  assert.ok(await run("wx.getStorageSync('only-us:local:v2:dataOnly')===true"),'Migration must have completed');
  assert.equal(await run("wx.getStorageInfoSync().keys.filter(k=>k.startsWith('only-us:mock:v1:')).length"),0);
  saved=await run("wx.getStorageInfoSync().keys.filter(k=>k.startsWith('only-us:')).map(k=>[k,wx.getStorageSync(k)])");fs.mkdirSync('artifacts/qa-private-backups',{recursive:true});fs.writeFileSync('artifacts/qa-private-backups/data-only-'+Date.now()+'.json',JSON.stringify(saved));
  const directory='artifacts/qa-private-backups',beforeFile=fs.readdirSync(directory).filter(f=>f.startsWith('before-placeholder-cleanup-')).sort().at(-1);
  if(beforeFile){const before=new Map(JSON.parse(fs.readFileSync(path.join(directory,beforeFile),'utf8'))),after=new Map(saved),profileBefore=before.get('only-us:mock:v1:space')?.profile||{},profileAfter=after.get('only-us:local:v2:space')?.profile||{};for(const field of ['mine','partner'])if(profileBefore[field]&&!['云朵泡芙','森林来信'].includes(profileBefore[field]))assert.equal(profileAfter[field],profileBefore[field],'User nickname must survive');if(profileBefore.mine&&profileBefore.mine!== '云朵泡芙'&&profileBefore.anniversary)assert.equal(profileAfter.anniversary,profileBefore.anniversary,'Saved anniversary must survive');checks.push('当前设备旧缓存已迁移，用户修改过的昵称保留');}
  for(const key of ['cabin','moments','mailbox','reunion','us']){await nav(key);const d=await data();assert.equal(d.key,key);if(key==='reunion')assert.equal(d.wishRows.length,d.extraWishes.length);await capture('pages/'+key,key);}
  checks.push('五个主页面可打开，心愿列表只来自用户记录');
  for(const [key,route]of [['editor','subpackages/moments/editor'],['compose','subpackages/mail/compose']]){await nav(key,route);const d=await data();const draftName=key==='editor'?'momentDraft':'letterDraft',stored=new Map(saved).get('only-us:local:v2:'+draftName);assert.equal(d.content,stored?.content||'');if(key==='editor')assert.equal(d.photo,stored?.photo||'');else assert.equal(d.letterTitle,stored?.title||'');await capture(route,key);await nav('cabin');}
  checks.push('新建表单仅回显用户草稿，不自动填入文字或照片');
  await nav('bind','subpackages/connection/bind');assert.equal((await data()).inviteCode,'');await run("getCurrentPages().slice(-1)[0].perform('newCode','')");assert.equal((await data()).inviteCode,'');assert.equal((await data()).bound,false);checks.push('未接云环境不会生成假邀请码或模拟绑定成功');success=true;
 }finally{
  try{if(saved){await nav('cabin');await run(`(()=>{for(const key of wx.getStorageInfoSync().keys)if(key.startsWith('only-us:'))wx.removeStorageSync(key);for(const [key,value]of ${JSON.stringify(saved)})wx.setStorageSync(key,value);const p=getCurrentPages().slice(-1)[0];p.onShow();p.dismissFeedback();return true;})()`);assert.deepEqual(new Map(await run("wx.getStorageInfoSync().keys.filter(k=>k.startsWith('only-us:')).map(k=>[k,wx.getStorageSync(k)])")),new Map(saved));checks.push('验收后保留清理结果，恢复验收前的真实用户数据');}}
  finally{s.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({success,checks},null,2));}
 }
 console.log(JSON.stringify({success,checks},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
