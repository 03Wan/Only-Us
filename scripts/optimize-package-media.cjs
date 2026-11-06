const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),app=path.join(root,'miniprogram'),assets=path.join(app,'assets');
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
async function optimizeMedia(){
 const reportFile=path.join(root,'docs/media-budget.json'),previous=fs.existsSync(reportFile)?JSON.parse(fs.readFileSync(reportFile,'utf8')):{files:[]},known=new Map(previous.files.map(f=>[f.file,f.sha256]));
 let source='';function readSources(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.name==='assets')continue;const file=path.join(dir,e.name);if(e.isDirectory())readSources(file);else if(/\.(wxml|wxss|json|ts)$/.test(e.name))source+=fs.readFileSync(file,'utf8');}}readSources(app);
 const used=new Set([...source.matchAll(/\/assets\/icons\/([\w.-]+)/g)].map(m=>m[1])),backup=path.join(root,'artifacts/media-originals');
 const preserve=(file,relative)=>{const dest=path.join(backup,relative);if(!fs.existsSync(dest)){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest);}};
 let excluded=0;for(const name of fs.readdirSync(path.join(assets,'icons')))if(!used.has(name)){const file=path.join(assets,'icons',name);preserve(file,'icons/'+name);fs.unlinkSync(file);excluded++;}
 const files=[];let total=0,optimized=0;
 for(const folder of ['icons','tab','photos'])for(const name of fs.readdirSync(path.join(assets,folder))){
  const relative=folder+'/'+name,file=path.join(assets,relative);if(!/\.(png|jpe?g)$/i.test(name))continue;let buffer=fs.readFileSync(file);const before=buffer.length;
  if(known.get(relative)!==hash(buffer)){
   preserve(file,relative);
   const image=sharp(buffer);buffer=folder==='photos'?await image.resize({width:640,withoutEnlargement:true}).jpeg({quality:64,mozjpeg:true}).toBuffer():await image.resize({width:48,height:48,fit:'inside',withoutEnlargement:true}).png({palette:true,colours:24,quality:80,effort:9}).toBuffer();
   fs.writeFileSync(file,buffer);optimized++;
  }
  total+=buffer.length;files.push({file:relative,bytes:buffer.length,sha256:hash(buffer)});
 }
 const report={budgetBytes:200000,totalBytes:total,passed:total<200000,files};fs.writeFileSync(reportFile,JSON.stringify(report,null,2));if(!report.passed)throw Error('Packaged media exceeds 200 KB: '+total);
 return {totalBytes:total,files:files.length,optimized,excludedUnusedIcons:excluded};
}
module.exports={optimizeMedia};
if(require.main===module)optimizeMedia().then(console.log).catch(error=>{console.error(error);process.exitCode=1;});
