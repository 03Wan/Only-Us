// Exercises real compiled native pages in the local WeChat renderer.
// Viewport emulation validates CSS, not physical iOS/Android keyboard behavior.
const fs=require('node:fs'),path=require('node:path');
const {connect}=require('./cdp-local.cjs');
const pages=require('./design-map.cjs');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const sizes=[[320,568],[375,667],[390,844],[430,932],[768,1024],[1024,768],[1194,834]];
const native=process.argv.includes('--native');
const out=path.resolve(__dirname,'../artifacts/responsive');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const records=[];let service=await connect(t=>t.url.includes('/appservice/'));
 try{
  for(const p of pages){
   await service.evaluate(`new Promise((resolve,reject)=>wx.${p.tab===undefined?'reLaunch':'switchTab'}({url:${JSON.stringify('/'+p.route)},success:()=>resolve(true),fail:reject}))`);
   await pause(450);
   const render=await connect(t=>t.url.includes('/__pageframe__/'+p.route));
   try{
    const nativeSize=native?await render.evaluate('[innerWidth,innerHeight]'):null;
    for(const [width,height]of native?[nativeSize]:sizes){
     if(!native)await render.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await pause(60);
     const data=await render.evaluate(`(()=>{
      const box=x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
      const root=document.querySelector('.native-screen');
      if(!root)throw new Error('Native page did not render');
      const overflow=[...root.querySelectorAll('wx-button,wx-input,wx-textarea,wx-view')].filter(x=>{
       const r=x.getBoundingClientRect(),s=getComputedStyle(x);return r.width>0&&(r.left< -1||r.right>innerWidth+1)&&s.position!=='absolute'&&s.position!=='fixed';
      }).map(x=>({class:x.className,text:x.innerText.slice(0,50),...box(x)}));
      return {width:innerWidth,height:innerHeight,screen:box(root),scrollWidth:document.documentElement.scrollWidth,overflow,actions:[...root.querySelectorAll('.native-fixed-action')].map(box),text:document.body.innerText.slice(0,90)};
     })()`);
     records.push({page:p.key,viewport:[width,height],...data});
     if(native){
      const shot=await render.send('Page.captureScreenshot',{format:'png',fromSurface:true});fs.writeFileSync(path.join(out,`actual-${p.key}-${width}.png`),Buffer.from(shot.data,'base64'));
     }
    }
   }finally{if(!native)await render.send('Emulation.clearDeviceMetricsOverride');render.close();}
   console.log(p.key+': '+records.filter(x=>x.page===p.key&&x.overflow.length).map(x=>x.width+'px '+x.overflow.length+' overflow').join(', '));
  }
 }finally{
  await service.evaluate(`new Promise(resolve=>wx.reLaunch({url:'/pages/cabin/index',complete:resolve}))`).catch(()=>{});service.close();
  fs.writeFileSync(path.resolve(__dirname,native?`../docs/native-device-${records[0]?.width||'unknown'}-validation.json`:'../docs/responsive-validation.json'),JSON.stringify({method:native?'WeChat actual simulator device':'WeChat native renderer + CDP CSS viewport emulation (geometry only; screenshots excluded due embedded surface tiling)',sizes:native?[records[0]?.viewport]:sizes,records},null,2));
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
