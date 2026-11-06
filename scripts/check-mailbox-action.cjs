// Regression for the compose button hidden underneath the custom tab bar.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {connect}=require('./cdp-local.cjs');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const service=await connect(t=>t.url.includes('/appservice/'));
 await service.evaluate(`new Promise((resolve,reject)=>wx.switchTab({url:'/pages/mailbox/index',success:()=>resolve(true),fail:reject}))`);
 const render=await connect(t=>t.url.includes('/__pageframe__/pages/mailbox/index'));
 const records=[];
 const original=await service.evaluate(`getCurrentPages().slice(-1)[0].data.mailTab`);
 try{
  for(const mailTab of ['received','sent']){
   await service.evaluate(`getCurrentPages().slice(-1)[0].setData({mailTab:${JSON.stringify(mailTab)}});true`);
   for(const [width,height]of [[320,568],[375,667],[390,844],[430,932],[768,1024],[1024,768],[1194,834]]){
    await render.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    for(const scrollTop of [0,2000]){
     await render.evaluate(`window.scrollTo(0,${scrollTop})`);await pause(80);
     const record=await render.evaluate(`(()=>{
      const button=document.querySelector('#mailbox-compose-button');
      const dock=document.querySelector('[class*="bar-index--dock"]');
      const b=button.getBoundingClientRect(),d=dock.getBoundingClientRect();
      const record=document.querySelector('.local-sent-card');
      const hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);
      return {width:innerWidth,height:innerHeight,scrollY,button:{left:b.left,right:b.right,top:b.top,bottom:b.bottom},dockTop:d.top,gap:d.top-b.bottom,position:getComputedStyle(button.parentElement).position,sentPosition:record?getComputedStyle(record).position:null,clickable:hit===button||button.contains(hit)};
     })()`);
     assert.equal(record.position,'fixed');assert.ok(record.gap>=8,`Compose button overlaps tab bar: ${JSON.stringify(record)}`);
     assert.ok(record.button.left>=0&&record.button.right<=width+1&&record.button.top>=0);
     assert.ok(record.clickable,'Compose button center must receive touches');
     if(mailTab==='sent')assert.notEqual(record.sentPosition,'fixed');
     records.push({mailTab,...record});
    }
   }
  }
 }finally{
  await render.send('Emulation.clearDeviceMetricsOverride');await render.evaluate('window.scrollTo(0,0)');render.close();
  await service.evaluate(`getCurrentPages().slice(-1)[0].setData({mailTab:${JSON.stringify(original)}});true`);service.close();
 }
 fs.writeFileSync('docs/mailbox-action-validation.json',JSON.stringify({records},null,2));
 console.log(`Mailbox compose button: ${records.length} checks passed; all buttons above tab bar and receive touches.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
