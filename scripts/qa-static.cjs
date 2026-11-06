const fs=require('fs'),path=require('path'),assert=require('assert/strict'),cheerio=require('cheerio');
const ts=require('typescript');require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f);
const {createPage}=require('../miniprogram/shared/page-controller.ts');
const allowed=new Set([...Object.keys(createPage('cabin')), 'onImageError']);
const inventory=[];const missing=[];
for(const p of require('./design-map.cjs')){
 const $=cheerio.load(fs.readFileSync('miniprogram/'+p.route+'.wxml','utf8'),{xmlMode:true,decodeEntities:false});
 $('*').each((i,e)=>{
  for(const [event,handler]of Object.entries(e.attribs).filter(([k])=>/^(bind|catch)/.test(k))){if(!allowed.has(handler)&&!['dismissFeedback','retryAction'].includes(handler))missing.push({page:p.key,event,handler});}
  if(e.name==='button'||e.name==='picker'||Object.keys(e.attribs).some(k=>/^(bindtap|catchtap|bindinput|bindchange)/.test(k)))inventory.push({page:p.key,index:i,element:e.name,id:e.attribs.id||'',action:e.attribs['data-action']||e.attribs['data-field']||'',value:e.attribs['data-value']||'',label:$(e).text().trim().replace(/\s+/g,' ').slice(0,80),handler:Object.entries(e.attribs).filter(([k])=>/^(bind|catch)/.test(k)).map(([k,v])=>`${k}=${v}`).join('; ')});
 });
}
const utilities=fs.readFileSync('miniprogram/styles/design.wxss','utf8');assert.ok(!/font-size:\s*calc\(/.test(utilities),'Small generated text sizes must have a readable floor');
for(const rule of ['database','storage'])assert.deepEqual(JSON.parse(fs.readFileSync(`cloudfunctions/${rule}.rules.json`)),{read:false,write:false});
const app=JSON.parse(fs.readFileSync('miniprogram/app.json'));const size=dir=>fs.readdirSync(dir,{withFileTypes:true}).reduce((n,e)=>n+(e.isDirectory()?size(path.join(dir,e.name)):fs.statSync(path.join(dir,e.name)).size),0);
const packageBytes=size('miniprogram');assert.ok(packageBytes<2*1024*1024,'Main package source exceeds 2MB; inspect package partition');
assert.deepEqual(missing,[]);
const actions=Array.from(new Set(inventory.map(x=>x.action).filter(Boolean))).sort();
fs.writeFileSync('docs/qa-interaction-inventory.json',JSON.stringify({pages:13,tabs:app.tabBar.list.length,interactiveElements:inventory.length,actions,missingHandlers:missing,packageSourceBytes:packageBytes,inventory},null,2));
let md='# 可交互元素检查清单\n\n本清单由 `npm run qa:static` 从当前 WXML 自动生成。静态通过表示绑定和处理函数存在；真实运行证据与真机边界见 QA_TEST_REPORT.md。相同 wx:for 模板按一个元素记录。\n\n| 页面 | 元素 / ID | 动作或字段 | 文案 | 绑定 |\n|---|---|---|---|---|\n';
for(const r of inventory)md+=`| ${r.page} | ${r.element}${r.id?' #'+r.id:''} | ${r.action} ${r.value} | ${r.label.replace(/\|/g,' / ')} | ${r.handler} |\n`;
fs.writeFileSync('docs/QA_INTERACTIONS.md',md);
console.log(JSON.stringify({pages:13,tabs:app.tabBar.list.length,interactiveElements:inventory.length,distinctActions:actions.length,missingHandlers:missing.length,packageSourceBytes:packageBytes}));
