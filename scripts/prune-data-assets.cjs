const fs=require('node:fs'),path=require('node:path');
function pruneDataAssets(){
 const root=path.resolve(__dirname,'../miniprogram'),used=new Set();
 function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory()){if(entry.name!=='assets')visit(file);}else if(/\.(wxml|wxss|json)$/.test(file))for(const m of fs.readFileSync(file,'utf8').matchAll(/\/assets\/photos\/([\w.-]+)/g))used.add(m[1]);}}
 visit(root);
 // Older saved local stories may reference the original cabin illustration.
 used.add('photo-26002011e417.jpg');
 let removed=0;const photos=path.join(root,'assets/photos');for(const name of fs.readdirSync(photos))if(!used.has(name)){fs.unlinkSync(path.join(photos,name));removed++;}
 for(const name of ['design-assets.ts','design-defaults.ts']){const file=path.join(root,'shared',name);if(fs.existsSync(file))fs.unlinkSync(file);}
 return {retained:used.size,removed};
}
module.exports={pruneDataAssets};
if(require.main===module)console.log(pruneDataAssets());
