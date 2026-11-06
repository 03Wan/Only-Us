const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('packaged images and audio stay below the 200 KB total budget',()=>{
 const media=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(/\.(png|jpe?g|gif|webp|mp3|wav|m4a|aac|ogg)$/i.test(entry.name))media.push({file,bytes:fs.statSync(file).size});}}walk('miniprogram');
 const total=media.reduce((sum,file)=>sum+file.bytes,0);assert.ok(total<200000,`Packaged media totals ${total} bytes, must remain below 200000`);for(const file of media)assert.ok(file.bytes<200000,file.file);
});
