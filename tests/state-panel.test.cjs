const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function panel(){
 let options,serial=0;const timers=new Map(),events=[];
 const source=ts.transpileModule(fs.readFileSync('miniprogram/components/state-panel/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(source,{Component:o=>options=o,wx:{getWindowInfo:()=>({statusBarHeight:44}),getMenuButtonBoundingClientRect:()=>({top:56,height:32})},setTimeout:(fn,delay)=>{const id=++serial;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id)});
 const p={...options.methods,properties:{visible:true,message:'抱抱已记下',kind:'success',token:1},data:{...options.data},setData(patch){Object.assign(this.data,patch);},triggerEvent:name=>events.push(name)};
 options.lifetimes.attached.call(p);
 return {p,options,timers,events};
}
test('success notices sit below native header and dismiss after 2.4 seconds',()=>{const {p,timers,events}=panel();assert.equal(p.data.top,112);assert.equal(timers.size,1);const timer=[...timers.values()][0];assert.equal(timer.delay,2400);timer.fn();assert.deepEqual(events,['dismiss']);});
test('repeating a notice restarts its timer instead of letting an older timer close it',()=>{const {p,options,timers,events}=panel();const first=[...timers.keys()][0];p.properties.token++;options.observers['visible,message,kind,token'].call(p);assert.equal(timers.has(first),false);assert.equal(timers.size,1);assert.deepEqual(events,[]);p.properties.visible=false;p.scheduleDismiss();assert.equal(timers.size,0);});
test('error notices allow five seconds to retry, and retry releases the timer',()=>{const {p,timers,events}=panel();p.properties.kind='error';p.scheduleDismiss();assert.equal([...timers.values()][0].delay,5000);p.retry();assert.equal(timers.size,0);assert.deepEqual(events,['retry']);});
test('hidden and detached pages release all notice timers',()=>{const a=panel();a.options.pageLifetimes.hide.call(a.p);assert.equal(a.timers.size,0);assert.deepEqual(a.events,['dismiss']);const b=panel();b.options.lifetimes.detached.call(b.p);assert.equal(b.timers.size,0);assert.deepEqual(b.events,[]);});
