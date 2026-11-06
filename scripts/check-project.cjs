const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const map=require('./design-map.cjs');
const app=JSON.parse(fs.readFileSync('miniprogram/app.json','utf8'));
const routes=[...app.pages,...app.subpackages.flatMap(p=>p.pages.map(r=>p.root+'/'+r))];
assert.equal(routes.length,13);assert.equal(new Set(routes).size,13);assert.equal(app.tabBar.list.length,5);
const allowed=new Set(['view','text','image','button','input','textarea','picker','switch','scroll-view','block','app-header','state-panel']);
for(const page of map){
  assert.ok(routes.includes(page.route),`Missing route ${page.route}`);
  for(const ext of ['ts','wxml','wxss','json'])assert.ok(fs.existsSync(`miniprogram/${page.route}.${ext}`),`Missing ${page.route}.${ext}`);
  const source=fs.readFileSync(`miniprogram/${page.route}.wxml`,'utf8');
  for(const match of source.matchAll(/<([a-z][\w-]*)\b/g))assert.ok(allowed.has(match[1]),`Unsupported element ${match[1]}`);
  assert.ok(!/<(?:script|web-view|iframe)|\bonclick=|https?:\/\//.test(source),`Web dependency found in ${page.route}`);
  for(const img of source.matchAll(/src="(\/assets\/[^"{}]+)"/g))assert.ok(fs.existsSync(path.join('miniprogram',img[1])),`Missing image ${img[1]}`);
  assert.ok(source.includes('app-header'),'Missing shared navigation');
}
const locked=fs.readFileSync('miniprogram/subpackages/mail/locked/index.wxml','utf8');
assert.ok(!locked.includes('当你拆开这封信的时候'),'Locked route must not ship the example unlocked body');
const mailbox=require('cheerio').load(fs.readFileSync('miniprogram/pages/mailbox/index.wxml','utf8'),{xmlMode:true});
assert.equal(mailbox('#mailbox-compose-button').length,1,'Mailbox needs one identifiable primary compose button');
assert.ok(mailbox('#mailbox-compose-button').parent().hasClass('native-fixed-action'),'Primary compose button must stay above the tab bar');
assert.ok(!mailbox('.local-sent-card').hasClass('native-fixed-action'),'Sent record must remain in normal document flow');
const config=JSON.parse(fs.readFileSync('project.config.json','utf8'));
assert.ok(config.setting.useCompilerPlugins.includes('typescript'));
assert.equal(config.miniprogramRoot,'miniprogram/');
const assets=JSON.parse(fs.readFileSync('docs/resource-manifest.json','utf8'));
assert.equal(assets.pages.length,13);assert.equal(assets.images.length,20);
console.log('Verified 13 native routes, 5 tabs, local images, shared headers and TypeScript import configuration.');
