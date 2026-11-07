const {wxmlDependencies}=require('./wxml-source.cjs');
// Use the user's installed official WeChat WXML/WXSS compiler. No network or upload.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const candidates=[process.env.WECHAT_COMPILER_DIR,'D:/AppGallery/Software/微信web开发者工具/resources/app.asar.unpacked/node_modules/wcc-exec',path.join(process.env['ProgramFiles(x86)']||'C:/Program Files (x86)','Tencent/微信web开发者工具/resources/app.asar.unpacked/node_modules/wcc-exec')];
const sdk=candidates.find(p=>p&&fs.existsSync(path.join(p,'wcc.exe')));
if(!sdk){console.error('Set WECHAT_COMPILER_DIR to the installed official wcc-exec directory.');process.exit(1);}
const root=path.resolve(__dirname,'..'),app=path.join(root,'miniprogram');
const artifacts=path.join(root,'artifacts/native-compile');fs.mkdirSync(artifacts,{recursive:true});
function files(dir,ext){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(f=>f.isDirectory()?files(path.join(dir,f.name),ext):f.name.endsWith(ext)?[path.join(dir,f.name)]:[]);}
let failed=false;const records=[];
for(const f of files(app,'.wxml')){
 const relative='./'+path.relative(app,f).replace(/\\/g,'/');const result=cp.spawnSync(path.join(sdk,'wcc.exe'),['-o',path.join(artifacts,path.basename(path.dirname(f))+'-wxml.js'),...wxmlDependencies(f).map(file=>'./'+path.relative(app,file).replace(/\\/g,'/'))],{cwd:app,encoding:'utf8'});
 records.push({file:relative,kind:'wxml',status:result.status,error:result.stderr});if(result.status!==0)failed=true;
}
for(const f of files(app,'.wxss')){
 const relative='./'+path.relative(app,f).replace(/\\/g,'/');const imports=f===path.join(app,'app.wxss')?['./styles/design.wxss','./styles/tokens.wxss','./styles/base.wxss','./styles/qa.wxss']:[];
 const result=cp.spawnSync(path.join(sdk,'wcsc.exe'),['-o',path.join(artifacts,path.basename(path.dirname(f))+'-wxss.js'),relative,...imports],{cwd:app,encoding:'utf8'});
 records.push({file:relative,kind:'wxss',status:result.status,error:result.stderr});if(result.status!==0)failed=true;
}
fs.writeFileSync(path.join(root,'docs/native-compile.json'),JSON.stringify(records,null,2));
for(const r of records.filter(r=>r.status!==0))console.error(r.file,r.error);
console.log(`Official native compiler: ${records.length} files, ${records.filter(r=>r.status!==0).length} errors.`);process.exitCode=failed?1:0;
